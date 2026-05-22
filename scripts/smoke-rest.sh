#!/usr/bin/env bash
# Self-contained smoke test: sets up its own fixtures, hits every endpoint
# the UI uses, prints pass/fail per call, and cleans up.
set -u
BASE=${1:-http://localhost:3000}
PASS=0; FAIL=0
hit() {
  local method=$1 path=$2 body=${3:-} expected=${4:-200}
  local args=(-s -o /tmp/r.body -w "%{http_code}" --max-time 60 -X "$method" "$BASE$path")
  [[ -n $body ]] && args+=(-H "Content-Type: application/json" -d "$body")
  local code; code=$(curl "${args[@]}")
  if [[ $code == "$expected" ]]; then
    printf 'PASS %-6s %s\n' "$method" "$path"
    PASS=$((PASS+1))
    cat /tmp/r.body
    echo
  else
    printf 'FAIL %-6s %s (got %s, want %s) :: %s\n' "$method" "$path" "$code" "$expected" "$(head -c 250 /tmp/r.body)"
    FAIL=$((FAIL+1))
  fi
}
# Returns just the body of a successful call, for capturing IDs.
capture() {
  local method=$1 path=$2 body=${3:-}
  local args=(-s -o /tmp/c.body -w "%{http_code}" --max-time 60 -X "$method" "$BASE$path")
  [[ -n $body ]] && args+=(-H "Content-Type: application/json" -d "$body")
  curl "${args[@]}" > /dev/null
  cat /tmp/c.body
}
jget() { node -e "console.log(JSON.parse(process.argv[1]).$2 ?? '')" "$1" "$2"; }

echo ">>> Set up fresh fixtures"
P1=$(jget "$(capture POST /api/players '{"name":"R-P1"}')" id)
P2=$(jget "$(capture POST /api/players '{"name":"R-P2"}')" id)
P3=$(jget "$(capture POST /api/players '{"name":"R-P3"}')" id)
P4=$(jget "$(capture POST /api/players '{"name":"R-P4"}')" id)
S=$(jget "$(capture POST /api/series '{"name":"Rest Test","targetWins":2,"isActive":true}')" id)
T1=$(jget "$(capture POST /api/teams "{\"name\":\"RT1\",\"seriesId\":$S,\"captainId\":$P1}")" id)
T2=$(jget "$(capture POST /api/teams "{\"name\":\"RT2\",\"seriesId\":$S,\"captainId\":$P2}")" id)
capture POST "/api/teams/$T1/players" "{\"playerId\":$P1,\"seriesId\":$S}" > /dev/null
capture POST "/api/teams/$T1/players" "{\"playerId\":$P3,\"seriesId\":$S}" > /dev/null
capture POST "/api/teams/$T2/players" "{\"playerId\":$P2,\"seriesId\":$S}" > /dev/null
capture POST "/api/teams/$T2/players" "{\"playerId\":$P4,\"seriesId\":$S}" > /dev/null
M=$(jget "$(capture POST /api/matches "{\"seriesId\":$S,\"team1Id\":$T1,\"team2Id\":$T2,\"firstBattingTeamId\":$T1,\"oversPerSide\":2}")" id)
echo "Fixtures: players=$P1,$P2,$P3,$P4  series=$S  teams=$T1,$T2  match=$M"

echo
echo ">>> Match-players"
hit POST "/api/matches/$M/players" "{\"playerId\":$P1,\"teamId\":$T1}"
hit POST "/api/matches/$M/players" "{\"playerId\":$P3,\"teamId\":$T1}"
hit POST "/api/matches/$M/players" "{\"playerId\":$P2,\"teamId\":$T2}"
hit POST "/api/matches/$M/players" "{\"playerId\":$P4,\"teamId\":$T2}"
hit GET  "/api/matches/$M/players"
hit GET  "/api/matches/$M/innings"

echo
echo ">>> Ball-by-ball"
hit POST "/api/balls/save-with-context" "{\"matchId\":$M,\"seriesId\":$S,\"inningsNumber\":1,\"overNumber\":1,\"ballNumber\":1,\"strikerId\":$P1,\"nonStrikerId\":$P3,\"bowlerId\":$P2,\"runs\":4,\"isWide\":false,\"isNoBall\":false,\"isWicket\":false,\"extras\":0,\"battingTeamId\":$T1,\"bowlingTeamId\":$T2}"
hit POST "/api/balls/save-with-context" "{\"matchId\":$M,\"seriesId\":$S,\"inningsNumber\":1,\"overNumber\":1,\"ballNumber\":2,\"strikerId\":$P1,\"nonStrikerId\":$P3,\"bowlerId\":$P2,\"runs\":0,\"isWide\":false,\"isNoBall\":false,\"isWicket\":true,\"wicketType\":\"Bowled\",\"wicketPlayerId\":$P1,\"extras\":0,\"battingTeamId\":$T1,\"bowlingTeamId\":$T2}"
hit GET  "/api/matches/$M/scorecard"
hit POST "/api/stats/update-from-ball" "{\"strikerId\":$P3,\"nonStrikerId\":$P1,\"bowlerId\":$P2,\"runs\":2,\"isWicket\":false,\"seriesId\":$S}"

echo
echo ">>> Aggregations"
hit GET "/api/matches/all"
hit GET "/api/series"
hit GET "/api/series/$S/matches"
hit GET "/api/series/$S/stats"
hit GET "/api/series/$S/recent-matches"
hit GET "/api/players/$P1/stats?seriesId=$S"
hit GET "/api/stats/all"

echo
echo ">>> Update side-effects (match completion + simple updates)"
hit PATCH "/api/matches/$M" "{\"isCompleted\":true,\"winningTeamId\":$T1}"
hit GET   "/api/series/$S/progress"
hit PUT   "/api/matches/$M" "{\"oversPerSide\":3}"
hit PUT   "/api/teams/$T1" "{\"name\":\"RT1-renamed\"}"
hit PUT   "/api/players/$P1" "{\"name\":\"R-P1-renamed\"}"
hit PUT   "/api/players/$P1/stats" "{\"seriesId\":$S,\"highestScore\":99}"

echo
echo ">>> Unknown route → 404"
hit GET "/api/nonsense" "" 404

echo
echo ">>> Cleanup"
hit DELETE "/api/teams/$T2/players/$P2"
hit DELETE "/api/matches/$M"

echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
exit $(( FAIL > 0 ? 1 : 0 ))
