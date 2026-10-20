#!/usr/bin/env bash
# Ships Cravify: checks, then the Convex backend, then the web app.
# Only this script deploys the Convex functions.
set -euo pipefail
cd "$(dirname "$0")/.."

# Refuse to deploy unless this folder is linked to Cravify's Convex project
# (dev dapper-pika-804), so a deploy can never land on another project's prod.
grep -q "dapper-pika-804" .env.local || {
  echo "This folder isn't linked to Cravify's Convex project — not deploying." >&2
  exit 1
}

npm test
npx tsc --noEmit
npx eslint src convex e2e scripts
npx convex deploy -y
vercel deploy --prod --yes
