# PlainVoice Release Candidate Verification

Last updated: 2026-04-30

Scope: release-candidate stabilization only. No new product features, billing, Stripe, checkout, subscriptions, pricing UI, campaigns, mass texting, white-label, or unrelated expansion.

## Summary

PlainVoice is ready for a public landing/product-tour demo and local release-candidate smoke testing. The full live staging demo still requires provider-backed tests with Vapi, Twilio, Cal.com, hosted Supabase, Railway, and Vercel.

## Test Legend

- PASS: verified in this RC pass.
- FAIL: verified and broken.
- NOT TESTED: not run in this pass.
- REQUIRES: needs external credentials, hosted staging, provider account, paid/chargeable action, or explicit consent.

## 1. Static Checks

| Check | Result | Notes |
| --- | --- | --- |
| `git checkout main` | PASS | Already on `main`. |
| `git pull origin main` | PASS | Main was up to date. |
| `git status --short` | PASS | Clean before RC doc creation. |
| `pnpm check-types` | PASS | Turbo check-types completed successfully. |
| `pnpm lint` | PASS | Turbo lint completed successfully. |
| `python -m compileall apps/api/app` | PASS | API Python files compiled. |
| `pnpm --filter web build` | PASS | Initial Windows/OneDrive `.next` lock was cleared by deleting generated `.next`; rebuild passed. |
| Deployment JSON parse | PASS | `apps/web/vercel.json` and `apps/api/railway.json` parse as JSON. |

## 2. Database And Migrations

| Check | Result | Notes |
| --- | --- | --- |
| Migration files exist | PASS | 19 migrations present under `supabase/migrations`. |
| Seed demo org exists by inspection | PASS | `supabase/seed.sql` inserts `PlainVoice Demo` with ID `00000000-0000-0000-0000-000000000001`. |
| Seed demo agent exists by inspection | PASS | `supabase/seed.sql` inserts `Demo Receptionist` with ID `00000000-0000-0000-0000-000000000101`. |
| Local Supabase is running | PASS | `npx supabase status` reported local services and database URL. |
| API can read seeded demo agent | PASS | Local `GET /api/voice-agents` with `Bearer dev-bypass` returned the seeded `Demo Receptionist`. |
| `npx supabase migration list` | NOT TESTED | Command requires `supabase link`; repo is not linked to a hosted Supabase project. |
| `npx supabase db reset` | NOT TESTED | Requires explicit approval because it deletes/recreates local database data. |
| RLS production user access | NOT TESTED | Requires hosted/staging Supabase users and auth sessions. |

## 3. Public Web Pages

| Route | Result | Notes |
| --- | --- | --- |
| `/` | PASS | Returns 200 and redirects/serves locale route. |
| `/fr` | PASS | Returns 200, French hero copy present. |
| `/en` | PASS | Returns 200, English hero copy present. |
| CTA email | PASS | `redabaq58@gmail.com` present. |
| Public dashboard link | PASS | `/fr/dashboard` is not exposed in public landing page HTML. |
| Visible billing/signup claims | PASS | No visible billing, Stripe, checkout, subscription, or signup claim found on public tour. Hidden app translation payload still contains agent knowledge-base wording like “pricing notes”; this is not public billing UI. |
| Mobile visual QA | NOT TESTED | Requires browser screenshot review. |

## 4. Dashboard Pages

Local HTTP smoke test results:

| Route | Result | Notes |
| --- | --- | --- |
| `/fr/dashboard` | PASS | 200, no server-error marker. |
| `/fr/settings` | PASS | 200, no server-error marker. |
| `/fr/agents` | PASS | 200, no server-error marker. |
| `/fr/agents/new` | PASS | 200, no server-error marker. |
| `/fr/phone-numbers` | PASS | 200, no server-error marker. |
| `/fr/calls` | PASS | 200, no server-error marker. |
| `/fr/contacts` | PASS | 200, no server-error marker. |
| `/fr/inbox` | PASS | 200, no server-error marker. |
| `/fr/tasks` | PASS | 200, no server-error marker. |
| `/fr/activity` | PASS | 200, no server-error marker. |
| `/fr/implementation` | PASS | 200, no server-error marker. |

## 5. CRUD Persistence

