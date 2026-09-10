# Dutch Book

A browser learning game that takes a total beginner from *"what is a bid?"* to writing
prediction-market arbitrage strategy code.

Twelve chapters: order books and price-as-probability → orders and fills → probability and
expected value → how Polymarket and Kalshi actually work → the frictions that kill a paper
edge → four families of arbitrage (Dutch book, cross-venue, logical/correlated, temporal)
→ risk and sizing → execution → a capstone where you write a real scanner in the browser
with a coach that refuses to hand you the answer.

**Status: specification complete, implementation not started.**

## Read these first

| File | What it is |
|------|-----------|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | Living source of truth. Numbered, dated decisions (D1–D40). |
| [`BACKLOG.md`](BACKLOG.md) | 83 tickets across 14 epics, with a dependency map and milestones. |
| [`QUESTIONS.md`](QUESTIONS.md) | Open items that are deliberately not decided yet. |
| [`CLAUDE.md`](CLAUDE.md) | Session ritual and the invariants that must not be broken. |

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind · Vitest · React Testing Library ·
Playwright · deployed on Vercel. Static in v1 — no accounts, no backend, progress in
`localStorage`. Phase 2 adds serverless routes for live market data and a hosted coach.

## The design in one paragraph

A pure-TypeScript, fully deterministic simulation engine (real price-time-priority
matching, integer-tick money, seeded PRNG) sits underneath everything and never touches
React, the DOM, or the network. Market data reaches it only through a `MarketFeed`
adapter, so synthetic scenarios, recorded historical replays, and — later — live venue
feeds are interchangeable. Chapters are typed TypeScript modules whose every drill
declares the objective it assesses, which is what makes targeted remediation and
fresh-variant retries possible. Venues are modelled on the real Polymarket and Kalshi,
with every parameter cited to public documentation rather than written from memory.
