/**
 * Shared Tailwind class strings for the reference design.
 *
 * These reproduce the exact classes used by the React reference app so every
 * framework renders the same look. Because Tailwind only generates utilities it
 * can see, each app's stylesheet adds `@source` pointing at this directory.
 *
 * Plain string literals only — no framework-specific binding — so they can be
 * used from JSX, Vue/Astro/Svelte templates, Angular bindings, or the DOM.
 */

/* ---------- Focus + buttons ---------- */

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-(--theme-color-ring)";

export const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 " +
  "text-sm font-medium transition-colors cursor-pointer " +
  focusRing;

export const btnPrimary =
  btnBase +
  " border border-primary bg-primary text-primary-foreground hover:bg-primary/90";

export const btnOutline = btnBase + " border border-border bg-card hover:bg-muted";

/* Active state comes from aria-pressed, so styling and accessibility stay in sync. */
export const chip =
  "rounded-full border border-border px-3 py-1.5 text-sm capitalize " +
  "transition-colors cursor-pointer not-aria-pressed:hover:bg-muted " +
  "aria-pressed:border-primary aria-pressed:bg-primary " +
  "aria-pressed:text-primary-foreground " +
  focusRing;

export const segment =
  "flex-1 rounded-md px-3 py-1.5 text-sm capitalize transition-colors " +
  "cursor-pointer sm:flex-none not-aria-pressed:hover:bg-card " +
  "aria-pressed:bg-primary aria-pressed:text-primary-foreground " +
  focusRing;

/* ---------- Layout blocks ---------- */

export const card =
  "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6";

export const sectionHeading = {
  wrap: "mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
  title: "text-lg font-semibold",
  hint: "text-xs text-muted-foreground sm:text-sm",
};

export const controlGroup = {
  wrap: "grid gap-2 sm:grid-cols-[6rem_1fr] sm:items-start sm:gap-4",
  label:
    "text-xs font-medium uppercase tracking-wider text-muted-foreground sm:pt-2",
  group: "flex min-w-0 flex-wrap gap-2",
};

export const snippet = {
  wrap: "min-w-0 overflow-hidden rounded-lg border border-border bg-muted/40",
  header: "flex items-center justify-between gap-2 border-b border-border px-3 py-2",
  label: "text-xs font-medium text-muted-foreground",
  copyBtn: "rounded px-2 py-0.5 text-xs text-primary hover:bg-muted cursor-pointer " + focusRing,
  pre: "overflow-x-auto p-3 font-mono text-xs leading-relaxed",
};

/* ---------- Page shell ---------- */

export const page =
  "mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:gap-6 sm:px-6 sm:py-12 lg:py-16";

export const hero = {
  wrap: "flex flex-col items-center gap-5 pb-2 text-center sm:gap-6 sm:pb-4",
  pill: "inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm",
  title: "text-balance text-3xl font-bold tracking-tight sm:text-5xl",
  gradient:
    "bg-linear-to-r from-primary to-accent bg-clip-text text-transparent text-shadow-sm",
  lead: "max-w-lg text-balance text-sm text-muted-foreground sm:text-base",
  inlineCode: "rounded bg-secondary px-1.5 py-0.5 text-[0.85em]",
  nav: "grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3",
  pillDot: "size-2 shrink-0 rounded-full bg-success",
};

export const controls = {
  segmentWrap: "flex w-full gap-1 rounded-lg border border-border bg-muted p-1 sm:w-auto",
  divider: "border-border",
};

export const previewWindow = {
  section: "overflow-hidden rounded-xl border shadow-md",
  bar: "flex items-center gap-2 border-b px-4 py-3",
  dot: "size-2.5 rounded-full",
  body: "grid gap-5 bg-card p-4 sm:p-6 md:grid-cols-[1fr_auto] md:items-center",
  swatch: "size-4 shrink-0 rounded-full border-2 border-border",
};

export const colorsGrid =
  "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

export const colorButton =
  "flex w-full min-w-0 items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted cursor-pointer " +
  focusRing;

export const footer =
  "mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground";

export const scoped = {
  inner: "rounded-lg border border-border bg-primary p-4 text-primary-foreground sm:p-5",
  button: btnBase + " shrink-0 bg-primary-foreground text-primary hover:opacity-90",
};

/** Aggregate export so template frameworks can destructure one object. */
export const ui = {
  focusRing,
  btnBase,
  btnPrimary,
  btnOutline,
  chip,
  segment,
  card,
  sectionHeading,
  controlGroup,
  snippet,
  page,
  hero,
  controls,
  previewWindow,
  colorsGrid,
  colorButton,
  footer,
  scoped,
};
