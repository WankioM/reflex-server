# Reflex Server - Frontend Integration Guide

**Base URL:** `https://reflex-server-production.up.railway.app`
**Auth:** Bearer token in `Authorization` header (unless marked public)
**Error format:** `{ error: string, code: string, action?: string }`
**Pagination format:** `{ data: [...], pagination: { page, limit, total, totalPages } }`

---

## Auth

### `GET /api/auth/google`
**Auth:** Public
**Description:** Initiates Google OAuth flow. Redirect the user's browser here.
**Response:** Redirects to Google login, then back to `{FRONTEND_URL}/auth/callback?accessToken=xxx&refreshToken=xxx`

### `GET /api/auth/github`
**Auth:** Public
**Description:** Initiates GitHub OAuth flow. Redirect the user's browser here.
**Response:** Redirects to GitHub login, then back to `{FRONTEND_URL}/auth/callback?accessToken=xxx&refreshToken=xxx`

### `POST /api/auth/refresh`
**Auth:** Public
**Body:**
```json
{ "refreshToken": "string" }
```
**200 Response:**
```json
{ "accessToken": "string", "refreshToken": "string" }
```
**401 Response:** `AUTH_EXPIRED` - session expired, redirect to login

### `POST /api/auth/logout`
**Auth:** Required
**Body:**
```json
{ "refreshToken": "string" }
```
**200 Response:**
```json
{ "message": "Logged out successfully." }
```

---

## Users

