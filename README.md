# IIML-VMS — Visitor Management System

Enterprise MVP for **IIM Lucknow** campus visitor management, built from the IIML VMS PRD Enterprise v1.0.

Replaces the paper register with a digital, DPDP-compliant visitor trust layer covering pre-approved invites, walk-in registration, gate operations, blacklist enforcement, and admin compliance tools.

---

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **PostgreSQL database** — the app uses PostgreSQL in all environments. For local development, use [Neon](https://neon.tech) (free tier) or a local PostgreSQL instance. Neon provides both a pooled `DATABASE_URL` and a direct `DIRECT_URL` which Prisma requires.

---

## Quick Start

```bash
# 1. Install dependencies
cd iiml-vms
npm install

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env — fill in DATABASE_URL, DIRECT_URL, and JWT_SECRET

# 3. Push schema and seed demo data
npm run db:migrate --workspace=server   # or: cd server && npx prisma db push
npm run db:seed --workspace=server

# 4. Start dev servers (runs both concurrently)
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:4000

---

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in the values:

```env
# Prisma connection pooler URL (e.g. Neon pooled endpoint)
DATABASE_URL="postgresql://user:pass@host-pooler.region.neon.tech/dbname?sslmode=require"

# Direct non-pooled URL required by Prisma migrations (e.g. Neon direct endpoint)
DIRECT_URL="postgresql://user:pass@host.region.neon.tech/dbname?sslmode=require"

# Secret for signing JWTs — change this in production
JWT_SECRET="change-me-in-production"

PORT=4000
CLIENT_URL="http://localhost:5173"
```

> **Note:** Both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) are required when using Neon or PgBouncer. If you are using a plain local PostgreSQL instance, set both to the same connection string.

---

## Demo Accounts

Login is **email-only — no password required** (MVP auth mode). Enter one of the emails below on the login screen.

| Role | Email | Dashboard |
|------|-------|-----------|
| Security Guard | guard@iiml.ac.in | `/guard` |
| Student Host | host@iiml.ac.in | `/host` |
| Admin Officer | admin@iiml.ac.in | `/admin` |
| Security Head | security@iiml.ac.in | `/security` |
| Leadership | leadership@iiml.ac.in | `/leadership` |
| IT Admin | it@iiml.ac.in | `/admin` |

Additional seeded host accounts: `prof.mehta@iiml.ac.in`, `prof.iyer@iiml.ac.in`

---

## MVP Features (Phase 1)

- **Host Portal** — Create visitor invites with QR passes (≤60 sec flow)
- **Guard Tablet** — QR scan, check-in/out, walk-in registration with DPDP consent
- **Admin Dashboard** — Visitor log, blacklist, compliance export, data subject requests
- **Security Head** — Live occupancy, P0 incident alerts
- **Leadership** — Read-only campus visibility metrics
- **RBAC** — 6 roles with least-privilege access
- **Audit Log** — Append-only action tracking

## Phase 2 Features

- **Bulk CSV Invites** — Upload up to 500 visitors for events (convocation, placement season)
- **Recurring Passes** — Daily worker passes with shift windows (sanitation, maintenance)
- **Multi-day Passes** — Exec-ed participants valid across consecutive days
- **Zone Enforcement** — Gate-level zone validation with P2 incident logging
- **Notifications** — Async host alerts on arrival/departure (in-app bell + simulated SMS)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL (Neon recommended) |
| ORM | Prisma 6 |
| Auth | Email-only demo login (MVP) → IIML Google Workspace SSO (prod) |

---

## Project Structure

```
iiml-vms/
├── api/
│   └── index.js          Vercel serverless entry point (re-exports Express app)
├── client/               React frontend (role-based dashboards)
│   ├── src/
│   │   ├── pages/        One page component per role dashboard
│   │   ├── components/   Shared components (QR scanner, notification bell, RBAC guard)
│   │   └── lib/          API client, auth context
│   └── vite.config.js    Dev proxy: /api → localhost:4000
├── server/               Express API + Prisma
│   ├── prisma/
│   │   ├── schema.prisma Schema definition
│   │   ├── seed.js       Demo data (gates, users, visitors, visits)
│   │   └── migrations/   Migration history
│   └── src/
│       ├── routes/       auth, invites, gate, admin, recurring, notifications
│       ├── controllers/  Business logic per route group
│       ├── middleware/    JWT auth, RBAC (verifySession, requireRole)
│       └── lib/          Prisma client, JWT helpers, audit logger
└── vercel.json           Vercel deployment config
```

---

## API Endpoints

Base URL (local): `http://localhost:4000`

All protected routes require `Authorization: Bearer <token>`.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/api/auth/login` | — | Email-only login; returns JWT |
| `GET` | `/api/auth/demo-users` | — | List demo account emails |
| `GET` | `/api/auth/me` | Any | Current user info |
| `POST` | `/api/invites` | HOST, ADMIN, SECURITY_HEAD | Create visitor invite |
| `POST` | `/api/invites/bulk` | ADMIN, SECURITY_HEAD | Bulk invite (CSV) |
| `GET` | `/api/invites/mine` | HOST, ADMIN, SECURITY_HEAD | My invites |
| `GET` | `/api/invites/:id/qr` | HOST, ADMIN, SECURITY_HEAD | QR code for invite |
| `POST` | `/api/invites/:id/cancel` | HOST, ADMIN, SECURITY_HEAD | Cancel invite |
| `GET` | `/api/gate/lookup/:token` | GUARD, SECURITY_HEAD | QR token lookup |
| `POST` | `/api/gate/check-in` | GUARD, SECURITY_HEAD | Check visitor in |
| `POST` | `/api/gate/check-out` | GUARD, SECURITY_HEAD | Check visitor out |
| `POST` | `/api/gate/walk-in` | GUARD, SECURITY_HEAD | Register walk-in visitor |
| `POST` | `/api/gate/override` | GUARD, SECURITY_HEAD | Manual override with reason |
| `POST` | `/api/gate/emergency` | GUARD, SECURITY_HEAD | Flag P0 emergency |
| `GET` | `/api/gate/activity` | GUARD, SECURITY_HEAD | Recent gate activity |
| `GET` | `/api/gate/recurring/:token` | GUARD, SECURITY_HEAD | Lookup recurring pass |
| `POST` | `/api/gate/recurring/check-in` | GUARD, SECURITY_HEAD | Recurring pass check-in |
| `POST` | `/api/gate/recurring/check-out` | GUARD, SECURITY_HEAD | Recurring pass check-out |
| `GET` | `/api/admin/dashboard` | ADMIN, SECURITY_HEAD, LEADERSHIP | Dashboard stats |
| `GET` | `/api/admin/occupancy` | ADMIN, SECURITY_HEAD, LEADERSHIP | Live occupancy |
| `GET` | `/api/admin/visitors` | ADMIN, SECURITY_HEAD, LEADERSHIP | Full visitor log |
| `GET` | `/api/admin/export` | ADMIN, SECURITY_HEAD | CSV export |
| `GET/POST` | `/api/admin/blacklist` | ADMIN, SECURITY_HEAD | Get/add blacklist |
| `DELETE` | `/api/admin/blacklist/:id` | ADMIN, SECURITY_HEAD | Remove blacklist entry |
| `GET` | `/api/admin/incidents` | ADMIN, SECURITY_HEAD | Incident list |
| `PATCH` | `/api/admin/incidents/:id/resolve` | ADMIN, SECURITY_HEAD | Resolve incident |
| `GET` | `/api/admin/overstay` | ADMIN, SECURITY_HEAD | Overstay alerts |
| `GET/POST` | `/api/admin/dsr` | ADMIN | Data subject requests |
| `POST` | `/api/admin/dsr/:id/complete` | ADMIN | Complete DSR |
| `GET` | `/api/admin/audit` | ADMIN, SECURITY_HEAD, IT_ADMIN | Audit log |
| `GET` | `/api/admin/users` | ADMIN, IT_ADMIN | User list |
| `PATCH` | `/api/admin/users/:id` | IT_ADMIN | Update user role |
| `GET` | `/api/recurring-passes` | ADMIN, SECURITY_HEAD | List recurring passes |
| `POST` | `/api/recurring-passes` | ADMIN, SECURITY_HEAD | Create recurring pass |
| `POST` | `/api/recurring-passes/:id/revoke` | ADMIN, SECURITY_HEAD | Revoke recurring pass |
| `GET` | `/api/notifications` | Any | My notifications |

---

## Deployment (Vercel)

The repo is pre-configured for Vercel deployment. The Express server runs as a single serverless function at `/api/*` via `api/index.js`.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set the following environment variables in your Vercel project dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct (non-pooled) connection string |
| `JWT_SECRET` | Strong random secret |
| `CLIENT_URL` | Your Vercel deployment URL |

The build command in `vercel.json` runs `prisma generate`, `prisma db push`, and the seed script automatically on each deploy.

---

## Roadmap

- **Phase 1 (MVP)** — Digital foundation, guard app, invite flows ✅
- **Phase 2** — Recurring passes, bulk invites, zone control, notifications ✅
- **Phase 3** — ERP integration, vehicle recognition, predictive analytics

---

## Compliance

Built with DPDP Act 2023 requirements: data minimization (ID last 4 digits only), biometric consent capture, 48h deletion SLA, append-only audit logs, 5-year retention.
