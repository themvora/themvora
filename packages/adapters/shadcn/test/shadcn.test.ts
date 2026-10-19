import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createShadcnVariables } from "../src/generator";

const tokens = {
  colors: {
    background: "#f8fafc",
    foreground: "#0f172a",
    card: "#ffffff",
    primary: "#d97706",
    secondary: "#e2e8f0",
    muted: "#e2e8f0",
    accent: "#f59e0b",
    destructive: "#ef4444",
    border: "#e2e8f0",
    ring: "#d97706",
  },
  radius: { lg: "16px" },
};

describe("createShadcnVariables", () => {
  it("maps primary semantic tokens to shadcn variables", () => {
    const v = createShadcnVariables(tokens);
    expect(v["--background"]).toBe("#f8fafc");
    expect(v["--primary"]).toBe("#d97706");
    expect(v["--destructive"]).toBe("#ef4444");
    expect(v["--radius"]).toBe("16px");
  });

  it("falls back to empty when a foreground pair is missing", () => {
    const v = createShadcnVariables(tokens);
    expect(v["--primary-foreground"]).toBe("");
  });

  it("handles missing optional tokens gracefully", () => {
    const v = createShadcnVariables({ primary: "#000" });
    expect(v["--background"]).toBe("");
  });
});

/**
 * The status-token policy, pinned.
 *
 * shadcn/ui has **no `success` or `warning` semantic ramp** — `destructive` is
 * its only status role. The adapter mirrors the library rather than inventing
 * variables no shadcn component reads: a fabricated `--success` would look like
 * shadcn support while nothing consumed it, and would invite consumers to build
 * on a variable outside the library's contract.
 *
 * Applications that need a success surface use the Themvora variables directly
 * (`var(--theme-color-success)`), which the runtime writes to `:root`
 * regardless of which adapters are installed.
 *
 * If a future shadcn release adds a status ramp, these tests fail loudly and
 * mapping it becomes a deliberate one-line addition.
 */
describe("status-token policy", () => {
  it("exposes shadcn's only status role", () => {
    const v = createShadcnVariables(tokens);
    expect(v["--destructive"]).toBe("#ef4444");
  });

  it("does not fabricate status roles shadcn does not have", () => {
    const v = createShadcnVariables(tokens);
    const fabricated = Object.keys(v).filter((key) =>
      /success|warning|info/.test(key),
    );
    expect(fabricated).toEqual([]);
  });

  it("does not declare them in the stylesheet either", () => {
    // The generator and the CSS are two separate sources; both must hold the
    // policy or a component could pick up a variable the library never reads.
    const css = readFileSync(join(__dirname, "..", "src", "shadcn.css"), "utf8");
    const declared = [...css.matchAll(/^\s*(--[a-z-]+):/gm)].map((m) => m[1]);
    expect(declared.filter((name) => /success|warning|info/.test(name))).toEqual([]);
    expect(declared).toContain("--destructive");
  });
});