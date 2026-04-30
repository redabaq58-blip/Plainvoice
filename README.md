# PlainVoice

PlainVoice is an AI front desk and follow-up engine for small and medium businesses.

It gives a business a 24/7 receptionist, lead capture assistant, booking coordinator, and follow-up system. PlainVoice answers calls, captures leads, books appointments when calendar setup is connected, sends SMS follow-ups, creates contacts and follow-up tasks, and shows the owner exactly what happened.

Billing is frozen. Do not add Stripe, checkout, subscriptions, pricing logic, payment logic, campaigns, white-label, mass texting, or unrelated product features until billing is explicitly reopened.

## Current Product

PlainVoice currently includes:

- Public landing/product-tour page with no signup required
- Phone-number purchase and assignment
- Settings
- Contacts CRM
- Calls and call detail
- Call Outcomes
- SMS follow-up
- SMS History
- Automation Logs
- Business Inbox
- Follow-up Tasks
- Owner Digest
- Human Handoff
- Workflow Recipes
- Client Solution Builder
- Call Quality Review
- Voice Quality Consolidation
- Industry Demo Packs
- Staging Deployment Readiness

PlainVoice is built for Canada, Quebec, and North America, with bilingual English/French workflows where the product needs them.

## Stack

- Web: Next.js 16, React 19, TypeScript, next-intl, Tailwind CSS
- API: FastAPI, Pydantic settings, httpx
- Database/auth: Supabase, migrations, Supabase Auth/RLS
- Voice: Vapi assistants and browser call widget
- Phone/SMS: Twilio phone-number search, purchase, assignment, and SMS follow-up
- Booking: Cal.com availability and booking
- Tooling: pnpm, Turborepo, ESLint, TypeScript

## Local Setup

Install required tools:

- Node.js 22 recommended, Node 18 minimum
- pnpm 10.33.0 through Corepack
- Python 3.11+
- Supabase CLI
- Git

Install dependencies:

```sh
corepack enable
pnpm install
```

Copy environment values:

```sh
cp .env.example .env
```

The API reads `.env` from its working directory. For local development, keep the root `.env` and copy or mirror the needed values into `apps/api/.env` if you run the API from `apps/api`.

Start Supabase locally:

```sh
supabase start
supabase db reset
```

Run the app:

```sh
pnpm dev
```

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- API health: `http://localhost:8000/health`

## Required Environment Variables

Core:

- `NODE_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `PUBLIC_API_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `DEV_AUTH_BYPASS`
- `NEXT_PUBLIC_DEV_AUTH_BYPASS`

Voice, phone, and SMS:

- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
- `VAPI_PRIVATE_KEY`
- `VAPI_WEBHOOK_SECRET`
- `VAPI_MODEL_PROVIDER`
- `VAPI_MODEL_NAME`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Configured per organization inside the app:

- Cal.com API key
- Cal.com event type ID
- Cal.com username
- SMS enabled/disabled
- SMS sender phone number
- Owner notification phone
- SMS follow-up templates
- Business profile, hours, timezone, and voice settings

Production safety:

- `NODE_ENV=production`
- `DEV_AUTH_BYPASS=false`
- `NEXT_PUBLIC_DEV_AUTH_BYPASS=false`
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `VAPI_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, or Cal.com keys to the browser.

## Validation

Run before demo deploys:

```sh
pnpm check-types
pnpm lint
python -m compileall apps/api/app
```

Manual browser smoke paths:

- `/`
- `/fr`
- `/en`
- `/fr/dashboard`
- `/fr/settings`
- `/fr/agents`
- `/fr/inbox`
- `/fr/tasks`
- `/fr/calls`

## Deployment

Fastest public demo today:

- Deploy only `apps/web` to Vercel.
- Use the public landing/product-tour page as the demo URL.
- Do not deploy the API unless a live dashboard/API demo is needed.

Full staging demo:

- Web: Vercel
- API: Railway
- Database/auth: hosted Supabase project
- Voice/SMS/booking: Vapi, Twilio, and Cal.com staging-safe credentials

Step-by-step deployment docs:

- [Deploy today](docs/DEPLOY_TODAY.md)
- [Product status](docs/PRODUCT_STATUS.md)
- [Roadmap](docs/ROADMAP.md)
- [Staging deployment](docs/deployment/staging.md)
- [Environment checklist](docs/deployment/env-checklist.md)
- [Webhook checklist](docs/deployment/webhook-checklist.md)
- [Manual call QA](tests/manual-call-qa.md)

## Current Limits

The repository is demo-ready, not fully production-validated. Real live call quality, production Twilio number routing, production Vapi webhooks, production Cal.com booking, production SMS delivery, and accent testing still need controlled validation before claiming production readiness.
