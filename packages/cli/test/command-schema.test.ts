import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMAND_SPECS,
  GLOBAL_OPTIONS,
  acceptedFlags,
  findCommand,
  optionLabel,
  renderCommandHelp,
  renderMainHelp,
} from "../src/command-schema.js";
import { COMMAND_NAMES } from "../src/run.js";
import { VERSION } from "../src/version.js";
import { cli } from "./helpers.js";

describe("command contract — shape", () => {
  it("describes every command with the fields the docs and completion need", () => {
    for (const spec of COMMAND_SPECS) {
      expect(spec.name, "name").toBeTruthy();
      expect(spec.summary, `${spec.name} summary`).toBeTruthy();
      expect(spec.title, `${spec.name} title`).toBeTruthy();
      expect(spec.description, `${spec.name} description`).toBeTruthy();
      expect(spec.usage, `${spec.name} usage`).toMatch(/^themvora /);
      expect(Array.isArray(spec.aliases), `${spec.name} aliases`).toBe(true);
      expect(spec.exitCodes.length, `${spec.name} exit codes`).toBeGreaterThan(0);
    }
  });

  it("gives every option a flag and a description", () => {
    for (const spec of COMMAND_SPECS) {
      for (const option of spec.options) {
        expect(option.flag, `${spec.name} flag`).toMatch(/^--/);
        expect(option.description, `${spec.name} ${option.flag}`).toBeTruthy();
      }
    }
  });

  it("keeps every alias unique across commands", () => {
    const seen = new Map<string, string>();
    for (const spec of COMMAND_SPECS) {
      for (const name of [spec.name, ...spec.aliases]) {
        expect(seen.has(name), `duplicate command name/alias "${name}"`).toBe(false);
        seen.set(name, spec.name);
      }
    }
  });
});

describe("command contract — dispatch", () => {
  it("has a handler for every described command", async () => {
    for (const spec of COMMAND_SPECS) {
      const result = await cli(spec.name, "--help");
      expect(result.code, `${spec.name} --help`).toBe(0);
    }
  });

  it("resolves every alias to its command", async () => {
    for (const spec of COMMAND_SPECS) {
      for (const alias of spec.aliases) {
        expect(findCommand(alias)?.name, alias).toBe(spec.name);
        const result = await cli(alias, "--help");
        expect(result.code, `${alias} --help`).toBe(0);
      }
    }
  });

  it("exposes exactly the described commands", () => {
    expect([...COMMAND_NAMES]).toEqual(COMMAND_SPECS.map((spec) => spec.name));
  });

  it("reports an unknown command with exit 1", async () => {
    const result = await cli("frobnicate");
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown command: frobnicate");
  });
});

describe("command contract — help output", () => {
  it("prints the version for --version and -v", async () => {
    for (const flag of ["--version", "-v"]) {
      const result = await cli(flag);
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe(VERSION);
    }
  });

  it("prints the main help with every command listed", async () => {
    const result = await cli("--help");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Usage:");
    for (const spec of COMMAND_SPECS) {
      expect(result.stdout, spec.name).toContain(spec.name);
    }
    for (const option of GLOBAL_OPTIONS) {
      expect(result.stdout).toContain(option.flag);
    }
  });

  it("prints a command's usage and every option for --help", async () => {
    for (const spec of COMMAND_SPECS) {
      const result = await cli(spec.name, "--help");
      expect(result.stdout, `${spec.name} usage`).toContain(spec.usage);
      for (const option of spec.options) {
        expect(result.stdout, `${spec.name} ${option.flag}`).toContain(option.flag);
      }
      for (const exit of spec.exitCodes) {
        expect(result.stdout, `${spec.name} exit ${exit.code}`).toContain(String(exit.code));
      }
    }
  });

  it("renders the same help text the contract produces", async () => {
    for (const spec of COMMAND_SPECS) {
      const result = await cli(spec.name, "--help");
      expect(result.stdout.trim()).toBe(renderCommandHelp(spec));
    }
    const main = await cli("--help");
    expect(main.stdout.trim()).toBe(renderMainHelp(VERSION));
  });

  it("documents the short alias alongside the long flag", () => {
    const generate = findCommand("generate")!;
    const seed = generate.options.find((option) => option.flag === "--seed")!;
    expect(optionLabel(seed)).toBe("-s, --seed <color>");
  });

  it("lists every accepted flag, including back-compat spellings", () => {
    const generate = findCommand("generate")!;
    const flags = acceptedFlags(generate);
    expect(flags).toContain("--code");
    expect(flags).toContain("--with-code");
    expect(flags).toContain("--help");
  });
});

describe("command contract — exit codes", () => {
  it("uses 2 for a usage error and 1 for an unknown command", async () => {
    expect((await cli()).code).toBe(2);
    expect((await cli("--help")).code).toBe(0);
    expect((await cli("generate", "--mode", "nope")).code).toBe(2);
    expect((await cli("frobnicate")).code).toBe(1);
  });
});

describe("command contract — documentation stays synchronised", () => {
  /** The option table a docs page publishes for a command. */
  function documentedFlags(command: string): string[] {
    const page = readFileSync(
      join(import.meta.dirname, "..", "..", "..", "apps", "docs", "content", "cli", `${command}.md`),
      "utf8",
    );
    const table = page.slice(page.indexOf("### Options"), page.indexOf("### Exit codes"));
    // The first cell of each row, which is where the flag is named. Reading the
    // whole row would also pick up flags mentioned in a description.
    return table
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .map((line) => line.split("|")[1] ?? "")
      .flatMap((cell) => [...cell.matchAll(/(--[a-z][a-z-]*)/g)].map((match) => match[1]!));
  }

  it("documents every option the schema declares, and no others", () => {
    // The schema is the authoritative source; the page is generated from it by
    // hand, so this is the assertion that keeps the two from drifting.
    for (const spec of COMMAND_SPECS) {
      // Canonical flags only: the page's table documents one row per option,
      // with the short alias in the same cell. Secondary spellings (`aliases`)
      // are covered by the help-output assertions above.
      const declared = spec.options
        .map((option) => option.flag)
        .filter((flag) => !GLOBAL_OPTIONS.some((global) => global.flag === flag))
        .sort();
      const documented = [...new Set(documentedFlags(spec.name))].sort();

      expect(documented, `${spec.name}: docs and schema disagree`).toEqual(declared);
    }
  });

  it("documents the styling option with the values the parser accepts", async () => {
    const page = readFileSync(
      join(import.meta.dirname, "..", "..", "..", "apps", "docs", "content", "cli", "init.md"),
      "utf8",
    );

    const spec = findCommand("init")!;
    const styling = spec.options.find((option) => option.flag === "--styling")!;

    // The row the page publishes is the row the schema declares — label and
    // description both, so a reworded schema description that never reached the
    // page is caught here rather than in review.
    expect(page).toContain(`\`${optionLabel(styling)}\``);
    expect(page).toContain(styling.description);

    // The default the page claims is the default the parser applies.
    expect(page).toContain("| `css` |");
    const plan = await cli("init", "somewhere", "--framework", "react", "--plan", "--json");
    expect(plan.json<{ styling: string }>().styling).toBe("css");
  });
});
