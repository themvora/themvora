/**
 * The semantic palette engine — seed → identity → role-group palettes → solved
 * palette.
 *
 * ```
 * seed ──▶ identity ──┬─▶ surfaces    (background, card, popover, muted, secondary)
 *                     ├─▶ content     (foreground hierarchy)
 *                     ├─▶ actions     (primary, accent + foregrounds)
 *                     ├─▶ status      (destructive, success — brand-independent)
 *                     └─▶ interaction (border, input, ring)
 *                              ↓
 *                     relationships → contrast solver → solved palette
 * ```
 *
 * Light and dark are generated **independently** (Phase 4): the pipeline runs once
 * per mode with that mode's strategy, never once and then inverted.
 *
 * The pipeline entry point is {@link generateRolePalette}. `buildPalette` is the
 * raw, unsolved candidate set; it is exported for tests and diagnostics.
 *
 * @packageDocumentation
 */
export * from "./contract";
export * from "./contexts";
export * from "./roles";
export * from "./identity";
export * from "./styles";
export * from "./types";
export * from "./neutral";
export * from "./surfaces";
export * from "./content";
export * from "./foreground-policy";
export * from "./actions";
export * from "./status";
export * from "./interaction";
export * from "./solver";
export * from "./relationships";
export * from "./version";
export * from "./code-tokens";
export * from "./validate-levels";
export * from "./scorecard";
export * from "./pipeline";
export * from "./report";