### `GET /api/users/me`
**Auth:** Required
**200 Response:**
```json
{
  "data": {
    "_id": "string",
    "googleId": "string",
    "email": "string",
    "displayName": "string",
    "avatar": "string",
    "role": "free | pro | team | admin",
    "credits": 20,
    "freeCreditsGranted": true,
    "onboarding": { "completedAt": "date|null", "steps": ["string"] },
    "byoKey": { "enabled": false },
    "connections": { "github": { "connected": false, "username": null } },
    "subscription": { "tier": "free", "status": "none", "currentPeriodEnd": null },
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### `PATCH /api/users/me`
**Auth:** Required
**Body:**
```json
{ "displayName": "string", "avatar": "string" }
```
**200 Response:** Same shape as `GET /api/users/me`

### `PUT /api/users/me/byo-key`
**Auth:** Required
**Body:**
```json
{ "apiKey": "sk-ant-..." }
```
**200 Response:**
```json
{ "message": "API key saved and enabled." }
```
**400 Response:** `VALIDATION_ERROR` - invalid key format

### `DELETE /api/users/me/byo-key`
**Auth:** Required
**200 Response:**
```json
{ "message": "API key removed." }
```

### `PATCH /api/users/me/byo-key/toggle`
**Auth:** Required
**Body:**
```json
{ "enabled": true }
```
**200 Response:**
```json
{ "message": "BYO key enabled." }
```

### `DELETE /api/users/me`
**Auth:** Required
**200 Response:**
```json
{ "message": "Account scheduled for deletion." }
```

---

## Credits

### `GET /api/credits/balance`
**Auth:** Required
**200 Response:**
```json
{ "data": { "credits": 20 } }
```

### `GET /api/credits/history`
**Auth:** Required
**Query:** `?page=1&limit=20`
**200 Response:**
```json
{
  "data": [
    {
      "_id": "string",
      "type": "signup_bonus | purchase | gift | deduction | refund",
      "amount": 20,
      "balance": 20,
      "description": "Welcome bonus - 20 free credits",
      "metadata": {},
      "createdAt": "date"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

## Conversations

### `GET /api/conversations`
**Auth:** Required
**Query:** `?page=1&limit=20`
**200 Response:**
```json
{
  "data": [
    {
      "_id": "string",
      "title": "How do I create a Reflex app?",
      "status": "active",
      "messageCount": 4,
      "totalTokensUsed": 1200,
      "totalCreditsCharged": 2,
      "lastMessageAt": "date",
      "createdAt": "date"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### `POST /api/conversations`
**Auth:** Required
**Body:**
```json
{ "title": "string (optional)" }
```
**201 Response:**
```json
{ "data": { "_id": "string", "title": "New conversation", "status": "active", ... } }
```

### `GET /api/conversations/:id`
**Auth:** Required
**Query:** `?page=1&limit=50`
**200 Response:**
```json
{
  "data": {
    "_id": "string",
    "title": "string",
    "status": "active",
    "messages": [
      { "_id": "string", "role": "user", "content": "string", "createdAt": "date" },
      { "_id": "string", "role": "assistant", "content": "string", "tokensUsed": 600, "creditsCharged": 1, "codeCheckerRan": true, "createdAt": "date" }
    ]
  },
  "pagination": { "page": 1, "limit": 50, "total": 4, "totalPages": 1 }
}
```

### `PATCH /api/conversations/:id`
**Auth:** Required
**Body:**
```json
{ "title": "string", "status": "active | archived" }
```
**200 Response:** Updated conversation object

### `DELETE /api/conversations/:id`
**Auth:** Required
**200 Response:**
```json
{ "message": "Conversation deleted." }
```

---

## Projects

### `GET /api/projects`
**Auth:** Required
**Query:** `?status=active&page=1&limit=20`
**200 Response:**
```json
{
  "data": [
    {
      "_id": "string",
      "name": "My Calculator App",
      "description": "A simple calculator built with Reflex",
      "source": "manual",
      "githubRepo": null,
      "status": "active",
      "conversationCount": 3,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

### `POST /api/projects`
**Auth:** Required
**Body:**
```json
{ "name": "string (required)", "description": "string (optional)", "source": "manual | github", "githubRepo": "owner/repo (optional, github source only)" }
```
**201 Response:**
```json
{ "data": { "_id": "string", "name": "string", "description": "", "source": "manual", "githubRepo": null, "status": "active", ... } }
```
**400 Response:** `VALIDATION_ERROR` - Project name is required

### `GET /api/projects/:id`
**Auth:** Required
**200 Response:**
```json
{
  "data": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "source": "manual",
    "githubRepo": null,
    "status": "active",
    "conversations": [
      { "_id": "string", "title": "string", "status": "active", "messageCount": 4, "lastMessageAt": "date" }
    ],
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```
**404 Response:** `NOT_FOUND` - Project not found

### `PATCH /api/projects/:id`
**Auth:** Required
**Body:**
```json
{ "name": "string", "description": "string", "status": "active | archived" }
```
**200 Response:** Updated project object
**400 Response:** `VALIDATION_ERROR` - No valid fields to update
**404 Response:** `NOT_FOUND` - Project not found

### `DELETE /api/projects/:id`
**Auth:** Required
**Description:** Soft delete — sets status to `archived`
**200 Response:**
```json
{ "message": "Project archived." }
```
**404 Response:** `NOT_FOUND` - Project not found

### `POST /api/projects/:id/conversations`
**Auth:** Required
**Body:**
```json
{ "title": "string (optional)" }
```
**201 Response:**
```json
{ "data": { "_id": "string", "projectId": "string", "title": "New conversation", "status": "active", ... } }
```
**404 Response:** `NOT_FOUND` - Project not found (or archived)

### `GET /api/projects/:id/conversations`
**Auth:** Required
**Query:** `?page=1&limit=20`
**200 Response:**
```json
{
  "data": [
    { "_id": "string", "projectId": "string", "title": "string", "status": "active", "messageCount": 4, "lastMessageAt": "date" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```
**404 Response:** `NOT_FOUND` - Project not found

---

## Assistant

### `POST /api/assistant/chat`
**Auth:** Optional (works for both anonymous and authenticated users)
**Body:**
```json
{ "message": "string", "conversationId": "string (optional, authenticated only)" }
```

**200 Response (anonymous):**
```json
{
  "data": {
    "message": { "role": "assistant", "content": "string" },
    "creditsRemaining": 4,
    "isAnonymous": true
  }
}
```

**200 Response (authenticated):**
```json
{
  "data": {
    "conversationId": "string",
    "message": { "_id": "string", "role": "assistant", "content": "string", "tokensUsed": 600, "creditsCharged": 1, "codeCheckerRan": false },
    "creditsRemaining": 19,
    "isAnonymous": false
  }
}
```

**402 Responses:**
- `ANONYMOUS_CREDITS_EXHAUSTED` - anonymous user out of free queries, show signup prompt
- `CREDITS_EXHAUSTED` - authenticated user out of credits, show purchase/BYO key prompt
- `BYO_KEY_QUOTA` - user's own Claude key is out of tokens

**400 Response:** `BYO_KEY_INVALID` - user's Claude key isn't working

---

## Connections

### `GET /api/connections`
**Auth:** Required
**200 Response:**
```json
{
  "data": {
    "github": { "connected": true, "username": "WankioM", "connectedAt": "date" }
  }
}
```

### `POST /api/connections/github`
**Auth:** Required
**501 Response:** Not yet implemented

### `DELETE /api/connections/github`
**Auth:** Required
**200 Response:**
```json
{ "message": "GitHub disconnected." }
```

---

## Payments

### `POST /api/payments/create-checkout`
**Auth:** Required
**Body:**
```json
{ "credits": 100, "priceInCents": 999 }
```
**200 Response:**
```json
{ "data": { "checkoutUrl": "https://checkout.stripe.com/..." } }
```
**Frontend:** Redirect user to `checkoutUrl`. Stripe redirects back to `/settings/credits?success=true` or `?canceled=true`.

### `POST /api/payments/webhook`
**Auth:** Stripe signature (not user auth)
**Description:** Stripe sends payment events here. Not called by the frontend.

### `GET /api/payments/history`
**Auth:** Required
**Query:** `?page=1&limit=20`
**200 Response:**
```json
{
  "data": [
    {
      "_id": "string",
      "type": "one_time | subscription",
      "amount": 999,
      "currency": "usd",
      "creditsGranted": 100,
      "status": "succeeded",
      "createdAt": "date"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

## Admin (requires `admin` role)

### `GET /api/admin/users`
**Query:** `?page=1&limit=20&search=email-or-name`
**200 Response:** Paginated user list

### `GET /api/admin/users/:id`
**200 Response:** Full user object (minus encrypted fields)

### `PATCH /api/admin/users/:id`
**Body:**
```json
{ "role": "free | pro | team | admin", "displayName": "string" }
```
**200 Response:** Updated user

### `POST /api/admin/users/:id/credits`
**Body:**
```json
{ "amount": 100, "description": "Bonus for beta testing" }
```
**200 Response:**
```json
{ "data": { "credits": 120 } }
```

### `GET /api/admin/stats`
**200 Response:**
```json
{
  "data": {
    "totalUsers": 150,
    "activeUsersLast30Days": 42,
    "totalRevenueDollars": 1250.50
  }
}
```

### `GET /api/admin/feature-flags`
**200 Response:**
```json
{ "data": [{ "key": "subscriptions_enabled", "enabled": false, "description": "..." }] }
```

### `PUT /api/admin/feature-flags/:key`
**Body:**
```json
{ "enabled": true, "description": "Enable subscription payments" }
```
**200 Response:** Updated flag

---

## Team (requires `team` role or above)

### `POST /api/team/users/:id/credits`
**Body:**
```json
{ "amount": 50, "description": "Team credit grant" }
```
**200 Response:**
```json
{ "data": { "credits": 70 } }
```

### `POST /api/team/api-keys`
**Body:**
```json
{ "name": "Eval runner", "permissions": ["assistant:call"] }
```
**201 Response:**
```json
{ "data": { "key": "rfx_abc123...", "name": "Eval runner", "message": "Save this key - it cannot be retrieved again." } }
```

### `GET /api/team/api-keys`
**200 Response:** List of API keys (without hashes)

### `DELETE /api/team/api-keys/:id`
**200 Response:**
```json
{ "message": "API key revoked." }
```

### `GET /api/team/usage`
**Query:** `?page=1&limit=50`
**200 Response:** Paginated usage logs

---

## Health

### `GET /api/health`
**Auth:** Public
**200 Response:**
```json
{ "status": "ok", "timestamp": "2026-04-20T14:27:11.915Z" }
```

---

## Error Codes Reference

| Code | Status | Message |
|---|---|---|
| `AUTH_EXPIRED` | 401 | Your session expired. Sign in again. |
| `AUTH_INVALID` | 401 | Invalid or missing authentication token. |
| `AUTH_FORBIDDEN` | 403 | You do not have permission to access this resource. |
| `ANONYMOUS_CREDITS_EXHAUSTED` | 402 | You've used all 5 free queries. Sign up for 20 more free credits. |
| `CREDITS_EXHAUSTED` | 402 | You're out of credits. Buy more or add your own Claude API key. |
| `CREDITS_INSUFFICIENT` | 402 | This action requires X credits but you only have Y. |
| `BYO_KEY_INVALID` | 400 | Your Claude API key isn't working. |
| `BYO_KEY_QUOTA` | 402 | Your Claude API key is out of tokens. |
| `RATE_LIMITED` | 429 | Slow down - try again in a few seconds. |
| `GITHUB_DISCONNECTED` | 400 | Reconnect your GitHub account to use this feature. |
| `NOT_FOUND` | 404 | {Resource} not found. |
| `VALIDATION_ERROR` | 400 | {Details} |
| `SERVICE_UNAVAILABLE` | 503 | The assistant is temporarily down. |
| `INTERNAL_ERROR` | 500 | Something went wrong. Please try again later. |
