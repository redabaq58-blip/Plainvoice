# Manual Call QA Checklist

Run this checklist whenever voice prompts, templates, or Vapi config change.
Each scenario has a setup, the expected agent behavior, and pass/fail criteria.
A scenario fails if the agent gives a robotic response, hallucinates, promises something it cannot do, or derails the conversation.

---

## How to Use

1. Go to `/[locale]/agents/[id]` → **Test** tab.
2. Click **Start Call** (requires `NEXT_PUBLIC_VAPI_PUBLIC_KEY` set).
3. Work through each scenario. Mark ✅ pass or ❌ fail with a note.
4. Fix any failing scenario before merging prompt changes.

---

## Scenario 1 — French receptionist: basic question

**Setup:** Agent language = `fr`, vertical = `general` or any.
**Caller says:** "Bonjour, quelles sont vos heures d'ouverture ?"

**Expected:**
- Responds in French.
- Gives hours if they are in the knowledge base.
- If hours are not configured, says plainly it doesn't have that information and offers to take a message.
- Does NOT invent hours.

**Pass:** Correct answer or honest "I don't know". One or two sentences max.
**Fail:** Invents hours. Switches to English. Gives a long scripted disclaimer.

---

## Scenario 2 — English receptionist: basic question

**Setup:** Agent language = `en`, vertical = `general` or any.
**Caller says:** "Hi, what services do you offer?"

**Expected:**
- Responds in English.
- Summarizes services from the knowledge base if present.
- If no services configured, says it can help with questions or booking and asks what they need.

**Pass:** Relevant, concise answer. No hallucination.
**Fail:** Answers in French. Makes up services. Reads out a long robotic list.

---

## Scenario 3 — Bilingual caller switches language mid-call

**Setup:** Agent language = `bilingual`.
**Caller says (English):** "Hi, I'd like to book an appointment."
**Agent responds** in English.
**Caller then says (French):** "Désolé, je préfère parler en français."

**Expected:**
- Agent switches to French immediately and continues in French for the rest of the call.
- Does not revert back to English unless the caller does.

**Pass:** Clean language switch. Call continues naturally in French.
**Fail:** Agent stays in English. Agent asks again which language they prefer after the caller has already stated it.

---

## Scenario 4 — Appointment booking: happy path

**Setup:** Agent has Cal.com connected. Agent language = `fr` or `en`.
**Caller says:** "Je voudrais prendre un rendez-vous pour mardi prochain."

**Expected:**
1. Agent uses `check_availability` to look up slots.
2. Offers at most two available times.
3. Confirms the selected time with the caller.
4. Collects name, email, phone, and short reason.
5. Uses `book_appointment` only after caller clearly agrees.
6. Confirms booking with a clear, short confirmation.

**Pass:** Booking completes. Caller only asked one question at a time.
**Fail:** Agent offers 5+ time slots. Books without confirming. Skips collecting contact details.

---

## Scenario 5 — Pricing question: answer in knowledge base

**Setup:** Pricing notes are filled in the knowledge base (e.g., "Consultation: $150").
**Caller says:** "How much does a consultation cost?"

**Expected:**
- Agent gives the price from the knowledge base.
- Does not add disclaimers like "prices may vary" unless they are in the knowledge base.

**Pass:** Correct price stated. Concise.
**Fail:** Agent says it doesn't know when the answer is in the knowledge base. Agent adds unsolicited caveats.

---

## Scenario 6 — Unknown question: agent says "I don't know"

**Setup:** Knowledge base has no pricing. Caller asks about pricing.
**Caller says:** "What are your prices?"

**Expected:**
- Agent says it doesn't have that information.
- Offers to take a message or connect them with the team.
- Does NOT invent a price.

**Pass:** Honest response. Offers a next step.
**Fail:** Invents pricing. Gives a vague non-answer without offering a next step.

---

## Scenario 7 — Emergency / urgent call

