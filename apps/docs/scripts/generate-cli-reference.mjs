#!/usr/bin/env node
/**
 * Generate the drift-prone tables in `content/cli/*.md` from the CLI's own
 * command contract.
 *
 * `packages/cli/src/command-schema.json` is the single source of truth: it is
 * what `themvora --help` renders, what the dispatcher accepts, and — here — what
 * the docs tables are built from. Reading the same JSON is what makes "the docs
 * cannot advertise a flag the parser does not recognise" a structural property
 * rather than a review habit.
 *
 * JSON rather than the TypeScript module on purpose: this script runs in the
 * fast, static docs gate with no build step, and a `.mjs` script cannot import
 * TypeScript. The previous implementation regex-parsed `commandHelp` template
 * literals out of `cli.ts`, which broke the moment help became derived.
 *
 * `exit-codes.ts` is still read as text, because the global exit-code table
 * documents the `ExitCodes` constants and their JSDoc, which the JSON does not
 * carry.
 *
 * Only the marked regions are generated; the surrounding prose is hand-written
 * and left alone.
 *
 *   node scripts/generate-cli-reference.mjs           # write
 *   node scripts/generate-cli-reference.mjs --check   # verify (CI gate)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const CLI_DIR = join(repoRoot, "packages", "cli", "src");
const SCHEMA_FILE = join(CLI_DIR, "command-schema.json");
const CONTENT_DIR = join(here, "..", "content", "cli");
const REFERENCE = join(CONTENT_DIR, "reference.md");

const START = "<!-- cli-reference:generated:start -->";
const END = "<!-- cli-reference:generated:end -->";
const COMMAND_START = "<!-- cli-command:generated:start -->";
const COMMAND_END = "<!-- cli-command:generated:end -->";

/** Escape a cell for a Markdown table. */
function cell(value) {
  return String(value).replace(/\|/g, "\\|");
}

/** The label shown in an option's first column, e.g. `` `-s, --seed <color>` ``. */
function optionLabel(option) {
  const long = option.value ? `${option.flag} ${option.value}` : option.flag;
  return option.alias ? `${option.alias}, ${long}` : long;
}

/** The allowed values of an option, as prose. */
function valueHint(option) {
  if (option.values) return ` One of: ${option.values.map((v) => `\`${v}\``).join(", ")}.`;
  if (option.valuesFrom) {
    const registry = option.valuesFrom === "brand" ? "brands" : `${option.valuesFrom}s`;
    return ` Run \`themvora list ${registry}\` for the available values.`;
  }
  return "";
}

/** Render the Option/Description/Default table for one command. */
function optionsTable(command) {
  const rows = [
    "| Option | Description | Default |",
    "| ------ | ----------- | ------- |",
    ...command.options.map((option) => {
      const description = `${cell(option.description)}${valueHint(option)}`;
      const def = option.default !== undefined ? `\`${cell(option.default)}\`` : "—";
      return `| \`${cell(optionLabel(option))}\` | ${description} | ${def} |`;
    }),
  ];
  return rows.join("\n");
}

/**
 * Render the Synopsis + Options body shared by the reference and command pages.
 *
 * @param command - One command from the contract.
 * @param summaryPrefix - Text placed before the summary. Command pages use a
 *   heading; the reference page places the summary under its own `####`.
 * @returns The Markdown body, without markers.
 */
function commandBlockBody(command, summaryPrefix) {
  const lines = [
    `${summaryPrefix}${command.summary}`,
    "",
    "```text",
    "Usage:",
    `  ${command.usage}`,
    "```",
  ];

  if (command.positionals?.length) {
    lines.push("", "| Argument | Description |", "| -------- | ----------- |");
    for (const positional of command.positionals) {
      const required = positional.required ? "" : " (optional)";
      lines.push(`| \`${cell(positional.name)}\` | ${cell(positional.description)}${required} |`);
    }
  }

  lines.push("", "### Options", "", optionsTable(command), "", "### Exit codes", "");
  lines.push("| Code | Meaning |", "| ---- | ------- |");
  for (const exit of command.exitCodes) {
    lines.push(`| \`${exit.code}\` | ${cell(exit.meaning)} |`);
  }

  if (command.examples?.length) {
    lines.push("", "### Examples", "", "```bash");
    for (const example of command.examples) lines.push(example);
    lines.push("```");
  }

  lines.push(
    "",
    "> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.",
  );

  return lines.join("\n");
}

/** The same body, wrapped in the markers the command pages are spliced on. */
function commandBlock(command, summaryPrefix) {
  return [COMMAND_START, commandBlockBody(command, summaryPrefix), COMMAND_END].join("\n");
}

