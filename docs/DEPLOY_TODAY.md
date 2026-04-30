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

This is the path for "all features work live" staging. It still does not mean production-ready phone infrastructure; it means a controlled staging stack is live and smoke-tested.

## Full Staging Order

Do these in order:

1. Create hosted Supabase staging project.
2. Apply migrations with Supabase CLI.
3. Deploy FastAPI backend on Railway.
4. Deploy Next.js web app on Vercel.
5. Connect env vars on both hosts.
6. Configure Vapi, Twilio, Cal.com, and SMS settings.
7. Run smoke tests from Level 1 through Level 6.

## Vercel Web Steps

1. Go to Vercel.
2. Click **Add New**.
3. Click **Project**.
4. Import GitHub repo: `redabaq58-blip/Plainvoice`.
5. Set framework preset to **Next.js**.
6. Set root directory to `apps/web`.
7. Set install command:

```sh
cd ../.. && pnpm install --frozen-lockfile
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

The repo also includes `apps/web/vercel.json` with the same install command, build command, and output directory. Keep the Vercel dashboard values aligned with that file.

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

For Option B, set:

- `NEXT_PUBLIC_API_URL=https://<your-railway-api-domain>`
- `NEXT_PUBLIC_SITE_URL=https://<your-vercel-web-domain>`

For Option A, if the public landing page is the only demo, `NEXT_PUBLIC_API_URL` can be left blank only if Vercel accepts the build and you are not opening API-backed dashboard routes.

Never put `SUPABASE_SERVICE_ROLE_KEY`, `VAPI_PRIVATE_KEY`, `TWILIO_AUTH_TOKEN`, or Cal.com API keys into Vercel browser-visible variables.

## Railway API Steps

Only do this for Option B.

1. Go to Railway.
2. Create a new project.
3. Create a service from GitHub repo `redabaq58-blip/Plainvoice`.
4. Open the service **Settings**.
5. Set **Root Directory** to:

```text
/apps/api
```

6. Confirm Railway sees `apps/api/railway.json`.
7. If Railway does not apply config-as-code, set custom start command manually:

```sh
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

8. Add API environment variables.
9. Deploy.
10. Generate a public Railway domain.
11. Visit `https://<railway-api-domain>/health`.

Expected response:

```json
{"status":"ok","service":"plainvoice-api"}
```

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

1. Go to Supabase.
2. Create a new project named `plainvoice-staging`.
3. Wait for the project to finish provisioning.
4. Open **Project Settings** -> **API**.
5. Copy:
   - Project URL
   - anon public key
   - service_role key
6. Open **Project Settings** -> **Database**.
7. Copy the connection string if you need `DATABASE_URL` for tools.
8. On your machine, log in:

```sh
supabase login
```

9. Link this repo to the new staging project:

```sh
supabase link
```

10. Confirm the selected project is `plainvoice-staging`.
11. Review pending migrations:

```sh
supabase migration list
```

12. Push migrations:

```sh
supabase db push
```

13. Optional only if you want demo seed data in staging:

```sh
supabase db push --include-seed
```

14. Add the Vercel web URL to Supabase Auth site URL and redirect URLs.
15. Create a staging owner user and organization.
16. Smoke test dashboard routes.

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
- `/fr/contacts`
- `/fr/inbox`
- `/fr/tasks`
- `/fr/calls`
- `/fr/implementation`

API, if Railway is deployed:

- `GET /health`

Provider checks, if live call demo is needed:

- Vapi assistant server URL points to Railway API.
- Twilio staging phone number routes to the intended Vapi resource.
- Cal.com test account is connected in Organization Settings.
- SMS is enabled only with consenting test recipients.

## Full Staging Smoke Order

### Level 1: Public Web

- `/`
- `/fr`
- `/en`

Pass when pages load and CTA email opens a message to `redabaq58@gmail.com`.

### Level 2: API

- `GET https://<railway-api-domain>/health`

Pass when Railway returns:

```json
{"status":"ok","service":"plainvoice-api"}
```

### Level 3: Dashboard Routes

- `/fr/dashboard`
- `/fr/settings`
- `/fr/agents`
- `/fr/contacts`
- `/fr/calls`
- `/fr/inbox`
- `/fr/tasks`
- `/fr/implementation`

Pass when routes load without server errors after staging auth/data is configured.

### Level 4: Database

Test:

- Create or edit a contact.
- Create a follow-up task.
- Mark a task done.
- Update organization settings.
- Refresh each page.

Pass when refreshed pages keep the new values.

### Level 5: Integrations

Test one at a time:

- Vapi assistant sync.
- Twilio phone-number search.
- Cal.com availability check.
- SMS disabled/skipped path.
- SMS test to your own consenting number only.

### Level 6: Full Flow

Run one final demo flow:

1. Create an agent from an industry demo pack.
2. Assign a staging phone number.
3. Make a test call.
4. Confirm transcript/summary saves.
5. Confirm contact is created.
6. Set call outcome.
7. Create follow-up task.
8. Send or intentionally skip SMS.
9. Confirm automation log.
10. Confirm inbox item.
11. Confirm dashboard updates.

## Today Best Choice

If time is short, choose Option A. A live Vercel link with a clear product tour is safer than a rushed live phone/SMS/booking demo.
