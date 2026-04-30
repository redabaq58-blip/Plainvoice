# Environment Checklist

Use separate values for local, staging, and production. Staging should run with `NODE_ENV=production` so the same safety checks used in production also protect real-business testing.

## Required Variables

| Variable | Used by | Local | Staging | Production | Notes |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | web, API | `development` | `production` | `production` | Production mode enables stricter API and web URL validation. |
| `NEXT_PUBLIC_SUPABASE_URL` | web, API, Supabase client | local Supabase URL or staging project | staging Supabase URL | production Supabase URL | Public, but environment-specific. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, API, Supabase client | local anon key | staging anon key | production anon key | Public anon key; RLS still protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | API, server-only web paths | local service role key | staging service role key | production service role key | Secret. Never expose in browser, client bundles, logs, screenshots, or public docs. |
| `DATABASE_URL` | Supabase/tooling | local Postgres URL when needed | staging database URL when needed | production database URL when needed | Keep secret. The current app mostly uses Supabase REST clients. |
| `PUBLIC_API_URL` | API, Vapi server URL generation | `http://localhost:8000` | `https://<staging-api-host>` | `https://<production-api-host>` | Must be publicly reachable by Vapi outside local development. |
| `NEXT_PUBLIC_API_URL` | web, API safety checks | `http://localhost:8000` | `https://<staging-api-host>` | `https://<production-api-host>` | Public browser API base URL. Must not point to localhost in staging/production. |
| `NEXT_PUBLIC_SITE_URL` | web, API CORS/auth redirects | `http://localhost:3000` | `https://<staging-web-host>` | `https://<production-web-host>` | Add this URL to Supabase Auth redirects. |
| `DEV_AUTH_BYPASS` | API | `false`, or `true` only for seeded local dev | `false` | `false` | API ignores it unless `NODE_ENV` is not production and API URLs are local. |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | web, API safety checks | `false`, or `true` only for seeded local dev | `false` | `false` | Public flag. Must be false outside local dev. |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | web | optional locally unless using web call widget | staging Vapi public key | production Vapi public key | Public browser key for Vapi web calls. |
| `VAPI_PRIVATE_KEY` | API, Vapi | optional locally unless syncing assistants/numbers | staging Vapi private key | production Vapi private key | Secret. Required for assistant and phone-number sync. |
| `VAPI_WEBHOOK_SECRET` | API, Vapi | optional locally | staging shared secret | production shared secret | If set, Vapi must send the matching `x-vapi-secret` header. |
| `VAPI_MODEL_PROVIDER` | API, Vapi | blank to use API default | blank or staging override | blank or approved production override | Optional. API defaults to the configured provider. |
| `VAPI_MODEL_NAME` | API, Vapi | blank to use API default | blank or staging override | blank or approved production override | Optional. Use for controlled model testing. |
| `TWILIO_ACCOUNT_SID` | API, Twilio voice/SMS | optional unless testing phone/SMS | staging Twilio SID | production Twilio SID | Secret-ish account identifier; keep out of client bundles. |
| `TWILIO_AUTH_TOKEN` | API, Twilio voice/SMS | optional unless testing phone/SMS | staging Twilio token | production Twilio token | Secret. Server-only. |
| `TWILIO_PHONE_NUMBER` | API, SMS fallback | optional locally | staging fallback sender | production fallback sender | E.164 format, for example `+15145550123`. |

## Organization Settings, Not Global Env

These values are stored per organization in the app and should be configured from Organization Settings or onboarding:

- Cal.com API key
- Cal.com numeric event type ID
- Cal.com username
- Booking enabled/disabled
- SMS enabled/disabled
- SMS sender number
- Owner notification phone
- SMS follow-up templates
- Business name, phone, email, hours, timezone, website, and default voice settings

## Security Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `VAPI_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, and Cal.com API keys server-side only.
- Never prefix secrets with `NEXT_PUBLIC_`.
- Rotate staging secrets if they were ever copied into chat, screenshots, logs, or browser-visible config.
- Do not reuse production service-role keys in staging.
- Do not use production customer phone numbers, calendars, or organizations in staging tests.
- Billing is frozen. Do not add Stripe, checkout, subscription, or pricing variables for this staging-readiness work.

## Quick Staging Sanity Check

- Web env has no service-role key exposed to the browser.
- API env has `NODE_ENV=production`.
- Both API URLs use HTTPS staging hosts.
- Both dev auth bypass flags are `false`.
- Supabase Auth redirect URLs include the staging web origin.
- Provider dashboards use staging API/web URLs, not localhost.

## Vercel Web Env

Use these for the web project:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_DEV_AUTH_BYPASS=false
NODE_ENV=production
```

Do not add service-role or provider secrets to the Vercel web project.

## Railway API Env

Use these for the API project:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_API_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
VAPI_PRIVATE_KEY=
VAPI_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
VAPI_MODEL_PROVIDER=
VAPI_MODEL_NAME=
DEV_AUTH_BYPASS=false
NEXT_PUBLIC_DEV_AUTH_BYPASS=false
```
