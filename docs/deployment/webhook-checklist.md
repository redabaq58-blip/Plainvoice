# Webhook Checklist

Staging webhooks must be public HTTPS URLs. Nothing in Vapi, Twilio, Cal.com, or SMS staging configuration should point to localhost, `127.0.0.1`, a developer tunnel, or production.

## Vapi Webhook URL

Expected staging URL:

```text
https://<staging-api-host>/api/webhooks/vapi
```

Checklist:

- `PUBLIC_API_URL` on the API host is `https://<staging-api-host>`.
- `NEXT_PUBLIC_API_URL` is also the staging API host.
- The API responds at `GET https://<staging-api-host>/health`.
- New or updated Vapi assistants show the staging server URL.
- Imported Vapi phone numbers show the staging server URL.
- `VAPI_WEBHOOK_SECRET` is set on the API if webhook verification is required.
- Vapi sends `x-vapi-secret` matching `VAPI_WEBHOOK_SECRET` when the secret is configured.
- No assistant or phone-number server URL points at localhost, `127.0.0.1`, ngrok, or production.

Reachability test:

```sh
curl -i https://<staging-api-host>/health
```

For the webhook endpoint itself, a bare GET is not expected to succeed because Vapi sends POST payloads. Use Vapi's dashboard/test tooling or a controlled POST fixture when available.

## Twilio Phone Number

Checklist:

- Twilio staging account/subaccount credentials are set on the API host.
- The phone number used for staging is clearly labeled and safe for test calls.
- The number is purchased/imported through PlainVoice staging or manually connected to the staging Vapi resource.
- The PlainVoice `phone_numbers` row has the expected `twilio_sid`, `vapi_phone_number_id`, `agent_id`, and `provisioning_status`.
- Inbound calls route through Vapi to `https://<staging-api-host>/api/webhooks/vapi`.
- The staging Twilio number does not point to localhost, ngrok, or production webhooks.

## Cal.com Booking

Checklist:

- The staging organization has `booking_enabled=true` only when ready to test booking.
- The Cal.com API key belongs to a test account or safe staging calendar.
- The Cal.com event type ID is numeric.
- The organization timezone is correct.
- Vapi tool calls can check availability before booking.
- Missing Cal.com credentials return the app's disabled/missing-configuration message instead of failing the call.
- Test bookings are easy to identify in Cal.com metadata or event naming.

## SMS Sending

Checklist:

- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set on the API host.
- `TWILIO_PHONE_NUMBER` is set as a valid E.164 fallback sender.
- Organization Settings has SMS enabled only when ready to test.
- Organization SMS sender number is valid E.164 or intentionally relies on the fallback.
- Test recipients have consent to receive staging SMS.
- Missing Twilio credentials or missing sender number returns skipped/failed status without breaking call persistence.
- The call record shows SMS status after a completed call.

## What Must Not Point To Localhost

Before staging testing, search these provider dashboards and app settings:

- Vapi assistant server URL
- Vapi phone-number server URL
- Twilio inbound call routing for the staging number
- Any manually configured Twilio messaging webhook
- Cal.com redirect or webhook URLs if added later
- Supabase Auth site URL and redirect URLs
- Web `NEXT_PUBLIC_API_URL`
- API `PUBLIC_API_URL`
- API `NEXT_PUBLIC_SITE_URL`

Disallowed in staging:

- `http://localhost:*`
- `http://127.0.0.1:*`
- developer-only ngrok/local tunnel URLs
- production API or web hosts

## End-To-End Webhook Test

1. Confirm API health with `curl -i https://<staging-api-host>/health`.
2. Create or update a staging agent so Vapi receives the current server URL.
3. Assign a staging phone number to that agent.
4. Call the staging phone number from a test phone.
5. Confirm the call appears in PlainVoice staging.
6. Confirm transcript/summary/contact data saves when Vapi sends end-of-call data.
7. Confirm Cal.com and SMS behavior matches the organization's settings.
