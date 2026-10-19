import type { ParsedArgs } from "../utils.js";
import { getBool } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import {
  listBrands,
  listPresets,
  listStyles,
  type RegistryEntry,
} from "../registry.js";
import { INIT_FRAMEWORKS, type InitFramework } from "../frameworks.js";
import { paint, wantsJson, writeJson } from "../output.js";
import { suggestionSuffix } from "../suggest.js";

/** The registries `list` can report on. */
const SELECTORS = ["brands", "presets", "styles", "frameworks"] as const;

type Selector = (typeof SELECTORS)[number];

/**
 * Normalise a selector so the singular spelling is accepted too.
 *
 * `themvora list preset` and `themvora list presets` are the same request; only
 * the plural is documented, so the error message stays canonical.
 */
function normaliseSelector(value: string): string {
  const lower = value.trim().toLowerCase();
  return lower.endsWith("s") ? lower : `${lower}s`;
}

/** Pad every cell in a column to the width of its widest entry. */
function renderTable(rows: readonly (readonly string[])[]): string[] {
  if (rows.length === 0) return [];
  const columns = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? "").length)),
  );

  return rows.map((row) =>
    row
      .map((cell, column) => (column === columns - 1 ? cell : cell.padEnd(widths[column]!)))
      .join("  ")
      .replace(/\s+$/, ""),
  );
}

/** The human-readable rows for a preset or brand registry. */
function registryRows(entries: readonly RegistryEntry[]): string[][] {
  return entries.map((entry) => [
    paint("bold", entry.id),
    entry.name,
    entry.style,
    entry.seed,
    ...(entry.provenance !== undefined ? [entry.provenance] : []),
    paint("dim", entry.description),
  ]);
}

/** The human-readable rows for the framework registry. */
function frameworkRows(frameworks: readonly InitFramework[]): string[][] {
  return frameworks.map((framework) => [
    paint("bold", framework.id),
    framework.displayName,
    framework.buildSystem,
    framework.ssr ? "server" : "client",
    paint("dim", framework.packages.join(", ")),
  ]);
}

/**
 * Implements the `list` command.
 *
 * Prints the canonical registries — brand recipes, preset recipes, generation
 * styles, and the frameworks `init` supports. Every value comes from the
 * registry itself, so this command cannot advertise an identifier the generator
 * would reject.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When the selector is not one of the four registries.
 */
export async function cmdList(args: ParsedArgs) {
  const requested = args._[1];
  const json = wantsJson(args);
  const idsOnly = getBool(args, "ids");

  let selectors: readonly Selector[] = SELECTORS;

  if (requested !== undefined) {
    const normalised = normaliseSelector(requested);
    if (!(SELECTORS as readonly string[]).includes(normalised)) {
      throw new UsageError(
        `unknown registry "${requested}"${suggestionSuffix(normalised, SELECTORS)} — ` +
          `use one of: ${SELECTORS.join(", ")}`,
      );
    }
    selectors = [normalised as Selector];
  }

  if (idsOnly && requested === undefined) {
    throw new UsageError(
      `--ids needs a registry — use one of: ${SELECTORS.join(", ")}`,
    );
  }

  const data: Record<string, unknown> = {};
  for (const selector of selectors) {
    if (selector === "brands") data.brands = listBrands();
    else if (selector === "presets") data.presets = listPresets();
    else if (selector === "styles") data.styles = listStyles();
    else data.frameworks = INIT_FRAMEWORKS;
  }

  // The identifiers, one per line, and nothing else. This is the mode a shell
  // completion script can consume without a JSON parser — and because it reads
  // the same registries as every other mode, a completion value cannot drift
  // from a value the command would accept.
  if (idsOnly) {
    const selector = selectors[0]!;
    const ids =
      selector === "brands"
        ? listBrands().map((entry) => entry.id)
        : selector === "presets"
          ? listPresets().map((entry) => entry.id)
          : selector === "styles"
            ? [...listStyles()]
            : INIT_FRAMEWORKS.map((framework) => framework.id);

    process.stdout.write(`${ids.join("\n")}\n`);
    return;
  }

  if (json) {
    // A single selector yields its array directly; no selector yields an object
    // keyed by registry. That is the shape a script wants in both cases.
    writeJson(selectors.length === 1 ? data[selectors[0]!] : data);
    return;
  }

  const blocks: string[] = [];

  for (const selector of selectors) {
    if (selector === "brands") {
      const entries = listBrands();
      blocks.push([`Brands (${entries.length})`, ...renderTable(registryRows(entries))].join("\n"));
    } else if (selector === "presets") {
      const entries = listPresets();
      blocks.push([`Presets (${entries.length})`, ...renderTable(registryRows(entries))].join("\n"));
    } else if (selector === "styles") {
      const styles = listStyles();
      blocks.push([`Styles (${styles.length})`, ...renderTable(styles.map((style) => [style]))].join("\n"));
    } else {
      blocks.push(
        [
          `Init frameworks (${INIT_FRAMEWORKS.length})`,
          ...renderTable(frameworkRows(INIT_FRAMEWORKS)),
        ].join("\n"),
      );
    }
  }

  process.stdout.write(`${blocks.join("\n\n")}\n`);
}