| Flow | Result | Notes |
| --- | --- | --- |
| Settings save -> refresh | NOT TESTED | Requires browser form interaction against local/staging data. |
| Create contact -> refresh | NOT TESTED | Requires browser form interaction. |
| Edit contact -> refresh | NOT TESTED | Requires browser form interaction. |
| Create task -> mark done -> refresh | NOT TESTED | Requires browser form interaction. |
| Create agent -> refresh | NOT TESTED | Requires browser form/API mutation; without Vapi credentials expected local-only warning should be verified manually. |
| Update call outcome -> refresh | NOT TESTED | Requires existing call detail row and browser form interaction. |
| Quality review -> refresh | NOT TESTED | Requires existing call detail row and browser form interaction. |

## 6. Voice Agent / Vapi Sync

| Check | Result | Notes |
| --- | --- | --- |
| Vapi config builder | PASS | Pure local check confirmed bilingual agent uses Deepgram `nova-3` with `language: multi`. |
| Vapi model tools location | PASS | Pure local check confirmed tools are under `model.tools`. |
| ElevenLabs provider mapping | PASS | Pure local check maps `elevenlabs` to Vapi `11labs`. |
| Missing Vapi credentials behavior | NOT TESTED | Needs create/update agent action with `VAPI_PRIVATE_KEY` absent. Expected: local save with warning. |
| Real assistant create/update | NOT TESTED | REQUIRES Vapi. |
| Vapi payload accepted | NOT TESTED | REQUIRES Vapi. |

## 7. Twilio Phone Number Flow

| Check | Result | Notes |
| --- | --- | --- |
| Missing credentials search behavior | PASS | Local `/api/phone-numbers/search?area_code=514` returned clear 400 message: Twilio credentials are not configured. |
| No blind purchase | PASS | No purchase command or endpoint was invoked. |
| Canadian number search with credentials | NOT TESTED | REQUIRES Twilio. |
| Purchase staging number | NOT TESTED | REQUIRES Twilio and explicit purchase approval; may cost money. |
| Store provider SID | NOT TESTED | REQUIRES Twilio purchase. |
| Import/configure in Vapi | NOT TESTED | REQUIRES Twilio and Vapi. |
| Assign/unassign agent | NOT TESTED | Requires phone number row. |

## 8. Vapi Webhook / Call Flow

| Check | Result | Notes |
| --- | --- | --- |
| Webhook route exists | PASS | `POST /api/webhooks/vapi` is mounted. |
| Webhook secret check exists | PASS | `x-vapi-secret` is enforced when `VAPI_WEBHOOK_SECRET` is configured. |
| API health | PASS | Local `GET /health` returned `{"status":"ok","service":"plainvoice-api"}`. |
| Real inbound call | NOT TESTED | REQUIRES Vapi, Twilio, Railway public URL, assigned number. |
| Assistant request resolves assigned agent | NOT TESTED | REQUIRES phone number row and Vapi webhook. |
| End-of-call saves transcript/summary | NOT TESTED | REQUIRES Vapi end-of-call webhook payload. |
| Contact created/linked from call | NOT TESTED | REQUIRES webhook call flow. |

## 9. Cal.com Booking Flow

| Check | Result | Notes |
| --- | --- | --- |
| Disabled booking result | PASS | Pure local service check returns non-crashing disabled response. |
| Missing credentials result | PASS | Code inspection confirms clear missing Cal.com settings response. |
| Availability check | NOT TESTED | REQUIRES Cal.com. |
| Booking creation | NOT TESTED | REQUIRES Cal.com and approved test appointment. |
| Booking metadata stored on call | NOT TESTED | REQUIRES Vapi tool-call flow and Cal.com. |

## 10. SMS Follow-Up And History

| Check | Result | Notes |
| --- | --- | --- |
| Missing SMS sender/credentials validation | PASS | Pure local service check returns non-crashing validation error. |
| SMS disabled/skipped path | NOT TESTED | Requires webhook flow or seeded call + organization setting path. |
| Failed SMS history row | NOT TESTED | Requires webhook flow or direct controlled fixture. |
| Live SMS to own phone | NOT TESTED | REQUIRES Twilio and live phone/SMS consent. |
| SMS history UI | NOT TESTED | Requires call with `sms_messages` rows. |

## 11. Automation Logs

