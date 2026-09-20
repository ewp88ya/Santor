# Santor ↔ LN-NeU Authentication Contract

## Scope

This document records the authentication boundaries for the current Phase 13 integration.

There are three separate credential classes:

1. **Santor user authentication** — the dashboard/API user sends a JWT as `Authorization: Bearer <token>`.
2. **Santor → LN-NeU service authentication** — Santor sends `X-LN-NeU-API-Key`; LN-NeU validates it against `SANTOR_API_KEY`.
3. **Telegram webhook authentication** — Telegram sends `X-Telegram-Bot-Api-Secret-Token`; Santor validates it against `TELEGRAM_WEBHOOK_SECRET`. The Bot API token is used only for outbound `sendMessage` calls.

## Dashboard AI request flow

```
Dashboard
  -> POST /api/v1/ai/chat
     Authorization: Bearer <Santor JWT>
  -> authMiddleware
     -> verify JWT
     -> load active user
     -> attach user.id + role + permissions
  -> requirePermission("ai:chat")
  -> dashboardRateLimit
  -> aiChatController
  -> lnNeuClient.executeChat(user.id, ...)
  -> POST LN-NeU /execute
     X-LN-NeU-API-Key: <shared service secret>
  -> LN-NeU require_santor_api_key
  -> TaskRouter / WorkflowEngine
  -> PromptGuard + SecurityMiddleware + AgentIsolation
  -> AnalysisAgent for action=chat
  -> Ollama
```

The user JWT is **not** forwarded to LN-NeU. Santor converts the authenticated user identity into the task context and uses the dedicated service credential for the inter-service hop.

## Telegram request flow

```
Telegram
  -> POST /api/v1/telegram/webhook
     X-Telegram-Bot-Api-Secret-Token: <webhook secret>
  -> telegramWebhookController
  -> TelegramIdentity lookup
  -> linked Santor user id
  -> lnNeuClient.executeChat(santorUserId, ...)
  -> POST LN-NeU /execute
     X-LN-NeU-API-Key: <shared service secret>
  -> LN-NeU -> AnalysisAgent -> Ollama
  -> Telegram Bot API /sendMessage
     bot token kept server-side
```

Unlinked Telegram users are not sent to LN-NeU. Linking is initiated by an authenticated Santor user through `POST /api/v1/telegram/link`; the generated code is stored hashed and expires after 10 minutes. A Telegram identity cannot be linked to two Santor accounts.

## Credential rules

- Never commit real secrets.
- `JWT_SECRET`, `SANTOR_INTERNAL_WEBHOOK_SECRET`, and LN-NeU service keys must be at least 32 characters in production.
- `LN_NEU_API_KEY` in Santor and `SANTOR_API_KEY` in LN-NeU are the **same shared secret** under different configuration names.
- LN-NeU compares the service key with `hmac.compare_digest`.
- Santor external API keys are compared with `timingSafeEqual` and checked against required scopes.
- Telegram webhook secret authenticates the inbound webhook; Telegram Bot token authenticates Santor's outbound Bot API calls.
- Do not log JWTs, API keys, Bot API tokens, or webhook secrets.

## Expected authentication failures

| Boundary | Failure | Expected result |
|---|---|---|
| Santor user API | Missing/invalid/expired JWT | HTTP 401 |
| Santor AI permission | JWT valid, no `ai:chat` | HTTP 403 |
| Santor → LN-NeU | Missing/wrong/short service key | HTTP 401 or 503 when LN-NeU is not configured |
| Telegram webhook | Missing/wrong secret | HTTP 401 + audit event |
| Telegram account | Not linked | Telegram response explaining linking is required |
| Telegram linking | Invalid/expired code | HTTP 400 |
| Telegram linking | Telegram identity already owned | HTTP 409 |
| External Santor API | Wrong key | HTTP 401 |
| External Santor API | Missing required scope | HTTP 403 |

## Production gate

Code-level authentication is implemented, but production readiness is only locked after all of these are verified:

- real secrets exist in the runtime secret store;
- Santor API and LN-NeU use the same service secret;
- `LN_NEU_ENABLED=true` and reachable `LN_NEU_API_URL`;
- Telegram bot token, webhook secret, and bot username are configured;
- Telegram webhook is registered to `https://<domain>/api/v1/telegram/webhook`;
- real Dashboard JWT → Santor → LN-NeU → Ollama flow succeeds;
- real Telegram linked-user → Santor → LN-NeU → Ollama → Telegram flow succeeds;
- negative authentication tests return the expected 401/403 responses;
- CI is green on the exact commits being deployed.

Until those live checks pass, this is **implemented**, not **production-verified**.
