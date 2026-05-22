# 🏏 BPL Scorer — Buddies Premier League

A full-stack cricket scoring application built for friendly league cricket. Track live matches ball-by-ball, manage player rosters across a long-running series, and follow career statistics for every player in your group.

---

## Why This Was Built

A group of friends plays regular cricket under a "Buddies Premier League" format — a long-running series where two captains draft teams and play until one side reaches a target number of wins (e.g., first to 13). The problem was keeping track of everything manually: who scored what, who took which wickets, how many series each captain has won. This app replaces scorebooks and memory with a live, persistent scoring system everyone can follow on their phones.

---

## Features

### 1. Series Management
**What it does:** Organises all matches under a named series with a target win count.

**Why it exists:** The BPL format is not just individual matches — it's a campaign. Captains draft their squads, and the series runs until someone hits the target. The app tracks wins per team within each series, shows live series standings, and automatically marks a series as complete when a team reaches the target.

**Business logic:**
- A series has a `targetWins` value (e.g., 13)
- Each team's win count is tracked on the series record
- When a team hits `targetWins`, the series is marked complete and all players' `seriesWins`, `seriesPlayed`, `winsAsCaptain`, and `captainSeriesPlayed` stats are updated
- Only one series can be active at a time; creating a new one deactivates the previous

---

### 2. Team & Player Management
**What it does:** Players are registered once globally and then assigned to teams per series.

**Why it exists:** The same group of people play every series, but captains draft different combinations each time. The app separates the concept of a global player (with career stats) from their team assignment for a specific series.

**Business logic:**
- Players are created globally and persist across all series
- When a new series starts, two captains are selected (manually or via a randomiser)
- Each captain builds their team from the available player pool
- Team names are automatically generated from the captain's name (e.g., "Chandan's Team")
- Career statistics (runs, wickets, matches) accumulate globally across all series
- Stats can be filtered per series on the Stats page

---

### 3. Match Setup & Roster Customisation
**What it does:** Before each match starts, the scorer can adjust who is playing and tweak the roster.

**Why it exists:** Real-world games are messy — someone might be late, someone might play for the other side to balance numbers, or a player might be unavailable that day. The match setup flow handles these scenarios without affecting the permanent series rosters.

**Business logic:**
- **Switch teams:** Move a player to the opposing team for this match only
- **Common player:** A player who bats and fields for one team but can also bowl for the other (or vice versa). Used when teams are uneven. A common player's match win counts for either team; their series win counts only for their original team
- **Mark unavailable:** Remove a player from this specific match without dropping them from the series
- **Toss & batting order:** Who bats first is set at match setup
- **Overs per side:** Configurable (2, 6, 7, 8, 9, 10, 12, or 20 overs)
- Strikers, non-strikers, and the opening bowler are selected before scoring begins

---

### 4. Ball-by-Ball Scoring
**What it does:** The core of the app — records every ball with full detail.

**Why it exists:** Accurate career statistics require accurate per-ball data. Knowing someone's strike rate, economy rate, or highest score isn't possible without tracking every ball bowled.

**Business logic:**
- **Legal runs:** 0–6 runs per ball; 4s and 6s tracked as boundaries
- **Wides:** Adds 1 extra run, does not count as a legal ball, over does not advance
- **No-balls:** Adds 1 extra run, does not count as a legal ball, allows additional runs (0–6) on top, allows run out dismissals only
- **Wickets:** Triggers the Wicket Details modal (see below); mandatory new batter selection before play resumes
- **Striker rotation:** Batters swap ends on odd runs (1, 3, 5) and at the end of each over
- **Single batting mode:** When only one batter remains, they stay on strike regardless of runs scored
- **Bowler rules:** The same bowler cannot bowl consecutive overs; a new bowler must be selected at the start of each over; the bowler change prompt is mandatory

---

### 5. Wicket & Dismissal Tracking
**What it does:** Captures exactly how each batsman was dismissed.

**Why it exists:** A proper scorecard shows how every wicket fell. This data feeds into the scorecard's "How Out" column and into bowler and fielder statistics.

**Dismissal types supported:**
| Type | Logic |
|------|-------|
| **Bowled** | Credits wicket to the bowler |
| **Caught** | Credits wicket to the bowler; fielder (catcher) recorded |
| **Run Out** | Credits run out to the fielder; no wicket for the bowler; allows runs scored before the wicket |
| **Stumped** | Credits wicket to the bowler; fielder (wicketkeeper) recorded |
| **Hit Wicket** | Credits wicket to the bowler |
| **Boundary Out** | BPL-specific rule; out if ball hits boundary after being caught |

**Business logic:**
- For run outs, the dismissed player can be either the striker or non-striker
- Wides can still result in a stumping or run out
- No-balls can still result in a run out
- Fielder data (catcher, thrower, stumper) is stored and displayed in scorecards and stats

---

### 6. Over Progress Visualisation
**What it does:** Shows the current over's balls as colour-coded tennis ball icons.

**Why it exists:** Gives a quick visual read of what has happened in the over without scrolling through text. Common in professional scoring apps.

