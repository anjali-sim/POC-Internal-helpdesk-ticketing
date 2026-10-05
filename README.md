# POC Internal Helpdesk

Two independent projects:

- [`backend/`](backend/) — Express + TypeScript API, Prisma/PostgreSQL, JWT auth
- [`frontend/`](frontend/) — Vite + React + TypeScript + Tailwind

Each has its own `package.json`, `.env.example`, and README with setup instructions. A shared root [`.prettierrc.json`](.prettierrc.json) and [`.gitignore`](.gitignore) apply to both.

## Quick start

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npm run prisma:generate
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## Backend layout

```
backend/src/
  lib/          shared, framework-agnostic helpers (prisma client, jwt, errors,
                password hashing, async-handler, business-hours, logger)
  middleware/   express middleware (auth, request validation, cookies, error handler)
  modules/
    auth/       register/login/me
    users/      agent listing
    tickets/    CRUD, transitions, assignment, comments, dashboard
```

Each domain module follows the same shape: `*.routes.ts` (wiring) →
`*.controller.ts` (HTTP in/out, wrapped in `asyncHandler`) → `*.service.ts`
(business logic, Prisma calls) → `*.schema.ts` (Zod validation). Ticket-only
concerns are split further: `ticket.state-machine.ts` (status transitions),
`ticket.sla.ts` (due-date maths), `ticket.auto-assign.ts` (round-robin +
system user), `ticket.mapper.ts` (DTO shaping), `ticket.dashboard.ts`
(reporting aggregates).

Full setup, scripts, and test docs: [`backend/README.md`](backend/README.md).

## Design decisions

### Visibility boundaries

| Role | Can see | Can do |
|---|---|---|
| Requester | Only tickets they raised, and only the public comments on them | Raise tickets, comment on their own tickets |
| Agent | **Every ticket**, including internal notes | Work their queue, change status, assign/reassign, comment (public or internal) |

- **A requester cannot reach another requester's ticket.** Every ticket lookup is
  constrained to `requesterId = <caller>` in the query itself, so someone else's
  ticket id answers `404 Not Found` (not `403`) and its existence is not revealed.
- **Internal notes never reach a requester.** The comment query for a requester
  adds `isInternal = false`, and a requester's own comments are always stored as
  public, even if the request asks otherwise. The filter depends on the caller's
  role, not on who the ticket is assigned to, so reassignment does not change it.
- **An agent's queue is `GET /api/tickets/queue`.** It returns the open tickets that
  have an open assignment (`unassignedAt IS NULL`) for the calling agent. It is
  built from the assignment, not from the all-tickets list, and it defaults to open
  statuses (`new`, `assigned`, `in_progress`, `reopened`).
- **Agents can also see tickets assigned to other agents** (`GET /api/tickets` and
  `GET /api/tickets/:id`). The helpdesk is one shared pool: agents need the full
  picture to cover for each other, spot unassigned work, and see SLA breaches.
- **Constraint on acting on another agent's ticket: ownership.** Agents can *see*
  every ticket, but only the current assignee can act on it:
  - **Status changes: current assignee only.** Anyone else gets `403 Forbidden`.
  - **Reassignment: current assignee only.** An agent hands a ticket on; they
    cannot take one back. A ticket with **no assignee** (e.g. raised while no
    agent existed) can be claimed by any agent.
  - **Comments and internal notes: any agent**, so a colleague can add context
    to a ticket they do not own.

  Every status change and assignment is recorded in the audit trail (transition
  log and assignment history), so each action is attributable.
- **Known limit:** there is no admin role, so a ticket held by an absent agent
  cannot be rescued by another agent. The spec's optional Admin ("reassign any
  ticket") is the intended fix and is out of scope for this POC.

### SLA targets and business hours

Targets depend on priority and are measured in **business minutes**:

| Priority | First response | Resolution |
|---|---|---|
| urgent | 30 min | 4 h |
| high | 1 h | 8 h |
| medium | 4 h | 24 h |
| low | 8 h | 72 h |

**Business hours policy.** The SLA clock runs **Monday to Friday, 09:00–18:00, in the
server's local timezone**. Time outside that window (evenings, nights, weekends)
does not count towards a target. Public holidays are not modelled.

- A ticket raised outside business hours starts counting at the next 09:00 on a
  weekday.
- Example: an `urgent` ticket (30-minute response target) raised at **17:50 on
  Friday** has 10 minutes left that day. The remaining 20 minutes are counted from
  Monday 09:00, so the first-response deadline is **Monday 09:20**, not Friday 18:20.
- **Time-to-resolution** is the number of business minutes between the ticket's
  creation and when it was moved to `resolved`. A ticket raised Friday 16:00 and
  resolved Monday 10:00 took 2 h (Friday) + 1 h (Monday) = **3 business hours**,
  not 66 elapsed hours. Reopening a ticket clears `resolvedAt`.
- **Deadlines are computed once, when the ticket is raised,** and stored on the
  ticket (`firstResponseDueAt`, `resolutionDueAt`). Breach checks and the dashboard
  are then a plain `now() > dueAt` comparison in SQL, served by indexes, instead of
  replaying the business calendar for every ticket.
- **First response** is the first public (non-internal) comment by an agent.
  Internal notes and requester comments do not count.
- **Timezone:** the calendar uses the server's timezone, so deployments should pin
  it (for example `TZ=Asia/Kolkata`). In the Docker image it defaults to UTC.
- The logic lives in `backend/src/lib/business-hours.ts` and
  `backend/src/modules/tickets/ticket.sla.ts`.
