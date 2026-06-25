# EasyGo Client App

Ionic Vue 8 + Capacitor 6 mobile app (iOS / Android / PWA) for the EasyGo intercity transfer platform. Runs as a web app at port 8100 and can be deployed to native platforms via Capacitor.

**Start dev server:** `pnpm dev` — launches Vite at http://localhost:8100. The app connects to the API via `VITE_API_URL` (default: `http://localhost:3000`). Set `VITE_2GIS_KEY` for 2GIS map integration on the Contacts page.

**Add native platforms:** after `pnpm build`, run `npx cap add ios` or `npx cap add android`, then `npx cap sync` and open the native IDE with `npx cap open ios` / `npx cap open android`. The Capacitor config is in `capacitor.config.ts` (appId: `kg.easygo.app`).
