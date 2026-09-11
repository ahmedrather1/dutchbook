import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderBook } from "./OrderBook";
import { ticks } from "@/lib/engine/money";

const level = (price: number, qty: number) => ({ price: ticks(price), qty, orders: [] });

const bids = [level(600, 40), level(590, 80)];
const asks = [level(640, 35), level(650, 90)];

describe("OrderBook", () => {
  it("renders both sides and the spread in cents", () => {
    render(<OrderBook bids={bids} asks={asks} />);
    expect(screen.getByText("$0.60")).toBeInTheDocument();
    expect(screen.getByText("$0.64")).toBeInTheDocument();
    expect(screen.getByText("4.0¢")).toBeInTheDocument();
  });

  it("labels each side for screen readers, so colour is not the only signal (D39)", () => {
    render(<OrderBook bids={bids} asks={asks} />);
    expect(screen.getAllByText("bid", { selector: ".sr-only" })).toHaveLength(2);
    expect(screen.getAllByText("ask", { selector: ".sr-only" })).toHaveLength(2);
  });

  it("says so plainly when one side is empty", () => {
    render(<OrderBook bids={[]} asks={asks} />);
    expect(screen.getByText("no bids")).toBeInTheDocument();
    expect(screen.getByText("no two-sided market")).toBeInTheDocument();
  });

  it("explains each row on focus in teaching mode", () => {
    render(<OrderBook bids={bids} asks={asks} teaching />);
    const row = screen.getByTitle(/40 contracts wanted at \$0\.60/);
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("is not focusable outside teaching mode", () => {
    const { container } = render(<OrderBook bids={bids} asks={asks} />);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
  });

  it("caps the number of levels shown", () => {
    const many = Array.from({ length: 12 }, (_, i) => level(600 - i * 10, 10));
    render(<OrderBook bids={many} asks={asks} levels={3} />);
    expect(screen.queryByText("$0.57")).not.toBeInTheDocument();
  });
});
