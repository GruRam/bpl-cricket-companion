# BPL Cricket Companion — Claude Code Briefing

> Read this file before doing anything. It contains the full project context,
> approved plan, known bugs, and coding standards for this rebuild.

---

## What this project is

A cricket scoring app for a weekly casual league ("Buddies Premier League") in Bangalore.
There is no dedicated scorer — whoever is fielding or batting-team waiting scores on their phone.
That use case drives every design decision below.

**North star for all UX work:**
> One-handed mobile use. One tap per ball in ~90% of cases. Mistakes recoverable in 2 taps. No scrolling during scoring.

---

## Tech stack (current + target)

| Layer | Current (Replit) | Target (Path B) |
|-------|-----------------|-----------------|
| Frontend | React 18 + TS + Vite + Tailwind + shadcn/ui | Same |
| Routing | Wouter | Same |
| State | TanStack Query v5 | Same |
| Backend | Express.js (monolith, port 5000) | Vercel serverless functions under `/api/` |
| Database | Neon Postgres (serverless) | Same — keep existing Neon DB |
| ORM | Drizzle ORM | Same |
| Hosting | Replit (gone) | Vercel (frontend + API functions) |

The database schema in `shared/schema.ts` is solid. Do not restructure it.

---

## Approved work plan — three phases

### Phase 1 — Get it hosted and stable

Goal: live on Vercel, data-corrupting bugs fixed, nothing else changed yet.

1. Remove Replit-specific plugins:
   - `@replit/vite-plugin-cartographer` from `vite.config.ts` and `package.json`
   - `@replit/vite-plugin-runtime-error-modal` from `vite.config.ts` and `package.json`
   - The replit dev-banner script from `client/index.html`

2. Migrate Express routes to Vercel serverless functions:
   - Each route group becomes a file under `/api/` at project root (Vercel convention)
   - Shared DB/storage logic stays in `server/storage.ts` — import it from each function
   - Keep Drizzle + Neon connection exactly as-is in `server/db.ts`
   - Add a `vercel.json` at project root to configure builds and rewrites

3. Set `DATABASE_URL` as a Vercel environment variable (user does this in Vercel dashboard).

4. **Fix bug: two competing localStorage save effects.**
   - File: `client/src/components/advanced-ball-by-ball-scorer.tsx`
   - Lines 96–131 define `saveMatchState()` function
   - Lines 296–315 have a separate `useEffect` that also writes to `match_${match.id}` with a *different shape*
   - They overwrite each other. Keep `saveMatchState` + its `useEffect` (lines 139–143). Delete the second duplicate save effect.

5. **Fix bug: stale closure on wicket details.**
   - File: `client/src/components/advanced-ball-by-ball-scorer.tsx`
   - `handleWicketDetails` sets `pendingWicketDetails` via `setState`, then immediately calls `handleBallEntry`
   - `handleBallEntry` reads `pendingWicketDetails` from closure — stale, still null
   - Fix: pass `wicketDetails` as a parameter directly into `handleBallEntry` instead of relying on state

6. **Fix bug: prop mutation.**
   - File: `client/src/components/advanced-ball-by-ball-scorer.tsx`, lines 673–675
   - `match.currentInnings = 2` etc. mutates a prop — React anti-pattern
   - Fix: store these in local state instead

7. Delete dead code: `ball-by-ball-scorer.tsx` and `enhanced-ball-by-ball-scorer.tsx` (unused)

8. Replace aggressive polling with mutation-based invalidation in `home.tsx` and `players.tsx`

---

### Phase 2 — Make casual scoring actually pleasant

Goal: the "scoring while fielding" UX is finally fast and forgiving.

Before any new features, **break up `advanced-ball-by-ball-scorer.tsx` (1,808 lines) into ~6 components:**
- `ScoreHeader.tsx` — score, overs, RR, target chase info
- `CurrentPlayers.tsx` — striker/non-striker/bowler pickers (replace dropdowns with chip grids)
- `ScoringKeypad.tsx` — the 10 quick-entry buttons, sticky to bottom on mobile
- `OverProgress.tsx` — tennis ball progress display + legend
- `LiveCommentary.tsx` — scrollable recent balls
- `InningsScorecard.tsx` — batting + bowling tables (one per innings, behind a tab)

The parent `AdvancedBallByBallScorer.tsx` orchestrates state and passes props down.

Then implement features in this order:

9. **Undo last ball.** Visible "Undo" button next to the keypad. Removes the last entry from `allBalls` and `overBalls`, reverts `totalScore`, reverses striker rotation if applicable, re-opens dismissed player if wicket was the last ball. Also delete from DB (new `DELETE /api/balls/last` endpoint).

10. **Sticky scoring keypad on mobile.** `ScoringKeypad.tsx` uses `position: fixed; bottom: 0` on mobile. Score header stays visible at top. Everything else scrolls between them.

11. **Replace player dropdowns with chip grids.** For new-batsman and new-bowler selection: grid of tappable name cards, 2 columns, large tap targets. No `<Select>` component for player picking.

12. **Add openers to match setup wizard.** Step 3 in `match-setup-modal.tsx`: pick opening striker, non-striker, and bowler before starting. These are passed into the scorer as initial state (not empty).

13. **Wicket modal smart defaults.** Pre-select striker as out (most common). Pre-select "Bowled" as dismissal type. Skip fielder step for Bowled/LBW/Hit Wicket. One-tap confirm for the default case.

14. **"Same teams as last match" quick-start.** In match setup step 1: if a previous match exists in the series, offer a "Use same squads" button that pre-loads last match's player assignments. User can still edit before starting.

