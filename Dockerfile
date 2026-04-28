# Multi-stage build for reflex-server.
#
# Why this exists (instead of letting Railway's Railpack auto-build):
#   The Tier 1 validation pipeline shells out to `clang -fsyntax-only` to
#   syntax-check AI-generated Reflex C++. Reflex headers use
#   std::source_location, which requires clang 15+ (libstdc++ gates the
#   <source_location> header behind __builtin_source_location).
#   Railway's default Railpack image is Debian Bookworm, whose default
#   clang is 14 — too old. Ubuntu 24.04 ships clang 18 in default apt, so
#   we base the runtime stage on it.
# See: Projects/Reflex/ReflexVirtual/railway-clang-issue.md

# ── Build stage ─────────────────────────────────────────────────────────
# Use Node 22 on Bookworm for the TypeScript compile. This stage doesn't
# need clang — it's just Node + tsc.
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install deps separately from source for better Docker-layer caching.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Strip dev dependencies before copying node_modules into runtime stage.
RUN npm prune --omit=dev


# ── Runtime stage ───────────────────────────────────────────────────────
# Ubuntu 24.04 ships clang 18.x in the default apt repos — no extra apt
# sources, no LLVM keyring, no Railpack stage-merge issues to debug.
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# Install Node 22 (NodeSource) + clang 18 in one apt pass.
# curl/ca-certificates/gnupg are needed for the NodeSource setup script.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        clang \
    && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pull only what the runtime needs from the builder.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Reflex public SDK headers — needed by /api/validate to resolve
# #include <reflex_ext.h> during clang -fsyntax-only.
COPY vendor ./vendor

# Railway injects $PORT at runtime; the Express app reads env.port.
# We don't EXPOSE a fixed port — Railway routes whatever the process binds to.
CMD ["node", "dist/index.js"]
