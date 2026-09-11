# BACKLOG.md — Dutch Book

> **How to use this file across sessions.** Read `REQUIREMENTS.md` first, then this file.
> Each ticket is written to be picked up independently by a fresh session. Before
> starting a ticket, check its assumptions against the current `REQUIREMENTS.md` — if a
> later decision has made a ticket's acceptance criteria shaky or inconsistent, **flag it
> and re-question before coding**; do not assume an old ticket is still correct.
> Decision IDs (D1–D40) refer to `REQUIREMENTS.md`.

---

## Requirements summary (mirror of REQUIREMENTS.md as of 2026-09-10)

- **Product:** browser learning game, total beginner → prediction-market arb bot author (D1–D3).
- **Size:** 12 chapters, ~6–10 hours (D4). **Chapter shape:** concept → drills → live sim boss level (D5).
- **Audience:** public product, desktop-first; **mobile out of scope for v1** (D6).
- **Curriculum:** the 12-chapter arc in D8 is locked in order. Ch 6–9 are the four arb families.
- **Assessment:** graded test per chapter (quiz + sim performance) (D9); score gate + retry with **fresh variants** and targeted remediation (D10); threshold is per-chapter (D11); gated but replayable (D12).
- **Venues:** Polymarket and Kalshi modelled accurately by name (D13); **every real parameter must be verified against current public docs and cited, never written from memory; unverifiable ones marked `UNVERIFIED`** (D14).
- **Data:** hand-tuned synthetic + real historical replays as static JSON (D15); live data is **phase 2** (D16); everything goes through a `MarketFeed` adapter (D17).
- **Engine:** deterministic, seeded PRNG, run identified by `(scenarioId, seed, actions)` (D18); pure TS, no React/DOM/network (D19); **integer ticks, never floats** (D20); real price-time-priority matching where player fills move the book (D21).
- **Capstone:** in-browser JS editor (D22); **Socratic coach refuses to give answers and requires the player to state a strategy first** (D23), and that refusal is a tested feature with a golden set (D24); BYOK now / proxy later (D25); key never leaves the browser except to Anthropic (D26); Ch 12 playable with no key (D27); player code runs in a Web Worker with a time budget (D28).
- **Persistence:** no accounts (D29); `ProgressStore` interface + localStorage (D30); versioned/migratable saves (D31); JSON export/import (D32).
- **Stack:** Next.js 15 App Router + TS strict + Tailwind on Vercel (D33); content as typed TS modules (D34); no `any` in engine/content (D35); Vitest + RTL + Playwright (D36); **tests are part of every ticket** (D37); **approve-each-library** (D38).
- **A11y:** keyboard-operable, visible focus, semantic markup, **never colour alone** (D39).
- **Repo is public, MIT** (D45).
- **Name is unlocked:** it lives only in `lib/brand.ts`; nothing else hardcodes it (D41).
- **Simplicity is a requirement:** smallest thing that meets the criteria, no speculative abstraction (D42). Comments say *why*, never *what* (D43). Docs are terse (D44).
- **Ships an interactive study guide about itself at `/guide`** (D40).

---

## Definition of Done (applies to EVERY ticket — D37)

A ticket is not complete until, in addition to its own acceptance criteria:

- **Unit tests** cover its pure logic and pass (`lib/**` code is unit-tested in isolation, no React).
- **Component tests** cover any interactive UI it introduces (RTL), including keyboard operation.
- **Determinism:** if it touches the engine or a feed, the replay-determinism harness (B-8) still passes — same `(scenarioId, seed, actions)` produces byte-identical event logs.
- **Types:** `tsc --noEmit` is clean; no `any` added to `lib/engine` or `lib/content` (D35).
- **A11y:** any new interactive UI is keyboard-operable with visible focus, and conveys no state by colour alone (D39).
- **No new dependency** was added without recorded owner approval (D38) — if the ticket needs one, stop and propose it.
- **Requirements updated:** if the ticket surfaced a new decision, it is recorded in `REQUIREMENTS.md` with a new D-number and date, and the mirror above is updated.
- **Venue facts cited:** any real-world venue parameter introduced carries a source link and a checked-on date in a code comment (D14).
- **Simplicity (D42–D43):** no abstraction without a second caller, no config for one call site, no dead or commented-out code. Comments explain *why*; anything needing a paragraph gets rewritten instead.
- **Brand (D41):** the product name appears only via `lib/brand.ts`.

---

## Milestones

| M | Name | Contents | Meaning |
|---|------|----------|---------|
| **M0** | Walking skeleton | A, B-1…B-3, D-1, E-1, E-2 | The app builds, deploys, and renders a fake order book that ticks deterministically. |
| **M1** | Playable chapter | rest of B, C-1…C-2, D, E-3…E-8, F-1…F-4, G-1 | Chapter 1 is fully playable end-to-end with grading and saved progress. |
| **M2** | Foundations | C-3…C-7, F-5…F-7, G-2…G-5, K | Chapters 1–5 complete. The game teaches everything an arb chapter will assume. |
| **M3** | The arb core | H-1…H-4, I-1, I-2 | Chapters 6–11 complete. **This is the point at which the owner's original goal is met.** |
| **M4** | Capstone | J | Chapter 12: sandbox + Socratic coach. |
| **M5** | Publish | L, N | Landing page, study guide, launch. |
| **M6** | Live | M | Phase 2: live feeds and live paper trading. |

> **If time is short, M3 is the real finish line for the owner's stated purpose.** M4–M6 make it a product.

---

## Dependency map

### Blocked-by table