15. **Read-only view link.** Route `/match/:id/view` renders live score (score header + over progress + commentary) with no keypad. Share via copyable URL. Polling every 5s is fine here.

16. **Better match list labels.** In `home.tsx` recent matches: show team names and date, not "Match #42".

---

### Phase 3 — Resilience and stats

17. **PWA.** Add `manifest.json`, service worker via `vite-plugin-pwa`. Caches app shell. Icon on phone homescreen.

18. **Offline ball queue.** Ball entries write to IndexedDB queue first, then flush to API in background. Small "X unsynced balls" indicator when offline. On reconnect, flush with retry.

19. **Fix maidens.** In `AdvancedBallByBallScorer`: track runs per over per bowler. An over with 0 runs conceded is a maiden. Update `stats.maidens` in the bowling table.

20. **Fall of wickets + partnerships.** Add to `InningsScorecard.tsx` below batting table.

21. **Simple passcode guard.** One shared passcode (stored as env var `APP_PASSCODE`). Checked once per device, stored in localStorage. A simple gate page before the app loads.

22. **Bowling run-rate fix.** Economy is currently calculated as `runs / overs` which gives wrong values. Correct formula: `(runs / balls) * 6`.

---

## Coding standards — follow these on every file touched

### Structure
- One component per file. No 1,000-line files.
- All shared types in `client/src/lib/types.ts` or `shared/schema.ts`. No inline interface duplication.
- API calls only in TanStack Query hooks, never inline in components.
- No `any` type unless interfacing with an untyped library.

### Comments
- Every function over 10 lines gets a JSDoc block: what it does, params, returns, and any cricket-specific logic explained.
- Non-obvious business logic (e.g. "wides don't advance the ball count") gets an inline comment.
- Each file gets a 3-line header comment: filename, what it is, what data it owns.

### Example comment style to follow:
```tsx
/**
 * ScoringKeypad.tsx
 * The 10-button quick entry keypad for ball-by-ball scoring.
 * Renders as a sticky bar at the bottom of the viewport on mobile.
 */

/**
 * Handles a ball entry from the quick keypad.
 * Updates local state immediately; persists to DB in background.
 * Note: wide and no-ball do NOT increment currentBallInOver.
 */
const handleBallEntry = (entry: BallEntry) => { ... }
```

### Mobile first
- All layout decisions default to mobile. Add `md:` breakpoints for desktop enhancement.
- Tap targets minimum 48px height.
- No horizontal scrolling on mobile.

---

## Known bugs summary (quick reference)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `advanced-ball-by-ball-scorer.tsx` | Two localStorage save effects with different shapes, overwrite each other | Delete the duplicate at lines 296–315 |
| 2 | `advanced-ball-by-ball-scorer.tsx` | Stale closure: `pendingWicketDetails` is null when `handleBallEntry` reads it | Pass details via parameter |
| 3 | `advanced-ball-by-ball-scorer.tsx` L673-675 | Direct prop mutation: `match.currentInnings = 2` | Move to local state |
| 4 | Bowling table | `stats.maidens` always 0 (never calculated) | Track over runs per bowler |
| 5 | Bowling table | Economy formula wrong (divides by overs not balls) | `(runs / balls) * 6` |
| 6 | All pages | Aggressive polling (2s/3s/5s) drains battery | Replace with query invalidation on mutation |

---

## File map (for orientation)

```
bpl-cricket-companion/
├── client/src/
│   ├── pages/
│   │   ├── home.tsx           # Dashboard, series progress, recent matches
│   │   ├── match.tsx          # Match entry point, setup/resume routing
│   │   ├── players.tsx        # Player roster + stats
│   │   ├── stats.tsx          # Full stats page
│   │   └── match-history.tsx  # Historical matches
│   ├── components/
│   │   ├── advanced-ball-by-ball-scorer.tsx  # THE main scorer (1808 lines, to be split)
│   │   ├── navigation.tsx
│   │   └── modals/
│   │       ├── match-setup-modal.tsx    # Multi-step match setup
│   │       ├── wicket-details-modal.tsx # Dismissal capture
│   │       ├── create-series-modal.tsx  # Series + team setup
│   │       ├── scorecard-modal.tsx
│   │       └── team-setup-modal.tsx
│   └── lib/
│       ├── types.ts           # CurrentMatch, BallEntry, SavedMatchState
│       └── queryClient.ts
├── server/
│   ├── routes.ts              # All Express routes (to be split into /api/ Vercel functions)
│   ├── storage.ts             # All DB operations via Drizzle (keep as-is, import into functions)
│   ├── db.ts                  # Neon + Drizzle setup (keep exactly as-is)
│   └── index.ts               # Express app entry (to be replaced by Vercel)
├── shared/
│   └── schema.ts              # Drizzle schema + Zod types (do not modify structure)
└── CLAUDE.md                  # This file
```

---

## Vercel deployment (Phase 1 reference)

`vercel.json` structure to create:
```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist/public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Each Express route group maps to a file:
- `server/routes.ts` players routes → `api/players.ts`
- `server/routes.ts` series routes → `api/series.ts`
- `server/routes.ts` teams routes → `api/teams.ts`
- `server/routes.ts` matches routes → `api/matches.ts`
- `server/routes.ts` innings/overs/balls routes → `api/innings.ts`, `api/balls.ts`
- `server/routes.ts` stats routes → `api/stats.ts`

Shared `storage.ts` is imported by all functions — no change needed there.

Environment variable needed in Vercel dashboard: `DATABASE_URL` (copy from Neon dashboard).
