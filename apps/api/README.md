# @easygo/api

Fastify + TypeScript modular monolith. Each module under `src/modules/<name>`
is `routes.ts` (HTTP + zod validation) → `service.ts` (business logic) → Prisma
(repository). Cross-cutting concerns live in `src/plugins` and `src/lib`.

## Endpoints

Public (no auth) — used by the client app:

| Method | Path                       | Purpose                              |
|--------|----------------------------|--------------------------------------|
| GET    | `/health`                  | Liveness                             |
| GET    | `/config`                  | Currency, company name, WhatsApp     |
| GET    | `/routes/public`           | Active routes (popular routes)       |
| GET    | `/flights/search`          | Bookable flights for route + day     |
| GET    | `/flights/:id`             | Flight detail                        |
| POST   | `/bookings`                | Submit a booking (Idempotency-Key)   |
| GET    | `/fleet/available`         | Available cars ("free transport")    |
| POST   | `/applications/drivers`    | Driver application                   |
| POST   | `/applications/partners`   | Partner application                  |

Authenticated (JWT) — admin CRM. Roles: `operator` < `admin` < `owner`.

- `POST /auth/login`, `GET /auth/me`
- `GET/POST/PATCH/DELETE /routes`
- `GET/POST/PATCH /flights`
- `GET /bookings`, `POST /bookings/admin`, `PATCH /bookings/:id/status`
- `GET/POST/PATCH /clients`
- `GET/POST/PATCH /drivers`
- `GET/POST/PATCH /fleet`, `PATCH /fleet/:id/location`
- `GET /applications/{drivers,partners}`, `PATCH .../:id/status`
- `GET /analytics/dashboard`, `GET /analytics/series`
- `POST /files/presign`, `GET /files`
- `PATCH /config` (admin/owner)

## Conventions

- **Money**: integer minor units everywhere (`price`, `total`, `revenue`).
- **Idempotency**: opt a route in with `config: { idempotent: true }`; send an
  `Idempotency-Key` header. Replays return the stored response.
- **Validation**: `parse(Schema, data)` (from `@easygo/shared`) → 422 on failure.
- **Errors**: throw `AppError` / `Errors.*`; the error-handler plugin maps them.
- **Analytics**: `DailyStat` rows are recomputed off-request by the BullMQ
  `stats` worker (runs in-process; see `lib/stats-worker.ts`).

## Dev

```bash
pnpm db:generate     # prisma client
pnpm db:migrate      # create/apply migration
pnpm db:seed         # demo data (login +996700000001 / easygo123)
pnpm dev             # tsx watch
```
