/**
 * How a canonical preset relates to the project.
 *
 * One calculation, two callers: the Studio's New Theme drawer and the
 * `Browse Presets` command. They read the same evidence — a catalog entry's
 * family joined to the project rows the source graph produced — so they cannot
 * disagree about whether a preset is already in the project.
 *
 * Everything here is derived from evidence the graph already recorded: each
 * project theme row says which canonical API produced it, how far the
 * relationship was traced, and which consumers import it. Nothing is inferred
 * from a display name, a filename or a colour.
 *
 * The join key is the **family**, and only rows whose origin is the catalog are
 * candidates. A project that hand-writes `defineTheme({ family: "berry" })` has
 * an origin of `definition`; it is the developer's own theme that happens to
 * share a name, and it is deliberately not counted as the preset.
 *
 * Rows may name the workspace folder they came from. When they do, each folder
 * is judged separately and the strongest answer is reported — a family whose
 * light variant lives in one project and dark variant in another is not
 * registered in either.
 *
 * @packageDocumentation
 */

/**
 * How well the project's registration of a preset is established.
 *
 * - `registered` — included, and the collection is traced to a verified consumer.
 * - `included` — included in a statically read collection, consumer not traced.
 * - `partial` — some variants are established and others are not.
 * - `unverified` — a relationship exists but the path could not be resolved.
 * - `catalog-only` — no static project relationship was established.
 */
export type PresetRegistrationStatus =
  | "registered"
  | "included"
  | "partial"
  | "unverified"
  | "catalog-only";

/**
 * The minimum a project row has to say to be weighed against a preset.
 *
 * Both the Studio's theme rows and the command catalog's entries satisfy this
 * after a two-line mapping, which is why the calculation lives here rather than
 * in either of them.
 */
export interface PresetEvidenceRow {
  /** The family the row was recorded under, when it has one. */
  readonly family?: string;
  /** The theme's own name. */
  readonly name: string;
  /** Its mode, which is what variant-level evidence is keyed on. */
  readonly mode?: string;
  /** How far the graph traced this theme's relationship. */
  readonly evidence?: string;
  /** The consumers that import it. */
  readonly usedBy: readonly string[];
  /** The file it came from. */
  readonly source?: string;
  /**
   * The workspace folder the row belongs to.
   *
   * A family is a unit inside one project, so evidence from two folders cannot
   * be added together: `light` in one and `dark` in another is not a registered
   * pair. When rows carry this, each folder is judged on its own.
   */
  readonly root?: string;
  /**
   * Whether this row came from the canonical catalog.
   *
   * False for a local `defineTheme()`, which is what keeps a same-named custom
   * theme from being mistaken for the preset.
   */
  readonly catalogOrigin: boolean;
}

/** The preset being asked about. */
export interface PresetRegistrationInput {
  /** The catalog family, which is the join key. */
  readonly family: string;
  /** The label to fall back to when the family is empty. */
  readonly label?: string;
  /** The modes the catalog ships, in its own order. */
  readonly modes: readonly string[];
}

/** The verdict, with the evidence behind it. */
export interface PresetRegistration<TRow extends PresetEvidenceRow = PresetEvidenceRow> {
  readonly status: PresetRegistrationStatus;
  /** The chip's text. */
  readonly label: string;
  /** One line explaining the evidence, for a tooltip or a picker's detail. */
  readonly detail: string;
  /** The project rows that carry this preset, when any. */
  readonly rows: readonly TRow[];
  /** The files those rows came from. */
  readonly sources: readonly string[];
  /** Verified consumers importing those rows. */
  readonly consumers: readonly string[];
  /** Modes the preset ships, and whether the project was found to include each. */
  readonly variants: readonly { readonly mode: string; readonly found: boolean }[];
}

/** The labels, in one place so both surfaces say the same words. */
export const PRESET_STATUS_LABEL: Record<PresetRegistrationStatus, string> = {
  registered: "Registered in source",
  included: "In project",
  partial: "Partially detected",
  unverified: "Registration not verified",
  "catalog-only": "Catalog only",
};

/**
 * The key a row is grouped under.
 *
 * A row that recorded no family falls back to its name with the mode suffix
 * removed — the same rule the Studio's sidebar uses to group a light/dark pair.
 *
 * @param row - One project row.
 * @returns Its family key.
 */
function rowFamily(row: PresetEvidenceRow): string {
  return row.family ?? row.name.replace(/-(light|dark)$/u, "");
}

/**
 * How established a verdict is.
 *
 * Completeness comes first by construction: `partial` always has a missing
 * variant and `registered`/`included` never do, so ranking by status also ranks
 * by how much of the family was established.
 */
const STATUS_RANK: Record<PresetRegistrationStatus, number> = {
  registered: 4,
  included: 3,
  partial: 2,
  unverified: 1,
  "catalog-only": 0,
};

/**
 * Work out how a canonical preset relates to the project.
 *
 * @param preset - The catalog entry, reduced to what the join needs.
 * @param rows - Every project theme row, from any origin.
 * @returns The status, its label and the evidence behind it.
 */
