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

Customer auth (`/client-auth`) + self-service (`/me`, client JWT):

| Method | Path                          | Purpose                                    |
|--------|-------------------------------|--------------------------------------------|
| POST   | `/client-auth/register`       | Register: phone + name + password          |
| POST   | `/client-auth/login`          | Login: phone + password                    |
| POST   | `/client-auth/telegram/start` | Telegram deep-link nonce (body = register) |
| POST   | `/client-auth/telegram/poll`  | Poll nonce → JWT / `not_registered`        |
| GET/PATCH | `/me`                      | Profile (name, whatsapp)                   |
| PATCH  | `/me/password`                | Set/change own password (hash-only)        |
| GET    | `/me/bookings`, `/me/custom-requests` | Own bookings / requests            |

Authenticated (JWT) — admin CRM. Roles: `operator` < `admin` < `owner`.

- `POST /auth/login`, `GET /auth/me`, `POST /auth/telegram/{start,poll}`,
  `POST /auth/telegram/link/{start,poll}`, `DELETE /auth/telegram/link`
- `GET/POST/PATCH/DELETE /routes`
- `GET/POST/PATCH /flights`
- `GET /bookings`, `POST /bookings/admin`, `PATCH /bookings/:id/status`
- `GET/POST/PATCH /clients`, `POST /clients/:id/set-password`,
  `DELETE /clients/:id` — 409 while the client has bookings (admin/owner)
- `GET/POST/PATCH /drivers`, `POST /drivers/:id/set-password`,
  `DELETE /drivers/:id` — 409 while the driver has flights (admin/owner)
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

## Testing

Integration tests (Vitest) run the **real Fastify app** via `app.inject()` — every
request goes through the actual plugins, services and Prisma. They cover all
business flows across the three roles (customer / back-office / driver): auth,
routes, flights, bookings + the seat/money state machine, driver flights, CRM,
applications, analytics, and end-to-end consistency invariants.

They run against an **isolated database `easygo_test`** and the local Redis —
never the dev `easygo` DB (a guard in `test/helpers/setup.ts` refuses to run if
`DATABASE_URL` doesn't point at the test DB). Each test starts from a truncated
database, and all files share one process (serialized), so a run needs Postgres +
Redis up but leaves your dev data untouched.

### One-time setup

Postgres + Redis must be running (see the repo `README.md` — this project uses
high host ports: Postgres `55432`, Redis `56379`). Create the test DB and apply
migrations to it:

```bash
# create the database (once)
psql "postgresql://easygo:easygo@localhost:55432/postgres" -c "CREATE DATABASE easygo_test;"

# apply migrations to it
pnpm --filter @easygo/api test:setup
```

The test DB connection is configured in `apps/api/vitest.config.ts` (`test.env`).
If your local Postgres/Redis ports differ, adjust `DATABASE_URL` / `REDIS_URL`
there and in the `test:setup` script.

### Running

```bash
pnpm --filter @easygo/api test              # whole suite (vitest run)
pnpm --filter @easygo/api test:watch        # watch mode
pnpm --filter @easygo/api exec vitest run test/bookings-status.test.ts   # one file
```

### Layout

- `test/*.test.ts` — one file per domain (e.g. `bookings-core`, `bookings-status`,
  `driver-flights`, `consistency`).
- `test/helpers/` — the harness: `app.ts` (app singleton + JWT token helpers for
  each role), `factories.ts` (fixture builders: `makeUser`/`makeClientRow`/
  `makeDriver`/`makeRoute`/`makeFlight`/…), `db.ts` (truncate/reset), `setup.ts`
  (per-test DB reset + test-DB guard).

Note: denormalized counters (`seatsTaken`, `tripsCount`, `totalSum`) are asserted
by reading Prisma directly — a booking's HTTP response snapshots those fields
before the counter updates within the same transaction.
