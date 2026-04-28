#!/bin/sh
# Start Tailscale userspace daemon (if authkey present), then exec node.
#
# In userspace mode tailscaled doesn't need TUN/NET_ADMIN; instead it
# exposes a SOCKS5 proxy and an HTTP proxy on localhost:1055. The
# validator wrapper picks up the HTTP one via VALIDATOR_HTTP_PROXY env.
#
# If TS_AUTHKEY is missing the container still boots — useful for local
# Docker runs and for any dev environment where Tailscale isn't wanted.
# In that case the validator wrapper degrades to { skipped: true }.

set -e

mkdir -p /var/lib/tailscale

if [ -n "$TS_AUTHKEY" ]; then
  echo "[tailscale] starting userspace daemon"
  /usr/sbin/tailscaled \
    --tun=userspace-networking \
    --socks5-server=localhost:1055 \
    --outbound-http-proxy-listen=localhost:1055 \
    --state=/var/lib/tailscale/tailscaled.state \
    --statedir=/var/lib/tailscale \
    >/tmp/tailscaled.log 2>&1 &
  TAILSCALED_PID=$!

  # Wait up to 15s for the daemon's local socket to come up before
  # `tailscale up` can talk to it.
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if /usr/bin/tailscale status >/dev/null 2>&1; then break; fi
    sleep 1
  done

  HOSTNAME="${RAILWAY_SERVICE_NAME:-reflex-server}-${RAILWAY_REPLICA_ID:-${RAILWAY_DEPLOYMENT_ID:-local}}"
  echo "[tailscale] joining tailnet as $HOSTNAME"

  if /usr/bin/tailscale up \
       --authkey="$TS_AUTHKEY" \
       --hostname="$HOSTNAME" \
       --accept-routes; then
    echo "[tailscale] up:"
    /usr/bin/tailscale status || true
  else
    echo "[tailscale] WARNING: tailscale up failed — validator will degrade to skipped"
  fi
else
  echo "[tailscale] TS_AUTHKEY not set — skipping tailnet join (validator will degrade to skipped)"
fi

exec node dist/index.js
