# WC2026 Fantasy Assistant

A web app to help you play the **official FIFA World Cup 2026 Fantasy** game
(play.fifa.com/fantasy). It pulls live data from FIFA's public game feed and
gives you three tools:

- **Research dashboard** — every player with price, form, ownership, total
  points, next fixture, and a projected-points model. Sort, filter, drill in.
- **Squad optimizer** — builds the highest projected-points legal 15 within
  budget, respecting squad shape, the per-nation cap for the stage, and a valid
  formation. Picks your captain.
- **My Team tracker** — recreate your real squad (saved in your browser), track
  live points and value, and get instant rule-compliance validation.
- **Advisor (24/7)** — an always-on engine that analyzes your squad against the
  live feed and issues ranked **commands** (sell/buy, captain, lineup, chip
  timing, injury alerts, deadline countdown), delivered to **Telegram** on a
  schedule via Vercel Cron.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **javascript-lp-solver** for the squad-selection ILP
- No database — FIFA's feed is fetched server-side and cached.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

Deploy to Vercel as-is (no env vars required).

## Data source

FIFA does not publish a documented developer API, but the official game runs on
a public, unauthenticated JSON feed at `https://play.fifa.com/json/fantasy/`:

| Endpoint            | Contents                                   |
| ------------------- | ------------------------------------------ |
| `players.json`      | ~1,500 players: price, position, stats     |
| `rounds.json`       | rounds + fixtures (results, venues, scores)|
| `squads_fifa.json`  | nations (group/seed metadata)              |

It's fetched server-side in [`lib/fifa/client.ts`](lib/fifa/client.ts) and
revalidated every 15 minutes (override with `FIFA_REVALIDATE_SECONDS`). Because
it's called server-side, there are no client CORS issues.

> Note: the feed gives **global** game data only. It can't see *your* personal
> FIFA team (that's behind FIFA login), so the tracker lets you enter your 15
> players manually and stores them in `localStorage`.

## How it works

### Data layer (`lib/fifa/`)

- `raw.ts` — verbatim API shapes.
- `normalize.ts` — turns raw feeds into typed models. Nations are derived from
  the fixtures feed (the `squadId` space there matches players; `squads_fifa.json`
  uses different ids and is only used to enrich group/seed by abbreviation).
- `projection.ts` — the projected-points model. Blends observed output
  (form/avg) with a price-implied baseline using a shrinkage weight that trusts
  real data more as a player accumulates games, then applies a light
  opponent-seed fixture multiplier. Transparent and tunable.

### Rules (`lib/rules.ts`)

A single source of truth for squad composition, budgets, per-stage nation caps,
formations, scoring, transfers, and chips. The optimizer, validator, and Rules
page all read from it.

### Optimizer (`lib/optimizer.ts`)

A binary ILP that **jointly** selects the 15-man squad and the starting XI:

- maximizes the XI's projected points;
- enforces squad shape (2/5/5/3), budget, and per-nation caps;
- links starters to the squad (`x_i ≤ s_i`);
- constrains the XI to `GK=1, DEF 3–5, MID 3–5, FWD 1–3` — ranges chosen so the
  only reachable combinations are exactly the 7 legal formations.

The candidate pool is pre-trimmed to the top + cheapest players per position so
the solve stays fast without affecting the optimum. Supports locking and
excluding specific players.

## 24/7 Advisor + Telegram bot

The advisor ([`lib/advisor.ts`](lib/advisor.ts)) is a pure, deterministic engine
that takes your squad + the live feed and emits ranked commands:

- 🚨 **Alerts** — squad players who are now unavailable; illegal-squad fixes.
- ⏰ **Deadline** — countdown to the next round's kickoff.
- 🔁 **Transfers** — best sell→buy swaps by projected-point gain, respecting
  budget, bank, and the stage's per-nation cap.
- ©️ **Captain** — highest-projected starter (doubled), plus vice.
- 📋 **Lineup** — best legal formation + who to bench.
- 🎫 **Chips** — heuristic timing for Wildcard / Maximum Captain / boosters.

The same engine runs in the in-app **Advisor** page (preview + "Send to
Telegram now") and in the scheduled cron route.

### Setup (one-time)

1. **Create a Telegram bot:** message [@BotFather](https://t.me/BotFather),
   `/newbot`, copy the token → `TELEGRAM_BOT_TOKEN`.
2. **Get your chat id:** message your bot once, open
   `https://api.telegram.org/bot<TOKEN>/getUpdates`, copy `chat.id` →
   `TELEGRAM_CHAT_ID`.
3. **Save your squad:** build it on **My Team**, then open **Advisor** and copy
   the `MY_SQUAD_IDS` string it shows → set that env var.
4. **Set `CRON_SECRET`** to any random string (secures the cron route).
5. **Deploy to Vercel** and add all four env vars in Project → Settings →
   Environment Variables, then redeploy.

See [`.env.example`](.env.example) for the full list. Locally you can test the
whole flow with `curl localhost:3000/api/cron/analyze` (with the env vars set).

### Schedule

[`vercel.json`](vercel.json) runs `/api/cron/analyze` daily at 09:00 UTC.
Vercel's **Hobby** plan caps crons at once per day; on **Pro** you can make it
match-day-frequent — e.g. every 3 hours:

```json
{ "crons": [{ "path": "/api/cron/analyze", "schedule": "0 */3 * * *" }] }
```

## Project layout

```
app/
  page.tsx            Research dashboard (server component)
  optimizer/          Squad optimizer (client + /api/optimize)
  team/               My Team tracker (client, localStorage)
  advisor/            24/7 Advisor preview + send-to-Telegram
  rules/              Rules reference
  api/dataset/        Normalized data for client components
  api/optimize/       Runs the ILP server-side
  api/advisor/        Generates a report (optionally pushes to Telegram)
  api/cron/analyze/   Scheduled run → Telegram (secured by CRON_SECRET)
components/           Nav, Pitch, PlayerExplorer, PlayerDetail, ui
lib/
  fifa/               client, raw, types, normalize, projection
  rules.ts            official rules config (+ stageForRound)
  optimizer.ts        ILP squad builder
  lineup.ts           best-XI + squad validation (client-safe)
  advisor.ts          ranked-command engine
  telegram.ts         report formatter + Telegram sender
```

## Caveats

- The FIFA feed is undocumented and could change shape or move; the normalize
  layer is where you'd adapt.
- The projection model is a heuristic, strongest once a few rounds are played.
  Tune the weights in `projection.ts` to taste.

_Unofficial. Not affiliated with FIFA._
