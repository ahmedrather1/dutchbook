# Dutch Book

A browser learning game that takes a total beginner from *"what is a bid?"* to writing
prediction-market arbitrage strategy code.

Twelve chapters. Each one is a short lesson, drills that generate fresh questions every
attempt, and a live simulated market you trade against. The last one hands you a code
editor and scores your strategy on markets it has never seen.

```
01  Markets & price-as-probability      07  ARB II  — Cross-venue
02  Orders & fills                      08  ARB III — Logical & correlated
03  Probability & expected value        09  ARB IV  — Temporal
04  Prediction markets                  10  Risk & sizing
05  Frictions                           11  Execution
06  ARB I — Dutch book                  12  Capstone — Strategy sandbox
```

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck, lint, unit tests, build
npm run test:e2e     # Playwright
```

## How it is built

A pure-TypeScript simulation engine sits underneath everything and never touches React,
the DOM, or the network. It has a real price-time-priority matching engine, so slippage
and queue position fall out of the mechanism rather than being faked. Money is integers
in sub-cent units — never floats, because in arbitrage the whole profit is often one tick.
Every run is reproducible from `(scenarioId, seed, actions)`.

Market data reaches the engine only through a `MarketFeed` adapter, so synthetic
scenarios, recorded replays, and eventually live venue data are interchangeable.

Chapters are typed TypeScript modules. Every drill declares which objective it assesses,
which is what makes targeted remediation possible: fail a chapter and you get back only
the lessons and drills for the objectives you actually missed, then a retry with freshly
generated questions.

Venues are modelled on the real Polymarket and Kalshi, with **every parameter cited to
public documentation and dated** in [`docs/venues.md`](docs/venues.md). Nothing is written
from memory; anything unverifiable is marked `UNVERIFIED` and tracked in `QUESTIONS.md`.

In the capstone, your code runs in a Web Worker with no network and no page access, under
a hard time budget — verified by browser tests, after the first version of that guarantee
turned out to be false.

| File | What it is |
|------|-----------|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | Living source of truth. Numbered, dated decisions. |
| [`BACKLOG.md`](BACKLOG.md) | Tickets, dependency map, milestones. |
| [`QUESTIONS.md`](QUESTIONS.md) | Open items, deliberately undecided. |
| [`CLAUDE.md`](CLAUDE.md) | Session ritual and the invariants. |
| [`docs/venues.md`](docs/venues.md) | Cited venue parameters. |

## Stack

Next.js 15 · TypeScript (strict) · Tailwind · Vitest · React Testing Library · Playwright.
No accounts, no backend, progress in `localStorage`.

## Licence

MIT. Note that this covers the curriculum as well as the code.
