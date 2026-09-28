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
