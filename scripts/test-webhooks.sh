#!/usr/bin/env bash
# =============================================================================
# PlainVoice — Vapi Webhook Simulator
# =============================================================================
# Tests all 4 Vapi webhook event types against the local FastAPI backend.
# Run with: bash scripts/test-webhooks.sh
#
# Required env vars (set before running, or edit defaults below):
#   VAPI_WEBHOOK_SECRET  — matches VAPI_WEBHOOK_SECRET in apps/api/.env
#   TEST_ORG_ID          — a valid org UUID from your organizations table
#   TEST_PHONE_NUMBER    — a phone_number from your phone_numbers table (e+164 format)
#   API_URL              — FastAPI base URL (default: http://localhost:8000)
# =============================================================================

API_URL="${API_URL:-http://localhost:8000}"
VAPI_WEBHOOK_SECRET="${VAPI_WEBHOOK_SECRET:-changeme}"
TEST_ORG_ID="${TEST_ORG_ID:-00000000-0000-0000-0000-000000000000}"
TEST_PHONE_NUMBER="${TEST_PHONE_NUMBER:-+15141234567}"
ENDPOINT="$API_URL/api/webhooks/vapi"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_response() {
  local label="$1"
  local http_code="$2"
  local body="$3"
  local expected_code="${4:-200}"

  echo ""
  echo "────────────────────────────────────────────"
  echo "TEST: $label"
  echo "HTTP: $http_code"
  echo "BODY: $body"

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
  else
    echo -e "${RED}FAIL${NC} — expected HTTP $expected_code, got $http_code"
  fi
}

echo "============================================"
echo "PlainVoice Vapi Webhook Tests"
echo "API URL  : $API_URL"
echo "Secret   : ${VAPI_WEBHOOK_SECRET:0:4}****"
echo "Org ID   : $TEST_ORG_ID"
echo "Phone    : $TEST_PHONE_NUMBER"
echo "============================================"

# =============================================================================
# 1. status-update
# =============================================================================
# Simulates Vapi notifying us that a call has changed status.
# Expected: HTTP 200, {"received": true}
# DB effect: PATCH calls SET status='in-progress' WHERE vapi_call_id='test-call-sim-001'
#            (no-op if call doesn't exist yet — handler skips silently)

RESPONSE=$(curl -s -o /tmp/wh_body.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "status-update",
      "call": {
        "id": "test-call-sim-001",
        "type": "webCall",
        "status": "in-progress",
        "metadata": {
          "org_id": "'"$TEST_ORG_ID"'"
        }
      }
    }
  }')

check_response "status-update" "$RESPONSE" "$(cat /tmp/wh_body.txt)"

# =============================================================================
# 2. end-of-call-report (web call)
# =============================================================================
# Simulates a complete web call ending.
# Expected: HTTP 200, {"received": true}
# DB effects:
#   - INSERT into calls (direction='web', status='completed', duration_seconds=90,
#     credits_used=2, transcript=[...], summary=...)
#   - UPDATE organizations SET voice_minutes_used += 1, credits_balance -= 2
#   - UPDATE contacts (if contact with from_number exists)
#
# Verify after running:
#   SELECT * FROM calls WHERE vapi_call_id = 'test-call-sim-001';
#   SELECT voice_minutes_used, credits_balance FROM organizations WHERE id = '$TEST_ORG_ID';

RESPONSE=$(curl -s -o /tmp/wh_body.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "end-of-call-report",
      "call": {
        "id": "test-call-sim-001",
        "type": "webCall",
        "status": "ended",
        "startedAt": "2026-04-16T10:00:00Z",
        "endedAt": "2026-04-16T10:01:30Z",
        "endedReason": "customer-ended-call",
        "durationSeconds": 90,
        "customer": {
          "number": "+15149999999"
        },
        "metadata": {
          "org_id": "'"$TEST_ORG_ID"'"
        }
      },
      "artifact": {
        "messages": [
          {"role": "assistant", "message": "Bonjour, bienvenue chez Clinique Test. Comment puis-je vous aider?"},
          {"role": "user",      "message": "Oui, je voudrais prendre un rendez-vous."},
          {"role": "assistant", "message": "Bien sûr! Avez-vous une préférence de date?"},
          {"role": "user",      "message": "Demain si possible."},
          {"role": "assistant", "message": "Parfait, j'\''ai une disponibilité demain à 10h. Est-ce que ça vous convient?"}
        ],
        "summary": "Customer called to book an appointment. Offered tomorrow at 10am.",
        "recordingUrl": null
      }
    }
  }')

