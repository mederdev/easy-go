# EasyGo — Production Deployment

Single-VPS, fully containerized stack (incl. nginx) with automated GitHub
Actions deploys and automatic Prisma migrations.

## Topology

| Host | Serves |
|------|--------|
| `easygo-transfer.com` (+ `www`) | client SPA (`apps/client`) |
| `admin.easygo-transfer.com` | admin SPA (`apps/admin`) |
| `api.easygo-transfer.com` | Fastify API (`apps/api`) |
| `storage.easygo-transfer.com` | MinIO (presigned file upload/download) |

All HTTP/S enters through one **edge nginx** container that terminates TLS
(Let's Encrypt via the **certbot** container) and routes by `server_name`. The
SPAs are tiny static-nginx images; the API is a single replica (its BullMQ
stats worker runs in-process — **do not scale `api`**).

Build → ship → run: GitHub Actions builds the three images, pushes them to
**GHCR**, then SSHes to the server to `pull` + run migrations + `up -d`.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | the production stack |
| `infra/nginx/edge.conf` | edge TLS + subdomain routing |
| `apps/{api,admin,client}/Dockerfile` | image builds (admin/client served by nginx) |
| `apps/{admin,client}/nginx.conf` | per-SPA static serving + history fallback |
| `.env.prod.example` | env template → copy to `.env.prod` on the server |
| `scripts/init-letsencrypt.sh` | one-time TLS bootstrap |
| `.github/workflows/deploy.yml` | CI build/push + SSH deploy |

> Build args `VITE_API_URL` / `VITE_2GIS_KEY` are **baked into the SPA bundles
> at build time** — they are configured in the workflow, not at runtime.

---

## 1. DNS

Point all five names at the VPS (A, and AAAA if you have IPv6):

```
easygo-transfer.com
www.easygo-transfer.com
admin.easygo-transfer.com
api.easygo-transfer.com
storage.easygo-transfer.com
```

Wait for propagation before issuing certificates.

## 2. Server bootstrap (one-time, empty VPS)

```bash
# Docker Engine + Compose v2 plugin (Debian/Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

# A non-root deploy user in the docker group
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy

# CI's public key → the deploy user.
# First generate a DEDICATED deploy keypair on your own machine (not the server):
#     ssh-keygen -t ed25519 -C "easygo-ci-deploy" -f ./easygo_deploy -N ""
#   • easygo_deploy      (PRIVATE) → GitHub secret DEPLOY_SSH_KEY (full file incl. BEGIN/END)
#   • easygo_deploy.pub  (PUBLIC)  → paste below in place of <CI_PUBLIC_KEY>
# Then delete the local files (rm easygo_deploy*). `cat easygo_deploy.pub` prints the value.
sudo -u deploy mkdir -p /home/deploy/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG7CQzlTKalBYREs8SYCRvc7oTCq5cLHrbdzbpEMCFFD easygo-ci-deploy" | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 700 /home/deploy/.ssh
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys

# Firewall: only SSH + web. Do NOT expose DB/Redis/MinIO/console.
sudo ufw allow 22,80,443/tcp && sudo ufw enable

# Deploy directory (owned by deploy)
sudo mkdir -p /opt/easygo && sudo chown deploy:deploy /opt/easygo
```

Only four things need to live on the server — no full repo checkout:

```
/opt/easygo/
├── docker-compose.prod.yml
├── infra/nginx/edge.conf
├── scripts/init-letsencrypt.sh
└── .env.prod            # created from .env.prod.example, chmod 600
```

Copy them from your local clone (run from the repo root; relative paths must be
preserved so the compose `./infra/nginx/edge.conf` mount and the script resolve):

```bash
ssh deploy@77.42.30.6 'mkdir -p /opt/easygo/infra/nginx /opt/easygo/scripts'
scp docker-compose.prod.yml      deploy@77.42.30.6:/opt/easygo/
scp .env.prod.example            deploy@77.42.30.6:/opt/easygo/
scp infra/nginx/edge.conf        deploy@77.42.30.6:/opt/easygo/infra/nginx/
scp scripts/init-letsencrypt.sh  deploy@77.42.30.6:/opt/easygo/scripts/
ssh deploy@77.42.30.6 'chmod +x /opt/easygo/scripts/init-letsencrypt.sh'
```

Then on the server create the real env file from the template:

```bash
cd /opt/easygo
cp .env.prod.example .env.prod
chmod 600 .env.prod
$EDITOR .env.prod          # fill in real values
```

`.env.prod` is the **single source of truth** for every secret — postgres,
minio and the api/migrate containers all read it (via `env_file`), so it must be
**complete** (the prod stack has no built-in fallback defaults). Make sure:
- `GHCR_OWNER` is the **lowercase** GitHub owner of the images.
- `JWT_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` are strong secrets.
- `DATABASE_URL` password matches `POSTGRES_PASSWORD`.
- `POSTGRES_USER/DB`, `MINIO_ROOT_USER`, `MINIO_BUCKET` and the public-MinIO vars
  (`MINIO_PUBLIC_ENDPOINT=storage.easygo-transfer.com`, `MINIO_PUBLIC_PORT=443`,
  `MINIO_PUBLIC_USE_SSL=true`) are present — copying from the example covers all.

## 3. First bring-up + TLS

> **Images must already be in GHCR before this step** — the script runs
> `compose pull`. Seed them by pushing to `main` first: CI builds & pushes the
> three images. With the `ENABLE_DEPLOY` variable unset (see §4) the deploy job
> is skipped, so the push only builds — it won't touch the server before TLS
> exists. Wait for the **Deploy** run's `build-push` job to go green.

Log in to GHCR once so the server can pull private images (paste the token via
`read -rs`, never into a file):

```bash
read -rs GHCR_TOKEN
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
unset GHCR_TOKEN
```

Issue certificates and start everything (use staging first to avoid Let's
Encrypt rate limits while you confirm DNS/ports, then re-run for real):

```bash
cd /opt/easygo
STAGING=1 LETSENCRYPT_EMAIL=shamed.develop@gmail.com ./scripts/init-letsencrypt.sh   # dry run
LETSENCRYPT_EMAIL=shamed.develop@gmail.com ./scripts/init-letsencrypt.sh             # real cert
```

The script plants a throwaway self-signed cert so nginx can boot, applies
migrations, starts the stack, then swaps in the real Let's Encrypt cert and
reloads nginx. Renewal is automatic (certbot loop + 6-hourly nginx reload).

## 4. GitHub repository secrets

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | server IP / hostname |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | **private** key whose public half is in the deploy user's `authorized_keys` |
| `GHCR_USER` | GitHub username that owns the `GHCR_TOKEN` |
| `GHCR_TOKEN` | PAT with `read:packages` (used on the server to pull) |
| `VITE_2GIS_KEY` | 2GIS map key baked into the client build |

> Tip: to skip `GHCR_USER`/`GHCR_TOKEN` and the server-side `docker login`
> entirely, set the three GHCR packages to **public** after the first push.

Also add a repository **variable** (not secret) — Settings → Secrets and
variables → Actions → **Variables**:

| Variable | Value |
|----------|-------|
| `ENABLE_DEPLOY` | `true` — turns on the auto-deploy job |

Leave it **unset** during initial setup so pushes only build & push images
(deploy is skipped). Set it to `true` once the server is bootstrapped, secrets
are in place, and TLS has been issued (§3) — from then on every push to `main`
auto-deploys.

## 5. Ongoing deploys

Push to `main` (or run the **Deploy** workflow manually). CI builds & pushes
`:<sha>` + `:latest` images, then on the server runs:

```
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm migrate
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

`prisma migrate deploy` is idempotent and applies only pending migrations; if
it fails the deploy aborts and the running API is left untouched.

**Rollback:** set `TAG=<previous-sha>` in `.env.prod` (or export it) and re-run
the last three commands — images are retained per commit SHA in GHCR.

## Notes / gotchas

- **Env model** — compose has two independent mechanisms:
  - `env_file: .env.prod` injects variables **into a container** (postgres,
    minio, createbuckets, api, migrate all use it) — this is how every secret is
    delivered, from one file.
  - `${VAR}` **interpolation** in the YAML is resolved from `--env-file` / the
    shell, **not** from `env_file:`. The prod stack only relies on it for the
    non-secret image coordinates `GHCR_OWNER` / `TAG`.

  That's why every command passes `--env-file .env.prod`: it feeds `GHCR_OWNER`
  and `TAG` (the secrets come through `env_file` regardless). `TAG` defaults to
  `latest`; CI overrides it with the commit SHA.
- **CORS**: `CORS_ORIGINS` must list the exact https origins (credentials are
  sent → no `*`).
- **MinIO split**: the API talks to MinIO internally (`MINIO_ENDPOINT=minio`)
  but signs presigned URLs for the public host (`MINIO_PUBLIC_ENDPOINT=
  storage.easygo-transfer.com`), which the edge proxies preserving `Host`.
- **Never** run `pnpm db:seed` in production (it wipes all tables).
- The dev `docker-compose.yml` / `infra/nginx/nginx.conf` are unchanged and
  remain for local use.
