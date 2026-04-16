# PlainVoice — Release Gate QA Checklist

**Purpose:** Verify every critical layer is stable before adding Twilio/SMS/WhatsApp provisioning.
**Rule:** A feature is "good enough to continue" only if it works in the browser, survives refresh/relogin, writes correct data to Supabase, handles at least one failure case cleanly, and does not break an already-working flow.

Mark each item: `[x]` Pass · `[!]` Fail · `[~]` Flaky

---

## Prerequisites

```bash
# Terminal 1 — Frontend
cd apps/web && pnpm dev                          # must run on localhost:3000 (CORS is hardcoded)

# Terminal 2 — Backend
cd apps/api && uvicorn app.main:app --reload     # localhost:8000

# Terminal 3 — Local DB (if not using hosted Supabase)
npx supabase start
```

> **CORS Warning:** `apps/api/app/main.py` allows only `http://localhost:3000`. If the frontend starts on port 3001 or any other, ALL API calls will silently fail with a network error. Fix: restart Next.js until it lands on 3000, or update `allow_origins` in `main.py`.

---

## Block A — Auth + Orgs

### A1. App Boot

| # | Action | Expected |
|---|--------|----------|
| 1 | Open `http://localhost:3000` | Redirects to `/fr/auth/login` |
| 2 | Open `http://localhost:3000/fr/dashboard` without login | Redirects to login, does not flash dashboard |
| 3 | Check browser console + both terminals | Zero crash errors |
| 4 | GET `http://localhost:8000/health` | `{"status":"ok","service":"plainvoice-api"}` |

- [ ] All 4 pass → continue
- Stop here if: terminal shows import errors or the health endpoint returns anything other than 200.

---

### A2. Signup + Org Creation

| # | Action | Expected |
|---|--------|----------|
| 1 | Go to `/fr/auth/signup` | Form shows: Nom de l'organisation, Email, Mot de passe, Confirmer |
| 2 | Submit mismatched passwords | Page reloads with error, no account created |
| 3 | Submit valid form (orgName: `Clinique Test`, email: `test@example.com`, password: `Test1234!`) | Redirects to `/fr/dashboard` |
| 4 | Verify Supabase (see SQL below) | 3 correct records |
| 5 | Sign out | Redirects to `/fr/auth/login` |

**Supabase verification SQL:**
```sql
-- Check user exists
SELECT id, email, created_at
FROM auth.users
WHERE email = 'test@example.com';

-- Check org was created with correct slug
SELECT id, name, slug, voice_minutes_used, credits_balance
FROM organizations
WHERE name = 'Clinique Test';
-- Expected: slug = 'clinique-test', voice_minutes_used = 0, credits_balance = 0

-- Check owner membership
SELECT om.role, om.user_id, o.name
FROM organization_members om
JOIN organizations o ON o.id = om.org_id
WHERE o.name = 'Clinique Test';
-- Expected: role = 'owner'
```

- [ ] Signup works, all 3 DB records correct → continue
- Stop here if: redirect fails, org row is missing, or membership role is not 'owner'.

---

### A3. Login + Session Persistence

| # | Action | Expected |
|---|--------|----------|
| 1 | Log in with the account created in A2 | Lands on `/fr/dashboard` |
| 2 | Hard-refresh the dashboard page (Ctrl+Shift+R) | Stays on dashboard, does not redirect to login |
| 3 | Open `/en/dashboard` | Shows dashboard in English |
| 4 | Open `/fr/dashboard` | Shows dashboard in French |
| 5 | Open DevTools → Application → Cookies | `sb-*-auth-token` cookie present |
| 6 | Open protected route `/fr/agents` directly | Renders agents page (no redirect) |

- [ ] All 6 pass → continue
- Stop here if: refresh redirects to login or locale routes break the session.

---

## Block B — Agents + Vapi

### B1. Create Agent

| # | Action | Expected |
|---|--------|----------|
| 1 | Click "Nouvel agent" (or New Agent) | Opens `/fr/agents/new` |
| 2 | Submit empty form | Validation errors appear, no submission |
| 3 | Fill: Name=`Agent Dental Test`, Vertical=`Dental`, Language=`fr` | System prompt + first message auto-fill |
| 4 | Change vertical to `Plumbing` | Prompts update to plumbing templates |
| 5 | Set Voice Provider=`ElevenLabs`, Status=`Draft`, submit | Redirects to agent detail page |

**Supabase verification SQL:**
```sql
SELECT id, name, vertical, language, voice_provider, status,
       vapi_assistant_id, created_at
FROM voice_agents
WHERE name = 'Agent Dental Test'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: all fields populated, vapi_assistant_id NOT NULL
```

