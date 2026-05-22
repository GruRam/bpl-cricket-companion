#!/usr/bin/env bash
# Hits every API endpoint and reports pass/fail. Run against `vercel dev`.
# Usage: bash scripts/smoke-test.sh [BASE_URL]   (default: http://localhost:3000)

set -u
BASE=${1:-http://localhost:3000}
PASS=0
FAIL=0
FAILURES=()

# hit METHOD PATH [BODY] [EXPECTED_STATUS]
hit() {
  local method=$1 path=$2 body=${3:-} expected=${4:-200}
  local args=(-s -o /tmp/smoke.body -w "%{http_code}" -X "$method" "$BASE$path")
  if [[ -n $body ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  local status
  status=$(curl "${args[@]}")
  local body_content
  body_content=$(cat /tmp/smoke.body)
  if [[ $status == "$expected" ]]; then
    printf '  [32mPASS[0m %s %s -> %s\n' "$method" "$path" "$status"
    PASS=$((PASS+1))
    echo "$body_content"
  else
    printf '  [31mFAIL[0m %s %s -> %s (expected %s)\n' "$method" "$path" "$status" "$expected"
    printf '       body: %s\n' "$body_content"
    FAIL=$((FAIL+1))
    FAILURES+=("$method $path -> $status")
    echo ""
  fi
}

# Extract a JSON field via node (jq isn't guaranteed on Windows).
jget() { node -e "console.log(JSON.parse(process.argv[1]).$2 ?? '')" "$1" "$2"; }

echo "=== Smoke test against $BASE ==="

echo
echo "--- players ---"
P1=$(hit POST /api/players '{"name":"Smoke-A"}' | tail -1)
P2=$(hit POST /api/players '{"name":"Smoke-B"}' | tail -1)
P3=$(hit POST /api/players '{"name":"Smoke-C"}' | tail -1)
P4=$(hit POST /api/players '{"name":"Smoke-D"}' | tail -1)
P1_ID=$(jget "$P1" id); P2_ID=$(jget "$P2" id); P3_ID=$(jget "$P3" id); P4_ID=$(jget "$P4" id)
echo "  player IDs: $P1_ID $P2_ID $P3_ID $P4_ID"
hit GET /api/players > /dev/null
hit PUT "/api/players/$P1_ID" "{\"name\":\"Smoke-A-renamed\"}" > /dev/null

echo
echo "--- series ---"
S=$(hit POST /api/series '{"name":"Smoke Series","targetWins":2,"isActive":true}' | tail -1)
S_ID=$(jget "$S" id)
echo "  series id: $S_ID"
hit GET /api/series > /dev/null
hit GET /api/series/active > /dev/null

echo
echo "--- teams ---"
T1=$(hit POST /api/teams "{\"name\":\"T1\",\"seriesId\":$S_ID,\"captainId\":$P1_ID}" | tail -1)
T2=$(hit POST /api/teams "{\"name\":\"T2\",\"seriesId\":$S_ID,\"captainId\":$P2_ID}" | tail -1)
T1_ID=$(jget "$T1" id); T2_ID=$(jget "$T2" id)
echo "  team IDs: $T1_ID $T2_ID"
hit PUT "/api/teams/$T1_ID" '{"name":"T1-renamed"}' > /dev/null
hit POST "/api/teams/$T1_ID/players" "{\"playerId\":$P1_ID,\"seriesId\":$S_ID}" > /dev/null
hit POST "/api/teams/$T1_ID/players" "{\"playerId\":$P3_ID,\"seriesId\":$S_ID}" > /dev/null
hit POST "/api/teams/$T2_ID/players" "{\"playerId\":$P2_ID,\"seriesId\":$S_ID}" > /dev/null
hit POST "/api/teams/$T2_ID/players" "{\"playerId\":$P4_ID,\"seriesId\":$S_ID}" > /dev/null
hit GET "/api/teams/$T1_ID/players" > /dev/null
hit GET "/api/teams/$T2_ID/players" > /dev/null
hit GET "/api/series/$S_ID/teams" > /dev/null
hit GET "/api/series/$S_ID/progress" > /dev/null

echo
echo "--- matches ---"
M=$(hit POST /api/matches "{\"seriesId\":$S_ID,\"team1Id\":$T1_ID,\"team2Id\":$T2_ID,\"firstBattingTeamId\":$T1_ID,\"oversPerSide\":2}" | tail -1)
M_ID=$(jget "$M" id)
echo "  match id: $M_ID"
hit POST "/api/matches/$M_ID/players" "{\"playerId\":$P1_ID,\"teamId\":$T1_ID}" > /dev/null
hit POST "/api/matches/$M_ID/players" "{\"playerId\":$P3_ID,\"teamId\":$T1_ID}" > /dev/null
hit POST "/api/matches/$M_ID/players" "{\"playerId\":$P2_ID,\"teamId\":$T2_ID}" > /dev/null
hit POST "/api/matches/$M_ID/players" "{\"playerId\":$P4_ID,\"teamId\":$T2_ID}" > /dev/null
hit GET "/api/matches/$M_ID/players" > /dev/null
hit GET "/api/matches/$M_ID/innings" > /dev/null
hit GET /api/matches/all > /dev/null
hit GET "/api/series/$S_ID/matches" > /dev/null
hit GET "/api/series/$S_ID/recent-matches" > /dev/null

echo
echo "--- ball-by-ball (save-with-context) ---"
hit POST /api/balls/save-with-context "{\"matchId\":$M_ID,\"seriesId\":$S_ID,\"inningsNumber\":1,\"overNumber\":1,\"ballNumber\":1,\"strikerId\":$P1_ID,\"nonStrikerId\":$P3_ID,\"bowlerId\":$P2_ID,\"runs\":4,\"isWide\":false,\"isNoBall\":false,\"isWicket\":false,\"extras\":0,\"battingTeamId\":$T1_ID,\"bowlingTeamId\":$T2_ID}" > /dev/null
hit POST /api/balls/save-with-context "{\"matchId\":$M_ID,\"seriesId\":$S_ID,\"inningsNumber\":1,\"overNumber\":1,\"ballNumber\":2,\"strikerId\":$P1_ID,\"nonStrikerId\":$P3_ID,\"bowlerId\":$P2_ID,\"runs\":1,\"isWide\":false,\"isNoBall\":false,\"isWicket\":false,\"extras\":0,\"battingTeamId\":$T1_ID,\"bowlingTeamId\":$T2_ID}" > /dev/null
hit GET "/api/matches/$M_ID/scorecard" > /dev/null
hit GET "/api/matches/$M_ID/innings" > /dev/null

echo
echo "--- stats ---"
hit GET "/api/players/$P1_ID/stats?seriesId=$S_ID" > /dev/null
hit GET "/api/series/$S_ID/stats" > /dev/null
hit GET /api/stats/all > /dev/null

echo
echo "--- complete the match ---"
hit PATCH "/api/matches/$M_ID" "{\"isCompleted\":true,\"winningTeamId\":$T1_ID}" > /dev/null
hit GET "/api/series/$S_ID/progress" > /dev/null

echo
echo "--- cleanup ---"
hit DELETE "/api/matches/$M_ID" > /dev/null
hit DELETE "/api/teams/$T1_ID/players/$P1_ID" > /dev/null
hit DELETE "/api/teams/$T1_ID/players/$P3_ID" > /dev/null
hit DELETE "/api/teams/$T2_ID/players/$P2_ID" > /dev/null
hit DELETE "/api/teams/$T2_ID/players/$P4_ID" > /dev/null

echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
if (( FAIL > 0 )); then
  printf '%s\n' "${FAILURES[@]}"
  exit 1
fi
