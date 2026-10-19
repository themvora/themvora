/**
 * The showcase's class vocabulary, per styling engine.
 *
 * The generated UI is one design rendered two ways. Every element's classes come
 * from this table, so:
 *
 * - the two engines cannot drift — a change lands in one place;
 * - a framework adapter never has to know which engine was selected;
 * - the Tailwind variant genuinely emits Tailwind utilities rather than the CSS
 *   variant's component classes with Tailwind bolted on.
 *
 * The native-CSS names are the selectors `renderShowcaseCss()` defines; the
 * Tailwind names are utilities that resolve to Themvora tokens through
 * `@themvora/tailwind`'s `@theme` layer — `bg-card` **is**
 * `var(--theme-color-card)`, not a palette entry.
 *
 * @packageDocumentation
 */
import type { StylingEngine } from "../types.js";

/** Focus treatment shared by every interactive element. */
const TW_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-(--theme-color-ring)";

/** Base button geometry, before a variant's colours. */
const TW_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 " +
  "text-sm font-medium transition-colors cursor-pointer " +
  TW_FOCUS;

/** The pill control used for preset families. */
const TW_CHIP =
  "rounded-full border border-border px-3 py-1.5 text-sm capitalize " +
  "transition-colors cursor-pointer not-aria-pressed:hover:bg-muted " +
  "aria-pressed:border-primary aria-pressed:bg-primary " +
  "aria-pressed:text-primary-foreground " +
  TW_FOCUS;

/** The segmented control used for light/dark/system. */
const TW_SEGMENT =
  "flex-1 rounded-md px-3 py-1.5 text-sm capitalize transition-colors " +
  "cursor-pointer sm:flex-none not-aria-pressed:hover:bg-card " +
  "aria-pressed:bg-primary aria-pressed:text-primary-foreground " +
  TW_FOCUS;

/** The token swatch button in the colour grid. */
const TW_TOKEN =
  "flex w-full min-w-0 items-center gap-3 rounded-lg border border-border p-2 " +
  "text-left transition-colors hover:bg-muted cursor-pointer " +
  TW_FOCUS;

/**
 * Every class string the showcase uses, keyed by element.
 *
 * @remarks
 * Names are the CSS variant's selectors. Keeping them flat and semantic — rather
 * than BEM chains — means each one has exactly one rule, so a reader can find the
 * styling for any element by name.
 */
export interface ShowcaseClasses {
  /** The application shell: full-height centring wrapper. */
  appShell: string;
  /** The showcase's content column. */
  page: string;
  hero: string;
  status: string;
  statusDot: string;
  statusText: string;
  title: string;
  titleGradient: string;
  lead: string;
  code: string;
  docsNav: string;
  card: string;
  /** A card whose direct children stack with the card's own rhythm. */
  cardStack: string;
  controlsRow: string;
  controlGroup: string;
  controlLabel: string;
  controlRow: string;
  segments: string;
  segment: string;
  rule: string;
  chip: string;
  preview: string;
  previewBar: string;
  previewDot: string;
  previewDotDestructive: string;
  previewDotAccent: string;
  previewDotSuccess: string;
  previewAddress: string;
  previewBody: string;
  previewInfo: string;
  previewTitle: string;
  previewMeta: string;
  previewSwatches: string;
  previewSwatch: string;
  previewSwatchDot: string;
  previewSwatchName: string;
  previewActions: string;
  previewPill: string;
  previewPillPrimary: string;
  previewPillSecondary: string;
  cardHeading: string;
  cardTitle: string;
  cardHint: string;
  tokenGrid: string;
  token: string;
  tokenSwatch: string;
  tokenBody: string;
  tokenName: string;
  tokenValue: string;
  snippetGrid: string;
  snippet: string;
  snippetHead: string;
  snippetLabel: string;
  snippetCopy: string;
  snippetCode: string;
  scopedTile: string;
  scopedTileBody: string;
  scopedTitle: string;
  scopedText: string;
  scopedMeta: string;
  scopedDot: string;
  scopedBtn: string;
  footer: string;
  footerLink: string;
  switcherWrap: string;
  switcherBtn: string;
  btn: string;
  btnPrimary: string;
  btnOutline: string;
  /** Icon sizing inside a button or link. */
  icon: string;
}

