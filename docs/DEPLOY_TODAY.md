# Deploy PlainVoice Today

This is the simplest path to get a public PlainVoice demo link today.

Billing is frozen. Do not add Stripe, checkout, subscriptions, pricing logic, payment logic, campaigns, white-label, mass texting, or unrelated product features during this deploy.

## Option A: Fastest Public Demo

Deploy only the web app on Vercel.

This gives you:

- Public landing page at `/`
- Product tour at `/fr` and `/en`
- Product explanation
- Feature tour
- Roadmap/status docs in GitHub
- Contact/demo CTA

This does not require the FastAPI backend to be public.

## Option B: Full Staging Demo

Deploy:

- Web: Vercel
- API: Railway
- Database/auth: hosted Supabase project

Use this only if you need the live dashboard/API demo today.

## Vercel Web Steps

1. Go to Vercel.
2. Click **Add New**.
3. Click **Project**.
4. Import GitHub repo: `redabaq58-blip/Plainvoice`.
5. Set framework preset to **Next.js**.
6. Set root directory to `apps/web`.
7. Set install command:

```sh
pnpm install
```

8. Set build command:

```sh
cd ../.. && pnpm turbo build --filter=web
```

9. Set output directory:

```text
.next
```

10. Add web environment variables.
11. Click **Deploy**.

### Vercel Web Env Vars

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_DEV_AUTH_BYPASS=false
NODE_ENV=production
```

For Option A, if the public landing page is the only demo, `NEXT_PUBLIC_API_URL` can be left blank only if Vercel accepts the build and you are not opening API-backed dashboard routes. For dashboard demos, set it to the Railway API URL.

Never put `SUPABASE_SERVICE_ROLE_KEY`, `VAPI_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, or Cal.com API keys into Vercel browser-visible variables.

## Railway API Steps

Only do this for Option B.

1. Go to Railway.
2. Create a new project.
3. Choose **Deploy from GitHub repo**.
4. Select `redabaq58-blip/Plainvoice`.
5. Set the service root/build context to the repository root if Railway needs monorepo access.
6. Set start command:

```sh
cd apps/api && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

7. Add API environment variables.
8. Deploy.
9. Generate a public Railway domain.
10. Visit `https://<railway-api-domain>/health`.

### Railway API Env Vars

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

Use the Railway public domain for:

- `PUBLIC_API_URL`
- `NEXT_PUBLIC_API_URL`
- Vapi assistant webhook base URL

## Supabase Hosted Project Steps

Only do this for Option B or a real dashboard demo.

1. Create a new Supabase project for staging.
2. Copy the project URL and anon key.
3. Copy the service-role key only into server-side environments.
4. Link the local repo to the Supabase project with the Supabase CLI.
5. Review pending migrations before pushing.
6. Push migrations to the hosted project.
7. Add the Vercel web URL to Supabase Auth site URL and redirect URLs.
8. Create a staging owner user and organization.
9. Smoke test dashboard routes.

Do not guess production commands against a live database. Confirm the target Supabase project before applying migrations.

## Post-Deploy Smoke Tests

Public web:

- `/`
- `/fr`
- `/en`

Dashboard routes after staging auth/data is configured:

- `/fr/dashboard`
- `/fr/settings`
- `/fr/agents`
- `/fr/inbox`
- `/fr/tasks`
- `/fr/calls`

API, if Railway is deployed:

- `GET /health`

Provider checks, if live call demo is needed:

- Vapi assistant server URL points to Railway API.
- Twilio staging phone number routes to the intended Vapi resource.
- Cal.com test account is connected in Organization Settings.
- SMS is enabled only with consenting test recipients.

## Today Best Choice

If time is short, choose Option A. A live Vercel link with a clear product tour is safer than a rushed live phone/SMS/booking demo.