| Ticket | Blocked by | Can start once… |
|--------|-----------|-----------------|
| A-1 scaffold | — | immediately (root) |
| A-2 Vitest/RTL | A-1 | scaffold exists |
| A-3 Playwright | A-1 | scaffold exists |
| A-4 lint + CI | A-2 | tests runnable |
| A-5 Vercel deploy | A-1 | scaffold exists |
| A-8 brand constants | A-1 | scaffold exists |
| A-6 money primitives | A-2 | can test |
| A-7 seeded PRNG | A-2 | can test |
| B-1 order book | A-6, A-7 | ticks + PRNG exist |
| B-2 matching | B-1 | book exists |
| B-3 clock | A-7 | PRNG exists |
| B-4 liquidity agents | B-2, B-3 | matching + clock |
| B-5 P&L | B-2 | fills exist |
| B-6 order lifecycle | B-2 | matching |
| B-7 latency/queue | B-2, B-3 | matching + clock |
| B-8 replay harness | B-4, B-5 | a full sim can run |
| B-9 scenario runner | B-8 | determinism proven |
| C-1 venue research | — | immediately (research only) |
| C-2 venue iface + Kalshi | C-1, A-6 | facts verified |
| C-3 Polymarket | C-2 | interface exists |
| C-4 YES/NO + merge/split | C-3 | Polymarket model |
| C-5 negative risk | C-4 | merge/split |
| C-6 settlement | C-2, B-5 | venue + P&L |
| C-7 fee engine | C-2, C-3 | both venues |
| D-1 content schema | B-9 | scenarios exist to reference |
| D-2 registry/loader | D-1 | schema |
| D-3 variant generator | D-1, A-7 | schema + PRNG |
| D-4 authoring guide | D-2, D-3 | pipeline works |
| D-5 content lint | D-2 | registry |
| E-1 design system | A-1 | scaffold |
| E-2 shell + chapter map | E-1, D-2 | tokens + chapters listable |
| E-3 order book UI | E-1, B-1 | tokens + book |
| E-4 order ticket | E-1, B-6 | tokens + orders |
| E-5 positions/P&L UI | E-1, B-5 | tokens + P&L |
| E-6 price chart | E-1 | tokens (needs lib proposal) |
| E-7 sim HUD | E-3, E-4, E-5, B-9 | a scenario can be driven |
| E-8 lesson/drill UI | E-1, D-1 | tokens + schema |
| E-9 a11y pass | E-3…E-8 | UI exists |
| F-1 ProgressStore | A-2 | can test |
| F-2 export/import | F-1 | store |
| F-3 scoring | D-1, B-9 | drills + sim results |
| F-4 mastery gate | F-1, F-3 | store + scores |
| F-5 remediation | F-3, D-3 | scores + variants |
| F-6 retry loop | F-4, F-5 | gate + remediation |
| F-7 skill report | F-3, F-1 | scores persisted |
| G-1 Ch1 | D-2, E-7, E-8, F-4 | full loop playable |
| G-2…G-5 | G-1 (+ C-2/C-3/C-7 for Ch4–5) | pattern established |
| H-1…H-4 | G-5, C-4, C-5 | foundations + venue mechanics |
| I-1 Ch10 | H-4 | arb taught |
| I-2 Ch11 | B-7, I-1 | latency model + Ch10 |
| J-1 worker sandbox | B-9 | headless sim runnable |
| J-2 editor | E-1 | tokens (needs lib proposal) |
| J-3 strategy API | J-1 | sandbox |
| J-4 strategy scoring | J-3, F-3 | API + scoring |
| J-5 LLM client + BYOK | A-2 | can test |
| J-6 coach prompt/guardrail | J-5 | client |
| J-7 coach eval set | J-6 | guardrail |
| J-8 scripted fallback | J-6 | guardrail shape known |
| J-9 Ch12 content | J-4, J-6, J-8 | sandbox + coach |
| K-1 replay format | D-1, B-9 | schema + runner |
| K-2 capture tooling | K-1 | format |
| K-3 curate episodes | K-2 | tooling |
| L-1 landing | E-1, M2 done | design + something to show |
| L-2 SEO/OG | L-1 | landing |
| L-3 analytics | — | needs proposal first |
| L-4 README/license | — | anytime |
| L-5 launch audit | L-1, E-9 | landing + a11y |
| N-1…N-6 guide | M2 done | there is an architecture worth documenting |
| M-1…M-5 phase 2 | M3 done | core game complete |

### Parallelisation notes

- **C-1 (venue research) and L-4 (README/license) have no blockers** — good work for a session with no context.
- **Epic F (learning loop) is almost fully parallel with Epic B/C**: it depends on schema and scores, not on the matching engine.
- **Epic E splits cleanly**: E-3, E-4, E-5 can be built concurrently by different sessions once E-1 lands.
- **Chapters G-2…G-5 are parallel with each other** once G-1 establishes the pattern; same for H-1…H-4.
- **Epic J (capstone) is largely independent of Epic G/H/I content** — J-1 through J-8 can proceed as soon as B-9 exists.
- **Epic N (study guide) is a natural background task**: it documents what already exists.

---

# Epic A — Foundation & tooling

### A-1 — Next.js 15 scaffold with strict TypeScript and Tailwind
**Blocked by:** —
**Goal:** A deployable empty app with the layout from REQUIREMENTS §7.
**Acceptance criteria:**
- Next.js 15 App Router project at repo root; `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`.
- Tailwind configured; a `lib/`, `components/`, `fixtures/`, `tests/e2e/` tree exists with `.gitkeep`s.
- Path aliases: `@/lib/*`, `@/components/*`.
- `npm run build` and `npm run dev` both work; `/` renders a placeholder.
- ESLint rule bans `any` under `lib/engine/**` and `lib/content/**` (D35).
**Non-goals:** Any real UI, any game logic.

### A-2 — Vitest + React Testing Library harness
**Blocked by:** A-1
**Acceptance criteria:** `npm test` runs Vitest; jsdom environment configured for component tests; `@testing-library/jest-dom` matchers registered; one passing smoke test for a pure function and one for a trivial component; coverage reporting available via `npm run test:coverage`.

### A-3 — Playwright harness
**Blocked by:** A-1
**Acceptance criteria:** `npm run test:e2e` boots the dev server and runs Playwright against it; one smoke spec asserts `/` loads; CI-friendly (headless, retries configured); browsers installable via a documented command.

### A-4 — Lint, format, and CI
**Blocked by:** A-2
**Acceptance criteria:** ESLint + Prettier configured and passing on a clean tree; a GitHub Actions workflow runs typecheck, lint, unit tests, and build on push and PR; workflow is green on the current tree. E2E runs on PR only (documented rationale if excluded).

### A-5 — Vercel deployment
**Blocked by:** A-1
**Acceptance criteria:** Project connected to Vercel; pushes to `main` deploy to production, PRs get preview URLs; production URL recorded in `README.md`; build succeeds with no environment variables required (v1 needs none — D25 BYOK).
**Non-goals:** Custom domain (see `QUESTIONS.md` Q2).