/** Parse the ExitCodes frozen object, keeping each entry's JSDoc. */
function parseExitCodes(src) {
  const anchor = src.indexOf("export const ExitCodes");
  if (anchor === -1) throw new Error("ExitCodes not found in exit-codes.ts");
  const body = src.slice(anchor);

  const out = [];
  const re = /\/\*\*\s*([\s\S]*?)\*\/\s*(\w+):\s*(\d+)/g;
  let m;
  while ((m = re.exec(body))) {
    const doc = m[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\*?\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
    out.push({ name: m[2], code: m[3], meaning: doc });
  }
  return out;
}

/** Render the reference page's generated region. */
function renderReference(commands, exitCodes) {
  const lines = [];

  lines.push("## Commands");
  lines.push("");
  lines.push("| Command | Aliases | Usage | Options |");
  lines.push("| ------- | ------- | ----- | ------- |");
  for (const command of commands) {
    const aliases = command.aliases?.length
      ? command.aliases.map((a) => `\`${a}\``).join(", ")
      : "—";
    const opts = command.options.map((o) => `\`${o.flag}\``).join(", ");
    // `cell()` escapes pipes: a usage line such as
    // `themvora list [brands|presets|…]` would otherwise split the row into
    // extra columns and break the table.
    lines.push(
      `| \`${command.name}\` | ${aliases} | \`${cell(command.usage)}\` | ${opts} |`,
    );
  }
  lines.push("");
  lines.push(
    "The theme-reading commands (`validate`, `inspect`, `migrate`, `export`) " +
      "accept the theme as a positional path instead of `--file`, and accept " +
      "either a single theme or a `{ light, dark }` pair.",
  );

  lines.push("");
  lines.push("### Options per command");
  lines.push("");
  lines.push(
    "Each block below is generated from the command contract — the same " +
      "definitions that drive `themvora <command> --help` and shell completion.",
  );
  lines.push("");
  for (const command of commands) {
    lines.push(`#### \`themvora ${command.name}\``);
    lines.push("");
    lines.push(commandBlockBody(command, ""));
    lines.push("");
  }

  lines.push("## Exit codes");
  lines.push("");
  lines.push("| Code | Constant | Meaning |");
  lines.push("| ---- | -------- | ------- |");
  for (const e of exitCodes) {
    lines.push(`| \`${e.code}\` | \`ExitCodes.${e.name}\` | ${e.meaning} |`);
  }
  lines.push("");
  lines.push(
    "CI and editors can switch on these without parsing stdout. The per-command " +
      "exit codes listed above are the subset each command can actually return.",
  );

  return lines.join("\n");
}

/** Replace the region between two markers. */
function splice(file, start, end, block, label) {
  const current = readFileSync(file, "utf8");
  const a = current.indexOf(start);
  const b = current.indexOf(end);
  if (a === -1 || b === -1) {
    throw new Error(`markers not found in ${label} — expected ${start} … ${end}`);
  }
  return {
    path: file,
    label,
    current,
    next: current.slice(0, a) + block + current.slice(b + end.length),
  };
}

function main() {
  const check = process.argv.includes("--check");

  const schema = JSON.parse(readFileSync(SCHEMA_FILE, "utf8"));
  const exitSrc = readFileSync(join(CLI_DIR, "exit-codes.ts"), "utf8");

  const commands = schema.commands ?? [];
  if (commands.length === 0) throw new Error("schema contains 0 commands — it is broken");

  const exitCodes = parseExitCodes(exitSrc);
  const outputs = [];

  // 1. the reference page's tables
  const generated = `${START}\n> Generated from \`packages/cli/src/command-schema.json\` and \`packages/cli/src/exit-codes.ts\` by \`apps/docs/scripts/generate-cli-reference.mjs\`. Do not edit by hand — run \`pnpm --filter @themvora/docs cli:generate\`.\n\n${renderReference(commands, exitCodes)}\n${END}`;
  outputs.push(splice(REFERENCE, START, END, generated, "content/cli/reference.md"));

  // 2. a Synopsis block on each command page, so every page carries the same
  //    generated section and no page can document different options.
  for (const command of commands) {
    const page = join(CONTENT_DIR, `${command.name}.md`);
    let text;
    try {
      text = readFileSync(page, "utf8");
    } catch {
      continue; // no dedicated page for this command
    }

    const block = commandBlock(command, "## Synopsis — ");

    if (text.includes(COMMAND_START)) {
      outputs.push(splice(page, COMMAND_START, COMMAND_END, block, `content/cli/${command.name}.md`));
    } else {
      // First run: place it directly after the page's Prerequisites section.
      const idx = text.indexOf("\n## ", text.indexOf("\n## Prerequisites"));
      const insertAt = idx === -1 ? text.length : idx + 1;
      outputs.push({
        path: page,
        label: `content/cli/${command.name}.md`,
        current: text,
        next: `${text.slice(0, insertAt)}${block}\n\n${text.slice(insertAt)}`,
      });
    }
  }

  const changed = outputs.filter((o) => o.next !== o.current);

  if (check) {
    if (changed.length > 0) {
      console.error("CLI reference is out of date:");
      for (const o of changed) console.error(`  ${o.label}`);
      console.error("Run: pnpm --filter @themvora/docs cli:generate");
      process.exit(1);
    }
    console.log(
      `CLI docs in sync (${commands.length} commands, ${exitCodes.length} exit codes, ${outputs.length} files).`,
    );
    return;
  }

  for (const o of changed) writeFileSync(o.path, o.next);
  console.log(
    changed.length === 0
      ? `CLI docs already up to date (${outputs.length} files).`
      : `Regenerated ${changed.length} file(s):\n` +
          changed.map((o) => `  ${o.label}`).join("\n"),
  );
}

main();
