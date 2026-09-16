# Santor ↔ LN-NeU Integration Contract

## Direction

Santor is the application/service layer. LN-NeU is the AI/core logic layer.
Santor calls the LN-NeU AI service over an authenticated internal API.

## Authentication

- Header: `X-LN-NeU-API-Key`
- Santor source: `LN_NEU_API_KEY`
- LN-NeU source: `SANTOR_API_KEY`
- Production minimum: 32 characters
- Secrets are environment-only and never returned by API responses.

## Execute endpoint

`POST {LN_NEU_API_URL}/execute`

Request:

```json
{
  "taskId": "uuid",
  "action": "chat",
  "input": "user message",
  "context": {
    "userId": "authenticated-santor-user-id",
    "source": "dashboard"
  }
}
```

Response:

```json
{
  "status": "queued",
  "message": "Task successfully queued",
  "task_id": "uuid",
  "queue_size": 1
}
```

## Santor public API

`POST /api/v1/ai/chat`

Authentication: existing Santor JWT + `ai:chat` permission + existing dashboard rate limit.

Request body:

```json
{
  "message": "user message",
  "context": {
    "source": "dashboard"
  }
}
```

The authenticated Santor user ID is authoritative and overwrites any `context.userId` supplied by the client.

## Error policy

- `503`: integration disabled or LN-NeU service not configured.
- `502`: LN-NeU unavailable, timeout/network failure, or non-success upstream response.
- Retry only transient upstream failures (`502`, `503`, `504`) or transport failures.
- Maximum retries: 2.
- Request timeout: 5 seconds per attempt.

## Current scope

This contract establishes service-to-service authentication, request/response shape, error handling, timeout/retry behavior, and the authenticated Santor AI entry point. Live deployment and production credential verification remain Phase 15.
