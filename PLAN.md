# Daily Flag Guessing Game — Design Plan

## Core Loop

- **Shared daily puzzle** (Wordle-style): everyone gets the same flag on a given day.
- **Day boundary**: UTC midnight. Countdown to the next flag is displayed converted to the player's local timezone.
- **Country selection**: a fixed pre-shuffled sequence over the full REST Countries dataset (~250 entries, sovereign states + territories/dependencies as returned by the API). Indexed by days-since-epoch (`daysSinceEpoch % list.length`). No repeats until the full cycle completes (~8 months).
- **Guess input**: searchable autocomplete/dropdown (no free-text/fuzzy matching against country names).
- **Guesses allowed**: 3 per player per day. No replay once a player finishes today's puzzle (win or lose) — revisiting shows a locked result view (their guesses, hints seen, outcome, answer if failed, fun facts).
- **Wrong guess feedback**: plain miss, no distance/direction indicator.

### Hints
- **Hint 1** (after guess 1 fails): continent/region.
- **Hint 2** (after guess 2 fails): a community-submitted hint pulled from the *previous cycle's* surviving hint pool for that country (highest-upvoted first, with option to browse all surviving hints). Falls back to an auto-generated hint (capital city or population) on a country's first-ever cycle, when no pool exists yet.
- **After guess 3 fails**: reveal the correct answer.
- **After reveal (win or lose)**: show fun facts about the country.

## Content Sourcing

- **Fun facts baseline**: auto-generated from REST Countries structured data (capital, population, region, languages, currency, area, borders) — always present, no cold-start gap.
- **Fun facts community layer**: players can submit a fun fact if they self-declare being from the country (honor-system checkbox, no real verification — consistent with no-signup identity). Community facts supplement, never replace, the baseline facts.

## Community Contribution & Moderation

- **Identity**: anonymous, cookie/local-ID based. No accounts, no signup.
- **Hint submission/voting/flagging gate**: only players who *solved* that cycle's country (guessed correctly within 3 tries).
- **Fun fact submission/voting/flagging gate**: broader — anyone who *finished* that cycle's puzzle (win or lose).
- **Submission cap**: one hint + one fun fact per cookie-ID per country per cycle.
- **Baseline automatic filter at submission time**: character length cap, banned-word/URL blocklist, rejects if the text contains the country's name or known aliases (prevents answer-giveaway).
- **Ranking**: upvote/downvote (Reddit-style), same gate as submission rights. Highest-voted hint/fact shown by default; full list browsable.
- **Flagging**: separate action from downvote. 5 flags auto-removes a hint/fact immediately — no admin approval step required.
- **Admin tooling**: none in v1. Fully automated/community-driven moderation. Direct DB access serves as the manual escape hatch if something slips through.

## Deferred to v2

- Streaks, guess-distribution stats, shareable emoji-style result string (Wordle-style share card).
- Any admin dashboard for moderation.
- Distance/direction feedback on wrong guesses.

## Tech Stack

- **Frontend/backend**: Next.js (App Router).
- **Database**: Postgres (Supabase or Neon).
- **Hosting**: Vercel.
- **Data source**: REST Countries API (pulled once at build/setup time for country list, flags, capitals, population, region, etc.).

## Data Model Sketch (for later reference)

- `countries` — id, name, flag_url, capital, population, region, cycle_index (position in shuffled sequence).
- `player_progress` — cookie_id, country_id, cycle_number, guesses (array), outcome (won/lost), completed_at.
- `hints` — id, country_id, cycle_submitted, submitted_by (cookie_id), text, upvotes, downvotes, flag_count, status (active/removed).
- `fun_facts` — id, country_id, cycle_submitted, submitted_by (cookie_id), text, upvotes, downvotes, flag_count, status (active/removed).
- `votes` — cookie_id, target_type (hint/fact), target_id, value (up/down), unique constraint on (cookie_id, target_id).
- `flags` — cookie_id, target_type (hint/fact), target_id, unique constraint on (cookie_id, target_id).