**Vapi verification:**
- Go to `https://dashboard.vapi.ai` → Assistants
- Confirm assistant named `Agent Dental Test` exists
- Confirm model is set to Claude Sonnet 4.5 (Anthropic)

- [ ] Agent in DB with vapi_assistant_id → continue
- [ ] Agent exists in Vapi dashboard → continue
- Stop here if: vapi_assistant_id is NULL (Vapi sync failed).

---

### B2. Edit Agent

| # | Action | Expected |
|---|--------|----------|
| 1 | Open the agent from B1 | All fields pre-populated |
| 2 | Change Name to `Agent Dental Test (MAJ)`, Status to `Active` | — |
| 3 | Save | No redirect; page refreshes showing new values |
| 4 | Hard-refresh | New name + status persist |

**Supabase verification SQL:**
```sql
SELECT name, status, updated_at
FROM voice_agents
WHERE name LIKE 'Agent Dental Test%'
ORDER BY updated_at DESC LIMIT 1;
-- Expected: name = 'Agent Dental Test (MAJ)', status = 'active'
```

**Vapi verification:**
- Confirm Vapi dashboard assistant name also changed.

- [ ] Edit persists in DB and Vapi → continue

---

### B3. Delete Agent

| # | Action | Expected |
|---|--------|----------|
| 1 | Open agent detail → Delete button | Confirmation dialog appears |
| 2 | Cancel | Dialog closes, agent still exists |
| 3 | Delete again → Confirm | Redirects to `/fr/agents`, agent gone from list |

**Supabase verification SQL:**
```sql
SELECT id FROM voice_agents WHERE name = 'Agent Dental Test (MAJ)';
-- Expected: 0 rows
```

**Vapi verification:**
- Confirm assistant no longer exists in Vapi dashboard.

- [ ] Deleted from DB and Vapi → continue

---

### B4. Browser Test Call

> Requires a NEW active agent with a valid Vapi assistant.

| # | Action | Expected |
|---|--------|----------|
| 1 | Create a fresh active agent (Status=`Active`) | — |
| 2 | Open agent detail page | Web call widget / test call button visible |
| 3 | Click Start Call — allow microphone | Call connects, AI answers |
| 4 | Speak naturally | AI responds |
| 5 | Interrupt AI mid-response | AI stops and listens |
| 6 | End call normally | UI updates to ended state, no crash |
| 7 | Deny microphone on a new call attempt | Clear error message shown |
| 8 | Check browser console | No unhandled promise rejections |

- [ ] Call starts and ends cleanly → continue
- [~] Note any flaky connection issues here: _______________
- Stop here if: call consistently fails to connect.

---

## Block C — Webhook + History

### C1. Simulated Webhook Tests

> Run: `bash scripts/test-webhooks.sh`
> (Set env vars first — see the script header)

| Test | Expected Response |
|------|-----------------|
| `status-update` | `{"received":true}` HTTP 200 |
| `end-of-call-report` | `{"received":true}` HTTP 200 |
| `assistant-request` (valid phone) | `{"assistant":{...config...}}` HTTP 200 |
| `assistant-request` (unknown phone) | `{"assistant":{}}` HTTP 200 |
| `tool-calls` (check_availability) | `{"results":[{"toolCallId":"tc-001","result":"Demain 10h, Demain 14h, Vendredi 9h"}]}` HTTP 200 |
| Malformed JSON body | HTTP 422 (FastAPI validation error — this is correct, Vapi always sends valid JSON) |
| Wrong `x-vapi-secret` | HTTP 401 |

> **Known stub:** `check_availability` always returns `"Demain 10h, Demain 14h, Vendredi 9h"` — this is intentional, not a bug.

**After running `end-of-call-report` sim:**
```sql
-- Check call was inserted (use the TEST_ORG_ID you set in the script)
SELECT id, vapi_call_id, direction, status, duration_seconds,
       credits_used, transcript, summary
FROM calls
WHERE vapi_call_id = 'test-call-sim-001'
ORDER BY created_at DESC LIMIT 1;
-- Expected: direction='web', status='completed', duration_seconds=90,
--           credits_used=2 (ceil(90/60)), transcript=[...], summary not null

-- Check org usage updated
SELECT voice_minutes_used, credits_balance
FROM organizations
WHERE id = 'YOUR_TEST_ORG_ID';
-- Expected: voice_minutes_used increased by 1, credits_balance decreased by 2
```

- [ ] All webhook tests return 200 → continue
- [ ] DB records correct after end-of-call-report sim → continue
- Stop here if: webhook returns 500 or DB records are missing/malformed.

