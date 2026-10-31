/**
 * Client tests.
 *
 * These call the real `@themvora/core` — no module is mocked. What is exercised
 * is the client's own layer: the envelope, the outcome classification, the error
 * mapping, cancellation, and the capability guard. The generation itself is
 * core's, and asserting its output here is how a regression in the delegation
 * would surface.
 */
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { detectCapabilities } from "../src/domain/capabilities";
import { createThemvoraClient, diagnosticOf } from "../src/services/coreClient";
import { createTempProject } from "./helpers/tempProject";

/** The client over the real core. */
const client = createThemvoraClient();

/** A valid pair, from the real generator. */
const PAIR = generateTheme({ seed: "#4f46e5" });

/** A theme with no colour tokens at all. */
const INVALID = { name: "broken", tokens: { colors: {} } } as unknown as ThemeDefinition;

describe("generate", () => {
  it("returns a usable pair", async () => {
    const result = await client.generate({ seed: "#4f46e5" });

    expect(result.outcome).toBe("ok");
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.errors).toEqual([]);

    const pair = result.value!;
    expect(pair.light.name).toBe("generated-light");
    expect(pair.dark.name).toBe("generated-dark");
    // `tokens` is optional on the type; a generated theme always has it.
    expect(Object.keys(pair.light.tokens?.colors ?? {})).toHaveLength(21);
    expect(pair.light.meta?.generation?.kind).toBe("generated");
  });

  it("passes the family and style through to core", async () => {
    const result = await client.generate({ seed: "#4f46e5", family: "brand", style: "vibrant" });

    expect(result.value!.light.name).toBe("brand-light");
    expect(result.value!.light.meta?.generation?.style).toBe("vibrant");
  });

  it("classifies an unusable seed as a usage error, not a crash", async () => {
    const result = await client.generate({ seed: "not-a-colour" });

    expect(result.outcome).toBe("usage");
    // The CLI maps a bad seed to UsageError, i.e. exit 2. Same contract here.
    expect(result.exitCode).toBe(2);
    expect(result.value).toBeNull();
    expect(result.errors[0]?.code).toBe("TV_GENERATION_INVALID_SEED");
    expect(result.errors[0]?.message).toContain("not-a-colour");
  });
});

describe("validate", () => {
  it("passes a valid theme and reports the canonical contrast", async () => {
    const result = await client.validate({ theme: PAIR.light });

    expect(result.outcome).toBe("ok");
    expect(result.exitCode).toBe(0);

    const report = result.value!;
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.contrast).toEqual({ pairs: 16, text: { total: 9, passing: 9 }, ui: { total: 7, passing: 7 } });
  });

  it("reports an invalid theme as validation-failed, keeping the report", async () => {
    const result = await client.validate({ theme: INVALID });

    expect(result.outcome).toBe("validation-failed");
    expect(result.ok).toBe(false);
    // The CLI's documented code for this case.
    expect(result.exitCode).toBe(3);
    // The value is the whole point of a failed validation, so it is preserved.
    expect(result.value?.valid).toBe(false);
    expect(result.value?.issues.length).toBeGreaterThan(0);
    expect(result.value?.issues[0]?.code).toBe("TV_THEME_TOKEN_MISSING");
  });

  it("leaves an unknown runtime failure observable, not disguised", async () => {
    const explosive = {
      name: "boom",
      get tokens(): never {
        throw new Error("kaboom");
      },
    } as unknown as ThemeDefinition;

    const result = await client.validate({ theme: explosive });

    // Not `ok`, not `validation-failed`, not `unavailable`: a genuine error.
    expect(result.outcome).toBe("error");
    expect(result.exitCode).toBe(1);
    expect(result.errors[0]?.message).toBe("kaboom");
  });
});

describe("catalog", () => {
  it("returns the real preset and brand catalog", async () => {
    const result = await client.catalog();

    expect(result.outcome).toBe("ok");
    expect(result.value!.entries).toHaveLength(14);
    expect(result.value!.entries.filter((entry) => entry.kind === "brand")).toHaveLength(5);
    expect(result.value!.styles).toContain("balanced");
  });
});

