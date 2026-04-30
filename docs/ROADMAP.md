# PlainVoice Roadmap

This roadmap is for consolidation after the public demo. It does not reopen billing.

## Now: Public Demo Readiness

- Keep the homepage public and no-signup.
- Keep GitHub documentation clear for investors, developers, partners, and SMB prospects.
- Deploy the web app on Vercel.
- Deploy the FastAPI backend on Railway only when a live dashboard/API demo is needed.
- Use a hosted Supabase staging project for dashboard demos.
- Run route smoke tests after each deploy.

## Next: Staging Validation

- Create a dedicated Supabase staging project.
- Apply migrations through a controlled Supabase CLI workflow.
- Add staging-safe Vapi, Twilio, and Cal.com credentials.
- Run one complete inbound call from a staging phone number.
- Confirm call persistence, contact creation, transcript/summary, SMS status, and task creation.
- Run the manual call QA checklist, including accent testing.

## Product Consolidation

- Tighten dashboard copy and empty states.
- Review owner digest and inbox action labels with SMB language.
- Confirm every workflow recipe maps to a real business use case.
- Add screenshots or short product clips after staging data is stable.
- Improve deployment smoke scripts if repeated manual deploys become slow.

## Technical Hardening

- Confirm Supabase RLS policies against staging users.
- Review webhook verification behavior for Vapi.
- Review Twilio failure states and retries.
- Review Cal.com booking failure states.
- Add API integration tests around webhooks and follow-up workflows.
- Add monitoring/logging for staged provider failures.

## Later, Explicitly Not Today

- Billing
- Stripe
- Checkout
- Subscription tiers
- Pricing logic
- Campaigns
- Mass texting
- White-label
- Complex admin system
- Mobile app
- New AI feature expansion

These items require a separate product decision and must not be mixed into demo deployment work.
