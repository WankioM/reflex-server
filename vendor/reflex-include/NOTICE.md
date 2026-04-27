# NOTICE — Reflex SDK Public Headers

Copyright © James / Reflex Multimedia.

These header files are the public-API surface of the Reflex C++ framework, identical to the headers distributed in Reflex's public SDK packages. They are bundled here for use by the AI assistant's Tier 1 syntax validation pipeline (`clang -fsyntax-only`).

## What's in this folder
- `reflex/` — core Reflex framework headers
- `reflex_ext/` — Reflex extension headers
- `reflex_ext.h` — top-level entry header

## What's NOT in this folder
- No source (`.cpp`) files
- No compiled libraries (`.lib`, `.a`, `.dll`)
- No build scripts
- No internal-only headers

## Usage
- Used at runtime by the validator endpoint (`/api/validate`) to give clang the include path it needs to syntax-check AI-generated Reflex code.
- Not intended for redistribution outside this repo's deploy targets.

## Updates
When the Reflex SDK is updated, sync these headers from the canonical SDK at `C:\Users\VICTUS\Desktop\reflex\include\` (Tracy's local) or, eventually, from James's master repo via git submodule once Tracy gets access.

## Original location
- Source: `C:\Users\VICTUS\Desktop\reflex\include\`
- Sync date: 2026-04-27
- Sync method: manual `cp -r` (Stage 0 of Tier 1 validation pipeline rollout)
