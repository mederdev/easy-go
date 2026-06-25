# @easygo/admin

Admin CRM dashboard for the EasyGo intercity transfer platform — a Vue 3 + Vite +
TypeScript desktop SPA (Pinia + Vue Router 4) where operators manage bookings,
flights, routes, the fleet, clients, analytics, partnership applications, and
system settings. All UI copy is in Russian and the visual language follows the
`EasyGo Admin.dc.html` mock (Manrope, Material Symbols, brand green `#56A919`).
Run it with `pnpm dev` — it serves on **http://localhost:5173** and proxies
`/api` → `http://localhost:3000` (the `@easygo/api` server). Build with
`pnpm build`, typecheck with `pnpm typecheck`. Seeded operator login:
`+996700000001` / `easygo123`.
