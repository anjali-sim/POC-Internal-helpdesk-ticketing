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
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```
