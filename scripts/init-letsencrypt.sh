#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# One-time TLS bootstrap for the EasyGo edge nginx (Let's Encrypt, webroot).
#
# Run ONCE on the server from /opt/easygo, AFTER:
#   • DNS A-records for all five hostnames resolve to this server
#   • `.env.prod` exists with real values
#   • `docker login ghcr.io` has been done (so images can be pulled)
#
# Usage:
#   LETSENCRYPT_EMAIL=you@example.com ./scripts/init-letsencrypt.sh
#   STAGING=1 LETSENCRYPT_EMAIL=you@example.com ./scripts/init-letsencrypt.sh   # test first
#
# It solves the chicken-and-egg (nginx won't start without a cert, certbot
# needs nginx on :80) by planting a throwaway self-signed cert, starting the
# stack, then swapping in the real Let's Encrypt cert and reloading nginx.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose --env-file .env.prod -f docker-compose.prod.yml"
PRIMARY="easygo-transfer.com"
DOMAINS=(easygo-transfer.com www.easygo-transfer.com admin.easygo-transfer.com api.easygo-transfer.com storage.easygo-transfer.com)
EMAIL="${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL=you@example.com}"
STAGING="${STAGING:-0}"
export TAG="${TAG:-latest}"

live="/etc/letsencrypt/live/${PRIMARY}"

echo "### 1/6 Pulling images ..."
$COMPOSE pull

echo "### 2/6 Planting a throwaway self-signed cert so nginx can start ..."
$COMPOSE run --rm --entrypoint sh certbot -c "\
  mkdir -p '${live}' && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '${live}/privkey.pem' -out '${live}/fullchain.pem' \
    -subj '/CN=${PRIMARY}'"

echo "### 3/6 Applying database migrations ..."
$COMPOSE run --rm migrate

echo "### 4/6 Starting the stack (edge serves :80 for the ACME challenge) ..."
$COMPOSE up -d

echo "### 5/6 Requesting the real certificate ..."
$COMPOSE run --rm --entrypoint sh certbot -c "\
  rm -rf '/etc/letsencrypt/live/${PRIMARY}' \
         '/etc/letsencrypt/archive/${PRIMARY}' \
         '/etc/letsencrypt/renewal/${PRIMARY}.conf'"

domain_args=""
for d in "${DOMAINS[@]}"; do domain_args="$domain_args -d $d"; done
staging_arg=""; [ "$STAGING" != "0" ] && staging_arg="--staging"

# shellcheck disable=SC2086
$COMPOSE run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
  $staging_arg $domain_args \
  --email "${EMAIL}" --agree-tos --no-eff-email --non-interactive --force-renewal

echo "### 6/6 Reloading nginx ..."
$COMPOSE exec edge nginx -s reload

echo "### Done. Verify: https://${PRIMARY}  https://admin.${PRIMARY}  https://api.${PRIMARY}/health"
[ "$STAGING" != "0" ] && echo "NOTE: STAGING cert issued (browser-untrusted). Re-run without STAGING=1 for a real cert."
