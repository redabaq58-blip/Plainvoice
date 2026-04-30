# PlainVoice Product Status

Last updated: 2026-04-30

PlainVoice is at the public demo and deployment consolidation stage. The goal is to make the product understandable, demoable, and deployable without adding new product scope.

Billing is frozen. Stripe, checkout, subscriptions, pricing logic, payment logic, campaigns, white-label, mass texting, and unrelated features are intentionally out of scope.

## Positioning

PlainVoice is an AI front desk and follow-up engine for small and medium businesses.

It answers calls, captures leads, books appointments when configured, sends SMS follow-ups, creates contacts and follow-up tasks, and shows the owner exactly what happened.

## Built

- AI agents
- Phone numbers
- Phone-number purchase and assignment
- Settings
- Contacts CRM
- Calls
- Call Outcomes
- SMS follow-up
- SMS History
- Booking
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
- Public landing/product-tour page with no signup

## Validated

- `pnpm check-types`
- `pnpm lint`
- `python -m compileall apps/api/app`
- Migrations exist under `supabase/migrations`
- Local route smoke test plan exists
- Programmatic prompt checks and manual call QA checklist exist

## Not Fully Validated

- Real live call quality
- Real production Twilio number
- Real production Vapi webhook
- Real production Cal.com booking
- Real production SMS delivery
- Accent testing across Quebec French, multilingual French, Indian English, Latino/Hispanic English, and standard North American English callers
- Full production customer data, security, and uptime review

## Demo Confidence

Good for:

- Public product explanation
- Investor/product walkthrough
- Developer architecture review
- Partner conversation
- SMB customer discovery
- Local or staging dashboard demo with prepared data

Not yet claimed:

- Fully production-ready call center replacement
- Fully validated live phone/SMS/booking system
- Billing-ready SaaS
- Compliance-certified deployment

## Current Demo Recommendation

Fastest safe demo:

1. Deploy the web app on Vercel.
2. Use `/`, `/fr`, and `/en` as public no-signup product tour pages.
3. Keep dashboard routes protected or available only to controlled staging testers.
4. Deploy Railway API and hosted Supabase only if a live dashboard/API demo is required today.

## Current Risk Notes

- Production provider credentials must be configured carefully. Vapi, Twilio, Cal.com, and Supabase should use staging-safe resources first.
- The dashboard can demonstrate product depth, but live call/SMS/booking behavior needs real provider testing before strong claims.
- Dev auth bypass must remain disabled outside local development.
- Service-role and provider secrets must never be exposed through `NEXT_PUBLIC_` variables or browser configuration.
