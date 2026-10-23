#!/usr/bin/env bash
# Smoke-tests the backend a release build points at, the way the store extension calls it: no
# cookies, no Authorization header, Origin chrome-extension://<item id>.
#
#   CMS_BASE_URL=https://… EXTENSION_ORIGIN=chrome-extension://<item id> \
#     CHECKLIST=checklist.tsv .github/scripts/smoke-backend.sh
#
# Each check is appended to CHECKLIST as "pass|warn|fail<TAB>check<TAB>detail" for the release
# notes. Fails (exit 1) on 401, 403, 5xx, no response, or a missing CORS grant for the extension
# origin. Other 4xx (404 unknown route, 429 daily allowance used up) are warnings.
#
# /api/translate makes one real, cheap call (a fixed sentence, so a cache hit after the first run).
# /api/exercises is pure computation on the backend.
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

check_api() { # path body
  local path="$1" body="$2" status verdict allow methods headers

  # Preflight, as Chrome sends it before the background worker's JSON POST.
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

  status="$(request POST "$path" \
    --header "Origin: ${EXTENSION_ORIGIN}" \
    --header "Content-Type: application/json" \
    --data-binary "$body")"
  verdict="$(classify "$status")"
  allow="$(header "$tmp/headers" access-control-allow-origin)"
  case "$status" in
    404) record "$verdict" "POST ${path}" "404: route not found on this backend" ;;
    429) record "$verdict" "POST ${path}" "429: backend alive, daily allowance used up" ;;
    *)
      if [[ "$verdict" == pass ]] && ! allows_origin "$allow"; then
        record fail "POST ${path}" "${status}, but no allow-origin for ${EXTENSION_ORIGIN}"
      elif [[ "$verdict" == pass ]]; then
        record pass "POST ${path}" "${status}, allow-origin ${allow}"
      else
        record "$verdict" "POST ${path}" "status ${status} $(head -c 200 "$tmp/body") $(cat "$tmp/curl-error")"
      fi
      ;;
  esac
}

check_api /api/translate "$TRANSLATE_BODY"
check_api /api/exercises "$EXERCISES_BODY"
check_api /api/tts "$TTS_BODY"

if ((failed)); then
  echo "Backend smoke test FAILED against ${CMS_BASE_URL}" >&2
  exit 1
fi
echo "Backend smoke test passed against ${CMS_BASE_URL}"
