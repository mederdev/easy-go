# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

**EasyGo** is an intercity passenger-transfer booking platform (Бишкек / Алматы /
Иссык-Куль, KIA Carnival minivans, bookings confirmed over WhatsApp). All UI copy
is in **Russian** — keep it that way.

The repo is a **pnpm monorepo** implementing the system, plus the original design
mocks it was built from. See `README.md` for setup and `apps/api/README.md` for
the endpoint map.

```
apps/api/        Fastify + TS modular monolith (Prisma/Postgres, Redis/BullMQ, MinIO)  ← built & verified
apps/admin/      Vue 3 + Vite CRM dashboard                                            ← in progress
apps/client/     Ionic Vue + Capacitor mobile app (iOS/Android/PWA)                    ← in progress
packages/shared/ zod schemas · DTOs · enums · money helpers — the cross-app contract
packages/{api-client,ui-tokens,ui-kit}/   typed client, design tokens, shared components
infra/nginx/     reverse proxy
EasyGo website design/   the source DESIGN MOCKS (DC-runtime HTML — see below)
EasyGo Architecture.dc.html (in the design project) — the spec the build follows
```

**Architecture invariants (don't violate):**
- Money is **integer minor units** everywhere; currency is one global `SystemConfig`
  value (default KGS). Format only at the UI edge via `@easygo/shared` money helpers.
- All mutations are **idempotent** via an `Idempotency-Key` header (API plugin +
  `config: { idempotent: true }` on the route). Status changes are explicit actions.
- API modules follow `routes.ts` (HTTP + zod) → `service.ts` (logic) → Prisma.
  Validate with `parse(Schema, data)`; throw `AppError`/`Errors.*`.
- Counters (`tripsCount`, `seatsTaken`, `tripsMonth`…) are **denormalized**;
  analytics come from precomputed `DailyStat` rows recomputed by the BullMQ worker.
- BullMQ needs a **separate Redis connection per role** (see `lib/queue.ts` —
  `makeRedis()`); never share one ioredis instance between Queue and Worker.

## Running

See `README.md`. Quick path: `corepack enable` → `cp .env.example .env` →
`pnpm install` → `pnpm infra:up` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`.
Seeded owner login: `+996700000001` / `easygo123`.

Note: this is a busy multi-project Docker host — 5432/6379/3000 are often taken by
other stacks. If `pnpm infra:up` hits port conflicts, remap host ports locally.

## The design mocks (`EasyGo website design/`)

The customer + admin screens were prototyped as self-contained **DC-runtime** HTML
files; treat them as the **visual source of truth** for the Vue apps. Open a
`.dc.html` in a browser (it self-boots, loading React + fonts from CDN — needs
internet). Design tokens to match: brand green `#56A919` (accent `#3E7C12`, light
`#EEF6E6`), near-black `#16181C`; font **Manrope**; **Material Symbols Outlined**
icons. These tokens are mirrored in `packages/ui-tokens`.

## The DC runtime mental model (read before editing any `.dc.html`)

`support.js` is a single-file React-based template engine. **It is generated** —
its header says `GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with
`cd dc-runtime && bun run build``. That `dc-runtime` source project is **not in
this repo**. Do not hand-edit `support.js`; treat it as a vendored dependency.

Each `.dc.html` has exactly two meaningful parts:

1. A `<x-dc>…</x-dc>` **template** — plain HTML with these special directives:
   - `{{ expr }}` — interpolation, resolved against the object returned by
     `renderVals()`. Works in text and in any attribute (incl. `style` and
     `onClick="{{ handler }}"`, which binds a function).
   - `<sc-if value="{{ flag }}">…</sc-if>` — conditional block.
   - `<sc-for list="{{ arr }}" as="item">…</sc-for>` — loop; reference fields as
     `{{ item.field }}` inside.
   - `<helmet>…</helmet>` — content hoisted into `<head>` (fonts, base CSS).
   - `<x-import from="…" name="…"/>` — load an external component (JSX or JS
     module). The `from` URL must be a literal (no `{{ }}`).
   - `hint-placeholder-val` / `hint-placeholder-count` — streaming-render hints
     only; they don't affect runtime behavior.

2. A `<script type="text/x-dc" data-dc-script>` defining `class Component extends
   DCLogic`. The contract:
   - `state = { … }` holds UI state; mutate only via `this.setState(...)`.
   - `renderVals()` **must return one flat object** containing every name the
     template references — values, derived strings, **and event handlers as
     functions** (e.g. `goHome:()=>this.nav('home')`). This is the single bridge
     between logic and template; if a `{{ name }}` renders blank, it's missing
     from `renderVals()`'s return.
   - There is **no routing**. Screen switching is a state field (`screen` in the
     Client, `section` in the Admin) toggled by `setState`, with `<sc-if>`
     selecting which view renders. "Navigation" = `this.nav('booking')`.
   - Data shown in mocks is **hardcoded** inside `renderVals()` (trips, bookings,
     fleet, clients are literal arrays) — there is no backend or API layer.

## Project conventions

- **Styling is 100% inline** `style="…"` strings — no CSS classes or stylesheets
  beyond the runtime's. Repeated/stateful styles are produced by small helper
  methods on the Component that return CSS strings (e.g. `navBtn(active)`,
  `tab(active)`, `seg(active)`, `chip(active)`, `st(statusName)` for status-color
  pairs), then exposed through `renderVals()` as `…Style` keys.
- **Design tokens**: brand green `#56A919` (accent `#3E7C12`, light bg `#EEF6E6`),
  near-black `#16181C`, page bg `#E7E9E3`. Font **Manrope**; icons via the
  **Material Symbols Outlined** font (icon name as element text).
- Each file is a **complete multi-screen app in one document**. When adding a
  screen: add a `<sc-if>` block in the template, add the boolean + any handlers
  to `renderVals()`, and wire a nav entry (sidebar rail + bottom tab in Client).
- Keep the two mocks visually consistent — they share the same palette, fonts,
  helper-style patterns, and Russian copy.

## Editor-bridge code (ignore unless relevant)

`support.js` exposes `window.__dc*` APIs and `postMessage` handlers so these
files can be driven by an external DC visual editor host (iframe streaming,
template-source round-tripping). This is infrastructure for that host — not part
of the EasyGo prototype's own logic.
