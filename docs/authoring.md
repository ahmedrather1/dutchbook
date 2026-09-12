# Adding a chapter

The content lint will tell you what is missing, so the fastest loop is: write, run
`npm run check:quick`, fix what it names, repeat.

## 1. The module

`lib/content/ch13.ts`, exporting a typed `Chapter`. Everything hangs off objectives, so
write those first.

```ts
export const chapter13: Chapter = {
  number: 13,
  slug: "your-slug",
  title: "Your title",
  teaches: "One line, shown on the chapter map even while locked.",
  estimatedMinutes: 30,
  objectives: [
    { id: "do-the-thing", statement: "Do the thing." },
  ],
  lessons: [...],
  drills: [...],
  scenarios: [...],
  test: { passThreshold: 0.85, objectiveFloor: 0.6, drills: [...] },
};
```

**Objectives are capabilities, not topics.** "Compute a venue's fee from its real
formula", not "fees". Everything is assessed against them, and remediation routes by them.

## 2. Lessons

```ts
{
  id: "lesson-id",
  title: "Short title",
  objectives: ["do-the-thing"],
  defines: ["new term"],       // any jargon introduced here
  points: ["**Bold** the term being defined.", "Four or five bullets."],
  body: ["Paragraphs, shown behind a toggle."],
}
```

- **`points` is what most people read.** Write those first and make them stand alone.
- **`defines` is enforced.** Use a jargon term before the lesson that declares it and the
  build fails, naming the chapter, the lesson, and the term. Ordinary English does not
  belong in `defines` — the glossary in `content.test.ts` is jargon only.
- A forward reference is fine **if you gloss it in place**; declare it in `defines` there.

## 3. Drills

Every objective needs at least one drill in `drills` and at least one in `test.drills`, or
the coverage test fails by name.

Static drills are plain objects. Generated ones are templates from `generate.ts` or
`arbGenerate.ts`:

```ts
drills: [
  walkTheBook("d13-walk", ["do-the-thing"]),
  { kind: "choice", id: "d13-x", objectives: ["do-the-thing"], prompt: "…",
    options: ["…"], answerIndex: 1, explanation: "Why, not just what." },
]
```

**Write a new generator when the drill should differ every attempt.** Two rules:

1. **Compute the answer from the instance you generated.** Never hard-code it. A test
   should be able to recompute it independently from the prompt.
2. **Mix real cases and traps roughly evenly**, or the answer becomes guessable from the
   shape of the question.

Add a test in `generate.test.ts` that recomputes the answer from the drill's own prompt.
This has already caught two bugs that would have taught the wrong thing.

## 4. Scenarios

```ts
scenarios: [{
  id: "step-id",
  scenario: myScenario,
  brief: "An instruction, not a description. Tell them what to do.",
  objectives: ["do-the-thing"],
  success: [{ kind: "min-position", qty: 20, label: "Take the trade" }],
}]
```

Scenarios are scored on **goals met, never on profit**. A lucky profitable run that missed
the point does not pass.

Build the market with agents from `lib/engine/agents.ts`. A market with only a competent
maker offers a taker nothing — if the player is meant to find an edge, put one there
(`makeClumsyTrader`), or make the edge a maker's edge.

Two traps worth avoiding, both found the hard way:

- **Do not seed a crossed book.** A test asserts no scenario ever crosses.
- **Verify the lesson can actually happen.** If the brief says "watch slippage grow", run
  it and check that it does.

## 5. Register it

```ts
// lib/content/registry.ts
export const CHAPTERS = [..., chapter13];
```

That is the only wiring. Routes, the chapter map, locking, and progress all follow.

## 6. Run the gate

```bash
npm run check:quick
```

The content lint checks: objective coverage in drills and in the test, no references to
undeclared objectives, every objective taught by a lesson, unique drill ids, variant
self-consistency across 100 seeds, no repeated questions between retries, scenario
determinism, and jargon discipline.

It fails with the chapter, the lesson, and the term or objective. Read the message; it is
usually telling you exactly what to add.
