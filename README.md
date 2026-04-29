# PlainVoice

PlainVoice is a bilingual voice-agent dashboard for small businesses. It combines Supabase-backed organization data, a Next.js web app, a FastAPI backend, Vapi voice assistants, Twilio phone numbers/SMS, and Cal.com booking workflows.

Billing is intentionally frozen. Do not add Stripe, checkout, subscriptions, pricing UI, or payment logic until billing is explicitly reopened.

## Stack

- Web: Next.js 16, React 19, TypeScript, next-intl, Tailwind CSS
- API: FastAPI, Pydantic settings, httpx
- Database/auth: Supabase local development and Supabase Auth/RLS
- Voice: Vapi assistants and web call widget
- Phone/SMS: Twilio phone-number search, purchase, assignment, and SMS follow-up
- Booking: Cal.com v2 availability and booking
- Tooling: pnpm, Turborepo, ESLint, TypeScript

## Required Tools

- Node.js 22 recommended, Node 18 minimum per `package.json`
- pnpm 10.33.0 via Corepack
- Python 3.11+
- Supabase CLI
- Git

Enable pnpm through Corepack:

```sh
corepack enable
pnpm install
```

## Environment

Copy the root example and fill in values:

```sh
cp .env.example .env
```

The API reads `.env` from its working directory. For local development, keep the root `.env` and copy or mirror the needed values into `apps/api/.env` if you run the API from `apps/api`.

Required for core app:

- `NODE_ENV`: `development` locally, `production` in deployed environments.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key used by web/API RLS calls.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key for webhooks, local dev bypass fallback, and server-side setup.
- `DATABASE_URL`: Postgres connection string when needed by tooling.
- `PUBLIC_API_URL`: Public backend URL used by Vapi webhooks. Local default is `http://localhost:8000`.
- `NEXT_PUBLIC_API_URL`: Frontend-to-API URL. Local default is `http://localhost:8000`.
- `NEXT_PUBLIC_SITE_URL`: Web app URL for auth redirects. Local default is `http://localhost:3000`.

Required for voice/phone/SMS:

- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`: Public Vapi key for the browser call widget.
- `VAPI_PRIVATE_KEY`: Server-side Vapi API key for assistant and phone-number sync.
- `VAPI_WEBHOOK_SECRET`: Reserved for webhook verification when enabled.
- `TWILIO_ACCOUNT_SID`: Twilio account SID.
- `TWILIO_AUTH_TOKEN`: Twilio auth token.
- `TWILIO_PHONE_NUMBER`: Fallback SMS sender in E.164 format, for example `+15145550123`.

Configured inside Organization Settings:

- Cal.com API key
- Cal.com event type ID
- Cal.com username
- SMS enabled/disabled
- SMS sender phone number or explicit sender number
- Owner notification phone
- SMS follow-up templates

## Local Supabase

Start Supabase:

```sh
supabase start
```

Reset the local database and apply seed data:

```sh
supabase db reset
```

The seed creates the PlainVoice demo organization and demo agent used by local dev auth bypass:

- Demo org ID: `00000000-0000-0000-0000-000000000001`
- Demo org slug: `plainvoice-demo`
- Demo agent ID: `00000000-0000-0000-0000-000000000101`

Migrations are ordered under `supabase/migrations`. Do not rewrite historical migrations unless a production-blocking issue requires it.

## Running Locally

Run the full workspace dev command:

```sh
pnpm dev
```

Or run apps separately:

```sh
pnpm --filter web dev
pnpm --filter api dev
```

Expected local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- API health: `http://localhost:8000/health`

## Dev Auth Bypass

The local bypass is for seeded development data only. It must never be enabled in production.

To use it locally:

```env
NODE_ENV=development
DEV_AUTH_BYPASS=true
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Safety rules enforced by code:

- API bypass only works when `NODE_ENV !== "production"`.
- API bypass only works when `DEV_AUTH_BYPASS=true`.
- API bypass only works when both API URLs point to localhost or `127.0.0.1`.
- Web bypass only works when `NODE_ENV !== "production"` and `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`.
- `DISABLE_AUTH` is not accepted as an API bypass switch.

## Features Currently In Main

- Phone-number purchase and agent assignment
- Organization Settings
- Settings persistence
- Contacts CRM
- Agent Builder and Knowledge Base
- Cal.com booking integration
- SMS follow-up
- Dashboard Analytics
- Onboarding Flow
- PlainVoice CI with typecheck and lint

## Testing Checklist

Run these before opening or merging hardening/product PRs:

```sh
pnpm check-types
pnpm lint
python -m compileall apps/api/app
```

Manual browser smoke paths:

- `/fr/dashboard`
- `/fr/onboarding`
- `/fr/settings`
- `/fr/agents`
- `/fr/phone-numbers`
- `/fr/contacts`
- `/fr/calls`

## CI

GitHub Actions lives in `.github/workflows/webpack.yml`. It currently:

- checks out the repo
- enables Corepack
- installs pnpm dependencies with `pnpm install --frozen-lockfile`
- runs `pnpm check-types`
- runs `pnpm lint`

Keep CI simple until deployment is finalized.

## Deployment Notes

Before production deployment:

- Set `NODE_ENV=production`.
- Keep `DEV_AUTH_BYPASS=false` and `NEXT_PUBLIC_DEV_AUTH_BYPASS=false`.
- Use production Supabase URL/keys and never expose the service role key to the browser.
- Set `PUBLIC_API_URL` to the deployed FastAPI URL reachable by Vapi webhooks.
- Set `NEXT_PUBLIC_API_URL` to the frontend-accessible API URL.
- Configure CORS for the deployed web origin.
- Configure Vapi, Twilio, and organization-level Cal.com/SMS settings.
- Run the testing checklist and smoke the main dashboard routes.

Suggested deployment split:

- Web: Vercel or equivalent Next.js hosting.
- API: Railway, Fly.io, Render, or another FastAPI-compatible host.
- Database/auth: Supabase production project.

## Out Of Scope For Now

- Billing
- Stripe
- Checkout
- Subscriptions
- Pricing UI
- Landing page
- Campaigns
- White-label features
- Analytics expansion
