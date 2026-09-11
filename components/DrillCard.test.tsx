import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrillCard } from "./DrillCard";
import type { Drill } from "@/lib/content/schema";

const choice: Drill = {
  kind: "choice",
  id: "c1",
  objectives: ["o"],
  prompt: "You want to buy right now. Which price do you get?",
  options: ["The bid", "The ask"],
  answerIndex: 1,
  explanation: "You pay the ask, because buying immediately accepts a seller's offer.",
};

const numeric: Drill = {
  kind: "numeric",
  id: "n1",
  objectives: ["o"],
  prompt: "What probability does $0.62 imply?",
  answer: 62,
  tolerance: 0.5,
  unit: "%",
  explanation: "62 cents out of a dollar is 62 percent.",
};

const render1 = (drill: Drill, onAnswered = vi.fn()) => {
  render(<DrillCard drill={drill} index={0} total={3} onAnswered={onAnswered} />);
  return onAnswered;
};

describe("choice drills", () => {
  it("reports a correct answer and explains it", async () => {
    const onAnswered = render1(choice);
    await userEvent.click(screen.getByRole("button", { name: /The ask/ }));
    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(screen.getByText(/You pay the ask/)).toBeInTheDocument();
    expect(screen.getByText("✓ correct")).toBeInTheDocument();
  });

  it("states the right answer when you get it wrong (E-8)", async () => {
    const onAnswered = render1(choice);
    await userEvent.click(screen.getByRole("button", { name: /The bid/ }));
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText(/The answer is "The ask"/)).toBeInTheDocument();
  });

  it("accepts only one answer", async () => {
    const onAnswered = render1(choice);
    await userEvent.click(screen.getByRole("button", { name: /The bid/ }));
    await userEvent.click(screen.getByRole("button", { name: /The ask/ }));
    expect(onAnswered).toHaveBeenCalledTimes(1);
  });
});

describe("numeric drills", () => {
  it("accepts an answer inside the tolerance", async () => {
    const onAnswered = render1(numeric);
    await userEvent.type(screen.getByLabelText("Your answer"), "62");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it("ignores units the player types", async () => {
    const onAnswered = render1(numeric);
    await userEvent.type(screen.getByLabelText("Your answer"), "62%");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it("rejects an answer outside the tolerance", async () => {
    const onAnswered = render1(numeric);
    await userEvent.type(screen.getByLabelText("Your answer"), "70");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText(/The answer is 62%/)).toBeInTheDocument();
  });

  it("treats nonsense as wrong rather than crashing", async () => {
    const onAnswered = render1(numeric);
    await userEvent.type(screen.getByLabelText("Your answer"), "abc");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswered).toHaveBeenCalledWith(false);
  });
});

describe("book-read drills", () => {
  it("shows the book and accepts dollars or cents", async () => {
    const drill: Drill = {
      kind: "book-read",
      id: "b1",
      objectives: ["o"],
      prompt: "What is the best ask?",
      book: [
        { side: "buy", price: 600, qty: 10 },
        { side: "sell", price: 640, qty: 10 },
      ],
      ask: "best-ask",
      answer: 640,
      explanation: "The best ask is the lowest price anyone will sell at.",
    };
    const onAnswered = render1(drill);
    expect(screen.getByText("$0.64")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your answer"), "0.64");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onAnswered).toHaveBeenCalledWith(true);
  });
});