describe("diff", () => {
  it("reports no change between a theme and itself", async () => {
    const result = await client.diff({ a: PAIR.light, b: PAIR.light });

    expect(result.outcome).toBe("ok");
    expect(result.value!.hasChanges).toBe(false);
  });

  it("reports a change between two generated themes", async () => {
    const other = generateTheme({ seed: "#10b981" });
    const result = await client.diff({ a: PAIR.light, b: other.light });

    expect(result.outcome).toBe("ok");
    expect(result.value!.hasChanges).toBe(true);
  });
});

describe("exportVariables", () => {
  it("projects a theme to its CSS custom properties", async () => {
    const result = await client.exportVariables({ theme: PAIR.light });

    expect(result.outcome).toBe("ok");
    const variables = result.value!;
    expect(Object.keys(variables).length).toBeGreaterThan(20);
    expect(Object.keys(variables).some((name) => name.includes("--theme-color-primary"))).toBe(true);
  });
});

describe("migrate", () => {
  it("returns a theme with the same identity", async () => {
    const result = await client.migrate({ theme: PAIR.light });

    expect(result.outcome).toBe("ok");
    expect(result.value!.theme.name).toBe(PAIR.light.name);
    expect(typeof result.value!.changed).toBe("boolean");
  });
});

describe("cancellation", () => {
  it("reports a pre-flight abort as cancelled, never as a failure", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await client.generate({ seed: "#4f46e5", signal: controller.signal });

    expect(result.outcome).toBe("cancelled");
    expect(result.ok).toBe(false);
    // A cancelled operation has no exit code: it was killed, not exited.
    expect(result.exitCode).toBeNull();
    expect(result.value).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.reason).toContain("cancelled");
  });

  it("runs normally when the signal is not aborted", async () => {
    const result = await client.generate({ seed: "#4f46e5", signal: new AbortController().signal });
    expect(result.outcome).toBe("ok");
  });
});

describe("unavailable capabilities", () => {
  /** A client that believes nothing is exported. */
  const starved = createThemvoraClient({ capabilities: detectCapabilities({}) });

  it("refuses every operation with an actionable reason", async () => {
    const results = [
      await starved.generate({ seed: "#4f46e5" }),
      await starved.validate({ theme: PAIR.light }),
      await starved.catalog(),
      await starved.diff({ a: PAIR.light, b: PAIR.dark }),
      await starved.exportVariables({ theme: PAIR.light }),
      await starved.cssDocument({ theme: PAIR.light }),
      await starved.migrate({ theme: PAIR.light }),
    ];

    for (const result of results) {
      expect(result.outcome).toBe("unavailable");
      expect(result.skipped).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.value).toBeNull();
      expect(result.reason).toContain("does not export");
    }
  });

  it("does not treat an unavailable capability as a validation failure", async () => {
    const result = await starved.validate({ theme: PAIR.light });

    expect(result.exitCode).toBeNull();
    expect(result.errors).toEqual([]);
  });
});

describe("read-only operations", () => {
  it("do not touch the workspace", async () => {
    const project = createTempProject();
    try {
      project.write("package.json", "{}");
      project.write("theme.json", "{}");
      const before = project.files();

      await client.generate({ seed: "#4f46e5" });
      await client.validate({ theme: PAIR.light });
      await client.catalog();
      await client.diff({ a: PAIR.light, b: PAIR.dark });
      await client.exportVariables({ theme: PAIR.light });
      await client.cssDocument({ theme: PAIR.light });
      await client.migrate({ theme: PAIR.light });

      expect(project.files()).toEqual(before);
    } finally {
      project.cleanup();
    }
  });
});

describe("diagnosticOf", () => {
  it("keeps a core diagnostic's code and hint", () => {
    const diagnostic = diagnosticOf(
      Object.assign(new Error("bad seed"), { code: "TV_GENERATION_INVALID_SEED", hint: "use a hex" }),
    );

    expect(diagnostic.code).toBe("TV_GENERATION_INVALID_SEED");
    expect(diagnostic.hint).toBe("use a hex");
    expect(diagnostic.severity).toBe("error");
  });

  it("keeps a thrown string observable", () => {
    expect(diagnosticOf("something broke").message).toBe("something broke");
  });

  it("never returns an empty message", () => {
    expect(diagnosticOf(undefined).message.length).toBeGreaterThan(0);
    expect(diagnosticOf({}).code).toBe("unknown");
  });
});