**Setup:** Agent vertical = `plumbing` or `hvac`. Emergency instructions are filled in knowledge base.
**Caller says:** "I have water flooding my basement right now."

**Expected:**
- Agent recognizes urgency immediately.
- Delivers the emergency instructions first (e.g., "Shut off the main water valve").
- Collects address and callback number quickly.
- Does not start booking a regular appointment.

**Pass:** Emergency instructions delivered first. Calm and clear. Collects essentials.
**Fail:** Agent treats it as a routine booking request. Gives a long scripted intro before helping.

---

## Scenario 8 — Caller asks to speak to a human: transfer configured

**Setup:** Agent has `transfer_phone_number` set.
**Caller says:** "Can I speak to someone?"

**Expected:**
- Agent offers to transfer.
- Uses the language from the Transfer section of the prompt.
- Initiates the transfer.

**Pass:** Transfer initiated cleanly. Agent does not argue or stall.
**Fail:** Agent says it cannot transfer when a number is configured. Agent ignores the request.

---

## Scenario 9 — Caller asks to speak to a human: no transfer configured

**Setup:** Agent has NO `transfer_phone_number`.
**Caller says:** "I want to speak to a real person."

**Expected:**
- Agent says it cannot transfer right now.
- Offers to take a detailed message so the team can follow up.
- Does NOT promise a transfer that cannot happen.

**Pass:** Honest response. Message offer made.
**Fail:** Agent promises a transfer. Agent ignores the request. Agent repeats the same line multiple times.

---

## Scenario 10 — Caller interrupts the agent mid-sentence

**Setup:** Any agent language and vertical.
**Caller interrupts** the agent while it is speaking.

**Expected:**
- Agent stops and responds to what the caller said.
- Does not restart from the beginning of its previous sentence.
- Continues naturally.

**Pass:** Clean interruption handling. Conversation flows.
**Fail:** Agent finishes its full sentence after being interrupted. Agent becomes confused and repeats itself.

---

## Scenario 11 — Caller gives a vague or incomplete answer

**Setup:** Agent asks: "What's your name?"
**Caller says:** "Um, yeah."

**Expected:**
- Agent asks once more, clearly: "Could you give me your name?"
- Does not accept the non-answer and move on.
- Does not ask more than twice for the same piece of information.

**Pass:** Agent asks again politely. Does not get stuck in a loop.
**Fail:** Agent accepts "um, yeah" as a name. Agent asks the same question three or more times in a row.

---

## Scenario 12 — Call summary and transcript in dashboard

**Setup:** Complete any of the above calls.

**Expected:**
- After the call ends, go to `/[locale]/calls`.
- The call appears in the list with the correct duration, caller number, and status.
- The transcript is accessible and reflects the actual conversation.
- If booking occurred, it is linked to the call record.

**Pass:** Call logged. Transcript readable. No missing data.
**Fail:** Call does not appear. Transcript is empty. Duration shows 0. Booking not linked.

---

## Scenario 13 — Accented caller (multilingual real-world STT test)

**Purpose:** Validate that Deepgram transcription works for the real SMB caller population in Quebec, Canada, and the Americas.

**Setup:** Test with at least two of these caller profiles:
- Quebec French accent (native FR speaker)
- Moroccan or Maghrebi French accent
- Indian English accent
- Latino/Hispanic English accent
- Standard North American English

**Expected:**
- Agent understands the caller without asking them to repeat more than once.
- Responses remain in the correct language (no language flip due to STT misread).
- For bilingual agents, the `language: "multi"` transcriber correctly identifies the language being spoken.

**Pass:** Caller understood. Language correct. No repeated misreadings.
**Fail:** Agent consistently misunderstands one accent. Bilingual agent defaults to English when caller spoke French. Agent switches languages mid-response due to STT error.

**Note:** If consistent failures are seen for a specific accent, log the Deepgram model used and consider testing with `nova-3` (multilingual) for all agent types, not just bilingual.
