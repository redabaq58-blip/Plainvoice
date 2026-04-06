# PlainVoice — Claude Code Configuration

## Project Overview
PlainVoice is a multi-tenant AI Voice Agent SaaS for Quebec SMBs.
Agency brand: AutoRéponse QC. Pricing: $197/month + $300 setup.
Two revenue streams: agency (GHL+Vapi, running now) + SaaS (this codebase).

## Architecture
- apps/web → Next.js 16.2 App Router → Vercel
- apps/api → FastAPI Python → Railway
- packages/ui → shared shadcn/ui components
- packages/database → Supabase client helpers + generated types
- Database: Supabase (Postgres + Auth + Realtime + Storage)
- Payments: Stripe (metered billing, Checkout, Customer Portal)
- Voice AI: Vapi.ai (agents, calls, webhooks, Web SDK)
- Telephony: Twilio (Canadian numbers, SMS, WhatsApp)
- Background jobs: Trigger.dev
- Translations: next-intl (fr-CA default, en secondary)

## Code Conventions
### TypeScript
- Strict mode always. Zero `any`. Zero `as unknown`.
- Server Components by default. `use client` only when needed.
- Zod for ALL external data validation (API inputs, webhook payloads)
- Use `type` not `interface` for object shapes
- snake_case for database columns, camelCase for TypeScript variables
- Import paths: use `@/` for apps/web/ (no src/ dir), `@plainvoice/ui` for packages/ui

### Python (FastAPI)
- Pydantic v2 models for ALL request/response shapes
- Async/await everywhere (no sync endpoints)
- snake_case for everything
- Type hints on every function signature
- Never expose raw Supabase service key to client

### Database
- ALL tables have: id (uuid), org_id (uuid), created_at, updated_at
- RLS enabled on ALL tables — never bypass in production code
- Migrations in supabase/migrations/ — never modify manually
- Generated types from: npx supabase gen types typescript --local

### Components
- shadcn/ui components only — never write raw HTML buttons/inputs
- Tailwind utilities only — no custom CSS files
- Dark mode support required on all new components
- FR/EN text: always use t('key') from next-intl, never hardcode strings

## Commands
pnpm dev          → starts web + api simultaneously
pnpm build        → production build
pnpm lint         → ESLint all packages
pnpm typecheck    → tsc --noEmit all packages
cd apps/api && uvicorn app.main:app --reload → API only
npx supabase start → local database
npx supabase db reset → reset + reseed local database
stripe listen --forward-to localhost:8000/api/billing/webhook → Stripe webhooks

## Claude Code Workflow Rules
1. ALWAYS start new sessions in Plan Mode (Shift+Tab twice)
2. ONE feature per session — never combine unrelated features
3. Read opensrc/ sources before using any external package
4. After ANY change to .ts/.tsx files, run: pnpm typecheck
5. After ANY change to Python files, check for import errors
6. NEVER commit .env or .env.local
7. NEVER bypass RLS with service key in client-side code
8. Commit after every working feature with conventional commits:
   feat: add [feature]
   fix: resolve [bug]
   chore: [maintenance]
9. When stuck in a loop (same fix 3x), STOP and explain root cause
10. /compact when context gets long, /clear between sessions

## Key File Locations
- Supabase client: packages/database/index.ts
- Vapi webhook handler: apps/api/app/routers/vapi_webhooks.py (to be created in Session 3)
- Stripe webhook handler: apps/api/app/routers/billing.py (to be created in Session 5)
- Locale layout: apps/web/app/[locale]/layout.tsx
- Auth/i18n middleware: apps/web/proxy.ts
- i18n routing config: apps/web/i18n/routing.ts
- i18n request config: apps/web/i18n/request.ts
- Translations FR: apps/web/messages/fr.json
- Translations EN: apps/web/messages/en.json

## Multi-tenancy Pattern
Every query MUST filter by org_id from session.
Use: const org = await getOrgFromSession() → always returns org_id.
Never return data without verifying org_id matches session.

## When Compacting
Preserve: current branch name, last working state, next planned step,
any env vars added this session, any unresolved errors.
