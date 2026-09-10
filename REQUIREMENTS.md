# REQUIREMENTS.md — Dutch Book

**Living source of truth.** Nothing is "decided" until it is written here. Every locked
decision is dated with a one-line rationale. When implementation surfaces a new
ambiguity, stop and interrogate it (batched questions, push back on vagueness, make a
concrete choice) and record the outcome here immediately — do not leave it implicit in
code or chat.

- Project: a browser learning game that takes a total beginner from "what is a bid?" to
  writing and running prediction-market arbitrage strategies.
- Read this file **and** `BACKLOG.md` at the start of every session before touching a ticket.
- Open, undecided items live in `QUESTIONS.md`. Do not silently resolve them.
- Last updated: 2026-09-10 (initial capture D1–D40; added working standards D41–D44).

---

## 0. Why this exists

The owner intends to build a prediction-market arbitrage trading bot but does not
currently understand the underlying strategies or the market mechanics they depend on.
This product is the prerequisite: it teaches the foundational knowledge through
simulated scenarios and graded tests, and ends by bridging directly into writing bot
strategy code. It is also a public, publishable product in its own right.

**Design consequence:** every chapter must justify itself by "does a bot author need
this?" Content that is interesting-but-inapplicable is out of scope.

---

## 1. Product shape (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Product = a browser learning game**, not a course, not a doc site. Every concept is taught through a playable simulated market or an interactive drill. Prose exists only to set up interaction. | The owner learns by doing; passive reading is what already failed. |
| D2 | **Audience = total beginner.** Assume zero vocabulary: "bid", "ask", "order book", "fill" must all be introduced from nothing. Never use an untaught term without defining it in place. | Explicit owner self-assessment. Also widens the public audience. |
| D3 | **Scope = the full ladder to running arb bots.** Market basics → prediction-market mechanics → four families of arbitrage → risk/sizing → execution → writing strategy code. | The product's job is finished only when the owner can build the bot. |
| D4 | **Size = 12 chapters, ~6–10 hours of content.** A real course-sized product. | Owner chose "substantial" knowingly. |
| D5 | **Shape of a chapter = concept → drills → live simulation "boss level".** Short taught concept, then fast repetition drills, then a timed simulated market with a ticking clock and a live order book you trade against. | Owner chose "live sim + quizzes between levels"; drills sit between the two to build fluency before pressure. |
| D6 | **Public product, desktop-first. Mobile is explicitly out of scope for v1.** The UI must not be built in a way that makes responsive impossible later, but no ticket carries mobile acceptance criteria. | Dense order books need screen area; owner accepted the tradeoff. |
| D7 | **Product name = "Dutch Book"**, repo `dutchbook`. Used everywhere for now; **the name is not locked** and D41 keeps changing it cheap. | On-theme and memorable, but a beginner-facing landing page may want plainer words (Q1). |

## 2. Curriculum (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D8 | **The 12-chapter arc is locked as ordered below.** Chapters may grow or split internally, but the sequence and the learning objective of each chapter do not change without a recorded decision. | The dependency order is pedagogical: each chapter's drills assume the previous chapter's fluency. |

| Ch | Title | Learning objective (what the player can do after) |
|----|-------|---------------------------------------------------|
| 1 | Markets & price-as-probability | Read an order book: bid, ask, spread, depth, last. Explain why a price of $0.62 means "the market thinks 62%". |
| 2 | Orders & fills | Choose between limit and market orders and predict the fill. Explain maker vs taker, queue priority, partial fills, and slippage. |
| 3 | Probability & expected value | Compute fair value and edge. Convert between price, probability, decimal odds, and American odds. Explain variance and why a +EV bet can lose. |
| 4 | Prediction markets | Explain $0–$1 binary contracts, YES/NO equivalence (`YES + NO = $1`), resolution, and settlement. Describe how Polymarket's CLOB and Kalshi's exchange actually differ. |
| 5 | Frictions | Compute the true cost of a trade: fees, spread, gas/withdrawal, and capital lockup. Demonstrate why a paper edge dies in practice. |
| 6 | **ARB I — Dutch book** | Spot and size `YES + NO < $1` within one venue. Use merge/split and negative-risk mechanics. |
| 7 | **ARB II — Cross-venue** | Spot the same event mispriced across two venues. Reason about leg risk and losing the race. |
| 8 | **ARB III — Logical / correlated** | Spot violations across mutually exclusive outcome sets, conditional relationships, and moneyline-vs-spread consistency. |
| 9 | **ARB IV — Temporal** | Exploit stale quotes and news latency. Distinguish arbing from market making, and recognise when "stale" is actually adverse selection. |
| 10 | Risk & sizing | Size positions with Kelly and fractional Kelly. Reason about drawdown, capital locked until resolution, and why "riskless" positions are correlated. |
| 11 | Execution | Reason about latency, rate limits, partial-fill handling, and adverse selection as a bot author. |
| 12 | **Capstone — Strategy sandbox** | Write a working scanner/strategy in the in-browser editor, with a Socratic coach, and run it against the simulated feed and (phase 2) live markets. |

