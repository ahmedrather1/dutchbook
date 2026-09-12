import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { LAYERS, INVARIANTS } from "./architecture";

/**
 * A study guide that drifts from the code is worse than none (N-2). These assertions are
 * what stop that: rename a file and this fails.
 */
describe("the guide describes code that exists", () => {
  const files = LAYERS.flatMap((l) => l.files);

  it.each(files)("%s exists", (file) => {
    expect(existsSync(file), `${file} is referenced by /guide but does not exist`).toBe(true);
  });

  it("gives every layer a real directory", () => {
    for (const layer of LAYERS) {
      expect(existsSync(layer.path), `${layer.path} does not exist`).toBe(true);
    }
  });

  it("lists layers in dependency order, engine last", () => {
    expect(LAYERS[0]!.id).toBe("app");
    expect(LAYERS.at(-1)!.id).toBe("engine");
  });

  it("says what each layer must never do", () => {
    for (const layer of LAYERS) {
      expect(layer.never.length).toBeGreaterThan(20);
      expect(layer.owns.length).toBeGreaterThan(20);
    }
  });
});

describe("the invariants match REQUIREMENTS.md", () => {
  const requirements = readFileSync("REQUIREMENTS.md", "utf8");

  it.each(INVARIANTS.filter((i) => /^D\d+$/.test(i.id)).map((i) => i.id))(
    "%s is a decision that actually exists",
    (id) => {
      expect(requirements).toContain(`| ${id} |`);
    },
  );

  it("explains why each one matters, not just what it is", () => {
    for (const inv of INVARIANTS) expect(inv.why.length).toBeGreaterThan(60);
  });
});
