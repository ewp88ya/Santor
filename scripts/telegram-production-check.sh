#!/usr/bin/env bash
set -euo pipefail

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET is required}"

API_BASE_URL="${SANTOR_API_BASE_URL:-https://api.santor.app}"
WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-https://api.santor.app/api/v1/telegram/webhook}"

printf '%s\n' '=== Santor API health ==='
curl --fail --silent --show-error "${API_BASE_URL}/api/v1/health"
printf '\n%s\n' '=== Telegram Bot ==='
curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
printf '\n%s\n' '=== Telegram Webhook ==='
curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
printf '\n%s\n' '=== Santor webhook contract ==='
webhook_response="$(curl --fail --silent --show-error \
  --request POST \
  --url "${WEBHOOK_URL}" \
  --header 'content-type: application/json' \
  --header "X-Telegram-Bot-Api-Secret-Token: ${TELEGRAM_WEBHOOK_SECRET}" \
  --data '{"update_id":0}')"
printf '%s\n' "${webhook_response}" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data.get("success") is True and data.get("handled") is False, data'
printf '%s\n' 'Telegram production checks passed.'