| # | Decision | Rationale |
|---|----------|-----------|
| D9 | **Every chapter ends in a graded test** combining a quiz and measured performance in that chapter's simulation. | Owner asked for tests; performance-in-sim is the honest measure of whether a concept transferred. |
| D10 | **Score gate + retry until mastered.** Below the pass threshold, the player gets remediation targeted at exactly the objectives they missed, then retries with *freshly generated variants* — never the identical question set. | Owner's choice. Fresh variants prevent memorising the answer key instead of the concept. |
| D11 | **Pass threshold is per-chapter and defined in that chapter's content module**, not a global constant. | Chapter 3 arithmetic and Chapter 9 judgement calls deserve different bars. |
| D12 | **Progression is gated but not punitive:** a locked chapter shows what it teaches and what you must pass to unlock it. Completed chapters are always replayable. | Beginner-friendly without abandoning rigour. |

## 3. Simulation fidelity (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D13 | **Venues are modelled on real Polymarket and Kalshi, by name, accurately.** Fee formulas, price granularity, order types, settlement, and Polymarket's merge/split and negative-risk mechanics are reproduced, not abstracted away. | Knowledge must transfer directly to the bot the owner is going to write. |
| D14 | **Real venue parameters must be verified against current public documentation at implementation time and cited in code**, never written from memory. Any parameter that cannot be verified is marked `UNVERIFIED` in the venue config and surfaced in `QUESTIONS.md`. | Fee schedules and mechanics change; a confidently wrong fee formula teaches a false lesson and would produce a losing bot. |
| D15 | **Market data = hand-tuned synthetic scenarios plus real historical replays.** Synthetic scenarios are designed to teach one specific lesson (this book *has* an arb; that one is a trap). Historical replays are real captured episodes, committed as static JSON fixtures. | Teaching requires designed situations; authenticity requires real ones. Static fixtures keep the site deployable and tests deterministic. |
| D16 | **Live real market data is phase 2**, not v1. Late chapters gain a live paper-trading mode that connects to real Polymarket/Kalshi public feeds, lets the player paper-trade current markets, and scores them against what actually happened. | Owner wants it, but it needs a server proxy (CORS, rate limits, keys) and cannot be allowed to block or destabilise the core game. |
| D17 | **The data layer is an adapter interface from day one.** The engine consumes a `MarketFeed`; synthetic, replay, and (phase 2) live are implementations. No component may reach for a network call directly. | This is the single design decision that makes phase 2 a drop-in rather than a rewrite. |
| D18 | **The simulation engine is deterministic and replayable.** All randomness comes from an injected seeded PRNG. A run is fully identified by `(scenarioId, seed, ordered player actions)` and reproduces exactly. | Non-negotiable for testable grading, for reproducing a player's bad run during remediation, and for trustworthy fixtures. |
| D19 | **The engine is pure TypeScript with no React, DOM, or network dependency.** It is a library that a UI drives, exercised by unit tests in isolation. | Keeps the hard logic testable and lets the same engine later run headless inside the strategy sandbox. |
| D20 | **All money and prices are integers in the venue's minimum tick (cents or sub-cent units) — never floating point.** Formatting to `$0.62` happens only at the display boundary. | Float arithmetic silently breaks arbitrage detection, where the entire edge is often one tick. |
| D21 | **The order book is a real matching engine**: price-time priority, partial fills, resting orders, and a book that moves when the player takes liquidity. Player fills must be able to move the price against them. | Slippage and queue position are Chapters 2 and 11's core lessons; they cannot be taught by a fake book. |

