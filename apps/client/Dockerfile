# Build from the repo ROOT:  docker build -f apps/client/Dockerfile .
# The client SPA imports @easygo/{api-client,shared,ui-tokens} as TS source,
# so the build needs the whole pnpm workspace as context (like apps/api).
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# --- deps: install only the workspace packages the client app needs ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/client/package.json apps/client/
RUN pnpm install --frozen-lockfile=false

# --- build: Vite static build with the production API URL + map key baked in ---
# Both VITE_* values are statically inlined by Vite at build time, so they MUST
# be passed as build args (they cannot be set at container runtime).
FROM deps AS build
ARG VITE_API_URL
ARG VITE_2GIS_KEY
ARG VITE_TELEGRAM_BOT_USERNAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_2GIS_KEY=$VITE_2GIS_KEY
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
COPY . .
RUN pnpm --filter @easygo/client build

# --- runtime: static files served by nginx ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
