#!/usr/bin/env bash
set -euo pipefail

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET is required}"

WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-https://santor.app/api/v1/telegram/webhook}"

curl --fail --silent --show-error \
  --request POST \
  --url "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --header 'content-type: application/json' \
  --data "$(printf '{"url":"%s","secret_token":"%s","drop_pending_updates":true}' "$WEBHOOK_URL" "$TELEGRAM_WEBHOOK_SECRET")"

printf '\nWebhook configured: %s\n' "$WEBHOOK_URL"
