#!/usr/bin/env bash
set -euo pipefail

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN is required}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET is required}"

WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-https://santor.app/api/v1/telegram/webhook}"

printf '%s\n' '=== Telegram Bot ==='
curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
printf '\n%s\n' '=== Telegram Webhook ==='
curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
printf '\n%s\n' '=== Santor HTTPS endpoint ==='
curl --fail --silent --show-error --head "${WEBHOOK_URL}"
printf '\nTelegram production checks passed.\n'
