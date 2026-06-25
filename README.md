# EasyGo

Intercity passenger-transfer booking platform (Бишкек · Алматы · Иссык-Куль).
Customers book seats on scheduled minivan trips; operators manage bookings,
flights, routes and the fleet from a CRM. Bookings are confirmed over WhatsApp.

This repo implements the system described in `EasyGo website design/EasyGo
Architecture.dc.html` (open it in a browser for the full diagram).

## Stack

| Layer     | Tech                                                        |
|-----------|-------------------------------------------------------------|
| Client    | Ionic Vue + Capacitor (iOS / Android / PWA), Pinia, Router  |
| Admin     | Vue 3 + Vite SPA                                             |
| API       | Fastify + TypeScript — modular monolith, zod-validated      |
| Data      | PostgreSQL + Prisma · Redis + BullMQ · MinIO (S3)           |
| External  | WhatsApp (wa.me) · 2GIS maps                                |
| Infra     | Docker Compose · nginx                                       |

## Monorepo layout (pnpm workspaces)

```
apps/
  client/      Ionic Vue + Capacitor mobile app
  admin/       Vue 3 dashboard
  api/         Fastify modular monolith (auth, bookings, flights, routes, fleet…)
packages/
  shared/      zod schemas · DTOs · enums   (the cross-app contract)
  api-client/  typed HTTP client over shared DTOs
  ui-tokens/   colors · typography
  ui-kit/      reusable Vue components
infra/nginx/   reverse proxy config
```

## Architecture principles

- **Idempotency** — every mutation accepts an `Idempotency-Key`; a repeat returns
  the stored response. Status transitions are explicit actions, no-op on repeat.
- **Simple queries** — no heavy joins; counters are denormalized, analytics come
  from precomputed `DailyStat` rows.
- **Clean layers** per module: `routes` → `service` → `repository` → `domain`,
  dependencies pointing inward only.
- **Money is integer minor units**; the currency is one global `SystemConfig`
  value (default KGS / сом) applied everywhere.

## Getting started

Prereqs: Node ≥ 18.18, Docker. Enable pnpm once via Corepack:

```bash
corepack enable && corepack prepare pnpm@9.12.0 --activate
cp .env.example .env
pnpm install
pnpm infra:up           # postgres + redis + minio
pnpm db:migrate         # apply Prisma schema
pnpm db:seed            # demo routes, flights, fleet, users
pnpm dev                # run api + admin + client in parallel
```

| Service        | URL                          |
|----------------|------------------------------|
| API            | http://localhost:3000        |
| API health     | http://localhost:3000/health |
| Admin CRM      | http://localhost:5173        |
| Client (PWA)   | http://localhost:8100        |
| MinIO console  | http://localhost:9001        |

See `apps/api/README.md` for the module/endpoint map.