const CSS: ShowcaseClasses = {
  appShell: "app-shell",
  page: "page",
  hero: "hero",
  status: "status",
  statusDot: "status-dot",
  statusText: "status-text",
  title: "title",
  titleGradient: "title-gradient",
  lead: "lead",
  code: "code",
  docsNav: "docs-nav",
  card: "card",
  cardStack: "card-stack",
  controlsRow: "controls-row",
  controlGroup: "control-group",
  controlLabel: "control-label",
  controlRow: "control-row",
  segments: "segments",
  segment: "segment",
  rule: "rule",
  chip: "chip",
  preview: "preview",
  previewBar: "preview-bar",
  previewDot: "preview-dot",
  previewDotDestructive: "preview-dot-destructive",
  previewDotAccent: "preview-dot-accent",
  previewDotSuccess: "preview-dot-success",
  previewAddress: "preview-address",
  previewBody: "preview-body",
  previewInfo: "preview-info",
  previewTitle: "preview-title",
  previewMeta: "preview-meta",
  previewSwatches: "preview-swatches",
  previewSwatch: "preview-swatch",
  previewSwatchDot: "preview-swatch-dot",
  previewSwatchName: "preview-swatch-name",
  previewActions: "preview-actions",
  previewPill: "preview-pill",
  previewPillPrimary: "preview-pill-primary",
  previewPillSecondary: "preview-pill-secondary",
  cardHeading: "card-heading",
  cardTitle: "card-title",
  cardHint: "card-hint",
  tokenGrid: "token-grid",
  token: "token",
  tokenSwatch: "token-swatch",
  tokenBody: "token-body",
  tokenName: "token-name",
  tokenValue: "token-value",
  snippetGrid: "snippet-grid",
  snippet: "snippet",
  snippetHead: "snippet-head",
  snippetLabel: "snippet-label",
  snippetCopy: "snippet-copy",
  snippetCode: "snippet-code",
  scopedTile: "scoped-tile",
  scopedTileBody: "scoped-tile-body",
  scopedTitle: "scoped-title",
  scopedText: "scoped-text",
  scopedMeta: "scoped-meta",
  scopedDot: "scoped-dot",
  scopedBtn: "scoped-btn",
  footer: "footer",
  footerLink: "footer-link",
  switcherWrap: "switcher-wrap",
  switcherBtn: "switcher-btn",
  btn: "btn",
  btnPrimary: "btn btn-primary",
  btnOutline: "btn btn-outline",
  icon: "icon",
};