| Check | Result | Notes |
| --- | --- | --- |
| Automation logger is non-throwing | PASS | Code inspection confirms `log_automation_event` catches and logs exceptions. |
| `call_saved` event | NOT TESTED | Requires Vapi end-of-call flow. |
| Booking skipped/failed event | NOT TESTED | Requires Vapi tool-call flow. |
| SMS skipped/failed/sent event | NOT TESTED | Requires call/SMS flow. |
| Task created event | NOT TESTED | Requires task workflow interaction. |
| Recipe executed event | NOT TESTED | Requires recipe trigger. |
| Human handoff unavailable event | NOT TESTED | Requires Vapi tool-call flow. |
| Contact created event | NOT TESTED | Requires contact/call interaction. |

## 12. Inbox, Tasks, Workflow Recipes

| Check | Result | Notes |
| --- | --- | --- |
| Inbox route loads | PASS | `/fr/inbox` returned 200. |
| Tasks route loads | PASS | `/fr/tasks` returned 200. |
| Workflow recipe settings visible via Settings route | PASS | `/fr/settings` returned 200 and settings code includes recipe toggles. |
| Inbox failed SMS surface | NOT TESTED | Requires failed SMS event. |
| Inbox failed booking surface | NOT TESTED | Requires failed booking event. |
| Inbox urgent/bad-quality/follow-up items | NOT TESTED | Requires calls with matching states. |
| Mark inbox done persists | NOT TESTED | Requires browser interaction. |
| Create/reopen/delete task | NOT TESTED | Requires browser interaction. |
| Recipe failure never crashes webhook | NOT TESTED | Needs webhook fixture/integration test. Code is designed to catch recipe exceptions. |

## 13. Call Outcomes And Quality Review

| Check | Result | Notes |
| --- | --- | --- |
| Calls route loads | PASS | `/fr/calls` returned 200. |
| Call detail route code supports outcome update | PASS | Code inspection confirms server action updates outcome, lead status, urgency, follow-up flag, notes, and automation events. |
| Quality review server action exists | PASS | Code inspection confirms rating, issue categories, review notes, and follow-up flag update. |
| Outcome update persists | NOT TESTED | Requires existing call detail row and browser form interaction. |
| Quality review persists | NOT TESTED | Requires existing call detail row and browser form interaction. |

## 14. Deployment Readiness

| Check | Result | Notes |
| --- | --- | --- |
| Vercel config | PASS | `apps/web/vercel.json` defines monorepo install/build/output. |
| Railway config | PASS | `apps/api/railway.json` defines Railpack build, start command, `/health`, restart policy. |
| Env checklist | PASS | `docs/deployment/env-checklist.md` splits Vercel web and Railway API vars. |
| Deploy today doc | PASS | `docs/DEPLOY_TODAY.md` describes full staging order and smoke tests. |
| Hosted Supabase linked | NOT TESTED | `supabase link` has not been run for staging. |
| Railway API deployed | NOT TESTED | Requires Railway project/domain. |
| Vercel web deployed | NOT TESTED | Requires Vercel project/domain. |
| Provider dashboards configured | NOT TESTED | Requires Vapi/Twilio/Cal.com accounts. |

## Bugs Found

No product-code bug was found in the checks run during this pass.

## Required Next Manual/Staging Tests

Before calling this a full working staging demo:

1. Approve and run `npx supabase db reset` locally, or create hosted `plainvoice-staging` and run `supabase db push`.
2. Perform browser CRUD persistence checks for settings, contacts, tasks, agents, call outcomes, and quality review.
3. Deploy Supabase staging, Railway API, and Vercel web.
4. Verify Railway `/health`.
5. Configure Vapi webhook URL: `https://<railway-api-domain>/api/webhooks/vapi`.
6. Configure Twilio staging-safe credentials and number.
7. Configure Cal.com staging event type in Organization Settings.
8. Run one real controlled inbound call.
9. Run one SMS only to your own consenting phone number.
10. Run one Cal.com test booking.
11. Run `tests/manual-call-qa.md`, including accent testing.

## Current Release Candidate Verdict

Ready for:

- Public landing demo.
- Local route smoke demo.
- Developer review.
- Staging deployment preparation.

Not yet ready for:

- Claiming all live phone/SMS/booking integrations work.
- Real customer production.
- Compliance/security-reviewed launch.
