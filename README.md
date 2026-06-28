# IIML-VMS — Visitor Management System

Enterprise MVP for **IIM Lucknow** campus visitor management, built from the IIML VMS PRD Enterprise v1.0.

Replaces the paper register with a digital, DPDP-compliant visitor trust layer covering pre-approved invites, walk-in registration, gate operations, blacklist enforcement, and admin compliance tools.

## Quick Start

```bash
cd iiml-vms
npm install
npm run db:migrate --workspace=server
npm run db:seed --workspace=server
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:4000

## Demo Accounts

| Role | Email | Dashboard |
|------|-------|-----------|
| Security Guard | guard@iiml.ac.in | `/guard` |
| Student Host | host@iiml.ac.in | `/host` |
| Admin Officer | admin@iiml.ac.in | `/admin` |
| Security Head | security@iiml.ac.in | `/security` |
| Leadership | leadership@iiml.ac.in | `/leadership` |
| IT Admin | it@iiml.ac.in | `/admin` |

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

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 |
| Backend | Node.js + Express 5 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma 6 |
| Auth | Demo login (MVP) → IIML Google Workspace SSO (prod) |

## Project Structure

```
iiml-vms/
├── client/          React frontend (role-based dashboards)
├── server/          Express API + Prisma
│   ├── prisma/      Schema, migrations, seed
│   └── src/         Routes, controllers, middleware
└── package.json     npm workspaces root
```

## Roadmap

- **Phase 1 (MVP)** — Digital foundation, guard app, invite flows ✅
- **Phase 2** — Recurring passes, bulk invites, zone control, notifications ✅
- **Phase 3** — ERP integration, vehicle recognition, predictive analytics

## Compliance

Built with DPDP Act 2023 requirements: data minimization (ID last 4 digits only), biometric consent capture, 48h deletion SLA, append-only audit logs, 5-year retention.
