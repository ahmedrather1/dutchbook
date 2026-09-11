import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderTicket } from "./OrderTicket";
import type { FillEstimate } from "@/lib/engine/match";
import { ticks } from "@/lib/engine/money";

const estimate = (_side: "buy" | "sell", qty: number): FillEstimate => ({
  filledQty: Math.min(qty, 40),
  notional: (Math.min(qty, 40) * 650) as never,
  averagePrice: ticks(650),
  bestPrice: ticks(620),
  worstPrice: ticks(680),
  slippage: 30,
  shortfall: Math.max(0, qty - 40),
});

describe("OrderTicket", () => {
  it("previews the average fill and total before you commit", () => {
    render(<OrderTicket estimate={estimate} onSubmit={vi.fn()} />);
    expect(screen.getByText("$0.65")).toBeInTheDocument();
    expect(screen.getByText("$6.50")).toBeInTheDocument();
  });

  it("warns about slippage with a sign, not colour alone (D39)", () => {
    render(<OrderTicket estimate={estimate} onSubmit={vi.fn()} />);
    expect(screen.getByText(/Slippage/)).toBeInTheDocument();
    expect(screen.getByText("3.0¢")).toBeInTheDocument();
  });

  it("says when the book cannot supply the size", async () => {
    render(<OrderTicket estimate={estimate} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "50" }));
    expect(screen.getByText("10 contracts")).toBeInTheDocument();
  });

  it("submits the chosen side and size", async () => {
    const onSubmit = vi.fn();
    render(<OrderTicket estimate={estimate} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Sell" }));
    await userEvent.click(screen.getByRole("button", { name: "25" }));
    await userEvent.click(screen.getByRole("button", { name: /Sell 25 at market/ }));
    expect(onSubmit).toHaveBeenCalledWith("sell", 25);
  });

  it("marks the active side for assistive tech", async () => {
    render(<OrderTicket estimate={estimate} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Buy" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(screen.getByRole("button", { name: "Sell" })).toHaveAttribute("aria-pressed", "true");
  });
});
