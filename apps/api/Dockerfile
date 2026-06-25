# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- deps: install the whole workspace (api needs @easygo/shared) ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

# --- build: prisma generate + tsc (shared is consumed as TS source via tsx) ---
FROM deps AS build
COPY . .
RUN pnpm --filter @easygo/api db:generate

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3000
# Run with tsx (shared package is TS source). Apply migrations then start.
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
