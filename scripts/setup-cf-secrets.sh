#!/usr/bin/env bash
# setup-cf-secrets.sh
# Read local .env keys and push non-placeholder values to Cloudflare Worker Secrets.
# Usage: bash scripts/setup-cf-secrets.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${CF_SECRETS_ENV_FILE:-$PROJECT_DIR/.env}"
DRY_RUN="${CF_SECRETS_DRY_RUN:-0}"
WORKER_NAME="${CF_SECRETS_WORKER_NAME:-}"

if [ ! -f "$ENV_FILE" ]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

SECRETS=()
while IFS= read -r secret_name; do
  SECRETS+=("$secret_name")
done < <(
  ENV_FILE="$ENV_FILE" node <<'NODE'
const fs = require('node:fs');
const { parse } = require('dotenv');

const parsed = parse(fs.readFileSync(process.env.ENV_FILE, 'utf8'));

for (const key of Object.keys(parsed).sort()) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    console.log(key);
  }
}
NODE
)

if [ "${#SECRETS[@]}" -eq 0 ]; then
  echo "no valid env keys found in $ENV_FILE" >&2
  exit 1
fi

read_env_value() {
  local secret_name="$1"

  ENV_FILE="$ENV_FILE" SECRET_NAME="$secret_name" node <<'NODE'
const fs = require('node:fs');
const { parse } = require('dotenv');

const parsed = parse(fs.readFileSync(process.env.ENV_FILE, 'utf8'));
process.stdout.write(parsed[process.env.SECRET_NAME] || '');
NODE
}

is_placeholder_value() {
  local value="$1"
  local lower
  lower="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  [ -z "$value" ] ||
    [ "$value" = "替换" ] ||
    [ "$lower" = "replace" ] ||
    [ "$lower" = "placeholder" ] ||
    [ "$lower" = "changeme" ] ||
    [ "$lower" = "todo" ] ||
    [ "$lower" = "xxx" ] ||
    [[ "$lower" == your* ]] ||
    [[ "$lower" == *"_xxx"* ]] ||
    [[ "$lower" == *"-xxx"* ]]
}

put_secret() {
  local secret_name="$1"
  local value="$2"
  local wrangler_args=(secret put "$secret_name")

  if [ -n "$WORKER_NAME" ]; then
    wrangler_args+=(--name "$WORKER_NAME")
  fi

  if [ "$DRY_RUN" = "1" ]; then
    echo "   dry-run ${wrangler_args[*]}"
    return 0
  fi

  printf '%s' "$value" | pnpm exec wrangler "${wrangler_args[@]}" >/dev/null
}

echo "Reading runtime config from $ENV_FILE..."
if [ -n "$WORKER_NAME" ]; then
  echo "Worker name override: $WORKER_NAME"
fi
if [ "$DRY_RUN" = "1" ]; then
  echo "Dry run: values will not be uploaded"
fi
echo ""

success=0
failed=0

for secret_name in "${SECRETS[@]}"; do
  value="$(read_env_value "$secret_name")"

  if is_placeholder_value "$value"; then
    echo "skip $secret_name: empty or placeholder"
    continue
  fi

  echo "upload $secret_name ..."
  if put_secret "$secret_name" "$value"; then
    echo "   ok $secret_name"
    ((success++)) || true
  else
    echo "   failed $secret_name"
    ((failed++)) || true
  fi
done

echo ""
echo "--------------------------------"
echo "ok: $success | failed: $failed"
echo "--------------------------------"

if [ "$failed" -gt 0 ]; then
  exit 1
fi
