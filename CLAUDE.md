# CLAUDE.md — session guide for Dutch Book

This file is auto-loaded at the start of every session. Follow it before doing anything.

## What this project is

A browser learning game that takes a total beginner from "what is a bid?" to writing
prediction-market arbitrage strategy code. The owner is building an arb trading bot and
needs the foundational knowledge first. It is also a public, publishable product.

## Start-of-session ritual (do this first, every time)

1. **Read `REQUIREMENTS.md` in full.** It is the living source of truth. Decisions are
   numbered (D1, D2, …) and dated. Nothing is "decided" unless it is written there.
2. **Read `BACKLOG.md` in full.** Epics A–N, each ticket with acceptance criteria and
   non-goals. The top mirrors `REQUIREMENTS.md` — if the two disagree, `REQUIREMENTS.md`
   wins and you should fix the mirror.
3. **Read `QUESTIONS.md`.** These are open, undecided items. Never silently resolve one
   in code — ask the owner.
4. **Check `git log --oneline` and `git status`** to see what landed and whether the tree
   is clean.
5. **Before starting a ticket, re-validate its assumptions.** If a later decision (higher
   D-number) has made a ticket's acceptance criteria shaky, inconsistent, or stale,
   **stop and flag it — re-question before coding.**

## Working rules (these are not optional)

- **Requirements-gathering is continuous.** When implementation surfaces a new ambiguity
  or a decision with hidden sub-decisions, STOP. Interrogate it the same way as upfront:
  batched questions, push back on vague answers, make the owner choose concretely. Do not
  silently resolve it and keep coding.
- **Record every new decision in `REQUIREMENTS.md` immediately** — dated, numbered, with a
  one-line rationale — and update the mirror in `BACKLOG.md`. Not in code comments, not
  only in chat.
- **Definition of Done applies to every ticket** (see `BACKLOG.md`). Tests at the right
  levels must be green. A ticket with failing tests is not done.
- **Approve-each-library (D38):** never add a dependency without proposing it and getting
  explicit owner approval, then recording it in the approved-libraries table in
  `REQUIREMENTS.md`. Tickets marked ⚠️ in the backlog exist specifically because they need
  a proposal first.

## Invariants — treat any change that weakens these as a stop-and-flag event

- **Determinism (D18).** Every simulation run is reproducible from
  `(scenarioId, seed, ordered actions)`. All randomness comes from the injected PRNG;
  `Math.random` is banned in `lib/`.
- **No floats for money (D20).** Prices and cash are integers in the venue's minimum tick.
  Formatting happens only at the display boundary.
- **The engine is pure (D19).** `lib/engine` imports no React, touches no DOM, makes no
  network call. Ever.
- **All market data goes through the `MarketFeed` adapter (D17).** No component fetches
  data directly. This is the single thing that makes phase-2 live data a drop-in.
- **Venue facts are cited, never remembered (D14).** Any real Polymarket/Kalshi parameter
  in code carries a source URL and a checked-on date. If you cannot verify it, mark it
  `UNVERIFIED` and raise it in `QUESTIONS.md` — do not guess. A wrong fee formula teaches
  a false lesson and would produce a losing bot.
- **No real-money code path.** v1 places no real orders; the phase-2 proxy (M-1/M-3) has
  **no write endpoint** by design.
- **The player's API key never leaves the browser except to Anthropic (D26).** Never
  logged, never in analytics, never in an error report.
- **The Socratic coach never hands over the answer (D23/D24).** Its refusal behaviour is a
  tested feature with a golden set that must pass 100% on the answer-seeking half.

## Simplicity bar (D42–D44)

- **Build the smallest thing that meets the acceptance criteria.** No speculative
  abstraction, no config for one caller, no layer added "for later". A plain function
  beats a class; a plain object beats a factory. Delete rather than comment out.
- **Comments explain *why*, never *what*.** Code needing a paragraph gets rewritten.
  Three things earn a comment: a venue fact with its source URL (D14), a non-obvious
  invariant, a deliberate tradeoff.
- **Be terse in chat too.** State what changed and what the owner needs to know. No
  preamble, no restating the diff, no summarising work they just watched happen.
- **The product name is not hardcoded** (D41) — it comes from `lib/brand.ts`. Never type
  it into a component, metadata field, or piece of copy.

## Teaching quality bar

This is a learning product for a stated beginner (D2). Two rules that are easy to forget:

- **Never use a term before the chapter that defines it.** The D-5 content lint enforces
  this against a running glossary; do not work around it, fix the prose.
- **Scoring rewards the lesson, not luck (F-3).** A profitable run that missed the
  objective does not pass, and taking a merely-correlated "arb" scores as a failure even
  when it happens to make money.

## Gotchas that have already cost time

- **`npm run check` kills a running `npm run dev`.** The build step replaces `.next`, and
  the dev server then serves stale or 500ing chunks. If a page looks frozen, blank, or
  wrong, restart the dev server **before** believing what you see — three separate
  "bugs" in this project turned out to be nothing but a stale dev server.
- **Playwright's `getByText` matches the editor's contents.** A test that types a sentinel
  string into the code editor will match its own input. Assert on the console output
  instead.
- **`.next/types` is stale during typecheck.** Adding a route makes `npm run check` fail
  on the typed-routes validator until a build has run. `rm -rf .next && npm run build`
  first, then re-check.

## Milestone workflow (commit/push cadence)

At each **completed milestone** (a ticket whose acceptance criteria + Definition of Done
are met and verified):

1. Run the full gate: `npm run typecheck && npm run lint && npm test && npm run build`.
2. Commit with the ticket id in the subject (e.g. `B-2: matching engine with book walking`).
3. Push. Vercel preview/production deploys from there (A-5).
4. Update the ticket's status in `BACKLOG.md` and, if a decision was made, `REQUIREMENTS.md`.

## Where to start if the tree is empty

`A-1` (scaffold) is the root. `C-1` (venue research, no code) and `L-4` (README/licence)
have no blockers and are good parallel work. See the dependency map in `BACKLOG.md`.
