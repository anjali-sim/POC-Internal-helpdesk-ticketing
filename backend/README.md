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

| Script                  | Description                              |
| ------------------------ | ----------------------------------------- |
| `npm run dev`             | Start dev server with hot reload (`tsx`)  |
| `npm run build`           | Type-check and compile to `dist/`         |
| `npm start`                | Run the compiled build                    |
| `npm run typecheck`       | Type-check without emitting                |
| `npm run lint`             | Lint with ESLint                          |
| `npm test`                 | Run tests with Vitest                     |
| `npm run format`           | Format with Prettier                      |
| `npm run prisma:migrate`  | Run Prisma migrations                     |
| `npm run prisma:generate` | Generate the Prisma client                |
| `npm run prisma:seed`     | Seed the database                         |