export function presetRegistration<TRow extends PresetEvidenceRow>(
  preset: PresetRegistrationInput,
  rows: readonly TRow[],
): PresetRegistration<TRow> {
  // Without a folder there is nothing to keep apart: the Studio builds its rows
  // from one inspection, and a caller that never sets `root` gets the plain
  // family calculation.
  if (!rows.some((row) => row.root !== undefined)) return verdictFor(preset, rows);

  const groups = new Map<string, TRow[]>();
  for (const row of rows) {
    const key = row.root ?? "";
    const bucket = groups.get(key);
    if (bucket === undefined) groups.set(key, [row]);
    else bucket.push(row);
  }

  // Each folder answers the question on its own evidence, and the strongest
  // answer wins. Rows are never pooled: a preset split across two unrelated
  // projects is not a registered preset in either of them.
  let best: PresetRegistration<TRow> | undefined;
  for (const [root, group] of groups) {
    const verdict = verdictFor(preset, group, root.length === 0 ? undefined : root);
    if (best === undefined || STATUS_RANK[verdict.status] > STATUS_RANK[best.status]) best = verdict;
  }

  // `groups` is non-empty whenever `rows` is, which is the only way here.
  return best ?? verdictFor(preset, rows);
}

/**
 * Judge one preset against one set of rows.
 *
 * @param preset - The catalog entry.
 * @param rows - The rows of a single folder, or of no particular folder.
 * @param rootLabel - The folder's name, when the caller keeps folders apart.
 * @returns The verdict.
 */
function verdictFor<TRow extends PresetEvidenceRow>(
  preset: PresetRegistrationInput,
  rows: readonly TRow[],
  rootLabel?: string,
): PresetRegistration<TRow> {
  // A state built by an older host has no `family`. Falling back to the label
  // keeps the surface usable instead of throwing on the first render.
  const declared = typeof preset.family === "string" ? preset.family : "";
  const key = declared.length > 0 ? declared : (preset.label ?? "").toLowerCase();
  const included = rows.filter((row) => rowFamily(row) === key && row.catalogOrigin);

  const variants = preset.modes.map((mode) => ({
    mode,
    found: included.some((row) => (row.mode ?? "default") === mode),
  }));
  const missing = variants.filter((variant) => !variant.found).map((variant) => variant.mode);

  if (included.length === 0) {
    return {
      status: "catalog-only",
      label: PRESET_STATUS_LABEL["catalog-only"],
      detail:
        "A canonical catalog preset with no static project registration. Copying it creates a new theme; it does not register the preset.",
      rows: [],
      sources: [],
      consumers: [],
      variants,
    };
  }

  const sources = [...new Set(included.flatMap((row) => (row.source === undefined ? [] : [row.source])))];
  const consumers = [...new Set(included.flatMap((row) => row.usedBy))];
  const registered = included.filter((row) => row.evidence === "registered");
  const unresolved = included.some((row) => row.evidence === "partially-resolved");

  // In a multi-root workspace the file alone is ambiguous — two folders can hold
  // a `src/theme/theme.config.ts` — so the folder is named alongside it.
  const where =
    sources.length === 0
      ? rootLabel === undefined
        ? ""
        : ` in ${rootLabel}`
      : ` in ${sources.join(", ")}${rootLabel === undefined ? "" : ` (${rootLabel})`}`;
  const by = consumers.length === 0 ? "" : `, passed to ${consumers.join(", ")}`;

  /** The sentence a row shows, built from what was actually found. */
  const detailFor = (status: PresetRegistrationStatus): string => {
    const gap =
      missing.length === 0
        ? ""
        : ` ${missing.join(" and ")} ${missing.length === 1 ? "was" : "were"} not found in the project.`;

    switch (status) {
      case "registered":
        return `Included${where}${by}.${gap}`;
      case "included":
        return `Included${where}, but no verified consumer was traced to that collection.${gap}`;
      case "partial":
        return `Only part of this preset is established${where}.${gap}`;
      case "unverified":
        return `A relationship to this preset exists${where}, but the path could not be resolved statically.${gap}`;
      default:
        return "";
    }
  };

  const settle = (status: PresetRegistrationStatus): PresetRegistration<TRow> => ({
    status,
    label: PRESET_STATUS_LABEL[status],
    detail: detailFor(status),
    rows: included,
    sources,
    consumers,
    variants,
  });

  // A missing variant is the strongest statement: the family is only partly
  // present, whatever the rows that were found say about registration.
  if (missing.length > 0) return settle("partial");
  if (registered.length === included.length) return settle("registered");
  if (registered.length > 0) return settle("partial");
  if (unresolved) return settle("unverified");
  return settle("included");
}

/**
 * Whether a preset already belongs to the project.
 *
 * @param registration - The verdict.
 * @returns `true` for every status except catalog-only.
 */
export function isInProject(registration: { readonly status: PresetRegistrationStatus }): boolean {
  return registration.status !== "catalog-only";
}
