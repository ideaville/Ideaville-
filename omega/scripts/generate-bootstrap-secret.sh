#!/usr/bin/env bash
# Generate a bootstrap admin password for Vercel secret entry.
# Prints ONE line to stdout — redirect only into a secret store / local clipboard.
# Do not commit the output. Do not paste into chat logs.
set -euo pipefail
openssl rand -base64 32 | tr -d '\n'
echo 1>&2
echo "Copy the line above into Vercel env OMEGA_BOOTSTRAP_ADMIN_PASSWORD (min 10 chars satisfied)." 1>&2
echo "Set OMEGA_BOOTSTRAP_ADMIN_EMAIL to a verified owner address (see docs/STAGING_DB_HANDOFF.md)." 1>&2
