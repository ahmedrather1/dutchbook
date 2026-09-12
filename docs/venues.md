# Venue parameters — Polymarket and Kalshi

**Rule (D14): nothing in this file is written from memory.** Every line carries a source
URL and a checked-on date. Anything that could not be confirmed from public documentation
is marked `UNVERIFIED` and raised in `QUESTIONS.md`.

Worked examples are computed by hand here so the fee engine (C-7) has an oracle that is
independent of its own implementation.

Checked on **2026-09-12** unless a line says otherwise.

---

## Kalshi

| Parameter | Value | Source |
|---|---|---|
| Contract payout | $1.00 if YES, $0.00 if NO | [orderbook_responses](https://docs.kalshi.com/getting_started/orderbook_responses.md) |
| Price range | $0.00 – $1.00 | [orderbook_responses](https://docs.kalshi.com/getting_started/orderbook_responses.md) |
| YES/NO identity | "A YES BID at price X is equivalent to a NO ASK at price ($1.00 − X)"; binary markets must sum to $1.00 | [orderbook_responses](https://docs.kalshi.com/getting_started/orderbook_responses.md) |
| Book shape | Only bids are published, on both `yes_dollars` and `no_dollars`; asks are implied by the identity above | [orderbook_responses](https://docs.kalshi.com/getting_started/orderbook_responses.md) |
| Price precision | Dollar strings with subpenny precision, e.g. `"0.4200"` | [orderbook_responses](https://docs.kalshi.com/getting_started/orderbook_responses.md) |
| Tick size | **UNVERIFIED** — not stated in the docs read. Subpenny precision is supported; 1¢ is the conventional tick. See Q5. | — |
| Trading fee | `0.07 × C × P × (1 − P)`, rounded **up**, where C = contracts and P = price in dollars | [fee_rounding](https://docs.kalshi.com/getting_started/fee_rounding) + secondary sources |
| Fee rounding | Applied **per order across all fills** via a fee accumulator, not per contract. `trade fee = ceil_6dp(model_fee)` | [fee_rounding](https://docs.kalshi.com/getting_started/fee_rounding) |
| Maker fee | **UNVERIFIED** — not stated in the section read. See Q5. | — |
| Settlement fee | **UNVERIFIED** — not stated in the section read. See Q5. | — |
| Fractional contracts | Supported; counts are fixed-point strings, e.g. `"13.00"` | [orderbook_responses](https://docs.kalshi.com/getting_started/orderbook_responses.md) |

### Worked fee examples (by hand)

Formula: `fee = ceil_to_cent(0.07 × C × P × (1 − P))`

| C | P | `0.07·C·P·(1−P)` | Fee |
|---|---|---|---|
| 20 | 0.60 | 0.07 × 20 × 0.60 × 0.40 = **0.336** | **$0.34** |
| 100 | 0.50 | 0.07 × 100 × 0.50 × 0.50 = **1.750** | **$1.75** |
| 100 | 0.10 | 0.07 × 100 × 0.10 × 0.90 = **0.630** | **$0.63** |
| 100 | 0.90 | 0.07 × 100 × 0.90 × 0.10 = **0.630** | **$0.63** |
| 1 | 0.50 | 0.07 × 1 × 0.25 = **0.0175** | **$0.02** |

**The shape that matters for teaching:** `P(1−P)` peaks at $0.50 and collapses at the
extremes. A coin-flip trade costs about **7×** the fee of a 10¢ or 90¢ trade of the same
size. Chapter 5 is built on this.

---

## Polymarket

| Parameter | Value | Source |
|---|---|---|
| Market type | Central limit order book (CLOB), USDC/pUSD collateral | [docs.polymarket.com/trading/fees](https://docs.polymarket.com/trading/fees) |
| Who pays fees | **Takers only.** "Only takers pay fees." Makers are never charged and receive rebates. | [trading/fees](https://docs.polymarket.com/trading/fees) |
| Taker fee formula | `fee = C × feeRate × p × (1 − p)` | [trading/fees](https://docs.polymarket.com/trading/fees) |
| Fee rate by category | crypto 0.07; sports/economics/culture/weather 0.05; finance/politics/tech 0.04; geopolitics 0 | [trading/fees](https://docs.polymarket.com/trading/fees) |
| Fee precision | Rounded to 5 decimal places; smallest fee charged is 0.00001 USDC | [trading/fees](https://docs.polymarket.com/trading/fees) |
| Maker rebate | Portion of collected fees paid daily, 15–25% by category; geopolitics has none (fee-free) | [trading/fees](https://docs.polymarket.com/trading/fees) |
| Tick size | 0.0025 (0.25¢) on decimalized markets (World Cup advance, moneyline, spreads, totals). Other markets **UNVERIFIED**. See Q5. | changelog / secondary |
| Split | 1 USDC → 1 YES + 1 NO, at any time before resolution | secondary sources; see conflict note |
| Merge | 1 YES + 1 NO → 1 USDC, at any time before resolution | secondary sources; see conflict note |
| Negative risk | In a winner-take-all multi-outcome event, **1 NO share on any outcome converts to 1 YES share on every other outcome**, atomically via the NegRisk Adapter | [advanced/neg-risk](https://docs.polymarket.com/advanced/neg-risk) |
| Minimum order size | **UNVERIFIED** — not stated in the page read. See Q5. | — |

### ⚠️ Conflicting sources on the taker fee formula

Two forms appeared, and they are **not** equivalent:

- Official docs page: `fee = C × feeRate × p × (1 − p)`
- Secondary/search summary: `fee = C × p × feeRate × (p × (1 − p))^exponent`

The second adds an extra `p` factor and an exponent. **The official docs form is used in
code**, cited and dated, and the discrepancy is recorded as Q5. If the exponent form turns
out to be current, Chapter 5's numbers change and `lib/venues/polymarket.ts` must be
revised — the fee engine is deliberately written so that is a one-function change.

### Worked fee examples (by hand)

Using the official form with a politics market (`feeRate = 0.04`):

| C | p | `C × 0.04 × p × (1−p)` | Fee (5 dp) |
|---|---|---|---|
| 100 | 0.50 | 100 × 0.04 × 0.25 = **1.00000** | **1.00000 USDC** |
| 100 | 0.60 | 100 × 0.04 × 0.24 = **0.96000** | **0.96000 USDC** |
| 100 | 0.90 | 100 × 0.04 × 0.09 = **0.36000** | **0.36000 USDC** |
| 20 | 0.60 | 20 × 0.04 × 0.24 = **0.19200** | **0.19200 USDC** |

---

## What this means for the game

1. **Both venues charge most at 50¢ and least at the extremes.** Same `p(1−p)` shape, and
   it is the single most teachable fact about prediction-market fees.
2. **Kalshi charges everyone; Polymarket charges takers only.** That difference is a real
   strategy input — on Polymarket, resting a limit order is fee-free *and* earns a rebate.
3. **Kalshi rounds the fee up, per order.** Small orders pay proportionally more.
4. **Merge is what makes a Dutch book realisable immediately** rather than at resolution
   (Chapter 6).
5. **Negative risk changes the arithmetic of multi-outcome sets** (Chapter 8).
