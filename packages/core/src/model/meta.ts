/**
 * Origin recorded in {@link GenerationMeta.kind}.
 *
 * Presently a single value: a theme the public generator produced. Shipped
 * presets and the neutral baseline are produced by the same engine but are not
 * application-generated, so they omit the field rather than carry a marker an
 * accessor would have to special-case.
 */
export type GenerationKind = "generated";

/**
 * Provenance for a theme produced by the generator.
 *
 * Present only on generated themes. It records *how* the theme was made, so a
 * shipped theme can be traced back to the algorithm that produced it — which is
 * what lets a future `semantic-v3` ship without silently changing every existing
 * theme (theme-generation.md Phase 6).
 *
 * @see {@link ThemeMeta.generation}
 */
export interface GenerationMeta {
  /**
   * Provenance origin.
   *
   * `"generated"` is stamped only by the public {@link generateTheme} call, so a
   * consumer can tell a theme *the application generated* from one shipped with
   * the framework. The built-in presets and the neutral baseline carry the rest
   * of {@link GenerationMeta} (`algorithm`, `seed`, `contrast`, …) without this
   * field — the algorithm name alone cannot distinguish them, because they are
   * produced by the same engine.
   *
   * This declares provenance; it is an API contract, not a security boundary.
   *
   * @see {@link isGeneratedTheme}
   */
  kind?: GenerationKind;
  /**
   * The generation algorithm that produced this theme, e.g. `"semantic-v2"`.
   *
   * This is the *algorithm* version, distinct from {@link ThemeMeta.version}
   * (the token-schema version) and from the package version.
   */
  algorithm: string;
  /**
   * The seed the theme was generated from, verbatim.
   *
   * Provenance only: the resolved `primary` may have been contrast-repaired away
   * from this value, and that is the point — the seed records intent, the token
   * records the result.
   */
  seed: string;
  /** The generation style used, when one was chosen explicitly. */
  style?: string;
  /**
   * Roles pinned to a brand anchor rather than generated.
   *
   * The distinction matters to every downstream audit. A **generated** action
   * fill is expected to stand off the canvas — that is what makes it read as a
   * control. An **anchored** one is a brand's published colour, and some brands
   * are simply too dark to stand off a near-black page: Slack's aubergine is
   * 1.42:1 there.
   *
   * That is brand fidelity working as designed, not a generator failure, and
   * without this field an audit cannot tell the two apart — which is exactly how
   * a contributor ends up "fixing" Slack by replacing its brand colour.
   *
   * @see generation/contexts.ts — `auditActionProminence`
   */
  anchored?: readonly string[];
  /** The contrast contract the theme was solved against. */
  contrast?: {
    /** Normal-text ratio. */
    text: number;
    /** Large-text ratio. */
    largeText: number;
    /** Non-text UI ratio. */
    ui: number;
  };
}

/**
 * Metadata describing a theme's family, mode, and presentation.
 *
 * `family` and `mode` drive selection; the remaining fields are descriptive
 * and may be surfaced by tooling, the inspector, or docs generators.
 *
 * @see {@link ThemeDefinition}
 */
export interface ThemeMeta {
  /** Human-readable theme name shown in pickers and the inspector. */
  label?: string;
  /** Short human-readable description of the theme. */
  description?: string;
  /** Deprecated alias for {@link family}. Prefer `family`. */
  group?: string;
  /** Theme schema version this definition targets. */
  version?: string;
  /** ISO date the theme was created. */
  created?: string;
  /** ISO date the theme was last updated. */
  updated?: string;

  /**
   * Theme family used for selection and toggling. Themes without a family
   * belong to the `"default"` family.
   */
  family?: string;
  /**
   * Color mode of the theme. When omitted, the mode is inferred from the
   * theme name (e.g. `"mint-dark"` → `"dark"`).
   */
  mode?: "light" | "dark" | "system";
  /** Relative sort order among themes of the same family. */
  order?: number;
  /** Free-form tags for filtering and classification. */
  tags?: string[];
  /**
   * Generation provenance, present only on generated themes.
   *
   * @see {@link GenerationMeta}
   */
  generation?: GenerationMeta;
}
