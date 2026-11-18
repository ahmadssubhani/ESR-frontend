# ESR Mobile API

## Base URL

Use your deployed Next.js origin:

- **Production:** `https://esr-web-frontend.vercel.app/api` (Vercel project `esr-web-frontend`, team `esr6`)
- **Local:** `http://localhost:3000/api`

Set `NEXT_PUBLIC_APP_URL` on Vercel to your canonical domain for CORS.

## Authentication

**Option A (recommended):** Supabase client SDK in the mobile app (`signInWithPassword`, `refreshSession`).

**Option B:** REST helpers:

- `POST /api/auth/login` — `{ email, password }` → tokens
- `POST /api/auth/signup` — `{ email, password, full_name? }`
- `POST /api/auth/refresh` — `{ refresh_token }`
- `POST /api/auth/logout` — optional `Authorization: Bearer …`

Send `Authorization: Bearer <access_token>` on protected routes.

## New mobile endpoints

- `GET /api/me/vouchers` — claimed vouchers for the current user
- `GET /api/me/reviews` — reviews authored by the current user
- `POST /api/devices/register` — `{ push_token, platform }` (requires `user_devices` migration)

## One command: mobile APIs + Swagger

From `esr-web-frontend`:

```bash
npm run mobile:api
```

This script:

1. Patches all `/api` routes for **Bearer token** auth (`getApiUser`)
2. Scans every Next.js + Flask JSON endpoint
3. Writes **`openapi/openapi.yaml`**, **`openapi/openapi.json`**, **`openapi/mobile-api-manifest.json`**

CI drift check: `npm run mobile:api:check`

Optional enrichments (summaries, bodies): edit `openapi/enrichments.json` then re-run.

## Documentation

- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api/openapi.json`
- Mobile manifest: `openapi/mobile-api-manifest.json`

Scope: **esr-web-frontend** and Flask JSON routes only (`MY-esr` duplicate is excluded).