---

### C2. Real Call Webhook Persistence

> Make a real browser call using the agent from B4, then end it.

| # | Check | Expected |
|---|-------|----------|
| 1 | Row added to `calls` | Yes, within seconds of ending call |
| 2 | `transcript` column | JSON array of role+content objects |
| 3 | `summary` column | Non-null string |
| 4 | `duration_seconds` | Matches approximate call length |
| 5 | `direction` | `'web'` |
| 6 | `status` | `'completed'` |
| 7 | Org `voice_minutes_used` | Incremented |

**SQL:**
```sql
SELECT vapi_call_id, direction, status, duration_seconds,
       credits_used, summary, jsonb_array_length(transcript) AS transcript_turns
FROM calls
WHERE direction = 'web'
ORDER BY created_at DESC LIMIT 1;
```

> **Known limitation:** Web calls rely on `metadata.org_id` being passed by the Vapi Web SDK. If `org_id` is not in metadata, the webhook will log "Could not resolve org" and silently skip the insert. If the call row is missing, check `uvicorn` logs for this warning.

- [ ] Real call data persists correctly → continue
- Stop here if: no row inserted. Check API logs first before anything else.

---

### C3. Call History Dashboard

| # | Action | Expected |
|---|--------|----------|
| 1 | Open `/fr/calls` | Table with call rows, stats cards visible |
| 2 | Click a call row | Opens `/fr/calls/[id]` with transcript |
| 3 | Filter by Direction=`Web` | Only web calls shown |
| 4 | Filter by Sentiment=`Positive` | Only positive calls shown (or empty) |
| 5 | Search by phone number | Results filter live after ~400ms |
| 6 | Click Next/Prev pagination | Page changes |
| 7 | Make a new test call while page is open | New row appears without manual refresh |

> **Known limitation:** Realtime only handles `INSERT` events. Status changes mid-call do NOT update the table in real-time — only new completed calls appear.

- [ ] Table loads and filters work → continue
- [ ] Detail page shows correct transcript → continue
- [~] Realtime insert updates page: Yes / No / Flaky: _______________
- Stop here if: page throws a React error or transcript is blank when DB shows data.

---

## Block D — Multi-Tenant Safety

### D1. Cross-Org Data Isolation

| # | Action | Expected |
|---|--------|----------|
| 1 | Sign out, sign up as a second user (`user2@example.com`, org: `Autre Org`) | Creates separate org |
| 2 | Log in as User 2 — open `/fr/agents` | Zero agents (User 1's agents invisible) |
| 3 | Open `/fr/calls` as User 2 | Zero calls |
| 4 | Note User 1's agent ID from the URL (e.g., `abc-123`) | — |
| 5 | As User 2, navigate to `/fr/agents/abc-123` | 404 or "not found", not User 1's data |

**Supabase RLS verification:**
```sql
-- Run as an anon/user2 token (not service role) — should return 0 rows
SELECT COUNT(*) FROM voice_agents WHERE org_id = '<user1_org_id>';
-- Expected: 0 rows (RLS blocks cross-org access)
```

- [ ] User 2 sees zero of User 1's data → continue
- Stop here if: cross-org data leaks. This is not optional — fix RLS before any next step.

---

## Block E — Failure Cases

| # | Failure Scenario | Expected Behavior |
|---|-----------------|------------------|
| 1 | Kill API server, try to create agent in browser | Error message shown, page does not crash |
| 2 | Restart API server | Everything works again without page reload |
| 3 | Submit agent form with name > 100 chars | Validation error before API call |
| 4 | Open `/fr/agents/non-existent-uuid` | 404 or "Agent not found" message |
| 5 | Expire session (clear cookies), refresh dashboard | Redirects to login cleanly |
| 6 | Open calls page with zero calls | Empty state UI visible, no crash |
| 7 | Open agents page with zero agents | Empty state UI visible, no crash |

- [ ] All failure cases handled gracefully → release gate passed

---

## Final Verdict

Complete this section after all blocks.

| Block | Status | Notes |
|-------|--------|-------|
| A — Auth + Orgs | Pass / Fail / Partial | |
| B — Agents + Vapi | Pass / Fail / Partial | |
| C — Webhook + History | Pass / Fail / Partial | |
| D — Multi-Tenant | Pass / Fail / Partial | |
| E — Failure Cases | Pass / Fail / Partial | |

**Known issues to fix before next session:**
- [ ] _____________________________________________
- [ ] _____________________________________________
- [ ] _____________________________________________

**Decision:** Ready to add Twilio provisioning? Yes / No / Fix first: _______________

**Tested on:** (date) _______________ by _______________
