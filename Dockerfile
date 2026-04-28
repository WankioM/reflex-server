# Multi-stage build for reflex-server with Tailscale userspace sidecar.
#
# Why a Dockerfile (Railway uses Railpack by default):
#   The Tier 1 validation pipeline (Stage 1c) needs reflex-server on
#   Railway to reach the Mac Mini validator at 100.82.195.40:8080 — but
#   that IP is only routable inside Tracy's tailnet. Railway containers
#   don't have NET_ADMIN / TUN, so the only way in is Tailscale's
#   userspace networking + a SOCKS5/HTTP proxy on localhost.
#
# How startup works:
#   start.sh launches `tailscaled --tun=userspace-networking
#   --socks5-server=localhost:1055 --outbound-http-proxy-listen=localhost:1055`,
#   waits for it to come up, runs `tailscale up --authkey=$TS_AUTHKEY`,
#   then exec's `node dist/index.js`. The validator wrapper routes its
#   fetch() through the local HTTP proxy when VALIDATOR_HTTP_PROXY is set.
#
# Required Railway env (in addition to the existing reflex-server vars):
#   TS_AUTHKEY            — ephemeral, reusable, tag:railway from
#                           https://login.tailscale.com/admin/settings/keys
#   VALIDATOR_URL         — http://100.82.195.40:8080
#   VALIDATOR_TOKEN       — same token Mac Mini's ~/reflex-validator/.env has
#   VALIDATOR_HTTP_PROXY  — http://localhost:1055
#
# If TS_AUTHKEY is missing the container still boots — start.sh logs a
# warning and skips the tailnet join. The validator wrapper degrades to
# { ok: null, skipped: true, reason } so reflex-server doesn't crash.

# ── Build stage ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN npm prune --omit=dev

# ── Runtime stage ───────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

# Install Tailscale + minimal runtime deps. iptables and iproute2 aren't
# needed in userspace mode but ca-certificates is required for
# tailscaled's outbound TLS to the coordination server.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
    && \
    curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg | tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null && \
    curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends tailscale && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

CMD ["./start.sh"]
