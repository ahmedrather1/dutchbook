import type { Strategy } from "./api";

/**
 * A reference solution, used only to prove the capstone suite is winnable (J-3).
 * Never shipped anywhere a player can read it — imported by tests alone.
 *
 * It is the course in miniature:
 *  - Ch 2: taking liquidity pays the spread every time, so rest orders and collect it.
 *  - Ch 9: when the price moves fast, your quotes are stale — stand aside.
 *  - Ch 10: skew quotes against your own inventory so a drift cannot bury you.
 *  - Ch 11: requote only when the market has moved, or you surrender queue position.
 */
export const referenceStrategy: Strategy = (ctx) => {
  const { bestBid, bestAsk, spread } = ctx.market;
  const { position, resting } = ctx.account;

  if (ctx.ticksRemaining <= 6) {
    if (resting.length > 0) return { type: "cancel" };
    if (position > 0) return { type: "sell", qty: position };
    if (position < 0) return { type: "buy", qty: -position };
    return;
  }

  if (bestBid === undefined || bestAsk === undefined || spread === undefined) return;

  const mid = (bestBid + bestAsk) / 2;
  const recent = (ctx.memory.mids as number[]) ?? [];
  recent.push(mid);
  if (recent.length > 6) recent.shift();
  ctx.memory.mids = recent;

  // Stale-quote guard: a fast move means our prices are behind the market.
  const moved = recent.length >= 4 ? Math.abs(mid - recent[0]!) : 0;
  if (moved > spread) {
    if (resting.length > 0) return { type: "cancel" };
    if (position > 0) return { type: "sell", qty: position };
    if (position < 0) return { type: "buy", qty: -position };
    return;
  }

  const edge = Math.floor(spread / 4);
  if (edge < 10) return resting.length > 0 ? { type: "cancel" } : undefined;

  // Lean away from inventory: long means bid lower and offer lower, to get flat.
  const skew = Math.round(position * 0.5);
  const wantBid = bestBid + edge - skew;
  const wantAsk = bestAsk - edge - skew;
  if (wantBid >= wantAsk || wantBid <= 0 || wantAsk >= 1000) return;

  const myBid = resting.find((o) => o.side === "buy");
  const myAsk = resting.find((o) => o.side === "sell");
  const stale =
    (myBid && Math.abs(myBid.price - wantBid) > edge) ||
    (myAsk && Math.abs(myAsk.price - wantAsk) > edge);
  if (stale) return { type: "cancel" };

  const size = 5;
  const cap = 12;
  const actions = [];
  if (!myBid && position < cap) actions.push({ type: "buy" as const, qty: size, price: wantBid });
  if (!myAsk && position > -cap) actions.push({ type: "sell" as const, qty: size, price: wantAsk });
  return actions;
};