### A-6 — Money and price primitives
**Blocked by:** A-2
**Goal:** Make float money arithmetic impossible (D20).
**Acceptance criteria:**
- Branded integer types for prices-in-ticks and cash-in-minor-units; constructors validate range and reject non-integers.
- Arithmetic helpers (`add`, `sub`, `mulQty`, `scale`) with explicit, documented rounding — no implicit `Math.round` anywhere else in the codebase.
- Formatters convert to display strings (`$0.62`, `62¢`) **only at the display boundary**.
- Unit tests cover: tick rounding at boundaries, negative values, overflow guards, and a property test that `format(parse(x)) === x` across the full price range.
**Non-goals:** Venue-specific tick sizes (that is C-2).

### A-7 — Seeded PRNG
**Blocked by:** A-2
**Acceptance criteria:** A small, documented, well-distributed PRNG (e.g. mulberry32/xoshiro) with an explicit seed; helpers for uniform int, uniform float, normal-ish draw, and weighted choice; **no use of `Math.random` anywhere in `lib/`** enforced by a lint rule; unit tests assert identical sequences for identical seeds and that independent streams do not correlate.

### A-8 — Brand constants
**Blocked by:** A-1
**Goal:** Make renaming the product a one-line change (D41).
**Acceptance criteria:**
- `lib/brand.ts` exports `PRODUCT_NAME`, `PRODUCT_TAGLINE`, `SITE_URL`.
- Every page title, metadata field, manifest entry, and piece of UI copy reads from it.
- Lint rule fails on the literal product name anywhere outside `lib/brand.ts` and the spec markdown files.
- Test: changing `PRODUCT_NAME` and rebuilding surfaces the new name everywhere; nothing greps back to the old one.
**Non-goals:** Logo, domain (Q2), final name (Q1).

---

# Epic B — Simulation engine

> All of Epic B is pure TypeScript under `lib/engine` — no React, DOM, or network (D19).

### B-1 — Order book data structure
**Blocked by:** A-6, A-7
**Acceptance criteria:**
- Two-sided book keyed by price level with **price-time priority** within a level.
- Operations: insert, cancel, amend, best bid/ask, spread, depth-at-price, cumulative depth, and a snapshot serialiser.
- Invariants enforced and tested: no crossed book after any operation, quantities never negative, levels with zero quantity are removed.
- Unit tests including a randomised (seeded) invariant-fuzz test over thousands of operations.

