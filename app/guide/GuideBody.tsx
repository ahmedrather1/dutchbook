"use client";

import { useState } from "react";
import { LAYERS, INVARIANTS } from "@/lib/guide/architecture";
import { CHAPTERS } from "@/lib/content/registry";
import { instantiate, isTemplate } from "@/lib/content/schema";
import { makeRng } from "@/lib/engine/rng";

export function GuideBody() {
  return (
    <div className="mt-12 space-y-16">
      <LayerStack />
      <Invariants />
      <VariantDemo />
      <AddAChapter />
    </div>
  );
}

/** N-2: click a layer, see what it owns and what it must never do. */
function LayerStack() {
  const [selected, setSelected] = useState(LAYERS.length - 1);
  const layer = LAYERS[selected]!;

  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        The layer stack
      </h2>
      <p className="mt-2 text-sm text-muted max-w-[62ch]">
        Dependencies point downward only. Nothing below ever reaches up.
      </p>

      <div className="grid md:grid-cols-[260px_1fr] gap-5 mt-5 items-start">
        <div className="space-y-1">
          {LAYERS.map((l, i) => (
            <div key={l.id}>
              {i > 0 && (
                <div aria-hidden className="text-center text-muted font-mono text-[10px] py-0.5">
                  ↓
                </div>
              )}
              <button
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                className={`w-full text-left font-mono text-xs px-3 py-2 border rounded focus-visible:outline-2 focus-visible:outline-accent ${
                  i === selected
                    ? "border-accent bg-raised text-accent font-semibold"
                    : "border-rule text-ink hover:border-accent"
                }`}
              >
                {l.name}
                <span className="float-right text-muted">{l.path}</span>
              </button>
            </div>
          ))}
        </div>

        <div className="border border-rule rounded-md bg-surface p-4 min-h-[260px]">
          <h3 className="font-bold text-lg">{layer.name}</h3>
          <p className="font-mono text-xs text-accent">{layer.path}</p>

          <dl className="mt-4 space-y-3">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Owns</dt>
              <dd className="text-[15px] mt-0.5">{layer.owns}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Must never
              </dt>
              <dd className="text-[15px] mt-0.5 text-ask">{layer.never}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Files</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {layer.files.map((f) => (
                  <code key={f} className="text-[11px] px-1.5 py-0.5 border border-rule rounded text-muted">
                    {f}
                  </code>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function Invariants() {
  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        Invariants
      </h2>
      <p className="mt-2 text-sm text-muted max-w-[62ch]">
        Weakening any of these is a stop-and-flag event, not a judgement call.
      </p>
      <div className="grid sm:grid-cols-2 gap-2 mt-5">
        {INVARIANTS.map((inv) => (
          <details key={inv.id} className="border border-rule border-l-2 border-l-ask rounded bg-surface">
            <summary className="cursor-pointer px-3 py-2 font-medium text-[15px] focus-visible:outline-2 focus-visible:outline-accent">
              <span className="font-mono text-[10px] text-ask mr-2">{inv.id}</span>
              {inv.title}
            </summary>
            <p className="px-3 pb-3 text-sm text-muted leading-relaxed">{inv.why}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** N-4: the variant generator, demonstrated live rather than described. */
function VariantDemo() {
  const [seed, setSeed] = useState(1);
  const template = CHAPTERS.flatMap((c) => c.drills).find(isTemplate)!;
  const drill = instantiate(template, makeRng(seed));

  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        Why a retry is never the same test
      </h2>
      <p className="mt-2 text-sm text-muted max-w-[62ch]">
        Drills are templates, not fixed questions. Each one computes its own answer from
        the instance it generated, so a retry cannot be passed from memory. Change the
        seed and watch the same template become a different question.
      </p>

      <div className="border border-rule rounded-md bg-surface p-4 mt-5">
        <div className="flex items-center gap-3">
          <label htmlFor="seed" className="font-mono text-xs text-muted">
            seed
          </label>
          <input
            id="seed"
            type="range"
            min={1}
            max={40}
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="font-mono text-xs tabular-nums w-8">{seed}</span>
        </div>

        <p className="mt-4 text-[15px]">{drill.prompt}</p>
        <p className="mt-2 text-sm text-muted">{drill.explanation}</p>
        <code className="block mt-3 font-mono text-[11px] text-muted">
          template {template.id} · assesses {drill.objectives.join(", ")}
        </code>
      </div>
    </section>
  );
}

function AddAChapter() {
  const steps = [
    ["Write the module", "lib/content/ch13.ts exporting a typed Chapter."],
    ["Declare objectives", "Each is a capability. Everything is assessed against them."],
    ["Write lessons", "points[] first — bullets are what most readers actually read — then body[]."],
    ["Declare new terms", "Anything jargon goes in defines[], or the lint fails the build."],
    ["Write drills", "Every objective needs at least one, or the coverage test fails."],
    ["Add a scenario", "Judged on objectives met, never on profit."],
    ["Register it", "Add to CHAPTERS in lib/content/registry.ts. That is the only wiring."],
    ["Run the gate", "npm run check. The content lint will tell you exactly what is missing."],
  ];

  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
        Adding a chapter
      </h2>
      <ol className="mt-5 border-t border-rule">
        {steps.map(([title, detail], i) => (
          <li key={title} className="border-b border-rule py-3 flex gap-4">
            <span className="font-mono text-xs text-muted tabular-nums w-6">{i + 1}</span>
            <div>
              <div className="font-medium text-[15px]">{title}</div>
              <div className="text-sm text-muted">{detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