## 4. Capstone & the Socratic coach (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D22 | **Chapter 12 provides an in-browser JavaScript editor.** The player writes a strategy/scanner function that is executed against the simulated market feed and scored. | Bridges the game directly to the bot the owner wants to build. |
| D23 | **The player may ask an LLM coach to help write the code, but the coach will not supply the answer.** It refuses "just give me the code" / "what's the arb here". It requires the player to *state the strategy* in their own words — entry condition, sizing, exit, and what risk they are accepting — and only then translates that stated strategy into code, while critiquing gaps. | Owner's explicit design. It preserves the learning objective: the player must own the strategy; the LLM is only a translator and critic. |
| D24 | **The coach's refusal behaviour is a tested product feature, not a prompt suggestion.** There is a golden-set eval of "answer-seeking" prompts that must be deflected and "strategy-stating" prompts that must be served. | A guardrail that isn't tested isn't a guardrail. |
| D25 | **LLM access is bring-your-own-key now, hosted proxy later.** v1: the player pastes an Anthropic API key, stored in `localStorage`, called from the browser. The call layer is an interface so a server proxy can be substituted with no change above it. | Keeps v1 static and costs the owner nothing; the abstraction makes the paid public path a config change. |
| D26 | **The BYOK key is never transmitted anywhere except Anthropic**, never logged, never included in analytics or error reports, and the UI states plainly that a browser-held key is visible to the page. | Honest handling of someone else's credential. |
| D27 | **When no key is present, Chapter 12 still works** in a scripted-coach fallback mode with reduced flexibility, and the sandbox itself is fully playable without any LLM. | The capstone must not be paywalled behind a key the public may not have. |
| D28 | **Player-authored code runs sandboxed in a Web Worker** with no network, no DOM, and a hard execution-time budget; a runaway strategy terminates the worker without hanging the page. | The player is writing loops in a browser; this is a certainty, not a risk. |

## 5. Persistence, accounts, privacy (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D29 | **v1 has no accounts.** Progress, scores, and settings live in `localStorage`. | Ship the game, not an auth system. |
| D30 | **Persistence goes through a `ProgressStore` interface** with a `localStorage` implementation in v1, so a hosted backend can be added without touching game code. | Owner chose "static now, backend-ready later"; this is what that means concretely. |
| D31 | **Saved progress is versioned and migratable.** A schema version is stored alongside it; an unreadable or newer-version save degrades gracefully (offer reset) rather than crashing. | Content will change under players who have saves. |
| D32 | **Progress is exportable and importable as a JSON file.** | Without accounts, this is the only way a player keeps progress across devices — and it makes bug reports reproducible. |

## 6. Technology (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D33 | **Next.js 15 (App Router) + TypeScript + Tailwind**, deployed on **Vercel**. | Vercel-native: the phase-2 LLM proxy and live-data CORS proxy become route handlers in the same repo with no migration. SSR landing page for a public product. |
| D34 | **Content is authored as typed TypeScript modules** — one module per chapter exporting a typed `Chapter` object (lessons, drills, scenarios, scoring). | Compile-time validation of content, autocomplete for the schema, and scenarios can embed real logic rather than a limited DSL. |
| D35 | **TypeScript `strict` is on and `any` is disallowed** in `lib/engine` and `lib/content`. | The engine's correctness is the product. |
| D36 | **Testing: Vitest** for engine/content/pure logic, **React Testing Library** for components, **Playwright** for end-to-end. | Three levels, each cheap at its own level. |
| D37 | **Tests are part of every ticket's acceptance criteria — a ticket is not done until they are green.** See Definition of Done in `BACKLOG.md`. | Same standard the owner applies on `herd`. |
| D38 | **Approve-each-library:** no new runtime or dev dependency is added without proposing it to the owner and recording approval in the approved-libraries table below. | Keeps a public product's dependency surface deliberate. |
| D39 | **Accessibility baseline:** keyboard-operable game controls, visible focus, semantic markup, and no information conveyed by colour alone — red/green must always carry a sign or label too. | A trading UI is the worst-case offender for colour-only meaning, and this is a public product. |
| D40 | **The repo ships an interactive study guide about itself** at `/guide` — an in-app, navigable explanation of the architecture, the engine, the content pipeline, and the reasoning behind the decisions in this file. It is a first-class deliverable with its own tests, not a README. | Owner's explicit request: they want to be able to navigate and understand the product technically, not just play it. |

