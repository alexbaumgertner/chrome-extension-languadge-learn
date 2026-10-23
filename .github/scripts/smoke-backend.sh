#!/usr/bin/env bash
# Smoke-tests the backend a release build points at, the way the store extension calls it: no
# cookies, no Authorization header, Origin chrome-extension://<item id>.
#
#   CMS_BASE_URL=https://… EXTENSION_ORIGIN=chrome-extension://<item id> \
#     CHECKLIST=checklist.tsv .github/scripts/smoke-backend.sh
#
# Each check is appended to CHECKLIST as "pass|warn|fail<TAB>check<TAB>detail" for the release
# notes. Fails (exit 1) on no response, 5xx, any 4xx a route doesn't tolerate, a missing CORS grant
# for the extension origin, or a 2xx body the extension's response schema rejects. Tolerated, as
# warnings: 429 (daily allowance used up) on /api/translate and /api/exercises, and 404 on /api/tts.
#
# /api/translate makes one real, cheap call (a fixed sentence, so a cache hit after the first run).
# /api/exercises is pure computation on the backend. /api/report and /api/events get only an
# empty body, which their validation refuses before any write.
set -euo pipefail

: "${CMS_BASE_URL:?CMS_BASE_URL is not set}"
: "${EXTENSION_ORIGIN:?EXTENSION_ORIGIN is not set}"
CHECKLIST="${CHECKLIST:-/dev/null}"

# Request bodies, shaped like the extension's calls (packages/shared/src/schemas/cms.ts).
TRANSLATE_BODY='{"text":"Сегодня хорошая погода, и мы гуляем в парке.","level":"A1-A2","topic":"release-smoke-test"}'
EXERCISES_BODY='{"variantText":"Heute ist das Wetter schön.","markedVocab":[{"start":14,"end":20,"german":"Wetter","lemma":"das Wetter","russian":"погода"}],"level":"A1-A2","topic":"release-smoke-test"}'
# The backend in apps/cms has no /api/tts route yet (dictation uses the browser's speech
# synthesis), so a 404 here is reported as a warning, not a failure.
TTS_BODY='{"text":"Heute ist das Wetter schön.","lang":"de-DE"}'

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
failed=0
repo="$(cd "$(dirname "$0")/../.." && pwd)"

record() { # status check detail
  local detail="${3//[$'\t\r\n']/ }" mark
  detail="${detail%"${detail##*[![:space:]]}"}" # trailing spaces
  printf '%s\t%s\t%s\n' "$1" "$2" "$detail" >>"$CHECKLIST"
  case "$1" in pass) mark="ok  " ;; warn) mark="WARN" ;; *) mark="FAIL" ;; esac
  printf '%s %s — %s\n' "$mark" "$2" "$detail"
  if [[ "$1" == fail ]]; then failed=1; fi
}

# Last value of a response header, without the trailing CR.
header() { # file name
  grep -i "^$2:" "$1" | tail -n 1 | sed -e 's/^[^:]*:[[:space:]]*//' -e 's/\r$//' || true
}

# Prints the HTTP status ("000" when nothing came back); headers and body go to $tmp.
request() { # method path [curl args…]
  local method="$1" path="$2"
  shift 2
  : >"$tmp/headers"
  : >"$tmp/body"
  curl --silent --show-error --max-time 60 --request "$method" \
    --dump-header "$tmp/headers" --output "$tmp/body" --write-out '%{http_code}' \
    "$@" "${CMS_BASE_URL}${path}" 2>"$tmp/curl-error" || true
}

classify() { # status → pass|warn|fail
  local status="$1"
  if [[ "$status" == 000 || "$status" == 401 || "$status" == 403 || "$status" -ge 500 ]]; then
    echo fail
  elif [[ "$status" -ge 200 && "$status" -lt 300 ]]; then
    echo pass
  else
    echo warn
  fi
}

allows_origin() { # access-control-allow-origin value
  [[ "$1" == "$EXTENSION_ORIGIN" || "$1" == "*" ]]
}

# The privacy policy URL goes into the store form, so it must actually serve the page.
status="$(request GET /privacy --location)"
type="$(header "$tmp/headers" content-type)"
if [[ "$status" == 200 && "$type" == text/html* ]]; then
  record pass "GET /privacy" "200, ${type}"
else
  record fail "GET /privacy" "status ${status}, content-type ${type:-none} $(cat "$tmp/curl-error")"
fi

# Validates $tmp/body with the extension's response schema; prints a summary or the problem.
check_body() { # route
  pnpm --silent --filter @sprachweise/cms exec tsx "$repo/.github/scripts/check-api-response.ts" \
    "$1" "$tmp/body" 2>&1
}

