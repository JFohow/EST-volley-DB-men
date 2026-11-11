# Eesti Võrkpall DB

Eesti Võrkpall DB is a bilingual (English and Estonian) historical statistics
archive for the Estonia Men's National Volleyball Team. It brings match,
player, coach, and performance data together in a searchable web app.

## What's in the app

- Match archive and individual match pages, including available match stats
- Player and coach indexes and profile pages
- Team and player statistics, season totals, and match highs
- Historical trivia and a configurable set of homepage highlights
- English and Estonian interface translations
- A development-only data import page at `/add` (currently supports previewing
  DataVolley text files; PDF and CEV import flows are placeholders)

## Tech stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite and Tailwind CSS
- Supabase for database access and authentication
- npm for dependency installation and project scripts

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) with npm
- Access to the Supabase project used by this app, with its schema and data

### Install and run

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create a `.env.local` file in the project root and configure Supabase:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   The `VITE_` variables are used by the browser bundle; the non-prefixed
   variables are used by server-side code. Use the same project URL and
   publishable key for both. Publishable keys are intended for client use and
   do not replace appropriate Supabase Row Level Security policies.

   `SUPABASE_SERVICE_ROLE_KEY` is only needed for server-side admin operations.
   Never prefix it with `VITE_` or expose it to the browser.

3. Start the development server:

   ```sh
   npm run dev
   ```

   Open the local URL printed by Vite.

The app expects a Supabase project containing the database schema and data it
queries. Project migrations are in [`supabase/migrations`](./supabase/migrations);
apply them to your Supabase project when setting up or updating its schema.
Some views may also depend on historical data that migrations do not provide.

## Match data model

### Match classification

The app stores match classification in three boolean columns on `matches`:

- `vm`: competitive game.
- `am`: official game. Every VM game is also AM, but an AM game need not be
  VM.
- `mam`: non-official game. A MAM game is never VM or AM.

### Venue

`matches.venue` is the name of the sports hall or venue where the match took
place.

### Official sets and additional sets

- `matches.estonia_sets` and `matches.opponent_sets` store the official
  scoreline. Their sum is the number of official sets (for example, 3 + 0 = 3
  official sets in a 3–0 win).
- Additional sets (when `has_additional_sets` is true, with the count in
  `additional_sets_count`) are stored in `match_sets` as set_number 6, 7, and 8.
  They are not part of the official scoreline.
- Technical results (`matches.technical_result`) are matches decided by a
  forfeit or technical loss. They have no set scores, so `match_sets` stays
  empty for them. Do not invent set scores for these matches.

### Statistics versions

`player_match_stats.stats_version` identifies which part of the match a row
covers:

- `AM`: official part of the match only. These rows use the first
  `estonia_sets + opponent_sets` sets. This also applies to MAM matches with
  additional sets: the federation doesn't count them as official, but their
  official part is still tagged `AM`.
- `ALL`: full match, including additional sets.

For matches with additional sets there are two rows per appearance, one `AM`
and one `ALL`. Matches without additional sets normally have only an `ALL` row,
but some have duplicate rows (see partial statistics below). Some rows may be
mis-tagged as `AM` because of data-entry typos.

`NULL` means the match has no stats. Such matches only have player names
(`first_name`, `last_name`); every other column is null.

Position columns are not tied to set_number. They follow the order of play: the
first additional set uses the next free column after the official sets. For a
3–0 win with one additional set, that is `set4_position`; with two additional
sets, `set4_position` and `set5_position`. The scoreline for the same sets is
still stored in `match_sets` as set_number 6, 7, and 8.

### Coaches

Use `matches.coach_id` (linked to `coaches`). The `coach` text column is not the
source of truth.

### Default views

Statistics, Total TOP, Game Highs, Players, and Trivia offer filters for the
stat version. The default view should be `AM`.

### Partial or missing match stats

Matches may have full, partial, or no player stats. `match_unavailable_stats`
has one row per match (`match_id` is the primary key), with one boolean column
per stat field named `<field>_unavailable` (for example, `serve_total_unavailable`).
A column set to `true` means that stat is unavailable for the whole match. A
match with no row, or a row with all columns `false`, has no unavailable stats.
The 15 covered fields are points, block_points, plus_minus, break_points,
serve_total, serve_aces, serve_errors, reception_total, reception_errors,
reception_positive_pct, reception_excellent_pct, attack_total, attack_errors,
attack_blocked, and attack_kills.

Partial matches (for example, 145–150 and 165–167) have stats for some players
and only points for others. Historical records do not contain the full data
for these matches, and this cannot be fixed from the database. Their
`player_match_stats` rows come in `ALL` and `NULL` pairs for each appearance.
The `ALL` row holds the data (for example, match 145 has points for 10 of 12
appearances and serve totals for 2). The `NULL` row is an empty placeholder
with no stats.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run build:dev` | Create a development-mode build |
| `npm run preview` | Preview a production build locally |
| `npm run lint` | Run ESLint |
| `bun run format` | Format files with Prettier |

There is currently no test script in `package.json`.

## Project structure

| Path | Purpose |
| --- | --- |
| [`src/routes`](./src/routes) | File-based TanStack routes and page components |
| [`src/lib`](./src/lib) | Data queries, statistics, and shared application logic |
| [`src/components`](./src/components) | Shared UI and feature components |
| [`src/i18n`](./src/i18n) | English and Estonian translations |
| [`src/integrations/supabase`](./src/integrations/supabase) | Supabase clients and authentication middleware |
| [`supabase/migrations`](./supabase/migrations) | Database schema and policy migrations |

Routes are defined by files under `src/routes`; see
[`src/routes/README.md`](./src/routes/README.md) for route naming conventions.
`src/routeTree.gen.ts` is generated by TanStack Router and should not be edited
by hand.
