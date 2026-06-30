# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS base
# Enable + cache pnpm in the image so the runtime never needs to fetch it.
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# --- deps: install the whole workspace (api needs @easygo/shared) ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

# --- build: prisma generate (shared is consumed as TS source via tsx) ---
FROM deps AS build
COPY . .
RUN pnpm --filter @easygo/api db:generate

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3000
# Liveness probe used by compose / the edge to gate startup.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1 || exit 1
# Migrations are applied by the dedicated one-shot `migrate` service
# (docker-compose.prod.yml) — the API just starts here.
CMD ["pnpm", "start"]
