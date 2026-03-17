# NeoEngine Dashboard

React-based web dashboard for NeoManager — Owners, Admins, and Super Admins.

## Prerequisites

- Node.js 18+
- NeoManager Backend running (default: `http://localhost:3000`)

## Setup

```bash
# Install dependencies
npm install

# Copy env example
cp .env.example .env

# Start dev server (with Vite proxy to backend)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `/api` (uses Vite proxy in dev) |

For production, set `VITE_API_BASE_URL=https://neoengine-be.neuoptic.in/api` (or your backend URL).

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run preview` — Preview production build

## Project Structure

- `src/api/` — API client, auth
- `src/components/` — Reusable UI
- `src/layouts/` — App layout, sidebar
- `src/pages/` — Route pages
- `src/hooks/` — Custom hooks
- `src/types/` — TypeScript types

## Documentation

- [PRD.md](./PRD.md) — Product requirements
- [TASK_LIST.md](./TASK_LIST.md) — Checkpoint-based implementation tasks

## Login

- **Owner:** Email + password → `/api/owner/login`
- **Super Admin:** Email + password → `/api/admin/login`

First-time owner login redirects to set-password.
