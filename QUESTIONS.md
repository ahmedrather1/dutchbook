# QUESTIONS.md — open, undecided items

These are **not decided**. Do not resolve one silently in code — ask the owner and then
record the answer in `REQUIREMENTS.md` with a new D-number and date.

| # | Question | Why it matters | Blocks |
|---|----------|----------------|--------|
| Q1 | Is "Dutch Book" the final product name? **Using it for now** (D7). | A real term of art for the arb the game teaches, but jargon a total beginner will not recognise on a landing page. Deliberately left open — D41 keeps the name in `lib/brand.ts` alone so changing it stays a one-line edit. | L-1, L-2 |
| Q2 | Custom domain, or the default Vercel URL? | Affects launch and OG card setup. | A-5, L-2 |
| Q4 | Analytics: none, self-hosted privacy-preserving, or hosted? | Needed to know whether the game actually teaches (where players fail and quit) — traded against a no-tracking stance for a public product. Must never capture the BYOK key or player code (D26). | L-3 |
| Q5 | Any venue parameter that C-1 cannot verify from public docs. | Encoding a fee formula or tick size from memory would teach a false lesson (D14). Each unverified item gets a row here when C-1 finds it. | C-2, C-3, C-7 |
| Q6 | Which real historical episodes to capture for replays, and are their terms of use compatible with committing the data? | K-3 needs specific episodes chosen and a defensible position on redistributing captured public market data. | K-2, K-3 |
| Q7 | Sound and haptics — fills, alerts, countdown? | Strongly reinforces a trading-terminal feel and time pressure, but adds asset weight and an accessibility surface. Currently unspecified. | E-7 |
| Q9 | Next 15 or Next 16? `npm audit` reports a high-severity `postcss` advisory in a transitive dep of Next 15; the fix is Next 16. | Build-time only — we control our own CSS, so it is not exploitable in this app — but it will keep showing up in CI. D33 says Next 15. | none currently |
| Q8 | Does the game need an "endless practice" mode after Chapter 12? | Retention and genuine skill-building beyond the curriculum, but it is a whole extra surface and is out of the current 12-chapter scope (D8). | post-M4 |