const TAILWIND: ShowcaseClasses = {
  appShell: "flex min-h-dvh w-full items-center justify-center px-[clamp(0rem,1vw,4rem)]",
  page: "mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:gap-6 sm:px-6 sm:py-12 lg:py-16",
  hero: "flex flex-col items-center gap-5 pb-2 text-center sm:gap-6 sm:pb-4",
  status:
    "inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm",
  statusDot: "size-2 shrink-0 rounded-full bg-success",
  statusText: "truncate",
  title: "text-balance text-3xl font-bold tracking-tight sm:text-5xl",
  titleGradient: "bg-linear-to-r from-primary to-accent bg-clip-text text-transparent",
  lead: "max-w-lg text-balance text-sm text-muted-foreground sm:text-base",
  code: "rounded bg-secondary px-1.5 py-0.5 text-[0.85em]",
  docsNav:
    "grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3",
  card: "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6",
  cardStack: "grid gap-5",
  controlsRow: "flex flex-wrap items-center justify-between gap-4",
  controlGroup: "grid gap-2 sm:grid-cols-[6rem_1fr] sm:items-start sm:gap-4",
  controlLabel: "text-xs font-medium uppercase tracking-wider text-muted-foreground sm:pt-2",
  controlRow: "flex min-w-0 flex-wrap gap-2",
  segments: "flex w-full gap-1 rounded-lg border border-border bg-muted p-1 sm:w-auto",
  segment: TW_SEGMENT,
  rule: "border-border",
  chip: TW_CHIP,
  preview:
    "overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-md",
  previewBar: "flex items-center gap-2 border-b border-border bg-muted px-4 py-3",
  previewDot: "size-2.5 rounded-full",
  previewDotDestructive: "bg-destructive",
  previewDotAccent: "bg-accent",
  previewDotSuccess: "bg-success",
  previewAddress: "ml-3 hidden h-5 flex-1 rounded-md sm:block",
  previewBody:
    "grid gap-5 bg-card p-4 sm:p-6 md:grid-cols-[1fr_auto] md:items-center",
  previewInfo: "min-w-0",
  previewTitle: "text-base font-semibold",
  previewMeta: "mt-1 break-all font-mono text-xs text-muted-foreground",
  previewSwatches: "mt-4 flex flex-wrap gap-x-4 gap-y-2",
  previewSwatch: "flex items-center gap-1.5",
  previewSwatchDot: "size-4 shrink-0 rounded-full border-2 border-border",
  previewSwatchName: "font-mono text-xs text-muted-foreground",
  previewActions: "grid grid-cols-2 gap-2 sm:flex md:justify-end",
  previewPill: "rounded-md px-3 py-2 text-center text-sm font-medium",
  previewPillPrimary: "",
  previewPillSecondary: "",
  cardHeading:
    "mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
  cardTitle: "text-lg font-semibold",
  cardHint: "text-xs text-muted-foreground sm:text-sm",
  tokenGrid:
    "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  token: TW_TOKEN,
  tokenSwatch: "size-9 shrink-0 rounded-md border-2 border-border",
  tokenBody: "min-w-0",
  tokenName: "block truncate text-sm font-medium",
  tokenValue: "block truncate font-mono text-xs text-muted-foreground",
  snippetGrid: "grid gap-3 md:grid-cols-2",
  snippet: "min-w-0 overflow-hidden rounded-lg border border-border bg-muted/40",
  snippetHead:
    "flex items-center justify-between gap-2 border-b border-border px-3 py-2",
  snippetLabel: "text-xs font-medium text-muted-foreground",
  snippetCopy: `rounded px-2 py-0.5 text-xs text-primary hover:bg-muted cursor-pointer ${TW_FOCUS}`,
  snippetCode: "overflow-x-auto p-3 font-mono text-xs leading-relaxed",
  scopedTile: "rounded-lg shadow-md",
  scopedTileBody:
    "rounded-lg border border-border bg-primary p-4 text-primary-foreground sm:p-5",
  scopedTitle: "font-semibold",
  scopedText: "mt-1 text-sm text-primary-foreground/70",
  scopedMeta: "mt-3 flex items-center gap-2 text-sm text-primary-foreground/70",
  scopedDot: "size-2.5 shrink-0 rounded-full bg-success",
  scopedBtn: `${TW_BTN} shrink-0 bg-primary-foreground text-primary hover:opacity-90`,
  footer:
    "mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground",
  footerLink: `rounded text-primary underline-offset-4 hover:underline ${TW_FOCUS}`,
  switcherWrap: "flex items-center justify-center",
  switcherBtn: `${TW_BTN} border border-primary bg-primary text-primary-foreground hover:bg-primary/90`,
  btn: TW_BTN,
  btnPrimary: `${TW_BTN} border border-primary bg-primary text-primary-foreground hover:bg-primary/90`,
  btnOutline: `${TW_BTN} border border-border bg-card hover:bg-muted`,
  icon: "size-[1em]",
};

const CLASSES: Record<StylingEngine, ShowcaseClasses> = {
  css: CSS,
  tailwind: TAILWIND,
};

/**
 * The showcase's class vocabulary for a styling engine.
 *
 * @param styling - The selected engine.
 * @returns Every class string the showcase renders.
 */
export function showcaseClasses(styling: StylingEngine): ShowcaseClasses {
  return CLASSES[styling];
}
