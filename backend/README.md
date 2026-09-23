# Helpdesk API

Express + TypeScript backend with Prisma/PostgreSQL and JWT auth.

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npm run prisma:generate
npm run dev             # http://localhost:4000
```

## Scripts

| Script                    | Description                              |
| ------------------------- | ---------------------------------------- |
| `npm run dev`             | Start dev server with hot reload (`tsx`) |
| `npm run build`           | Type-check and compile to `dist/`        |
| `npm start`               | Run the compiled build                   |
| `npm run typecheck`       | Type-check without emitting              |
| `npm run typecheck:test`  | Type-check the test files too            |
| `npm run lint`            | Lint with ESLint                         |
| `npm test`                | Run tests with Vitest                    |
| `npm run test:watch`      | Run tests in watch mode                  |
| `npm run test:coverage`   | Run tests with a coverage report         |
| `npm run format`          | Format with Prettier                     |
| `npm run prisma:migrate`  | Run Prisma migrations                    |
| `npm run prisma:generate` | Generate the Prisma client               |
| `npm run prisma:seed`     | Seed the database                        |

## Tests

```bash
npm test              # 251 tests, ~6s, no database required
npm run test:coverage
```

Vitest, configured in `vitest.config.mts`. Everything test-related lives under
`src/test/`, which mirrors the layout of `src/`: a test for `src/modules/tickets/
ticket.sla.ts` is at `src/test/modules/tickets/ticket.sla.test.ts`. Shared
helpers (`setup.ts`, `prisma-mock.ts`, `factories.ts`) sit at the root of that
folder.

**No database is needed.** `src/test/prisma-mock.ts` replaces `lib/prisma` with
per-model `vi.fn()`s that each test arms with the rows it wants back, so the
suite runs on a clean checkout with no Postgres, no migrations and no seed. What
is under test is the HTTP surface — routing, auth, role guards, validation, the
state machine, SLA maths and DTO shaping — not Postgres itself. Each API test
drives the real Express app through supertest with a genuinely signed JWT cookie,
so the auth middleware runs for real.

Two consequences worth knowing:

- Query _arguments_ are asserted (`where`, `select`, `skip`/`take`) rather than
  query results, since nothing executes SQL. The raw-SQL dashboard aggregates and
  the round-robin `$queryRaw` are therefore only checked for shape.
- `tsconfig.json` excludes `src/test` so tests never reach `dist/`; `npm run
typecheck:test` type-checks them separately, because Vitest transpiles without
  checking types.

| Area                            | File (under `src/test/`)                       |
| ------------------------------- | ---------------------------------------------- |
| Business-hours calendar         | `lib/business-hours.test.ts`                   |
| JWT signing/verification        | `lib/jwt.test.ts`                              |
| Password hashing                | `lib/password.test.ts`                         |
| Error classes                   | `lib/errors.test.ts`                           |
| Auth & role middleware          | `middleware/auth.test.ts`                      |
| Request validation              | `middleware/validate.test.ts`                  |
| Error responses                 | `middleware/errorHandler.test.ts`              |
| `/api/auth/*` + `/health`       | `modules/auth/auth.routes.test.ts`             |
| `/api/users/agents`             | `modules/users/user.routes.test.ts`            |
| `/api/tickets/*`                | `modules/tickets/ticket.routes.test.ts`        |
| Transition table & enum mapping | `modules/tickets/ticket.state-machine.test.ts` |
| SLA targets & due dates         | `modules/tickets/ticket.sla.test.ts`           |
| DTO mapping                     | `modules/tickets/ticket.mapper.test.ts`        |
| Round-robin & system user       | `modules/tickets/ticket.auto-assign.test.ts`   |
