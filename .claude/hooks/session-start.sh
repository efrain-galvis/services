#!/bin/bash
# Installs the node dependencies so `npm run check` (lint + vitest + tsc/vite
# build) works from the first turn of a web session.
#
# Without this, a fresh container has no node_modules, and a review of a PR
# that touches src/ can only be read, not verified — which is how findings end
# up reported as "could not run the test suite".
set -euo pipefail

# Local checkouts manage their own node_modules; this is only for the ephemeral
# containers Claude Code on the web hands out.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Warm container: the image is cached after this hook completes, so a restart
# already has the tree. Reinstall only if the lockfile moved since.
if [ -d node_modules ] && [ node_modules -nt package-lock.json ]; then
  exit 0
fi

# `npm ci`, not `npm install`. install rewrites package-lock.json on this repo
# (it adds `dev: true` markers to the optional rollup/vite platform binaries),
# which would leave every session starting on a dirty tree — and a dirty
# lockfile is exactly the kind of thing that gets swept into an unrelated
# commit. ci never writes the lockfile, and it is what Vercel builds from.
npm ci --no-audit --no-fund
