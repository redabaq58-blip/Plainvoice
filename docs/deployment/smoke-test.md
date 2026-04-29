# Staging Smoke Test

Run this after every staging deploy and before inviting real SMB testers. Use staging accounts, staging phone numbers, and staging calendars only.

## Preflight

- Web URL loads over HTTPS.
- API health returns OK:

```sh
curl -i https://<staging-api-host>/health
```

- `NODE_ENV=production` in web and API hosting.
- `DEV_AUTH_BYPASS=false`.
- `NEXT_PUBLIC_DEV_AUTH_BYPASS=false`.
- `NEXT_PUBLIC_API_URL` and `PUBLIC_API_URL` point to the staging API.
- Supabase Auth redirect URLs include the staging web URL.
- No provider dashboard points to localhost.

## Login And Auth

- Sign in with a staging test owner account.
- Confirm the user lands in the dashboard.
- Confirm local dev auth bypass is not visible or active.
- Open direct dashboard routes in a new tab and confirm auth still works:
  - `/fr/dashboard`
  - `/fr/onboarding`
  - `/fr/settings`
  - `/fr/agents`
  - `/fr/phone-numbers`
  - `/fr/contacts`
  - `/fr/calls`

## Organization Settings

- Open Organization Settings.
- Edit business name, phone, email, timezone, and hours.
- Save settings.
- Refresh the page and confirm values persist.
- Confirm Cal.com and SMS settings are either configured for staging or intentionally disabled.

## Agent Builder

- Create a staging test agent from an industry demo pack or a simple manual config.
- Confirm the agent saves.
- Confirm no `vapi_sync_warning` appears when `VAPI_PRIVATE_KEY` is configured.
- Edit the agent's knowledge base.
- Save and refresh.
- Confirm edits persist.

Expected missing-credential behavior:

- If `VAPI_PRIVATE_KEY` is missing, the agent should save locally with a Vapi sync warning.
- Staging that is used for live call testing should have Vapi configured.

## Phone Number Assignment

- Open Phone Numbers.
- Search for available numbers.
- Purchase or select a staging-safe test number.
- Assign the number to the staging test agent.
- Confirm the row shows the assigned agent and a successful provisioning status.
- Confirm Vapi has the phone number with the staging webhook URL.

## Test Call Path

- Call the staging phone number from a test phone.
- Confirm the agent answers with the expected greeting.
- Ask a normal business question from the configured industry.
- Provide caller name and phone number.
- End the call naturally.

Expected result:

- Call completes without provider errors.
- Vapi sends the webhook to the staging API.
- PlainVoice stores the call.
- Transcript and summary appear when Vapi provides them.
- A contact is created or updated for the caller.

## Booking Behavior

With booking disabled:

- Ask the agent to book an appointment.
- Confirm it explains booking is not available/configured and offers follow-up.
- Confirm the call still saves.

With booking enabled:

- Configure a staging Cal.com API key and numeric event type ID.
- Ask for appointment availability.
- Pick an offered slot.
- Confirm the booking appears in the staging Cal.com calendar.
- Confirm missing email or invalid details are handled conversationally.

## SMS Behavior

With SMS disabled or missing credentials:

- Complete a call that would normally trigger follow-up.
- Confirm SMS is skipped or marked failed without breaking call/contact persistence.

With SMS enabled:

- Configure Twilio credentials and organization SMS sender.
- Complete a call with a consenting test recipient number.
- Confirm the SMS is sent or queued by Twilio.
- Confirm the call record stores SMS status.

## Dashboard And CRM

- Dashboard loads without errors.
- Analytics cards render from staging data.
- Recent calls show the test call.
- Contacts page shows the test caller.
- Contact detail opens and includes related information.
- Calls page shows the test call.
- Call detail shows transcript, summary, recording when available, and SMS status when available.

## Onboarding

- Open onboarding for a staging organization.
- Walk through business profile, hours, agent setup, phone number, and integrations.
- Confirm missing optional integrations do not block core setup unless the step explicitly requires them.
- Confirm completed setup points the user back to useful dashboard/agent/phone-number flows.

## Pass Criteria

Staging is ready for business testing when:

- Auth, dashboard, settings, agents, phone numbers, contacts, calls, and onboarding all load.
- One real staging phone call is answered and saved.
- A contact is created or updated from that call.
- Booking disabled/missing credentials behavior is graceful.
- SMS disabled/missing credentials behavior is graceful.
- No staging route, webhook, callback, or provider config points to localhost.
- No billing, Stripe, checkout, subscription, pricing, campaign, white-label, or unrelated product feature was added.