### Approved libraries

| Library | Purpose | Approved |
|---------|---------|----------|
| next, react, react-dom | App framework | 2026-09-10 (D33) |
| typescript | Types | 2026-09-10 (D33) |
| tailwindcss | Styling | 2026-09-10 (D33) |
| vitest | Unit/integration tests | 2026-09-10 (D36) |
| @testing-library/react, @testing-library/jest-dom, @testing-library/user-event | Component tests | 2026-09-10 (D36) |
| @playwright/test | End-to-end tests | 2026-09-10 (D36) |

Anything not on this list requires explicit owner approval before use (D38). Notably
**unapproved and deliberately deferred**: state-management libraries, charting
libraries, code-editor components, animation libraries, and the Anthropic SDK — each is
a real decision, and each has a ticket that requires a proposal first.

---

## 7. Repository layout (locked 2026-09-10)

```
app/
  page.tsx                 landing page (public, SSR)
  play/                    the game shell and chapter routes
  guide/                   the interactive repo/architecture study guide (D40)
  api/                     phase 2 only: coach proxy, live-feed proxy
lib/
  brand.ts                 the ONLY place the product name appears (D41)
  engine/                  deterministic simulation: book, matching, clock, PRNG, P&L
  venues/                  Polymarket and Kalshi models: fees, ticks, settlement
  feed/                    MarketFeed adapters: synthetic, replay, (phase 2) live
  content/                 typed chapter modules + content schema
  learning/                scoring, mastery gating, remediation selection
  progress/                ProgressStore interface + localStorage implementation
  coach/                   Socratic coach: prompt, guardrail, LLM client interface
components/                UI: order book, ticket entry, P&L, charts, shell
fixtures/                  captured historical replay data (static JSON)
tests/e2e/                 Playwright specs
```

## 8. Working standards (locked 2026-09-10)

| # | Decision | Rationale |
|---|----------|-----------|
| D41 | **The product name lives in exactly one place** — `lib/brand.ts`, exporting `PRODUCT_NAME`, `PRODUCT_TAGLINE`, and `SITE_URL`. Nothing else hardcodes the name: not components, not metadata, not the manifest, not content prose. A lint rule bans the literal string outside that file. Renaming is a one-line change plus the repo directory. | The name is unlocked (D7/Q1). Making the change cheap is what lets it stay unlocked. |
| D42 | **Simplicity is a requirement, not a preference.** Build the smallest thing that meets the acceptance criteria. No speculative abstraction, no config for one caller, no layer added "for later". Prefer a plain function to a class, a plain object to a factory. Delete rather than comment out. | The value of this repo is the engine's correctness and the content's clarity. Ceremony hides both. |
| D43 | **Comments explain *why*, never *what*.** Code that needs a paragraph should be rewritten instead. The exceptions that earn a comment: a venue fact (with its source URL — D14), a non-obvious invariant, and a deliberate tradeoff. | A reader should follow the code by reading the code. |
| D44 | **Docs are terse.** Ticket updates, PR bodies, and `docs/` entries state what changed and what to know — no restating the diff, no preamble. | Same reason; the spec files are already long enough. |

---

## 9. Explicit non-goals for v1

- Real-money trading of any kind, or any code path that could place a real order.
- Mobile/responsive layouts (D6).
- Accounts, login, cloud sync, leaderboards, or social features.
- Live market data (phase 2, D16).
- Content beyond the 12 chapters in D8.
- Teaching options, futures, or general equities beyond what Chapters 1–3 need as scaffolding.
