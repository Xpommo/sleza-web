#!/usr/bin/env bash
# Provision an Oracle Cloud Always Free ARM VM (VM.Standard.A1.Flex, Ubuntu 24.04)
# to run the fonarik backend. Idempotent — safe to re-run.
#
#   curl -fsSL <raw-url>/setup.sh | bash -s -- <duckdns-subdomain> <duckdns-token>
# or, after cloning the repo:
#   sudo bash deploy/oracle/setup.sh <duckdns-subdomain> <duckdns-token>
#
# Ubuntu 24.04 is deliberate: Playwright ships arm64 Chromium for 22.04/24.04,
# but NOT for 26.04 — `playwright install --with-deps` fails there.
set -euo pipefail

DUCK_SUB="${1:?usage: setup.sh <duckdns-subdomain> <duckdns-token>}"
DUCK_TOKEN="${2:?usage: setup.sh <duckdns-subdomain> <duckdns-token>}"
DOMAIN="${DUCK_SUB}.duckdns.org"
APP_DIR=/opt/fonarik
APP_USER=ubuntu
REPO=https://github.com/${GITHUB_REPO:-Xpommo/sleza-web}.git

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "run with sudo"; exit 1; }

log "Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https netfilter-persistent

# --- Oracle-specific firewall gotcha -----------------------------------------
# Oracle's Ubuntu images ship an iptables ruleset that REJECTs everything except
# port 22, and it survives reboots. Opening 80/443 in the VCN Security List in
# the console is necessary but NOT sufficient — you must also punch through here,
# or Let's Encrypt's HTTP-01 challenge silently times out.
log "Opening ports 80/443 in iptables"
# Insert at the head of INPUT: Oracle's ruleset ends in a catch-all REJECT, so
# appending (or inserting at a fixed offset) can land after it and do nothing.
for p in 80 443; do
  iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null \
    || iptables -I INPUT 1 -p tcp --dport "$p" -j ACCEPT
done
netfilter-persistent save

log "Node.js 22 LTS"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v

log "Caddy (auto-TLS reverse proxy)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
fi

log "App checkout -> ${APP_DIR}"
if [ -d "$APP_DIR/.git" ]; then
  su - "$APP_USER" -c "cd $APP_DIR && git pull --ff-only"
else
  mkdir -p "$APP_DIR" && chown "$APP_USER:$APP_USER" "$APP_DIR"
  su - "$APP_USER" -c "git clone --depth 1 $REPO $APP_DIR"
fi

log "Backend deps + arm64 Chromium"
# PLAYWRIGHT_BROWSERS_PATH is pinned so the systemd unit resolves the browser
# identically to this shell (the default $HOME/.cache/ms-playwright is per-user
# and systemd's HOME differs → "browser not found" at runtime).
PW_ENV="PLAYWRIGHT_BROWSERS_PATH=$APP_DIR/.playwright"
su - "$APP_USER" -c "cd $APP_DIR/backend && $PW_ENV npm ci --omit=dev"

# Split deliberately: `install --with-deps` shells out to apt-get and needs root,
# but the browser itself must land in the app user's pinned path. One combined
# command can't satisfy both.
(cd "$APP_DIR/backend" && npx playwright install-deps chromium)
su - "$APP_USER" -c "cd $APP_DIR/backend && $PW_ENV npx playwright install chromium"

log "DuckDNS -> current public IP, refreshed every 5 min"
cat > /usr/local/bin/duckdns-update <<EOF
#!/usr/bin/env bash
# DuckDNS answers "OK" or "KO" in the BODY with HTTP 200 either way, so curl -f
# cannot detect a bad token — grep the body or a wrong token fails silently and
# the domain never resolves (which later surfaces as an inscrutable TLS failure).
resp=\$(curl -fsS "https://www.duckdns.org/update?domains=${DUCK_SUB}&token=${DUCK_TOKEN}&ip=")
echo "\$resp" > /var/log/duckdns.log
[ "\$resp" = "OK" ]
EOF
chmod 700 /usr/local/bin/duckdns-update   # contains the DuckDNS token — root-only
if /usr/local/bin/duckdns-update; then
  echo " duckdns: OK -> ${DOMAIN}"
else
  echo " duckdns: KO — subdomain '${DUCK_SUB}' or token rejected. Fix and re-run." >&2
  exit 1
fi
cat > /etc/cron.d/duckdns <<'EOF'
*/5 * * * * root /usr/local/bin/duckdns-update >/dev/null 2>&1
EOF

log "Caddyfile -> ${DOMAIN}"
sed "s/{{DOMAIN}}/${DOMAIN}/g" "$APP_DIR/deploy/oracle/Caddyfile" > /etc/caddy/Caddyfile
systemctl reload caddy 2>/dev/null || systemctl restart caddy

log "systemd unit"
sed -e "s|{{APP_DIR}}|${APP_DIR}|g" -e "s|{{APP_USER}}|${APP_USER}|g" \
  "$APP_DIR/deploy/oracle/fonarik-backend.service" > /etc/systemd/system/fonarik-backend.service
systemctl daemon-reload
systemctl enable fonarik-backend

if [ ! -f "$APP_DIR/backend/.env" ]; then
  cat <<EOF

  ⚠  $APP_DIR/backend/.env does not exist yet — the service will not start.
     Create it (see deploy/oracle/README.md), then:
       sudo systemctl start fonarik-backend
     Make sure it contains:  BACKEND_URL=https://${DOMAIN}

EOF
else
  systemctl restart fonarik-backend
  # First-time Let's Encrypt issuance takes ~10-30s; poll instead of a flat sleep
  # so a slow cert doesn't look like a failed deploy.
  log "Waiting for TLS + health (up to 60s)"
  for i in $(seq 1 20); do
    if curl -fsS --max-time 5 "https://${DOMAIN}/health" 2>/dev/null; then
      echo; break
    fi
    [ "$i" -eq 20 ] && {
      echo "health check did not pass — inspect:" >&2
      echo "  journalctl -u fonarik-backend -n 50 --no-pager" >&2
      echo "  journalctl -u caddy -n 50 --no-pager" >&2
    }
    sleep 3
  done
fi

log "Done. Backend: https://${DOMAIN}"