# Preflight, as Chrome sends it before the background worker's JSON POST.
check_preflight() { # path
  local path="$1" status allow methods headers
  status="$(request OPTIONS "$path" \
    --header "Origin: ${EXTENSION_ORIGIN}" \
    --header "Access-Control-Request-Method: POST" \
    --header "Access-Control-Request-Headers: content-type")"
  allow="$(header "$tmp/headers" access-control-allow-origin)"
  methods="$(header "$tmp/headers" access-control-allow-methods)"
  headers="$(header "$tmp/headers" access-control-allow-headers)"
  # The POST sends Content-Type: application/json, so Chrome blocks it unless the preflight allows it.
  if [[ "$(classify "$status")" == pass ]] && allows_origin "$allow" && [[ "$methods" == *POST* ]] \
    && [[ "${headers,,}" == *content-type* || "$headers" == "*" ]]; then
    record pass "CORS preflight ${path}" \
      "${status}, allow-origin ${allow}, allow-methods ${methods}, allow-headers ${headers}"
  else
    record fail "CORS preflight ${path}" \
      "status ${status}, allow-origin ${allow:-none}, allow-methods ${methods:-none}, allow-headers ${headers:-none} $(cat "$tmp/curl-error")"
  fi
}

check_api() { # path body tolerated-4xx schema-route
  local path="$1" body="$2" tolerated=" $3 " route="$4" status verdict allow summary

  check_preflight "$path"

  status="$(request POST "$path" \
    --header "Origin: ${EXTENSION_ORIGIN}" \
    --header "Content-Type: application/json" \
    --data-binary "$body")"
  verdict="$(classify "$status")"
  # A 4xx the route doesn't tolerate means the backend rejects the extension's own request shape.
  if [[ "$verdict" == warn && "$tolerated" != *" $status "* ]]; then verdict=fail; fi
  allow="$(header "$tmp/headers" access-control-allow-origin)"
  if [[ "$verdict" == pass ]] && ! allows_origin "$allow"; then
    record fail "POST ${path}" "${status}, but no allow-origin for ${EXTENSION_ORIGIN}"
  elif [[ "$verdict" == pass && -n "$route" ]]; then
    if summary="$(check_body "$route")"; then
      record pass "POST ${path}" "${status}, allow-origin ${allow}, ${summary}"
    else
      record fail "POST ${path}" "${status}, ${summary}"
    fi
  elif [[ "$verdict" == pass ]]; then
    record pass "POST ${path}" "${status}, allow-origin ${allow}"
  elif [[ "$verdict" == warn && "$status" == 404 ]]; then
    record warn "POST ${path}" "404: route not found on this backend"
  elif [[ "$verdict" == warn && "$status" == 429 ]]; then
    record warn "POST ${path}" "429: backend alive, daily allowance used up"
  else
    record "$verdict" "POST ${path}" "status ${status} $(head -c 200 "$tmp/body") $(cat "$tmp/curl-error")"
  fi
}

# Routes that store data (reports, usage events): an empty body must be refused with 400 by the
# route's validation, before anything is written. That proves the route is deployed and answers
# the extension's origin without adding a fake report or event to production.
check_write_route() { # path
  local path="$1" status allow
  check_preflight "$path"
  status="$(request POST "$path" \
    --header "Origin: ${EXTENSION_ORIGIN}" \
    --header "Content-Type: application/json" \
    --data-binary '{}')"
  allow="$(header "$tmp/headers" access-control-allow-origin)"
  if [[ "$status" == 400 ]] && allows_origin "$allow"; then
    record pass "POST ${path} (empty body)" "400 from validation, allow-origin ${allow}; nothing stored"
  elif [[ "$status" == 400 ]]; then
    record fail "POST ${path} (empty body)" "400, but no allow-origin for ${EXTENSION_ORIGIN}"
  else
    record fail "POST ${path} (empty body)" \
      "expected 400, got ${status} $(head -c 200 "$tmp/body") $(cat "$tmp/curl-error")"
  fi
}

check_api /api/translate "$TRANSLATE_BODY" "429" translate
check_api /api/exercises "$EXERCISES_BODY" "429" exercises
# No response schema in packages/shared for /api/tts yet; only status and CORS are checked.
check_api /api/tts "$TTS_BODY" "404" ""
check_write_route /api/report
check_write_route /api/events

if ((failed)); then
  echo "Backend smoke test FAILED against ${CMS_BASE_URL}" >&2
  exit 1
fi
echo "Backend smoke test passed against ${CMS_BASE_URL}"