check_response "end-of-call-report (web call)" "$RESPONSE" "$(cat /tmp/wh_body.txt)"
echo -e "${YELLOW}Verify DB:${NC} SELECT * FROM calls WHERE vapi_call_id = 'test-call-sim-001';"

# =============================================================================
# 3a. assistant-request — phone number found in DB
# =============================================================================
# Simulates Vapi asking "which assistant should handle this inbound call?"
# Expected: HTTP 200, {"assistant": { <full vapi config> }}
# Note: TEST_PHONE_NUMBER must exist in phone_numbers table pointing to an active agent.

RESPONSE=$(curl -s -o /tmp/wh_body.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-call-inbound-001",
        "type": "inboundPhoneCall",
        "phoneNumber": {
          "number": "'"$TEST_PHONE_NUMBER"'"
        },
        "customer": {
          "number": "+15141112222"
        }
      }
    }
  }')

check_response "assistant-request (known phone → agent config)" "$RESPONSE" "$(cat /tmp/wh_body.txt)"
if echo "$(cat /tmp/wh_body.txt)" | grep -q '"assistant"'; then
  echo -e "${GREEN}assistant key present in response${NC}"
else
  echo -e "${YELLOW}NOTE: assistant config empty — verify phone_numbers table has TEST_PHONE_NUMBER='$TEST_PHONE_NUMBER' linked to an active agent${NC}"
fi

# =============================================================================
# 3b. assistant-request — unknown phone number
# =============================================================================
# Expected: HTTP 200, {"assistant": {}} — empty config (graceful no-op)

RESPONSE=$(curl -s -o /tmp/wh_body.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-call-unknown-phone",
        "type": "inboundPhoneCall",
        "phoneNumber": {
          "number": "+19995550000"
        }
      }
    }
  }')

check_response "assistant-request (unknown phone → empty config)" "$RESPONSE" "$(cat /tmp/wh_body.txt)"

# =============================================================================
# 4. tool-calls (check_availability)
# =============================================================================
# Simulates Vapi calling our check_availability function tool during a live call.
# Expected: HTTP 200, {"results":[{"toolCallId":"tc-001","result":"Demain 10h, Demain 14h, Vendredi 9h"}]}
# Note: This is a hardcoded stub — real availability lookup is not yet implemented.

RESPONSE=$(curl -s -o /tmp/wh_body.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "tool-calls",
      "call": {
        "id": "test-call-sim-001",
        "type": "webCall"
      },
      "toolCallList": [
        {
          "id": "tc-001",
          "function": {
            "name": "check_availability",
            "arguments": {}
          }
        }
      ]
    }
  }')

check_response "tool-calls (check_availability stub)" "$RESPONSE" "$(cat /tmp/wh_body.txt)"
EXPECTED_RESULT="Demain 10h"
if echo "$(cat /tmp/wh_body.txt)" | grep -q "$EXPECTED_RESULT"; then
  echo -e "${GREEN}Stub result matches expected${NC}"
else
  echo -e "${RED}FAIL — expected result to contain '$EXPECTED_RESULT'${NC}"
fi

# =============================================================================
# 5. Wrong webhook secret
# =============================================================================
# Expected: HTTP 401

RESPONSE=$(curl -s -o /tmp/wh_body.txt -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: wrong-secret-value" \
  -d '{
    "message": {
      "type": "status-update",
      "call": {"id": "x", "type": "webCall", "status": "ended"}
    }
  }')

check_response "wrong x-vapi-secret" "$RESPONSE" "$(cat /tmp/wh_body.txt)" "401"

# =============================================================================
echo ""
echo "============================================"
echo "All tests complete."
echo "Next steps:"
echo "  - Check uvicorn logs for any WARNING/ERROR lines"
echo "  - Verify DB state with the SQL in QA_CHECKLIST.md Block C"
echo "  - Run a real browser call to test end-to-end webhook persistence"
echo "============================================"