**Colour coding:**
- 🟡 Yellow pulsing — next ball slot
- 🔵 Blue — runs scored (1, 2, 3, 5)
- 🟢 Green — boundary (4 or 6)
- ⚫ Grey — dot ball
- 🔴 Red — wicket
- 🟠 Orange — extra (wide or no-ball)

Extras appear chronologically in the over display but do not consume a legitimate ball slot — the over always shows 6 legitimate ball positions.

---

### 7. Innings Transitions & Match Completion
**What it does:** Handles the end of the first innings, the start of the second, and match completion.

**Why it exists:** A match has two innings. The state must cleanly hand over between them, preserving the first innings total as the target for the second.

**Business logic:**
- At the end of the first innings (all overs bowled or all out), the score is saved and displayed as the target
- Teams swap roles — batting becomes bowling and vice versa
- Second innings ends when the target is chased, all overs bowled, or all out
- **Win by runs:** First batting team wins; margin = (team 1 score) − (team 2 score)
- **Win by wickets:** Second batting team wins; margin = 10 − (wickets lost when target reached)
- Match result is saved and triggers player statistics updates

---

### 8. Match State Persistence & Resume
**What it does:** Automatically saves the full match state so it can be resumed after the browser is closed or the page is refreshed.

**Why it exists:** Phones lock, browsers crash, and matches get paused. Losing all scoring data mid-match was unacceptable.

**How it works:**
- Every ball is saved to the PostgreSQL database immediately
- The full UI state (striker, non-striker, bowler, score, over number) is saved to browser LocalStorage after every action
- On returning to the match page, the app detects a saved state and offers "Resume Match"
- The database is the source of truth; LocalStorage is the UI shortcut

---

### 9. Live Scorecards
**What it does:** Shows a professional innings-by-innings scorecard for any completed or in-progress match.

**Why it exists:** Players want to review how everyone batted and bowled, just like a real match scorecard.

**What it shows:**
- **Batting:** Batsman name, How Out, Runs, Balls, 4s, 6s, Strike Rate
- **Bowling:** Bowler name, Overs, Wickets, Runs, Economy
- **Extras:** Wides and no-balls totalled separately
- Innings total with overs

---

### 10. Player Statistics & Leaderboards
**What it does:** Tracks cumulative career statistics for every player across all matches and series.

**Why it exists:** The long-running series format creates genuine competition for individual records — who has the most runs ever, the best bowling average, the most series won as captain.

**Batting stats tracked:**
- Total runs, balls faced, innings played
- Batting average (runs per dismissal)
- Strike rate
- Fours, sixes
- Highest score (per innings)

**Bowling stats tracked:**
- Wickets, runs conceded, balls bowled
- Bowling average (runs per wicket)
- Economy rate (runs per over)

**Fielding stats tracked:**
- Catches, stumpings, run outs

**All-Round / Wins stats:**
- Matches played, matches won
- Series played, series won
- % Series Won as Captain (wins as captain ÷ series captained)

Stats can be filtered to show a specific series or the global career totals.

---

### 11. Match History
**What it does:** Lists all past matches with results, filterable by series.

**Why it exists:** Players want to look back at previous results and pull up old scorecards.

---

### 12. Dark Mode
**What it does:** Full dark/light theme toggle, saved to the browser.

**Why it exists:** Matches are often scored outdoors in sunlight (light mode) or in the evening (dark mode). Both are fully supported with explicit Tailwind colour classes throughout.

---

## Data Model

```
players           — Global player registry (name, career stats link)
series            — A named campaign with targetWins
teams             — Two teams per series, each with a captain
team_players      — Which players belong to which team in a series
matches           — Individual matches within a series
match_players     — Per-match roster with role flags (common, unavailable, team swap)
innings           — First and second innings records per match
overs             — Individual overs within an innings
balls             — Every ball bowled (runs, extras, wicket details, player IDs)
player_stats      — Aggregated career statistics per player
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Routing | Wouter |
| State | TanStack Query (React Query) |
| UI Components | Radix UI + shadcn/ui |
| Styling | Tailwind CSS |
| Build | Vite |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |

---

## Running Locally

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server (frontend + backend on same port)
npm run dev
```

Requires a `DATABASE_URL` environment variable pointing to a PostgreSQL database.

---

## Project Structure

```
client/
  src/
    pages/              — Home, Match, Stats, Players, Match History
    components/         — AdvancedBallByBallScorer, Modals, UI components
    lib/                — API client, query configuration

server/
  routes.ts             — All REST API endpoints
  storage.ts            — Database access layer & stats engine
  index.ts              — Express server entry point

shared/
  schema.ts             — Drizzle schema + Zod validation types (shared by client & server)
```

---

## BPL Format Rules

This app is designed around the Buddies Premier League format:

1. Two captains are chosen at the start of a series (randomly or manually)
2. Each captain selects their squad from the available player pool
3. Matches are played until one team reaches the target win count
4. Individual match results and ball-by-ball data are preserved permanently
5. Career statistics accumulate across all series played
