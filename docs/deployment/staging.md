# PlainVoice Staging Deployment

Staging is the first real-business test environment for PlainVoice. It should behave like production, use isolated data and provider credentials, and be reachable by Vapi, Twilio, Cal.com, and the browser without relying on localhost.

## Recommended Architecture

- Web app: deploy `apps/web` as a Next.js app.
- API: deploy `apps/api` as a public FastAPI service.
- Database/auth: create a separate Supabase project for staging.
- Voice: use a staging Vapi workspace or clearly labeled staging assistants and phone numbers.
- Phone/SMS: use Twilio credentials and phone numbers that are safe for testing.
- Booking: use a Cal.com staging/test account or a dedicated test event type.

Use separate staging domains, keys, phone numbers, and calendars. Staging must not share production customer data, production phone routing, or production service-role keys.

## Web Hosting

Recommended: Vercel for `apps/web`.

Set the project root to `apps/web` if the host supports monorepo project roots. The build should install from the repository root with pnpm and run the web build through the workspace. If the host cannot infer workspace dependencies, use the root as the project directory and configure the build command for the web app.

Required staging web values:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL=https://<staging-api-host>`
- `NEXT_PUBLIC_SITE_URL=https://<staging-web-host>`
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
- `NEXT_PUBLIC_DEV_AUTH_BYPASS=false`

Do not set `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_SITE_URL` to localhost in staging.

## API Hosting

Recommended: Railway, Render, Fly.io, or another host that can run FastAPI with Python 3.11+.

The API must expose:

- `GET /health`
- `POST /api/webhooks/vapi`
- `/api/voice-agents/*`
- `/api/phone-numbers/*`

Required staging API values:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_API_URL=https://<staging-api-host>`
- `NEXT_PUBLIC_API_URL=https://<staging-api-host>`
- `NEXT_PUBLIC_SITE_URL=https://<staging-web-host>`
- `VAPI_PRIVATE_KEY`
- `VAPI_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `DEV_AUTH_BYPASS=false`
- `NEXT_PUBLIC_DEV_AUTH_BYPASS=false`

The API startup validation fails in production mode when required production values are missing or API URLs point at localhost.

## Supabase Staging Setup

Create a dedicated Supabase staging project. Apply migrations from `supabase/migrations` in order and keep the staging project separate from local and production.

Minimum setup:

- Apply every migration under `supabase/migrations`.
- Confirm RLS policies are enabled and match local expectations.
- Enable Supabase Auth providers needed for staging testers.
- Add the staging web URL to Supabase Auth redirect URLs.
- Use the staging project URL and anon key in the web and API.
- Use the staging service role key only in server-side environments.

Recommended first staging data:

- One test organization.
- One owner/test user assigned through `organization_members`.
- One test agent.
- One test phone number assigned to that agent after Twilio/Vapi setup.
- Cal.com and SMS settings configured from Organization Settings, not from global env.

## Vapi Staging Notes

Use staging Vapi credentials or clearly labeled staging resources.

- Set `VAPI_PRIVATE_KEY` on the API host.
- Set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` on the web host.
- Set `PUBLIC_API_URL` to the public staging API URL before creating or updating assistants.
- Confirm each assistant has server URL `https://<staging-api-host>/api/webhooks/vapi`.
- If `VAPI_WEBHOOK_SECRET` is set, configure Vapi to send the matching `x-vapi-secret` header.
- Create test calls against staging assistants before giving the environment to business testers.

## Twilio Staging Notes

Use a staging-safe Twilio number and account/subaccount.

- Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` on the API host.
- Set `TWILIO_PHONE_NUMBER` to a verified fallback sender in E.164 format.
- Buy or import a staging phone number through the app.
- Confirm the number is imported into Vapi with the staging webhook URL.
- Do not point a staging Twilio number at local ngrok, localhost, or production webhooks.

## Cal.com Staging Notes

Cal.com credentials are stored per organization in Organization Settings.

- Use a dedicated test event type with safe availability.
- Store the Cal.com API key and numeric event type ID in Organization Settings.
- Verify the organization timezone before booking tests.
- Test disabled and missing-credential behavior before enabling real booking for testers.

## SMS Staging Notes

SMS follow-up uses Twilio credentials plus organization-level SMS settings.

- Keep `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` server-only.
- Configure the organization SMS sender number in E.164 format.
- Use test recipient numbers with consent.
- Confirm missing credentials are skipped gracefully and successful sends store status on the call.

## Deployment Gate

Before handing staging to a business tester:

- `pnpm check-types`
- `pnpm lint`
- `python -m compileall apps/api/app`
- `git diff --check`
- Web loads over HTTPS.
- API `/health` returns `{"status":"ok","service":"plainvoice-api"}`.
- No staging URL, webhook, callback, or provider config points to localhost.