### B-2 — Matching engine
**Blocked by:** B-1
**Acceptance criteria:**
- Supports limit and market orders, both sides, with partial fills and resting remainders.
- Taking liquidity **walks the book and produces multiple fills at worsening prices** (this is Chapter 2's slippage lesson — D21).
- Emits an ordered event stream: `OrderAccepted`, `Fill`, `OrderResting`, `OrderCancelled`, `OrderRejected`.
- Unit tests: exact-size fill, partial fill, walk-the-book across three levels with verified average price, self-trade handling, and a fill-quantity conservation property test.
**Non-goals:** Fees (C-7), latency (B-7).

### B-3 — Simulation clock and tick loop
**Blocked by:** A-7
**Acceptance criteria:** A logical clock advanced in discrete ticks, decoupled from wall time; the UI drives it via `requestAnimationFrame` but tests drive it synchronously by calling `advance(n)`; supports pause, resume, and a speed multiplier that changes wall-clock pacing only and **never changes simulation outcomes**; tested by asserting identical event logs at 1× and 8×.

### B-4 — Background liquidity agents
**Blocked by:** B-2, B-3
**Goal:** A book that feels alive and reacts to the player.
**Acceptance criteria:**
- Configurable agent archetypes: passive market maker (quotes a spread around a fair value), noise taker, and informed trader (trades toward a drifting true probability).
- Agents are parameterised per scenario (spread width, size, aggression, refresh rate) and driven entirely by the injected PRNG.
- Scenario authors can pin fair value to a scripted path so a lesson's setup is guaranteed to occur.
- Tests: with a fixed seed, agent behaviour is byte-identical across runs; a market maker widens after being repeatedly taken; a pinned fair-value path produces the intended arb window.

### B-5 — Position, cash, and P&L accounting
**Blocked by:** B-2
**Acceptance criteria:** Tracks per-market position, average cost, realised and unrealised P&L, cash, and **capital committed/locked**; all integer arithmetic (D20); handles both long and short sides of a binary contract; P&L identity is property-tested (`realised + unrealised + cash == starting cash` under mark-to-mid across randomised trade sequences).

### B-6 — Order lifecycle, validation, and rejections
**Blocked by:** B-2
**Acceptance criteria:** Orders are validated before entering the book — price on-tick, size positive and within limits, sufficient buying power — and rejected with a **specific, player-readable reason**; cancel and amend handle races (cancel of an already-filled order is a no-op with a distinct outcome, not an error); every rejection reason is enumerated and tested.

### B-7 — Latency and queue-position modelling
**Blocked by:** B-2, B-3
**Goal:** Make Chapter 11's execution lessons real.
**Acceptance criteria:** Configurable per-scenario latency for order submit, cancel, and market-data receipt; the player sees a book that is *n* ticks stale while acting on it; queue position is tracked and exposed so a resting order can be shown as "3rd in line, 400 ahead"; a scenario can be configured such that a naive taker loses the race to a faster agent, and a test asserts that outcome deterministically.

### B-8 — Replay determinism harness
**Blocked by:** B-4, B-5
**Goal:** The guarantee everything else relies on (D18).
**Acceptance criteria:** A test utility runs `(scenarioId, seed, orderedActions)` and produces a canonical serialised event log; a harness asserts byte-identical logs across repeated runs, across tick-batch sizes, and across speed multipliers; **this harness is added to the Definition of Done gate in CI**; a recorded failing run can be dumped to JSON and re-loaded.

### B-9 — Scenario definition and runner API
**Blocked by:** B-8
**Acceptance criteria:** A typed `Scenario` (initial book, agents, fair-value path, venue, player starting cash, duration, objectives, success criteria) and a `runScenario` API usable both headlessly (tests, J-1 sandbox) and interactively (UI); scenario outcomes report objective-by-objective results, not just a score; at least two example scenarios exist and are tested headlessly.

---

# Epic C — Venue models

### C-1 — Venue parameter research and verification
**Blocked by:** — (research only; start anytime)
**Goal:** Never encode a venue fact from memory (D14).
**Acceptance criteria:**
- A `docs/venues.md` recording, for **Polymarket** and **Kalshi**: order types, price granularity/tick, fee formula (with worked examples), settlement/resolution process, withdrawal/gas costs, rate limits, and any merge/split or negative-risk mechanics.
- **Every single line carries a source URL and a checked-on date.** Anything that cannot be verified from public documentation is recorded as `UNVERIFIED` with a note on what would confirm it, and is raised in `QUESTIONS.md`.
- Worked fee examples are computed by hand in the doc so C-7's tests have an independent oracle.
**Non-goals:** Writing any code.

### C-2 — Venue interface + Kalshi model
**Blocked by:** C-1, A-6
**Acceptance criteria:** A `Venue` interface covering tick size, price bounds, order types, fee function, settlement rules, and display conventions; a Kalshi implementation matching `docs/venues.md` with source citations in comments; tests assert the documented worked examples reproduce exactly.

### C-3 — Polymarket model
**Blocked by:** C-2
**Acceptance criteria:** Polymarket implementation of `Venue` (CLOB semantics, USDC denomination, its own tick and fee treatment) with citations; tests reproduce `docs/venues.md` worked examples; a test asserts the two venues genuinely differ where the docs say they differ — so Chapter 4's comparison lesson is grounded in the model, not in prose.

### C-4 — YES/NO complement, merge and split
**Blocked by:** C-3
**Goal:** The mechanical basis of Chapter 6.
**Acceptance criteria:** Model the identity `YES + NO = $1`; buying NO is representable as selling YES and the engine treats them consistently; **split** (convert $1 collateral into one YES + one NO) and **merge** (convert a YES+NO pair back into $1) are supported operations with correct cash/position effects; tests assert a merged pair returns exactly $1 minus modelled costs and that split-then-merge is a no-op up to fees.

### C-5 — Multi-outcome sets and negative risk
**Blocked by:** C-4
**Acceptance criteria:** Represent an event with N mutually exclusive outcomes; compute the sum of best asks across all outcomes and flag when it is under/over $1; model the negative-risk conversion mechanic per `docs/venues.md`; tests cover a 3-outcome set with a real arb, one without, and one where fees eliminate an apparent arb.

### C-6 — Settlement and resolution
**Blocked by:** C-2, B-5
**Acceptance criteria:** A market resolves to YES or NO at a scripted time; positions settle to $1 or $0; cash and P&L update; **capital is shown as locked until resolution** (Chapter 10's lesson); scenarios can schedule resolution mid-run or after the clock ends; tests cover settlement of long, short, and offsetting positions.

### C-7 — Fee engine and true-cost calculator
**Blocked by:** C-2, C-3
**Goal:** Chapter 5's centrepiece.
**Acceptance criteria:** A single function computing the all-in cost of a proposed trade — venue fee, spread cost vs mid, expected slippage from walking the book, and gas/withdrawal where applicable — returning an itemised breakdown, not one number; the itemisation is what Chapter 5 renders to the player; tests reproduce `docs/venues.md` worked examples and cover the case where a 2¢ gross edge is net-negative after costs.

---

# Epic D — Content system

### D-1 — Content schema
**Blocked by:** B-9
**Goal:** The type that makes 12 chapters authorable safely (D34).
**Acceptance criteria:**
- Types for `Chapter`, `Objective`, `Lesson`, `Drill` (multiple-choice, numeric-answer, book-reading, order-construction, arb-identification), `Scenario` reference, `ChapterTest`, and `PassThreshold`.
- Every `Drill` and every `ChapterTest` question declares which `Objective` ids it assesses — this linkage is what makes remediation (F-5) possible, so it is required by the type, not optional.
- Each drill can declare a seeded **variant generator** (D-3) or be static.
- Schema is versioned; a `CONTENT_SCHEMA_VERSION` constant exists.
- Tests: a fixture chapter type-checks, and a deliberately malformed one fails a runtime validator.

### D-2 — Chapter registry and loader
**Blocked by:** D-1
**Acceptance criteria:** A registry enumerating all chapters in curriculum order (D8) with metadata (title, objective summary, estimated time, unlock requirement); loader returns a fully typed chapter; adding a chapter requires touching exactly one registry file; tests assert registry order matches D8 and that every referenced scenario id resolves.

### D-3 — Seeded drill variant generator
**Blocked by:** D-1, A-7
**Goal:** Make "retry with fresh variants" (D10) real.
**Acceptance criteria:** Given a drill template and a seed, generate a concrete instance with different numbers/books/prices but the **same objective and the same reasoning**; generated variants carry their own correct answer, computed rather than hard-coded; tests assert 100 seeded variants of a template all have correct, self-consistent answers and that no two consecutive retries produce an identical instance.

### D-4 — Content authoring guide
**Blocked by:** D-2, D-3
**Acceptance criteria:** `docs/authoring.md` explains how to add a chapter, write each drill type, define a scenario, wire objectives, and choose a pass threshold — with a complete worked example a future session can copy. Reviewed by actually following it to produce a throwaway chapter.

### D-5 — Content lint test
**Blocked by:** D-2
**Acceptance criteria:** A test suite over *all* registered content asserting: every objective is covered by ≥1 drill and ≥1 test question; every test question maps to a declared objective; no drill references a missing scenario; all prose passes a "no undefined jargon" check against a glossary of terms introduced so far (D2 — a term may not be used before the chapter that defines it). This test is what keeps 12 chapters honest.

---

# Epic E — UI and design system

### E-1 — Terminal design system
**Blocked by:** A-1
**Goal:** The dark, dense, monospace trading-terminal look (owner's choice) with beginner ergonomics.
**Acceptance criteria:**
- Design tokens: colour scale, typography (monospace for all numerics, proportional for prose), spacing, borders, and motion.
- **Semantic colour pairs never carry meaning alone** (D39): up/down, buy/sell, pass/fail always ship with a glyph or label.
- Numeric type is tabular-figure aligned so a ticking book does not jitter.
- A `/styleguide` dev-only route renders every token and primitive.
- Tests: a component test asserts a "down" indicator is identifiable with colour stripped.
**Non-goals:** Page layouts.

### E-2 — App shell and chapter map
**Blocked by:** E-1, D-2
**Acceptance criteria:** Persistent shell (header, progress indicator, settings); a chapter-map screen listing all 12 chapters with locked/unlocked/completed state and, for locked chapters, **what they teach and what unlocks them** (D12); fully keyboard navigable; component tests cover all three states.

### E-3 — Live order book component
**Blocked by:** E-1, B-1
**Acceptance criteria:** Renders both sides with price, size, and cumulative depth; highlights best bid/ask and the spread; animates changes without layout shift; supports a "teaching mode" where hovering any cell explains what that number means (D2); handles 20+ levels at 10 ticks/sec without dropping frames; keyboard-navigable cells; component tests cover render, update, and the explain-on-focus path.

### E-4 — Order ticket entry
**Blocked by:** E-1, B-6
**Acceptance criteria:** Keyboard-first entry of side, type (limit/market), price, size; live preview of estimated fill, average price, worst price, and all-in cost (C-7) **before** submit; rejections surface the engine's specific reason (B-6) inline; component tests cover a valid submit, each rejection reason, and full keyboard-only operation.

### E-5 — Positions, P&L, and blotter
**Blocked by:** E-1, B-5
**Acceptance criteria:** Panels for open positions (with average cost and unrealised P&L), realised P&L, cash, and locked capital, plus a fill blotter; every number has a tooltip explaining it in beginner terms; sign is always shown explicitly, never colour-only (D39).

### E-6 — Price / probability chart
**Blocked by:** E-1
**⚠️ Requires a library proposal first (D38)** — propose a charting approach (hand-rolled SVG vs a library) to the owner and record the decision before writing code.
**Acceptance criteria:** Plots mid price over simulation time with a probability-labelled axis (`$0.62` and `62%` are the same axis — Chapter 1's core idea); supports scenario annotations (news events, resolution); renders deterministically for a given event log so it can be snapshot-tested.

### E-7 — Simulation HUD
**Blocked by:** E-3, E-4, E-5, B-9
**Acceptance criteria:** Composes the book, ticket, positions, and chart into the playable scenario screen; shows the clock, the scenario objectives with live pass/fail state, and a hint affordance that costs score; pause/resume; end-of-scenario summary reporting objective-by-objective outcomes (B-9). E2E test plays a scenario to completion.

### E-8 — Lesson and drill presentation
**Blocked by:** E-1, D-1
**Acceptance criteria:** Renders each drill type from D-1, with immediate feedback that **explains why an answer is wrong**, not just that it is; supports the variant/retry flow (D-3); progress within a drill set is visible; fully keyboard operable; component tests per drill type.

### E-9 — Accessibility pass
**Blocked by:** E-3…E-8
**Acceptance criteria:** Automated a11y checks pass on every screen; a documented keyboard map for the whole game; focus order verified on the simulation screen; a manual pass confirms the game is completable without a mouse; reduced-motion preference respected by the book and chart animations.

---

# Epic F — Learning loop

### F-1 — ProgressStore interface + localStorage implementation
**Blocked by:** A-2
**Acceptance criteria:** Interface covering chapter completion, per-objective mastery, scores, attempt history, and settings (D30); localStorage implementation behind it; **versioned payload with a migration path**, and an unreadable/newer save degrades to an explicit "reset or export" prompt rather than crashing (D31); tests cover round-trip, corrupt data, version bump, and quota-exceeded.

### F-2 — Progress export / import
**Blocked by:** F-1
**Acceptance criteria:** Export produces a JSON file the player can save; import validates and restores it, rejecting malformed or wrong-version files with a clear message (D32); round-trip test.

### F-3 — Scoring model
**Blocked by:** D-1, B-9
**Acceptance criteria:** Combines drill/test correctness with scenario performance into a per-objective mastery score and a chapter score; **scenario performance is judged on objectives met, not raw P&L** (a lucky profitable run that missed the lesson does not pass — this is the whole point); hints taken reduce score by a documented amount; pure and unit-tested against hand-computed cases.

### F-4 — Mastery gate and unlock logic
**Blocked by:** F-1, F-3
**Acceptance criteria:** Applies the per-chapter threshold (D11); unlocks the next chapter on pass; a failed attempt records exactly which objectives fell short; completed chapters remain replayable and a replay never lowers a recorded best (D12); tests cover pass, fail, borderline, and replay.

### F-5 — Remediation selector
**Blocked by:** F-3, D-3
**Acceptance criteria:** Given failed objectives, selects the specific lesson segments and drills that target them — never a blanket "redo the chapter" (D10); prefers content the player has not already seen; tests assert that failing exactly one objective produces remediation containing only that objective's material.

### F-6 — Retry loop
**Blocked by:** F-4, F-5
**Acceptance criteria:** Failing a chapter test routes to remediation, then to a retry generated with a **new seed and fresh variants** (D-3); attempt history is preserved; an e2e test fails a chapter deliberately, completes remediation, and passes the retry, asserting the retry questions differ from the first attempt.

### F-7 — Skill report
**Blocked by:** F-3, F-1
**Acceptance criteria:** A screen showing mastery per objective across all chapters, weakest areas first, with a link straight into targeted practice; honest about what has not been attempted yet (never shows 0% for untouched material as if it were failed).

---

# Epic G — Chapters 1–5 (foundations)

> Each chapter ticket delivers: objectives, lesson segments, drill set, ≥1 scenario, a
> chapter test, and a pass threshold — all passing D-5 content lint. "Playable" means an
> e2e test completes the chapter from locked to passed.

### G-1 — Chapter 1: Markets & price-as-probability
**Blocked by:** D-2, E-7, E-8, F-4
**This ticket also establishes the pattern every later chapter follows — take extra care.**
**Objectives:** read bid/ask/spread/depth/last from a book; state which side you trade at when buying vs selling; explain why $0.62 ≈ 62% probability; identify the widest and tightest spread among books.
**Scenarios:** a slow, calm market where the player is asked only to *read* and *predict* — no P&L pressure; a second where they must buy at the best available price and observe which side filled them.
**Drills:** label-the-book; "you want to buy now — what price do you get?"; price↔probability conversion; spread comparison.
**Test:** mixed drills + a scenario where they must answer four live questions about a moving book inside a time limit.
**Non-goals:** Order types (Ch 2), fees (Ch 5).

### G-2 — Chapter 2: Orders & fills
**Blocked by:** G-1
**Objectives:** choose limit vs market and predict the fill; explain maker vs taker; explain queue priority and why a resting order may never fill; compute the average price of an order that walks the book; define slippage and predict when it will be large.
**Scenarios:** thin book where a market order walks three levels — the player sees the average price they actually got vs the price they saw; a scenario where a limit order sits unfilled while the market moves away.
**Drills:** predict-the-fill across randomised books (D-3 variants); compute average fill price; "which order type here, and why"; queue-position reasoning.
**Test:** must achieve a target average price in a thin book, which is only possible by using limits patiently.

### G-3 — Chapter 3: Probability & expected value
**Blocked by:** G-1
**Objectives:** convert between price, implied probability, decimal odds, and American odds; compute EV of a trade; compute edge in cents and in percent; explain why a +EV trade frequently loses; explain variance and sample size.
**Scenarios:** a repeated-bet simulator where the player takes a small known edge many times and watches the distribution of outcomes — including losing streaks that are perfectly normal.
**Drills:** odds conversion (variant-generated); EV computation; "is this +EV?"; "you lost 6 of 10 with a 3% edge — what does that mean?".
**Test:** timed conversions plus EV judgement calls, including traps where the edge is negative after a moment's thought.

### G-4 — Chapter 4: Prediction markets
**Blocked by:** G-3, C-3
**Objectives:** explain the $0–$1 binary contract; use `YES + NO = $1` and show buying NO ≡ selling YES; explain resolution and settlement and who decides; state the concrete differences between Polymarket's CLOB and Kalshi's exchange (denomination, tick, fees, resolution) — grounded in `docs/venues.md` (C-1).
**Scenarios:** the same real-world question quoted on both modelled venues side by side; hold a position through a scripted resolution and watch it settle to $1 or $0.
**Drills:** complement arithmetic; "you hold 100 NO at 30¢ and it resolves NO — what is your P&L?"; venue-difference identification.
**Test:** includes at least one question that is only answerable by consulting the *modelled* venue's real parameters.

### G-5 — Chapter 5: Frictions
**Blocked by:** G-4, C-7
**Objectives:** compute a venue fee from its real formula; compute spread cost vs mid; estimate slippage before trading; account for gas/withdrawal and capital lockup; **demonstrate that a visible gross edge can be net-negative**.
**Scenarios:** the player is shown an apparently free 2¢ edge and, if they take it naively, ends the scenario down — then the itemised cost breakdown (C-7) explains exactly where it went.
**Drills:** fee computation (variant-generated per venue); all-in cost of a stated trade; "what is the minimum gross edge that clears costs at this size?".
**Test:** a set of trades where the player must accept only the ones that clear costs. **This chapter's threshold should be high — every arb chapter depends on it.**

---

# Epic H — Chapters 6–9 (the four arbitrage families)

> **This epic is the reason the product exists (D0/§0).** Each chapter must end with the
> player able to state the strategy precisely enough to implement it — that phrasing is
> exactly what Chapter 12's coach will demand of them (D23).

### H-1 — Chapter 6: ARB I — the Dutch book
**Blocked by:** G-5, C-4
**Objectives:** recognise `best ask(YES) + best ask(NO) < $1` as a locked profit; compute the profit per pair and the maximum size available given depth on both sides; use merge to realise it immediately rather than waiting for resolution; recognise the trap where the arb is real gross but negative net of fees (Ch 5); recognise the trap where depth on one side is far smaller than the other.
**Scenarios:** a book where a genuine Dutch book opens for a limited window and closes if the player is slow; a decoy where the sum is under $1 but fees and thin depth make it a loss.
**Drills:** given two books, is there an arb, and for how much size; compute net profit; choose merge vs hold-to-resolution.
**Test:** several live windows where the player must take only the profitable ones and size them correctly.

### H-2 — Chapter 7: ARB II — cross-venue
**Blocked by:** H-1
**Objectives:** identify the same real-world event listed on both venues and compare like-for-like after normalising tick, fee, and denomination differences; compute net edge across venues; **reason about leg risk** — you fill one side and the other moves; explain why one leg filled and the other missed is a directional position you did not want; describe how a bot mitigates leg risk (sequencing, size, fallback).
**Scenarios:** two venues quoting one event, with an edge that requires acting on both; a version where the second leg is deliberately faster to disappear, so the player experiences a stranded leg and must manage out of it.
**Drills:** normalise-and-compare across venues; compute cross-venue net edge; "which leg do you send first, and why".
**Test:** graded on net P&L **and** on whether the player ever ended holding an unhedged leg unintentionally.

### H-3 — Chapter 8: ARB III — logical / correlated
**Blocked by:** H-1, C-5
**Objectives:** for N mutually exclusive outcomes, detect when the asks sum below $1 (or bids above); detect conditional inconsistencies ("A wins the tournament" priced above "A reaches the final"); check moneyline-vs-spread consistency; distinguish a true logical guarantee from a merely correlated relationship that can break.
**Scenarios:** a multi-outcome event whose components drift into inconsistency; a pair of related markets where a *correlated-but-not-guaranteed* relationship looks like an arb and is not — the player must decline it.
**Drills:** sum-the-outcomes; find the inconsistent pair; "is this a logical guarantee or a correlation?" — the most important discrimination in the chapter.
**Test:** a mixed set of guaranteed and merely-correlated opportunities; taking a correlated one scores as a failure even if it happens to be profitable in that run (F-3).

### H-4 — Chapter 9: ARB IV — temporal
**Blocked by:** H-2, B-7
**Objectives:** recognise a stale quote after a news event; act inside the latency window; explain the difference between arbing a stale quote and making markets; **recognise adverse selection** — when the "stale" quote you are lifting belongs to someone who knows something you do not; explain why speed is a prerequisite and what that implies for a bot.
**Scenarios:** a scripted news event where one venue reprices and the other lags; a trap where the lagging quote is actually correct and the mover was noise, so the "arb" loses.
**Drills:** given a news event and two books, act or wait; "why did this stale quote not fill?"; identify adverse selection after the fact.
**Test:** measured on decision quality across many windows, with adverse-selection traps mixed in.

---

# Epic I — Chapters 10–11 (risk and execution)

### I-1 — Chapter 10: Risk & sizing
**Blocked by:** H-4
**Objectives:** compute the Kelly fraction for a binary bet and explain why practitioners use a fraction of it; reason about drawdown and ruin; account for capital locked until resolution and the opportunity cost of it; explain why a book of "riskless" arbs is correlated (same venue, same resolution source, same counterparty risk) and can fail together.
**Scenarios:** a bankroll simulation across many opportunities where over-sizing leads to ruin despite every individual bet being +EV; a scenario where several "independent" arbs share a resolution source that goes wrong.
**Drills:** Kelly computation (variant-generated); "how much of your bankroll can be locked at once"; identify the shared risk across a set of positions.
**Test:** manage a bankroll across a sequence of opportunities; scored on survival and growth, not single-trade profit.

### I-2 — Chapter 11: Execution
**Blocked by:** I-1, B-7
**Objectives:** reason about order latency and market-data staleness; handle partial fills programmatically; respect rate limits; place and manage resting orders with queue awareness; describe a concrete order-placement policy for a bot (what to send, in what order, with what fallback on partial fill or rejection).
**Scenarios:** an arb requiring two legs under a latency budget and a rate limit, where naive rapid-fire submission gets throttled and loses the opportunity.
**Drills:** partial-fill handling decisions; rate-limit budgeting; "your first leg filled 40% — what now?".
**Test:** execute a multi-leg opportunity under realistic constraints; scored on completion without stranded legs or rate-limit failures.
**Output that matters:** by the end, the player can write down an execution policy in prose — which is the input Chapter 12 requires.

---

# Epic J — Chapter 12 capstone: strategy sandbox and Socratic coach

### J-1 — Web Worker sandbox runtime
**Blocked by:** B-9
**Acceptance criteria:** Player code executes in a Web Worker with **no network and no DOM access** (D28); a hard wall-clock budget per tick and per run terminates a runaway worker without freezing the page; errors and `console.log` from player code surface in an in-app console with correct line references; tests cover an infinite loop, a thrown error, and an attempted `fetch` (which must fail closed).

### J-2 — Code editor component
**Blocked by:** E-1
**⚠️ Requires a library proposal first (D38)** — propose an editor (e.g. CodeMirror vs a plain textarea with minimal highlighting) with a bundle-size argument, and record the decision.
**Acceptance criteria:** Edits JavaScript with syntax highlighting and reasonable keybindings; content persists to `ProgressStore`; works with keyboard only; a reset-to-template action exists.

### J-3 — Strategy API surface
**Blocked by:** J-1
**Goal:** The API the player codes against should look like a real bot's, so the knowledge transfers (D22).
**Acceptance criteria:** A documented, typed API given to player code: read books across venues, read positions/cash, place/cancel orders, and a per-tick entry point; deliberately mirrors the shape of a real exchange client; `docs/strategy-api.md` documents it with worked examples; a reference solution strategy exists and passes the capstone scenarios (kept in a test-only path, **never shipped where a player can read it**).

### J-4 — Strategy scoring harness
**Blocked by:** J-3, F-3
**Acceptance criteria:** Runs a player strategy across a *suite* of scenarios (including ones it has not seen), scoring on objectives met, net P&L after costs, stranded legs, rate-limit violations, and worst drawdown; results are reported as a breakdown, not a single number; deterministic for a given seed set.

### J-5 — LLM client interface + BYOK key management
**Blocked by:** A-2
**⚠️ Requires a library proposal first (D38)** — using the Anthropic SDK vs a plain `fetch` client is a real decision; a `fetch` client keeps the bundle small and the swap-to-proxy trivial. Propose and record.
**Acceptance criteria:** An `LLMClient` interface with a browser BYOK implementation (D25); the key is stored in `localStorage`, **never logged, never sent anywhere but Anthropic** (D26), and the UI states plainly that a browser-held key is visible to the page; a clear "remove key" action; graceful, specific handling of invalid key, rate limit, and network failure; a proxy implementation of the same interface is stubbed for M-4; tests use a fake client.

### J-6 — Socratic coach prompt and guardrail
**Blocked by:** J-5
**Goal:** The coach that will not do your thinking for you (D23).
**Acceptance criteria:**
- A system prompt that: refuses to identify the arb, refuses to write code from a bare request, and instead requires the player to state **entry condition, sizing rule, exit condition, and the risk being accepted**.
- When the player supplies a genuine strategy statement, the coach translates it into code against the J-3 API **and critiques what is missing or wrong** — without silently fixing it.
- Partial statements get a targeted question about the missing part, not a lecture.
- The guardrail is enforced structurally where possible (the client refuses to send code-generation requests unless a strategy statement is present in the session), not by prompt text alone.
- Conversation state is scoped to the current scenario.

### J-7 — Coach guardrail eval set
**Blocked by:** J-6
**Acceptance criteria:** A golden set of ≥30 prompts split into **answer-seeking** ("just give me the code", "what's the arb here", "fix it for me", plus jailbreak-flavoured attempts) and **strategy-stating** (well-formed and partial); an eval harness scores deflection and service rates; **the answer-seeking set must be 100% deflected for the suite to pass** (D24); runnable against a real key locally and against a recorded fake in CI.

### J-8 — Scripted coach fallback
**Blocked by:** J-6
**Acceptance criteria:** With no API key, a rules-based coach parses the player's strategy statement into the four required parts, tells them which parts are missing, and offers canned critiques per missing part (D27); Chapter 12 is fully completable without any LLM.

### J-9 — Chapter 12 content
**Blocked by:** J-4, J-6, J-8
**Objectives:** express a strategy as entry/sizing/exit/risk; implement it against the J-3 API; debug it from its own results; explain why it fails on an unseen scenario.
**Structure:** a guided first strategy (a simple Dutch-book scanner), then an open brief where the player designs their own and is scored by J-4 across held-out scenarios.
**Test:** the strategy must clear a net-profit bar after costs on unseen scenarios **and** the player must correctly answer why it underperforms where it does.

---

# Epic K — Historical replay data

### K-1 — Replay fixture format
**Blocked by:** D-1, B-9
**Acceptance criteria:** A versioned JSON format for a captured episode (venue, market, timestamped book snapshots/deltas, trades, resolution outcome, provenance metadata: source, capture date, licence note); a `ReplayFeed` implements `MarketFeed` (D17) and drives the engine deterministically; tests replay a small fixture and assert determinism.

### K-2 — Capture tooling
**Blocked by:** K-1
**Acceptance criteria:** A documented offline script that fetches public data and emits a K-1 fixture; **it is a build-time tool and never ships in the client bundle**; it records provenance automatically; `docs/replays.md` documents how to capture a new episode and the terms-of-use position on the data used.

### K-3 — Curate replay episodes
**Blocked by:** K-2
**Acceptance criteria:** 3–4 real episodes captured and committed, each mapped to the chapter it serves — e.g. a high-volatility resolution, a genuine cross-venue divergence, a stale-quote-after-news moment; each has a written note on what the player should notice; fixture size kept sane (documented budget) so the bundle stays reasonable.

---

# Epic L — Publish

### L-1 — Landing page
**Blocked by:** E-1, M2 complete
**Acceptance criteria:** All copy reads from `lib/brand.ts` (A-8). A public page stating what the game teaches, who it is for, and what you can do afterward; shows the 12-chapter arc; a live non-interactive demo of a ticking order book as the hero; "Start Chapter 1" is the primary action with no signup; SSR-rendered for SEO (D33).

### L-2 — SEO, metadata, and social cards
**Blocked by:** L-1
**Acceptance criteria:** Title/description/canonical per route; OG and Twitter cards with a generated image; `sitemap.xml` and `robots.txt`; Lighthouse SEO ≥ 95 on the landing page.

### L-3 — Analytics decision
**Blocked by:** —
**⚠️ Decision + library proposal required (D38).** Present options (none / privacy-preserving self-hosted / hosted) with the privacy tradeoff, get an explicit choice, record it as a new D-number, then implement. **Whatever is chosen must never capture the BYOK key or player code (D26).**

### L-4 — README, licence, and contributing
**Blocked by:** —
**Acceptance criteria:** `README.md` covering what it is, running it locally, the test commands, the architecture in brief, and a pointer to `/guide`; a licence chosen with the owner (see `QUESTIONS.md` Q3); `CONTRIBUTING.md` if the repo is public.

### L-5 — Launch audit
**Blocked by:** L-1, E-9
**Acceptance criteria:** Full pass over: a11y (E-9), performance (book at 10 ticks/sec on a mid-range laptop, bundle-size budget documented and met), broken links, a cold-start play-through of Chapters 1–3 by someone who has not seen it, error boundaries on every route, and a graceful message for unsupported browsers.

---

# Epic M — Phase 2: live data and hosted coach

> **Blocked by M3 (the core game) being complete.** Nothing here may destabilise v1.

### M-1 — Live feed proxy route
**Blocked by:** M3 complete
**Acceptance criteria:** A Next.js route handler proxying public Polymarket/Kalshi market data (solving CORS), with caching, rate limiting, timeouts, and a documented failure mode; **the client degrades to replay mode if the proxy is unavailable, never breaking a chapter**; respects each venue's published terms and rate limits (cited).

### M-2 — Live MarketFeed adapter
**Blocked by:** M-1
**Acceptance criteria:** A `LiveFeed` implementing the same `MarketFeed` interface (D17) as synthetic and replay; normalises both venues into the engine's model; handles gaps, reconnects, and stale data explicitly, surfacing staleness to the player rather than hiding it (which is itself Chapter 9's lesson).

### M-3 — Live paper-trading mode
**Blocked by:** M-2, C-6
**Acceptance criteria:** Late chapters gain a mode where the player paper-trades **real current markets**; positions persist across sessions until the real market resolves; when it does, the player is scored against what actually happened (D16); a permanent, unmissable "PAPER — no real money, no real orders" indicator; **the code physically cannot place a real order — no write endpoint exists in the proxy** (treat any change that weakens this as a stop-and-flag event).

### M-4 — Hosted coach proxy
**Blocked by:** M3 complete, J-6
**Acceptance criteria:** A route handler holding the owner's key and enforcing the Socratic system prompt **server-side** so it cannot be bypassed by editing the client (D25); per-IP rate limiting and a cost cap; the client's `LLMClient` switches implementation by config with no change above the interface; the J-7 eval set passes against the proxy.

### M-5 — Abuse and cost controls
**Blocked by:** M-4
**Acceptance criteria:** Documented spend ceiling with alerting; automatic degradation to BYOK/scripted coach when the ceiling is hit; abuse patterns (prompt-stuffing, repeated jailbreak attempts) rate-limited and logged **without storing player-identifying data**.

---

# Epic N — Interactive study guide (`/guide`) — D40

> A first-class deliverable: an interactive, in-app explanation of how this product is
> built and why. Written for the owner to navigate the codebase confidently, and for any
> future CC session to onboard fast. Every claim must be **live-linked to real code**, and
> a test must fail if a referenced symbol no longer exists — a study guide that drifts
> from the code is worse than none.

### N-1 — Guide shell and navigation
**Blocked by:** M2 complete
**Acceptance criteria:** A `/guide` route with sectioned navigation, matching the terminal design system; deep-linkable sections; keyboard navigable; **it is not a static dump of prose** — each section hosts an interactive element.

### N-2 — Architecture map
**Blocked by:** N-1
**Acceptance criteria:** An interactive diagram of the layers (UI → learning loop → content → engine → venues → feed) where clicking a box reveals what it owns, what it must never do (e.g. "the engine never touches the network — D19"), and the real file paths; a test asserts every referenced path exists.

### N-3 — Live engine walkthrough
**Blocked by:** N-1, B-8
**Acceptance criteria:** An interactive panel where the reader steps a real simulation tick by tick and watches the book, the event log, and P&L update together; a seed control demonstrates determinism (D18) by producing an identical log twice; shows the actual event stream the engine emits, not a mock.

### N-4 — Content pipeline walkthrough
**Blocked by:** N-1, D-4
**Acceptance criteria:** Explains the `Chapter` schema by rendering a real chapter's structure interactively; a live demonstration of the variant generator (D-3) producing different instances of the same drill from different seeds; links to `docs/authoring.md`.

### N-5 — Decision log
**Blocked by:** N-1
**Acceptance criteria:** Renders the D-numbered decisions from `REQUIREMENTS.md` as a browsable, filterable log, each linked to the code that implements it; **generated from the source file, not hand-copied**, so it cannot drift; a test asserts every D-number in the file appears in the guide.

### N-6 — "Add a chapter" interactive tutorial
**Blocked by:** N-4
**Acceptance criteria:** A step-by-step walkthrough of adding a new chapter end to end — registry entry, objectives, drills, scenario, threshold, tests — with real code shown at each step; ends with a checklist that mirrors D-5's content lint so a reader knows what the test will demand.
