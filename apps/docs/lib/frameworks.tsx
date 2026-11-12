import { type ReactElement } from "react";
import { Icon } from "@iconify/react";

const icons = {
  react: <Icon icon="devicon:react" width={24} height={24} />,
  next: <Icon icon="devicon:nextjs" width={24} height={24} />,
  vue: <Icon icon="devicon:vuejs" width={24} height={24} />,
  svelte: <Icon icon="devicon:svelte" width={24} height={24} />,
  solid: <Icon icon="devicon:solidjs" width={24} height={24} />,
  angular: <Icon icon="devicon:angular" width={24} height={24} />,
  web: <Icon icon="simple-icons:webcomponentsdotorg" width={24} height={24} />,
  tailwind: <Icon icon="devicon:tailwindcss" width={24} height={24} />,
  astro: <Icon icon="simple-icons:astro" width={24} height={24} />,
  nuxt: <Icon icon="devicon:nuxtjs" width={24} height={24} />,
  remix: <Icon icon="simple-icons:remix" width={24} height={24} />,
  reactRouter: <Icon icon="simple-icons:reactrouter" width={24} height={24} />,
};

export type FrameworkFeature = {
  name: string;
  desc: string;
};

export type FrameworkGroup = {
  label: string;
  features: FrameworkFeature[];
};

export type FrameworkSnippet = {
  title: string;
  lang: string;
  code: string;
  /**
   * One sentence describing what to notice in the block.
   *
   * Used by the guide's second examples section, where a snippet appears
   * without without a step around it. A filename is not an explanation: `index.html`
   * and `App.tsx` appear three times each across the guides, and the reader has
   * no way to tell from the name which part of the contract they are looking at.
   */
  caption?: string;
  /**
   * Hand-authored JavaScript alternative, for snippets whose TypeScript cannot
   * be mechanically converted — `defineProps<T>()` with no runtime argument,
   * for example. When present, the pipeline uses it instead of deriving.
   */
  js?: string;
  /** File name for the JavaScript variant, when it differs from the mapped one. */
  jsFilename?: string;
};

/**
 * The snippet slots a setup step may point at, by name.
 *
 * A step references the framework entry's own snippets instead of restating
 * them, so a snippet the Quick Start page also renders has exactly one
 * definition — the two pages cannot drift apart.
 */
export type SnippetSlot =
  | "quickStart"
  | "quickStartExtra"
  | "setupExtra"
  | "noTheme"
  | "uiExample"
  | "snippet"
  | "snippet2"
  | "snippet3"
  | "snippet4"
  | "snippet6"
  | "snippet7"
  | "snippet8"
  | "snippet9"
  | "switchSnippet"
  | "reactSetup"
  | "styles";

/**
 * One labelled step inside a setup path — "Install", "Configure", "Use Theme
 * Kit". The steps are the part that genuinely differs between two application
 * shapes; everything below the paths is shared and explained once.
 */
export type SetupStep = {
  /** Step label, rendered as the step heading. */
  label: string;
  /** One-line description of what the step does. */
  desc: string;
  /**
   * Render an install command here instead of a code snippet.
   *
   * `"base"` is the framework's own packages. `"renderer"` adds the client
   * renderer the second path needs, so the command the reader copies is
   * complete for the path they chose — the reader should never have to infer an
   * extra package from prose.
   */
  install?: "base" | "renderer";
  /** Snippets the framework entry already defines, resolved by slot name. */
  refs?: SnippetSlot[];
  /** Snippets that exist only in this guide, declared inline. */
  snippets?: FrameworkSnippet[];
  /** Optional callout shown under the snippets. */
  note?: string;
};

/**
 * One onboarding step on a single-setup framework's guide.
 *
 * These live on the framework entry rather than in the page template because
 * the steps are not the same task in every framework. "Wrap the app in the
 * provider" is the right instruction for React and wrong for Angular (which
 * registers providers at bootstrap), for Tailwind (which has no provider at
 * all) and for Web Components (where the provider is an element in the markup).
 * A shared template can only be accurate for the frameworks it was written for.
 *
 * The steps stay one shape — install, set up, use, style — because that is the
 * order the work actually happens in. Only the wording is per-framework.
 */
export type GuideStep = {
  /** Heading text. The page prepends the step number. */
  label: string;
  /** One or two sentences: what this step does *here*, not in general. */
  desc: string;
  /** Render the install command instead of a snippet. */
  install?: boolean;
  /** Snippet slot shown under the description. */
  ref?: SnippetSlot;
  /** A second file, shown under the first. */
  refExtra?: SnippetSlot;
  /**
   * Callout under the snippets, resolved from the entry's own fields so the
   * guide and Quick Start cannot describe the same thing differently:
   * `"mode"` → `modeNote`, `"styles"` → {@link CANONICAL_STYLES_NOTE}.
   */
  note?: "mode" | "styles";
};

/**
 * One of the supported shapes of a Themvora app in this framework.
 *
 * Only frameworks whose integration genuinely supports more than one shape
 * declare these. Astro is the first: the distinction is whether the app ships a
 * client framework runtime at all, which changes the imports and the config —
 * and nothing else.
 */
export type SetupPath = {
  /** In-page anchor id, e.g. `astro-only`. Must be a stable, hand-written id. */
  id: string;
  /** Display name, e.g. "Astro-only". */
  name: string;
  /** Short badge on the choice card, e.g. "No React runtime". */
  badge: string;
  /** One-line summary for the choice card. */
  summary: string;
  /** "Use this when …" sentence — describes the shape, recommends nothing. */
  useWhen: string;
  /** The path's own steps. */
  steps: SetupStep[];
};

/** A concept that behaves identically in every path, explained once. */
export type SharedBehaviorSection = {
  /** Anchor id, e.g. `shared-readouts`. */
  id: string;
  title: string;
  /** Prose; `` `backticks` `` render as inline code. */
  body: string;
};

/** The "Choose your setup" decision block. */
export type SetupChoice = {
  title: string;
  intro: string;
  /** Exactly two paths, rendered as two visually distinct choices. */
  paths: [SetupPath, SetupPath];
  /** Column labels for the comparison table. */
  columns: [string, string];
  /**
   * "Which one should I use?" — describes the distinction rather than
   * recommending a path, because the right answer is a property of the app.
   */
  decision: { title: string; lines: string[] };
  /** Only the rows that differ, or that are explicitly shared. */
  comparison: { area: string; a: string; b: string }[];
};

/** A complete runnable example app that backs one of the paths. */
export type SetupExample = {
  label: string;
  /** Path inside the repo, e.g. `examples/apps/astro`. */
  path: string;
  note: string;
};

/**
 * A framework guide with more than one supported application shape.
 *
 * `lib/frameworks.tsx` stays the single source for the guide's snippets — this
 * field adds the *structure* the page renders: the two paths, the steps each
 * one contains, and the shared sections below them. The guide deliberately does
 * not duplicate the shared concepts into both paths.
 */
export type FrameworkSetupGuide = {
  /** Opening paragraphs, in order. `` `backticks` `` render as inline code. */
  overview: string[];
  choose: SetupChoice;
  /** Concepts explained once, after both paths. */
  shared: { title: string; intro: string; sections: SharedBehaviorSection[] };
  /** The runnable examples behind the paths. */
  examples: { title: string; intro: string; apps: SetupExample[] };
  /**
   * The client/server boundary the second path introduces, drawn as text so the
   * reader can see that React APIs are not reachable from `.astro` directly.
   */
  boundary: string;
  /** Intro copy for the caveats section. */
  caveatsIntro: string;
};

export type FrameworkItem = {
  slug: string;
  name: string;
  icon: ReactElement;
  pkg: string;
  tagline: string;
  mark: string;
  tags: string[];
  /**
   * True when this entry is a second integration for a framework that already
   * has a guide — React Router Framework Mode under Remix.
   *
   * Nested entries keep their own page and examples, but they are not a
   * separate framework: they never appear in a picker or a card list, and
   * {@link frameworks} filters them out.
   */
  nested?: boolean;
  /**
   * The guide's own route, when it is not `/framework-guides/<slug>`.
   *
   * React Router lives under its parent framework, so its page is
   * `/framework-guides/remix/react-router`.
   */
  path?: string;
  /**
   * A second install command, for a project that does not have the framework
   * yet. Kept separate from the primary command so the guide never presents
   * framework packages as Themvora requirements.
   */
  prerequisiteInstall?: { label: string; packages: string[] };
  /**
   * Overrides the "Project" prerequisite line.
   *
   * The default reads "A <name> project", which is fine for a framework and
   * meaningless for Web Components — there is no project type to create. The
   * override names the actual starting point, so a reader who has never used
   * the package knows what to have on disk before step 1.
   */
  projectPrerequisite?: string;
  groups: FrameworkGroup[];
  quickStart: FrameworkSnippet;
  /**
   * A second file the setup needs, shown as its own block. One file per block:
   * a single block holding two files cannot carry two filenames, so a reader
   * cannot tell where one ends and the next begins.
   */
  quickStartExtra?: FrameworkSnippet;
  /**
   * Quick Start, step 5 — the toggle that reads and writes the runtime. The
   * shared card from step 3 repaints when this changes the active theme; a
   * cssOnly integration leaves step 5 out because it has no runtime of its own.
   */
  snippet: FrameworkSnippet;
  snippet2: FrameworkSnippet;
  snippet3?: FrameworkSnippet;
  /**
   * A further example, shown after `snippet3` in "More Examples". For API that
   * deserves its own block rather than another feature bullet — Astro's
   * `getThemeController()` surface, where the `getMode` / `getResolvedMode`
   * distinction is the whole point and prose alone loses it.
   */
  snippet4?: FrameworkSnippet;
  /**
   * A further example, shown after `snippet4`. Astro only today: toggling the
   * theme with no `<ThemeToggle />` at all.
   *
   * `snippet4` documents the `getThemeController()` surface; this shows the
   * page that uses it, because an API listing does not tell a reader where the
   * `<script>` goes or that it replaces the component rather than joining it.
   */
  snippet6?: FrameworkSnippet;
  /**
   * A further example, shown after `snippet6`. Astro only today: a settings
   * page that renders the family and mode controls with no script of its own.
   *
   * `snippet6` shows the runtime reached from a plain `<script>`; this shows the
   * other half of the same contract — the `<select>` elements, which are driven
   * by the delegated `data-tv-select` attribute rather than by per-element
   * listeners, so they keep working across a `<ClientRouter />` navigation.
   */
  snippet7?: FrameworkSnippet;
  /**
   * A further example, shown after `snippet7`. Astro only today: a page whose
   * subtree is pinned to one theme.
   *
   * The scoped panel is resolved in the frontmatter, so the server markup is
   * already correct — this is the counterpart to the runtime-driven examples,
   * which only settle once a script has run.
   */
  snippet8?: FrameworkSnippet;
  /**
   * A further example, shown after `snippet8`. Astro only today: the layout
   * that adds `<ClientRouter />` for client-side navigation.
   *
   * It is a layout rather than a page because `<ClientRouter />` belongs in
   * `<head>`, and it is the one example where the runtime has to survive a
   * navigation that never re-executes a module `<script>`.
   */
  snippet9?: FrameworkSnippet;
  noTheme: FrameworkSnippet;
  /**
   * Quick Start, step 2 — an extra file the minimal setup needs, shown after
   * `noTheme`. `web` uses it for the entry module the built page loads; Vue and
   * Svelte use it for the Vite entry that mounts the app and imports the
   * stylesheet.
   *
   * Astro is deliberately not one of them. Its setup is three files, and its
   * Quick Start renders them from the entry's own slots (`quickStart`,
   * `noTheme`, `snippet`) so there is exactly one definition of
   * `theme.config.ts`, `astro.config.mjs` and the layout — a Quick-Start-only
   * copy is how the two pages drifted before.
   */
  setupExtra?: FrameworkSnippet;
  /**
   * Quick Start, step 5 — the switcher, when `snippet` is not one. A cssOnly
   * integration has no runtime step, so its runtime snippet appears under
   * "Further examples" instead.
   */
  switchSnippet?: FrameworkSnippet;
  /**
   * Astro + React only — the integration config with the React renderer
   * registered (`react()` next to `themvora()`).
   *
   * This is a slot rather than a guide-only inline snippet because two surfaces
   * render it: the guide's React path and the Quick Start page's React shape.
   * One definition means the two cannot disagree about what the React path
   * registers.
   */
  reactSetup?: FrameworkSnippet;
  /**
   * The canonical, token-driven stylesheet this framework's styling step shows.
   *
   * Every entry points at {@link CANONICAL_STYLES} — one definition, eleven
   * frameworks — so the framework snippets teach *integration* while the
   * stylesheet teaches *Themvora itself*. Only the file name differs, because
   * the conventional place for global CSS genuinely differs per framework.
   *
   * A slot rather than a page-local snippet because two surfaces render it (the
   * Quick Start page and the framework guide), and because Astro's layout
   * imports it by path: the copy-paste contract requires the file an import
   * names to be declared in the same bundle.
   */
  styles: FrameworkSnippet;
  /**
   * The guide's onboarding steps, in the order the work happens.
   *
   * Rendered by the framework guide and, for the first two, by Quick Start — so
   * the two pages cannot tell a reader to do different things. A framework with
   * more than one application shape (Astro) describes its steps in
   * {@link FrameworkSetupGuide} instead, because its onboarding is a choice
   * before it is a sequence.
   */
  guideSteps?: GuideStep[];
  /**
   * The heading and lead-in for the guide's second examples section.
   *
   * The snippets it shows differ per framework — a scoped panel, a history
   * panel, a pre-paint build script, a token map — so a shared heading cannot
   * describe them. Naming what follows is the difference between a section and
   * a pile of code blocks.
   */
  moreExamples?: { title: string; intro: string };
  /**
   * The framework's own markup for the small themed UI both Quick Start and the
   * guide render.
   *
   * One shared stylesheet, eleven pieces of markup: the point of the example is
   * that the *styling* is portable, so the CSS is identical everywhere and only
   * the attribute convention changes (`className` in JSX, `class` in a Vue or
   * Astro template, utilities in Tailwind). Written as a literal rather than
   * imported because the guide generator evaluates this array as JavaScript.
   *
   * @see {@link EXAMPLE_CSS} in `lib/example-ui.ts`
   */
  uiExample?: FrameworkSnippet;
  /**
   * Web Components only — the Vite integration and the `theme.config.ts`
   * registry, shown before the page markup in step 2.
   *
   * Both are setup, not examples: without the plugin the page paints unstyled
   * first, and without the registry the provider has no catalog to read.
   */
  buildConfig?: FrameworkSnippet;
  themeConfig?: FrameworkSnippet;
  /**
   * Nuxt only — the file that mounts the switcher and the card.
   *
   * Nuxt auto-registers components, so the step is not "write a component" but
   * "render it from `app/app.vue`"; a reader who skips it sees nothing.
   */
  appFile?: FrameworkSnippet;
  /**
   * The framework guide's own first-success path — install, set up, add a
   * toggle, run. `noTheme` and `snippet` supply the two code steps; these three
   * fields supply the rest, so a reader never has to leave the page to get one
   * working theme.
   */
  /** Whether this exact setup is flash-free, and what it takes if not. */
  zeroFlashNote: string;
  /** Quick Start, step 2 — how the starting theme and mode are chosen here. */
  modeNote: string;
  /** Quick Start, step 2 — where this framework's theme configuration lives. */
  configNote: string;
  /** Extra packages the minimal setup needs beyond `@themvora/core` + `pkg`. */
  extraPackages?: string[];
  featureCount: number;
  /**
   * True for CSS-only integrations (Tailwind, UnoCSS). They have no provider to
   * mount and no runtime of their own — they expose tokens as utilities — so
   * `FrameworkPicker` leaves them out of its "which framework are you using?"
   * list. Quick Start still offers them, because that tab is a complete setup:
   * it installs a runtime adapter alongside the CSS.
   */
  cssOnly?: boolean;
  /**
   * Present only when this framework supports more than one application shape.
   * Astro is the first: an Astro-native app and an Astro + React island app are
   * different enough that the reader has to pick before the install step, so the
   * guide presents the choice up front and explains the shared half once.
   *
   * @see {@link FrameworkSetupGuide}
   */
  setupGuide?: FrameworkSetupGuide;
};

type RawFramework = Omit<FrameworkItem, "featureCount">;

/**
 * The canonical, token-driven stylesheet — the shared visual thread.
 *
 * Every framework's Quick Start and framework guide renders *this* stylesheet
 * from *this* definition: one stylesheet, eleven frameworks. That is the whole
 * point of keeping it apart from the integration code. The framework-specific
 * snippets teach how to wire Themvora into a given framework; this file teaches
 * Themvora itself, so a reader moving from React to Svelte to Astro meets the
 * same styling model rather than three near-identical CSS files that quietly
 * disagree.
 *
 * ## The required-token contract
 *
 * The document rule (`html, body`) contains exactly the two foundational
 * colours — `background` and `foreground`. The component rules read only colour
 * keys that `validateTheme()` requires (`REQUIRED_COLOR_KEYS` in
 * `packages/core/src/validate-theme.ts`), so any theme that passes validation
 * emits every variable these rules use.
 *
 * Nothing here requires a typography, spacing, shadow or radius token: those
 * groups are optional, so a valid hand-written theme may emit none of them.
 * Typography is ordinary CSS (the font is inherited, the line height is a plain
 * value), and spacing is plain padding and margins. The two optional tokens
 * that improve the look — `radius.lg` and `shadows.sm` — are read through
 * `var(…, fallback)`, so a theme without them still lays out correctly. The
 * button deliberately does not read `--theme-radius-md`: `radius.md` is not
 * part of what a valid theme must define, so the smaller step is derived from
 * the guaranteed `--theme-radius-lg` with `calc()`, the same proportion the
 * utility-class mapping uses.
 *
 * ## Variable names
 *
 * Every custom property below is one the runtime actually emits. The names are
 * derived from the implementation, not written by hand:
 * `themeToCSSVariables()` (`packages/core/src/css.ts`) appends each token key to
 * its group prefix **verbatim**, with two consequences worth knowing before
 * editing this block:
 *
 *   - colour keys stay camelCase on purpose — the real property is
 *     `--theme-color-cardForeground`, not `--theme-color-card-foreground`;
 *   - two group prefixes are singular — `--theme-shadow-md` and
 *     `--theme-breakpoint-lg`, not `--theme-shadows-*` / `--theme-breakpoints-*`.
 *
 * The built-in neutral themes (the provider's fallback when no `theme.config.ts`
 * is discoverable) define the full token set, so every property here resolves
 * with no configuration at all. `npm run probe:guide-first-success` re-derives
 * this list from the shipped emitter and asserts each name exists — a renamed
 * token fails the probe instead of silently falling back to an inherited value.
 *
 * Deliberately small: it demonstrates the chain
 * theme → token → CSS variable → UI, and is not a design system.
 */
export const CANONICAL_STYLES = `/* Themvora emits its design tokens as CSS custom properties on the root
   element, so a stylesheet only has to read them. Nothing here is
   theme-specific. */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.themvora-example-card {
  display: grid;
  gap: 10px;
  max-width: 22rem;
  padding: 16px;
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  font-family: inherit;
  line-height: 1.5;
  box-shadow: var(--theme-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.06));
}

.themvora-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.themvora-example-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.themvora-example-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-color-success);
}

.themvora-example-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}

.themvora-example-description {
  margin: 0;
  font-size: 13px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-meta {
  margin: 0;
  font-size: 12px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-button {
  justify-self: start;
  padding: 8px 14px;
  border: 0;
  /* Presets and generated themes emit --theme-radius-lg and nothing else on
     the radius scale, so the smaller step is derived from it rather than
     assumed — the same proportion the utility-class mapping uses. */
  border-radius: calc(var(--theme-radius-lg, 12px) * 0.8);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.themvora-example-button:hover {
  filter: brightness(1.08);
}

.themvora-example-button:focus-visible {
  outline: 2px solid var(--theme-color-ring);
  outline-offset: 2px;
}`;

/**
 * The one-line explanation that accompanies {@link CANONICAL_STYLES}.
 *
 * Kept next to the stylesheet so the two cannot drift: every surface that
 * renders the stylesheet renders this sentence, and none of them writes its own.
 */
export const CANONICAL_STYLES_NOTE =
  "`.themvora-example-card` and its children read Themvora tokens, so switching the active theme repaints them — no re-render, and no per-theme CSS.";

/**
 * The step that introduces {@link CANONICAL_STYLES}, shared by Quick Start and
 * the framework guides so the two pages cannot describe it differently.
 *
 * Deliberately a plain object and not `as const`: `generate-framework-guides.mjs`
 * lifts this declaration verbatim into the scope it evaluates `rawFrameworks` in,
 * so it has to be valid JavaScript as written.
 */
export const CANONICAL_STYLES_STEP = {
  label: "Style it with Themvora tokens",
  desc: "Your own classes read the variables the active theme emits, so there is no per-theme CSS to write and nothing to re-render on a switch.",
};

export const rawFrameworks: RawFramework[] = [
  {
    slug: "react",
    name: "React",
    icon: icons.react,
    pkg: "@themvora/react",
    uiExample: {
      title: "src/components/WorkspaceCard.tsx",
      lang: "tsx",
      code: `export function WorkspaceCard() {
  return (
    <div className="themvora-example-card">
      <div className="themvora-example-header">
        <h3 className="themvora-example-title">Design system</h3>
        <span className="themvora-example-status">Active</span>
      </div>
      <p className="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p className="themvora-example-meta">Updated 2 minutes ago</p>
      <button className="themvora-example-button" type="button">View themes</button>
    </div>
  );
}`,
    },
    tagline:
      "Provider and hooks for React, with scoped themes, transitions, and an optional build-time bootstrap.",
    mark: "R",
    tags: ["SPA", "Vite", "Context"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "ThemeProvider",
            desc: "Creates a runtime, wires DOM + CSS-variable bindings, and provides it via context. Accepts every ThemeRuntimeOptions prop.",
          },
          {
            name: "Runtime injection",
            desc: "Pass `runtime` to share an existing instance, or `initial` to seed the server-resolved selection for hydration.",
          },
          {
            name: "scheduled prop",
            desc: "Switches between `lightTheme` and `darkTheme` at each visitor's local sunrise and sunset. Latitude/longitude are optional — the location comes from the browser timezone unless you pin `timeZone`.",
          },
        ],
      },
      {
        label: "Root bootstrap",
        features: [
          {
            name: "createThemeRoot()",
            desc: "Optional client-only root bootstrap that lets Themvora control the initial React root commit when synchronous first-commit behavior is required.",
          },
          {
            name: "Standard createRoot()",
            desc: "Use the normal React root API when no special first-commit optimization is needed.",
          },
        ],
      },
      {
        label: "Hooks",
        features: [
          {
            name: "useTheme()",
            desc: "Returns `{ theme, mode, effectiveMode, family, setMode, setFamily, toggleTheme }`.",
          },
          {
            name: "useThemeValue() / useThemeTokens()",
            desc: "The active theme definition, and the active theme tokens.",
          },
          {
            name: "useThemeMode() / useThemeFamily()",
            desc: "Granular reads for the current mode and family.",
          },
          {
            name: "useEffectiveThemeMode()",
            desc: "The mode actually applied — `light` or `dark`, never `system`. This is what a label or icon showing the current appearance must render: it follows a sunrise/sunset transition, while `useThemeMode()` keeps reporting what the visitor asked for.",
          },
          {
            name: "useSetThemeMode() / useSetThemeFamily()",
            desc: "Granular setters — set mode or family independently.",
          },
          {
            name: "useToggleTheme()",
            desc: "Toggle function for light/dark.",
          },
          {
            name: "useThemeRuntime()",
            desc: "Access the full runtime: registry, history, lifecycle, plugins.",
          },
          {
            name: "useThemeHistory()",
            desc: "`{ undo, redo, canUndo, canRedo, clear }`.",
          },
          {
            name: "useThemeBatch()",
            desc: "Wrap `runtime.batch()` for atomic, coalesced updates.",
          },
          {
            name: "useThemeSnapshot() / useThemeRestore()",
            desc: "Serialize and restore the full runtime state.",
          },
          {
            name: "useThemeTimeTravel()",
            desc: "`{ history, jump }` — indexed navigation through time.",
          },
          {
            name: "useThemeLifecycle()",
            desc: "Subscribe to typed lifecycle events (`beforeThemeChange`, `afterPersist`, ...).",
          },
          {
            name: "useThemePacks()",
            desc: "Install a theme pack at runtime via `runtime.use()`.",
          },
          {
            name: "useThemeSchedule()",
            desc: "Reactive sunrise/sunset controller: `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition` plus `enable()`/`disable()`/`set()`. Returns `null` when the provider has no `scheduled` option.",
          },
        ],
      },
      {
        label: "Components",
        features: [
          {
            name: "ThemeScope",
            desc: "Apply a specific theme to a subtree; emits scoped CSS vars plus Tailwind-compatible `--color-*` / `--radius-*` variables.",
          },
          {
            name: "ThemeModeButton",
            desc: "One-click light → dark → system cycle button.",
          },
          {
            name: "ThemeInspector",
            desc: "Floating dev panel: active theme, selection, flattened tokens, generated CSS variables.",
          },
          {
            name: "useScopedTheme(ref, themeName)",
            desc: "Imperative scoping for any element ref.",
          },
          {
            name: "useThemePacks()",
            desc: "Install a theme pack at runtime via `runtime.use()`.",
          },
        ],
      },
      {
        label: "Library adapters",
        features: [
          {
            name: "createMuiAdapter() / createChakraAdapter()",
            desc: "Maps Themvora semantic tokens into native generated themes while preserving the framework-neutral runtime contract.",
          },
          {
            name: "createAntdAdapter() / createMuiAdapter() / createChakraAdapter()",
            desc: "Rebuilds the library theme from the active Themvora theme and exposes a reactive snapshot/subscribe bridge for React providers.",
          },
          {
            name: "MantineThemeProvider + createMantineTheme()",
            desc: "Mantine's generated-theme bridge: `createMantineTheme(runtime)` rebuilds the native Mantine theme from Themvora tokens, and `MantineThemeProvider` forces the color scheme to match the active mode.",
          },
          {
            name: "CSS-variable adapters",
            desc: "Shadcn, Bootstrap, DaisyUI, and Open Props adapters can be registered directly with the runtime; their factories do not require React.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition prop",
            desc: "Transitions are enabled by default (300ms, smooth). Pass `transition` to tune duration/easing/preset/properties, or `transition={{ enabled: false }}` to disable.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Per-update escape hatch: `runtime.store.set(theme, { suppressTransition: true })` skips the configured animation for a single switch. For custom animation orchestration, compose the core diff/plan/runner APIs.",
          },
        ],
      },
    ],
    quickStart: {
      title: "src/main.tsx",
      lang: "tsx",
      code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    defaultTheme="mint-light"
    initialMode="system"
    transition={{ enabled: true, duration: 250 }}
  >
    <App />
  </ThemeProvider>,
);`,
    },
    setupExtra: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `// Application UI only; the provider lives in src/main.tsx.
import { ThemeSwitcher } from "./ThemeSwitcher";
import { WorkspaceCard } from "./components/WorkspaceCard";

export function App() {
  return (
    <main>
      <ThemeSwitcher />
      <WorkspaceCard />
    </main>
  );
}`,
    },
    snippet: {
      title: "src/ThemeSwitcher.tsx",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/react";

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      Theme: {theme.name} — toggle
    </button>
  );
}`,
    },
    snippet2: {
      title: "src/components/ThemeScopePanel.tsx",
      caption: "A `plum-dark` panel inside a `mint-light` app, with undo and redo wired to the history the provider keeps. The provider already lives in `src/main.tsx`, so this component only consumes it.",
      lang: "tsx",
      code: `import { ThemeScope, useThemeHistory } from "@themvora/react";

function HistoryControls() {
  const { undo, redo, canUndo, canRedo } = useThemeHistory();
  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}

export function ThemeScopePanel() {
  return (
    <>
      {/* Pinned to plum-dark regardless of the app-wide selection. */}
      <ThemeScope theme="plum-dark" transition={{ duration: 300, easing: "ease" }}>
        <p>This subtree is always plum-dark.</p>
      </ThemeScope>
      <HistoryControls />
    </>
  );
}`,
    },
    snippet3: {
      title: "src/main.tsx — optimized CSR bootstrap",
      lang: "tsx",
      code: `import { createThemeRoot } from "@themvora/react";
import "@themvora/core/scrollbar.css";
import { App } from "./App";

createThemeRoot({
  container: document.getElementById("root")!,
  defaultTheme: "mint-light",
  initialMode: "system",
  transition: { enabled: true },
  render: () => <App />,
});`,
    },
    zeroFlashNote:
      "Included. `ThemeProvider` injects a blocking script into `<head>` before the first paint, so a returning visitor sees their saved theme immediately. For an SSR app, inline it yourself with `createThemeBootstrapScript()`.",
    modeNote:
      "`defaultTheme` chooses the starting theme. Add `initialMode=\"system\"` to follow the visitor's OS on the first visit.",
    configNote:
      "Themes and the starting mode come from the provider props. That is the whole setup, with or without a build tool. If you do build with Vite, you can declare them once in `theme.config.ts` instead and let `themvoraVitePlugin()` derive the pre-paint bootstrap from the same file — the provider then takes no theme props. The plugin is optional either way.",
    styles: {
      title: "src/index.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package. It brings the runtime, the hooks and the components, and nothing else in your dependency tree changes.",
        install: true,
      },
      {
        label: "Set up",
        desc: "`createRoot()` renders your app inside `ThemeProvider`. The provider is what creates the runtime, so mounting it once at the entry point covers every component below it.",
        ref: "noTheme",
        refExtra: "setupExtra",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. The class names are ordinary CSS — the next step connects them to the theme.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The toggle reads and writes the runtime. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "A scoped panel, and the history behind it",
      intro: "`ThemeScope` applies a theme to one subtree, and `useThemeHistory()` drives undo and redo. Both are local to the app — neither changes what the rest of the page renders.",
    },
    noTheme: {
      title: "src/main.tsx",
      lang: "tsx",
      code: `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" initialMode="system">
    <App />
  </ThemeProvider>,
);`,
    },
  },
  {
    slug: "next",
    name: "Next.js",
    icon: icons.next,
    pkg: "@themvora/next",
    uiExample: {
      title: "app/workspace-card.tsx",
      lang: "tsx",
      code: `export function WorkspaceCard() {
  return (
    <div className="themvora-example-card">
      <div className="themvora-example-header">
        <h3 className="themvora-example-title">Design system</h3>
        <span className="themvora-example-status">Active</span>
      </div>
      <p className="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p className="themvora-example-meta">Updated 2 minutes ago</p>
      <button className="themvora-example-button" type="button">View themes</button>
    </div>
  );
}`,
    },
    tagline:
      "App Router theming with server-resolved themes, cookie persistence, and zero-flash.",
    mark: "N",
    tags: ["SSR", "RSC", "Zero-flash"],
    groups: [
      {
        label: "Server",
        features: [
          {
            name: "ThemeProvider (Server Component)",
            desc: "Reads `theme-mode`, `theme-family`, `theme-fingerprint` cookies, validates the fingerprint, resolves the initial theme, and renders `<html data-theme>` with inline CSS variables before hydration.",
          },
          {
            name: "Blocking bootstrap script",
            desc: "Emits a blocking script in `<head>` that applies the persisted theme before first paint.",
          },
          {
            name: "Dark-mode CSS fallback",
            desc: "Emits `@media (prefers-color-scheme: dark)` styles when the persisted mode is `system`.",
          },
          {
            name: "scheduled prop",
            desc: "Pass `scheduled={{ lightTheme, darkTheme }}` to the server ThemeProvider to enable sunrise/sunset switching app-wide. Coordinates are optional — each visitor's timezone is auto-detected on the client.",
          },
        ],
      },
      {
        label: "Client",
        features: [
          {
            name: "@themvora/next/client",
            desc: "The client entry point. Exports ClientThemeProvider, ThemeBootstrap, createNextThemePersistence, every React hook, and ThemeScope / ThemeInspector / ThemeModeButton.",
          },
          {
            name: "ClientThemeProvider",
            desc: "Runtime for client components that need theme state. Mounts the runtime, syncs the `.dark` class, and persists the selection.",
          },
          {
            name: "ThemeBootstrap",
            desc: "Injects the SSR dark-mode CSS via `useServerInsertedHTML`.",
          },
          {
            name: "createNextThemePersistence()",
            desc: "Builds the adapter `ClientThemeProvider` uses: localStorage plus the `theme-mode`, `theme-family` and `theme-fingerprint` cookies the server reads on the next request.",
          },
          {
            name: "useThemeSchedule()",
            desc: "Reactive sunrise/sunset controller: `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition` plus `enable()`/`disable()`/`set()`.",
          },
          {
            name: "useProvidedThemes()",
            desc: "The families the server provider was given, as a client component sees them. Pair it with `useThemeFamily()` for the current selection and `useSetThemeFamily()` to change it — select by `entry.family`, not `entry.name`, because the name is only the display label.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition prop",
            desc: "Built-in runtime transition support. Configure duration/easing once on the provider; Themvora generates the transition styles at runtime, so applications do not need to maintain theme-transition rules in global CSS.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Per-update escape hatch from `@themvora/next/client`: call `runtime.store.set(theme, { suppressTransition: true })` when a switch must be instantaneous.",
          },
        ],
      },
      {
        label: "Scrollbar",
        features: [
          {
            name: "scrollbar prop",
            desc: "Enables Themvora's custom overlay scrollbar. The SSR bootstrap hides the native scrollbar before first paint, then the overlay engine synchronizes with browser scrolling without replacing native scroll behavior.",
          },
          {
            name: "scrollbar option",
            desc: "Configure the overlay appearance from semantic tokens, including an explicit color token when needed. The overlay remains theme-aware and updates with runtime theme changes.",
          },
        ],
      },
    ],
    quickStart: {
      title: "app/layout.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@themvora/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // ThemeProvider renders <html> and <body> itself — do not wrap it in them.
    <ThemeProvider
      defaultTheme="light"
      body={{ className: geist.className }}
    >
      <main>
        {children}
      </main>
    </ThemeProvider>
  );
}`,
    },
    snippet: {
      title: "app/theme-switcher.tsx",
      lang: "tsx",
      code: `"use client";
import { useTheme } from "@themvora/next/client";

export function ThemeSwitcher() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main
      style={{
        background: "var(--theme-color-background)",
        color: "var(--theme-color-foreground)",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button
        onClick={toggleTheme}
        style={{
          background: "var(--theme-color-primary)",
          color: "var(--theme-color-primaryForeground)",
          border: 0,
          borderRadius: "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        Toggle theme
      </button>

      <section
        style={{
          background: "var(--theme-color-card)",
          border: "1px solid var(--theme-color-border)",
          borderRadius: "0.75rem",
          marginTop: "1.5rem",
          padding: "1rem",
        }}
      >
        <h2>Themed card</h2>
        <p style={{ color: "var(--theme-color-mutedForeground)" }}>
          Surface, border and text follow the theme.
        </p>
      </section>
    </main>
  );
}`,
    },
    snippet2: {
      title: "app/dashboard.tsx",
      caption: "A dashboard segment pinned to one theme, alongside undo and redo for the page's selection.",
      lang: "tsx",
      code: `// Scoped theming + history controls
"use client";
import { ThemeScope, useThemeHistory } from "@themvora/next/client";

export function Dashboard() {
  const { undo, redo, canUndo, canRedo } = useThemeHistory();

  return (
    <div>
      <div>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>

      {/* Pinned to plum-dark, whatever the rest of the page is using. */}
      <ThemeScope theme="plum-dark">
        <p>This subtree is always plum-dark.</p>
      </ThemeScope>
    </div>
  );
}`,
    },
    zeroFlashNote:
      "Included. `ThemeProvider` resolves the first paint on the server and renders the pre-paint script into `<head>` itself. There is no bundler plugin to add.",
    modeNote:
      "The server resolves the mode from the persisted cookies, so a first-time visitor starts on `defaultTheme`. Once they pick System, that choice is stored and reused on every later request.",
    configNote:
      "Themes and the starting mode come from the provider in `app/layout.tsx`. Next does not use Vite, so there is no bundler plugin to add: the provider resolves the selection on the server and emits the pre-paint script itself.",
    styles: {
      title: "app/globals.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "`@themvora/next` is the server entry; its client half ships from the same package under `/client`.",
        install: true,
      },
      {
        label: "Set up",
        desc: "The `ThemeProvider` in `@themvora/next` is a server component. It reads the theme cookies during the request and renders `<html data-theme>` — and `<body>` — itself, with the resolved variables already inline. Do not wrap it in `<html>` or `<body>`; the provider owns both elements, which is what makes the first byte correct.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. In the App Router it is an ordinary component under `app/`; the classes are styled in the next step.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The client toggle reads and writes the runtime. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "Scoped theming inside a route",
      intro: "The root layout sets the app-wide theme from the cookies. A client component can scope a different one for part of the tree without touching that selection.",
    },
    noTheme: {
      title: "app/layout.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@themvora/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // ThemeProvider renders <html> and <body> itself — do not wrap it in them.
    <ThemeProvider
      defaultTheme="light"
      body={{ className: geist.className }}
    >
      <main>
        {children}
      </main>
    </ThemeProvider>
  );
}`,
    },
  },
  {
    slug: "vue",
    name: "Vue 3",
    icon: icons.vue,
    pkg: "@themvora/vue",
    uiExample: {
      title: "src/components/WorkspaceCard.vue",
      lang: "vue",
      code: `<template>
  <div class="themvora-example-card">
    <div class="themvora-example-header">
      <h3 class="themvora-example-title">Design system</h3>
      <span class="themvora-example-status">Active</span>
    </div>
    <p class="themvora-example-description">
      Tokens resolve at runtime, so this card follows whichever theme is active.
    </p>
    <p class="themvora-example-meta">Updated 2 minutes ago</p>
    <button class="themvora-example-button" type="button">View themes</button>
  </div>
</template>`,
    },
    tagline:
      "Provider and composables for Vue 3, with scoped themes.",
    mark: "V",
    tags: ["Composition API", "Provider"],
    groups: [
      {
        label: "Setup",
        features: [
          {
            name: "ThemeProvider",
            desc: "Provider component accepting every runtime option; auto-registered via `app.use` (`.install`).",
          },
          {
            name: "provideThemeRuntime() / useThemeRuntime()",
            desc: "Explicit provide/inject access to the runtime.",
          },
        ],
      },
      {
        label: "Composables",
        features: [
          {
            name: "useTheme()",
            desc: "Reactive refs for `theme`, `mode`, `effectiveMode`, `family` plus `setMode`, `setFamily`, `toggleTheme`.",
          },
          {
            name: "useEffectiveThemeMode()",
            desc: "A `Ref` of the mode actually applied (`light` or `dark`). Follows a sunrise/sunset transition; `useThemeMode()` keeps reporting the configured mode.",
          },
          {
            name: "useThemeHistory()",
            desc: "Undo / redo / jump through theme history.",
          },
          {
            name: "useThemeBatch()",
            desc: "Atomic, coalesced updates via `runtime.batch()`.",
          },
          {
            name: "useThemeSnapshot() / useThemeRestore()",
            desc: "Serialize and restore the full runtime state.",
          },
          {
            name: "useThemeLifecycle()",
            desc: "Subscribe to typed lifecycle events.",
          },
          {
            name: "useThemePacks()",
            desc: "Install theme packs at runtime.",
          },
          {
            name: "useThemeSchedule()",
            desc: "Reactive schedule state (a `Ref` with `enabled`, `status`, `sunrise`, `sunset`, `nextTransition`) plus `enable()`/`disable()`/`set()`. Configure via the `scheduled` prop on ThemeProvider.",
          },
        ],
      },
      {
        label: "Library adapters",
        features: [
          {
            name: "Adapter framework subpaths",
            desc: "CSS-variable adapters own their framework wrappers behind subpaths (`/react`, `/vue`, `/svelte`, `/solid`, `/angular`) with optional peers — they are not re-exported by the framework package.",
          },
          {
            name: "useShadcnTheme(runtime) / useBootstrapTheme(runtime)",
            desc: "Composables on each adapter's framework subpath install the React-free CSS-variable factory and dispose the returned handle with the component lifecycle. Pass the runtime from this framework's runtime getter.",
          },
          {
            name: "useDaisyTheme(runtime) / useOpenPropsTheme(runtime)",
            desc: "Same contract for DaisyUI and Open Props. The adapter subpath supplies lifecycle wiring while the factory stays framework-neutral.",
          },
          {
            name: "adapter factory subpaths",
            desc: "Use `@themvora/shadcn/factory`, `@themvora/bootstrap/factory`, `@themvora/daisyui/factory`, or `@themvora/open-props/factory` when you need the adapter without any framework.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition prop",
            desc: "Pass `transition` to ThemeProvider to enable CSS transitions on theme changes.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Applies the theme immediately, without animating. Use it for a one-off instant switch. The `transition` prop is live: change it after mount and the next theme change uses the new options (no reload, no remount). Compose the core diff/plan/runner APIs for custom animation.",
          },
        ],
      },
      {
        label: "Components",
        features: [
          {
            name: "ThemeScope",
            desc: "Scoped theming component for subtrees.",
          },
        ],
      },
    ],
    quickStart: {
      title: "src/App.vue",
      lang: "vue",
      code: `<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
</script>

<template>
  <!-- \`default-theme\` picks the theme. Add \`initial-mode="system"\` to follow
       the OS preference instead of the theme's own mode. -->
  <ThemeProvider default-theme="mint-light">
    <h1>Hello, themed world</h1>
  </ThemeProvider>
</template>`,
    },
    snippet: {
      title: "src/ThemeSwitcher.vue",
      lang: "vue",
      code: `<script setup lang="ts">
import { useTheme } from "@themvora/vue";
const { theme, mode, toggleTheme } = useTheme();
</script>

<template>
  <main class="page">
    <h1>Themvora</h1>
    <p>Current theme: {{ theme.name }} ({{ mode }})</p>

    <button class="primary" @click="toggleTheme">Toggle theme</button>

    <section class="card">
      <h2>Themed card</h2>
      <p class="muted">Surface, border and text follow the theme.</p>
    </section>
  </main>
</template>

<style scoped>
  .page {
    background: var(--theme-color-background);
    color: var(--theme-color-foreground);
    min-height: 100vh;
    padding: 2rem;
  }
  .primary {
    background: var(--theme-color-primary);
    color: var(--theme-color-primaryForeground);
    border: 0;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
  }
  .card {
    background: var(--theme-color-card);
    border: 1px solid var(--theme-color-border);
    border-radius: 0.75rem;
    margin-top: 1.5rem;
    padding: 1rem;
  }
  .muted {
    color: var(--theme-color-mutedForeground);
  }
</style>`,
    },
    snippet2: {
      title: "src/ThemeScopeExample.vue",
      caption: "A `plum-dark` panel with undo and redo. `canUndo` and `canRedo` are refs, so the buttons disable themselves as the history moves.",
      lang: "vue",
      code: `<script setup lang="ts">
// Import both explicitly — \`ThemeScope\` is only globally registered if your
// entry does \`app.use(ThemeScope)\`.
import { ThemeScope, useThemeHistory } from "@themvora/vue";
const { undo, redo, canUndo, canRedo } = useThemeHistory();
</script>

<template>
  <div>
    <button @click="undo" :disabled="!canUndo">Undo</button>
    <button @click="redo" :disabled="!canRedo">Redo</button>

    <ThemeScope theme="plum-dark">
      <p>This subtree is always plum-dark.</p>
    </ThemeScope>
  </div>
</template>`,
    },
    zeroFlashNote:
      "Included. `<ThemeProvider>` injects a blocking script into `<head>` before the first paint. For an SSR app, inline it with `createThemeBootstrapScript()` instead.",
    modeNote:
      "`default-theme` chooses the starting theme. Add `initial-mode=\"system\"` to follow the visitor's OS on the first visit.",
    configNote:
      "Themes and the starting mode come from the provider props. If you do build with Vite, you can declare them once in `theme.config.ts` instead and let `themvoraVitePlugin()` derive the pre-paint bootstrap from the same file — the provider then takes no theme props. The plugin is optional either way.",
    styles: {
      title: "src/index.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package, with the composables and the components in the same entry.",
        install: true,
      },
      {
        label: "Set up",
        desc: "`ThemeProvider` is a component with a default slot. Register it once in `App.vue`, or with `app.use()`, and every component below can call the composables.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. The classes are ordinary template `class` attributes — the next step connects them to the theme.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The toggle reads and writes the runtime. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "A scoped panel with history controls",
      intro: "`ThemeScope` is a component you place around a subtree. It reads the runtime from context, so the same composables that drive the page drive the scope.",
    },
    setupExtra: {
      title: "src/main.ts",
      lang: "ts",
      code: `// The Vite entry: mount the app and load the stylesheet once.
import { createApp } from "vue";
import "./index.css";
import App from "./App.vue";

createApp(App).mount("#app");`,
    },
    noTheme: {
      title: "src/App.vue",
      lang: "vue",
      code: `<!-- No theme definition needed -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
</script>

<!-- No \`themes\` prop → built-in neutral theme.
     default-theme picks the theme; initial-mode="system" is the opt-in for
     following the OS. The provider hands that mode to BOTH the pre-paint
     script it injects and the runtime, so the two cannot disagree. -->
<template>
  <ThemeProvider default-theme="light" initial-mode="system">
    <h1>Hello, themed world</h1>
  </ThemeProvider>
</template>`,
    },
  },
  {
    slug: "svelte",
    name: "Svelte 5",
    icon: icons.svelte,
    pkg: "@themvora/svelte",
    uiExample: {
      title: "src/lib/WorkspaceCard.svelte",
      lang: "svelte",
      code: `<div class="themvora-example-card">
  <div class="themvora-example-header">
    <h3 class="themvora-example-title">Design system</h3>
    <span class="themvora-example-status">Active</span>
  </div>
  <p class="themvora-example-description">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="themvora-example-meta">Updated 2 minutes ago</p>
  <button class="themvora-example-button" type="button">View themes</button>
</div>`,
    },
    tagline:
      "Provider and readable stores for Svelte 5, with scoped themes and transitions.",
    mark: "S",
    tags: ["Context", "Stores", "Runes"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "ThemeProvider",
            desc: "Context-based provider that wires DOM + CSS variable bindings.",
          },
          {
            name: "getThemeRuntime() / setThemeRuntime()",
            desc: "Context helpers for retrieving or overriding the runtime.",
          },
        ],
      },
      {
        label: "Stores",
        features: [
          {
            name: "useTheme()",
            desc: "Reactive readable stores for `theme`, `mode`, `effectiveMode`, `family` and their setters.",
          },
          {
            name: "useEffectiveThemeMode()",
            desc: "A readable store of the mode actually applied (`light` or `dark`). Follows a sunrise/sunset transition; `useThemeMode()` keeps reporting the configured mode.",
          },
          {
            name: "useThemeHistory()",
            desc: "Undo / redo / jump through theme history.",
          },
          {
            name: "useThemeBatch()",
            desc: "Atomic, coalesced updates.",
          },
          {
            name: "useThemeSnapshot() / useThemeRestore()",
            desc: "Serialize and restore runtime state.",
          },
          {
            name: "useThemeLifecycle()",
            desc: "Subscribe to lifecycle events.",
          },
          {
            name: "useThemePacks()",
            desc: "Install theme packs at runtime.",
          },
          {
            name: "useThemeSchedule() / getThemeSchedule()",
            desc: "Reactive readable store of the schedule state (`enabled`, `status`, `sunrise`, `sunset`, `nextTransition`) plus the imperative `ThemeSchedule` controller. Configure via the `scheduled` prop on ThemeProvider.",
          },
        ],
      },
      {
        label: "Library adapters",
        features: [
          {
            name: "Adapter framework subpaths",
            desc: "CSS-variable adapters own their framework wrappers behind subpaths (`/react`, `/vue`, `/svelte`, `/solid`, `/angular`) with optional peers — they are not re-exported by the framework package.",
          },
          {
            name: "useShadcnTheme(runtime) / useBootstrapTheme(runtime)",
            desc: "Composables on each adapter's framework subpath install the React-free CSS-variable factory and dispose the returned handle with the component lifecycle. Pass the runtime from this framework's runtime getter.",
          },
          {
            name: "useDaisyTheme(runtime) / useOpenPropsTheme(runtime)",
            desc: "Same contract for DaisyUI and Open Props. The adapter subpath supplies lifecycle wiring while the factory stays framework-neutral.",
          },
          {
            name: "adapter factory subpaths",
            desc: "Use `@themvora/shadcn/factory`, `@themvora/bootstrap/factory`, `@themvora/daisyui/factory`, or `@themvora/open-props/factory` when you need the adapter without any framework.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition prop",
            desc: "Pass `transition` to ThemeProvider to enable CSS transitions on theme changes.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Applies the theme immediately, without animating. Use it for a one-off instant switch. The `transition` prop is live: change it after mount and the next theme change uses the new options (no reload, no remount). Compose the core diff/plan/runner APIs for custom animation.",
          },
        ],
      },
      {
        label: "Components",
        features: [
          {
            name: "ThemeScope",
            desc: "Scoped theming component for subtrees.",
          },
        ],
      },
    ],
    quickStart: {
      title: "src/App.svelte",
      lang: "svelte",
      code: `<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
</script>

<!-- \`defaultTheme\` picks the theme. Add \`initialMode="system"\` to follow the
     OS preference instead of the theme's own mode. -->
<ThemeProvider defaultTheme="mint-light">
  <ThemeSwitcher />
</ThemeProvider>`,
    },
    snippet: {
      title: "src/ThemeSwitcher.svelte",
      lang: "svelte",
      code: `<script lang="ts">
  import { useTheme } from "@themvora/svelte";
  const { theme, mode, toggleTheme } = useTheme();
</script>

<main class="page">
  <h1>Themvora</h1>
  <p>Current theme: {$theme.name} ({$mode})</p>

  <button class="primary" onclick={toggleTheme}>Toggle theme</button>

  <section class="card">
    <h2>Themed card</h2>
    <p class="muted">Surface, border and text follow the theme.</p>
  </section>
</main>

<style>
  .page {
    background: var(--theme-color-background);
    color: var(--theme-color-foreground);
    min-height: 100vh;
    padding: 2rem;
  }
  .primary {
    background: var(--theme-color-primary);
    color: var(--theme-color-primaryForeground);
    border: 0;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
  }
  .card {
    background: var(--theme-color-card);
    border: 1px solid var(--theme-color-border);
    border-radius: 0.75rem;
    margin-top: 1.5rem;
    padding: 1rem;
  }
  .muted {
    color: var(--theme-color-mutedForeground);
  }
</style>`,
    },
    snippet2: {
      title: "src/App.svelte — history + scope",
      caption: "`ThemeScope` around a paragraph, with `undo`/`redo` as functions and `canUndo`/`canRedo` as stores read with `$`.",
      lang: "svelte",
      code: `<script lang="ts">
  import { ThemeProvider, ThemeScope, useThemeHistory } from "@themvora/svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";

  // \`undo\` / \`redo\` are functions; \`canUndo\` / \`canRedo\` are readable stores,
  // so they are read with \`$\` in the markup.
  const { undo, redo, canUndo, canRedo } = useThemeHistory();
</script>

<ThemeProvider defaultTheme="mint-light">
  <ThemeScope theme="plum-dark" transition={{ duration: 300, easing: "ease" }}>
    <p>Scoped to plum-dark</p>
  </ThemeScope>

  <button onclick={undo} disabled={!$canUndo}>Undo</button>
  <button onclick={redo} disabled={!$canRedo}>Redo</button>

  <ThemeSwitcher />
</ThemeProvider>`,
    },
    zeroFlashNote:
      "Included. `<ThemeProvider>` injects a blocking script into `<head>` before the first paint. For an SSR app, inline it with `createThemeBootstrapScript()` instead.",
    modeNote:
      "`defaultTheme` chooses the starting theme. Add `initialMode=\"system\"` to follow the visitor's OS on the first visit.",
    configNote:
      "Themes and the starting mode come from the provider props. SvelteKit is Vite-based, so you can declare them once in `theme.config.ts` and let `themvoraVitePlugin()` derive the pre-paint bootstrap from the same file — the provider then takes no theme props. The plugin is optional either way.",
    styles: {
      title: "src/index.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package. The provider, the stores and the components ship together.",
        install: true,
      },
      {
        label: "Set up",
        desc: "`ThemeProvider` publishes the runtime through Svelte context, so it has to sit above every component that reads it.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. The classes are ordinary Svelte template `class` attributes — the next step connects them to the theme.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The toggle reads and writes the runtime. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "Scope and history in one component",
      intro: "The provider, a scoped subtree and the history stores can live in the same file: the scope takes the runtime from context rather than from a prop.",
    },
    setupExtra: {
      title: "src/main.ts",
      lang: "ts",
      code: `// The Vite entry: mount the app and load the stylesheet once.
import { mount } from "svelte";
import "./index.css";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });`,
    },
    noTheme: {
      title: "src/App.svelte",
      lang: "svelte",
      code: `<!-- No theme definition needed -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
</script>

<!-- No \`themes\` prop → built-in neutral theme.
     defaultTheme picks the theme; initialMode="system" is the opt-in for
     following the OS. The provider hands that mode to BOTH the pre-paint
     script it injects and the runtime, so the two cannot disagree. -->
<ThemeProvider defaultTheme="light" initialMode="system">
  <h1>Hello, themed world</h1>
</ThemeProvider>`,
    },
  },
  {
    slug: "solid",
    name: "Solid",
    icon: icons.solid,
    pkg: "@themvora/solid",
    uiExample: {
      title: "src/components/WorkspaceCard.tsx",
      lang: "tsx",
      code: `export function WorkspaceCard() {
  return (
    <div class="themvora-example-card">
      <div class="themvora-example-header">
        <h3 class="themvora-example-title">Design system</h3>
        <span class="themvora-example-status">Active</span>
      </div>
      <p class="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p class="themvora-example-meta">Updated 2 minutes ago</p>
      <button class="themvora-example-button" type="button">View themes</button>
    </div>
  );
}`,
    },
    tagline:
      "Signals-first theming with a context provider and scoped subtrees.",
    mark: "So",
    tags: ["Signals", "Context"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "ThemeProvider",
            desc: "Context provider with DOM + CSS variable bindings.",
          },
        ],
      },
      {
        label: "Signals",
        features: [
          {
            name: "useTheme()",
            desc: "Signals for `theme`, `mode`, `effectiveMode`, `family` with getter access and setters.",
          },
          {
            name: "useEffectiveThemeMode()",
            desc: "A signal of the mode actually applied (`light` or `dark`). Follows a sunrise/sunset transition; `useThemeMode()` keeps reporting the configured mode.",
          },
          {
            name: "useThemeHistory()",
            desc: "Undo / redo / jump through theme history.",
          },
          {
            name: "useThemeBatch()",
            desc: "Atomic, coalesced updates.",
          },
          {
            name: "useThemeSnapshot() / useThemeRestore()",
            desc: "Serialize and restore runtime state.",
          },
          {
            name: "useThemeLifecycle()",
            desc: "Subscribe to lifecycle events.",
          },
          {
            name: "useThemePacks()",
            desc: "Install theme packs at runtime.",
          },
          {
            name: "useThemeSchedule()",
            desc: "Reactive sunrise/sunset controller with signal-backed `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition` plus `enable()`/`disable()`/`set()`. Configure via the `scheduled` prop on ThemeProvider.",
          },
        ],
      },
      {
        label: "Library adapters",
        features: [
          {
            name: "Adapter framework subpaths",
            desc: "CSS-variable adapters own their framework wrappers behind subpaths (`/react`, `/vue`, `/svelte`, `/solid`, `/angular`) with optional peers — they are not re-exported by the framework package.",
          },
          {
            name: "useShadcnTheme(runtime) / useBootstrapTheme(runtime)",
            desc: "Composables on each adapter's framework subpath install the React-free CSS-variable factory and dispose the returned handle with the component lifecycle. Pass the runtime from this framework's runtime getter.",
          },
          {
            name: "useDaisyTheme(runtime) / useOpenPropsTheme(runtime)",
            desc: "Same contract for DaisyUI and Open Props. The adapter subpath supplies lifecycle wiring while the factory stays framework-neutral.",
          },
          {
            name: "adapter factory subpaths",
            desc: "Use `@themvora/shadcn/factory`, `@themvora/bootstrap/factory`, `@themvora/daisyui/factory`, or `@themvora/open-props/factory` when you need the adapter without any framework.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition prop",
            desc: "Pass `transition` to ThemeProvider to enable CSS transitions on theme changes.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Applies the theme immediately, without animating. Use it for a one-off instant switch. The `transition` prop is live: change it after mount and the next theme change uses the new options (no reload, no remount). Compose the core diff/plan/runner APIs for custom animation.",
          },
        ],
      },
      {
        label: "Components",
        features: [
          {
            name: "ThemeScope",
            desc: "Scoped theming component for subtrees.",
          },
        ],
      },
    ],
    quickStart: {
      title: "src/main.tsx",
      lang: "tsx",
      code: `import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import { App } from "./App";

render(
  () => (
    <ThemeProvider defaultTheme="mint-light">
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);`,
    },
    snippet: {
      title: "src/App.tsx",
      lang: "tsx",
      code: `import { useTheme } from "@themvora/solid";

const page = {
  background: "var(--theme-color-background)",
  color: "var(--theme-color-foreground)",
  "min-height": "100vh",
  padding: "2rem",
};

export function App() {
  // Signals: call them to read the current value.
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main style={page}>
      <h1>Themvora</h1>
      <p>
        Current theme: {theme().name} ({mode()})
      </p>

      <button
        onClick={toggleTheme}
        style={{
          background: "var(--theme-color-primary)",
          color: "var(--theme-color-primaryForeground)",
          border: 0,
          "border-radius": "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        Toggle theme
      </button>

      <section
        style={{
          background: "var(--theme-color-card)",
          border: "1px solid var(--theme-color-border)",
          "border-radius": "0.75rem",
          "margin-top": "1.5rem",
          padding: "1rem",
        }}
      >
        <h2>Themed card</h2>
        <p style={{ color: "var(--theme-color-mutedForeground)" }}>
          Surface, border and text follow the theme.
        </p>
      </section>
    </main>
  );
}`,
    },
    snippet2: {
      title: "src/App.tsx — history + scope",
      caption: "`history.canUndo` is read inside JSX so it tracks. Destructuring it would freeze the mount-time value and the button would never enable.",
      lang: "tsx",
      code: `import { ThemeProvider, ThemeScope, useThemeHistory } from "@themvora/solid";

function HistoryControls() {
  // \`canUndo\` / \`canRedo\` are getters — read them off the object in JSX.
  // Destructuring freezes the mount-time value and the buttons never enable.
  const history = useThemeHistory();
  return (
    <div>
      <button onClick={history.undo} disabled={!history.canUndo}>Undo</button>
      <button onClick={history.redo} disabled={!history.canRedo}>Redo</button>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="mint-light">
      <ThemeScope theme="plum-dark" transition={{ duration: 300, easing: "ease" }}>
        <span>Always plum-dark</span>
      </ThemeScope>
      <HistoryControls />
    </ThemeProvider>
  );
}`,
    },
    zeroFlashNote:
      "Included. `<ThemeProvider>` injects a blocking script into `<head>` before the first paint. For an SSR app, inline it with `createThemeBootstrapScript()` instead.",
    modeNote:
      "`defaultTheme` chooses the starting theme. Add `initialMode=\"system\"` to follow the visitor's OS on the first visit.",
    configNote:
      "Themes and the starting mode come from the provider props. If you do build with Vite, you can declare them once in `theme.config.ts` instead and let `themvoraVitePlugin()` derive the pre-paint bootstrap from the same file — the provider then takes no theme props. The plugin is optional either way.",
    styles: {
      title: "src/index.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package. The provider, the accessors and the components ship together.",
        install: true,
      },
      {
        label: "Set up",
        desc: "`ThemeProvider` publishes the runtime through Solid's context, and `render()` is where the tree starts. Every component below reads it with accessors.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. Solid accepts `class` in JSX, so the classes are plain attributes — the next step connects them to the theme.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The toggle reads and writes the runtime. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "Scope and history in one component",
      intro: "The same pieces as the other integrations, with Solid's rule attached: read accessors where you want a subscription, and keep the history object intact.",
    },
    noTheme: {
      title: "src/index.tsx",
      lang: "tsx",
      code: `// The Vite entry: render the tree and load the stylesheet once.
import "./index.css";
import { App } from "./App";
import { ThemeProvider } from "@themvora/solid";
import { render } from "solid-js/web";

render(
  () => (
    <ThemeProvider defaultTheme="light" initialMode="system">
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);`,
    },
  },
  {
    slug: "angular",
    name: "Angular",
    icon: icons.angular,
    pkg: "@themvora/angular",
    uiExample: {
      title: "src/app/workspace-card.component.html",
      lang: "html",
      caption: "This is the component's template. `class` is right for a static style like this one; `[class.some-class]` is for a class that depends on component state.",
      code: `<div class="themvora-example-card">
  <div class="themvora-example-header">
    <h3 class="themvora-example-title">Design system</h3>
    <span class="themvora-example-status">Active</span>
  </div>
  <p class="themvora-example-description">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="themvora-example-meta">Updated 2 minutes ago</p>
  <button class="themvora-example-button" type="button">View themes</button>
</div>`,
    },
    tagline:
      "Standalone-API theming with DI providers, reactive injectables, and a scoping directive.",
    mark: "A",
    tags: ["DI", "Directive", "SSR"],
    groups: [
      {
        label: "Setup",
        features: [
          {
            name: "provideTheme(options)",
            desc: "App-level providers from a ThemeRuntimeOptions config.",
          },
          {
            name: "provideThemeRuntime(runtime)",
            desc: "Provide an existing shared runtime instance.",
          },
        ],
      },
      {
        label: "Injectables",
        features: [
          {
            name: "injectThemeRuntime()",
            desc: "Inject the full runtime.",
          },
          {
            name: "injectTheme()",
            desc: "Reactive `ThemeState` — theme, mode, `resolvedMode` (the mode actually applied), family plus setters.",
          },
          {
            name: "injectEffectiveThemeMode()",
            desc: "A `Signal<'light' | 'dark'>` of the mode actually applied. Follows a sunrise/sunset transition; `state().mode` keeps reporting the configured mode.",
          },
          {
            name: "injectThemeHistory()",
            desc: "Undo / redo / jump through theme history.",
          },
          {
            name: "injectThemeBatch()",
            desc: "Atomic, coalesced updates.",
          },
          {
            name: "injectThemeSnapshot() / injectThemeRestore()",
            desc: "Serialize and restore runtime state.",
          },
          {
            name: "injectThemeTimeTravel()",
            desc: "`{ history, jump }` — indexed time travel.",
          },
          {
            name: "injectThemeLifecycle()",
            desc: "Subscribe to lifecycle events.",
          },
          {
            name: "injectThemePacks()",
            desc: "Install theme packs at runtime.",
          },
          {
            name: "injectThemeSchedule()",
            desc: "Reactive sunrise/sunset controller: `state()` is a Signal of `enabled`, `status`, `sunrise`, `sunset`, `nextTransition`; plus `enable()`/`disable()`/`set()`. Configure via `scheduled` in `provideTheme()`.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition in provideTheme()",
            desc: "Pass `transition` config to `provideTheme()` to enable CSS transitions on theme changes.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Applies the theme immediately, without animating. Use it for a one-off instant switch. The `transition` prop is live: change it after mount and the next theme change uses the new options (no reload, no remount). Compose the core diff/plan/runner APIs for custom animation.",
          },
        ],
      },
      {
        label: "Directives",
        features: [
          {
            name: "ThemeScopeDirective",
            desc: "Element-scoped theming via a directive.",
          },
        ],
      },
      {
        label: "SSR & Bootstrap",
        features: [
          {
            name: "createAngularPersistence()",
            desc: "Angular-flavored persistence adapter.",
          },
          {
            name: "createBlockingScriptContent / buildThemeCSSMap",
            desc: "Blocking `<script>` plus a critical `<style>` carrying the resolved theme's CSS variables, so a server-rendered page paints themed. For `system` mode it emits both schemes as media blocks.",
          },
        ],
      },
    ],
    quickStart: {
      title: "src/main.ts",
      lang: "ts",
      code: `import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ defaultTheme: "mint-light" })],
});`,
    },
    snippet: {
      title: "src/app/theme-switcher.component.ts",
      lang: "ts",
      code: `import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "theme-switcher",
  standalone: true,
  template: \`
    <main class="page">
      <h1>Themvora</h1>
      <p>Current theme: {{ state().theme.name }} ({{ state().mode }})</p>

      <button class="primary" (click)="toggle()">Toggle theme</button>

      <section class="card">
        <h2>Themed card</h2>
        <p class="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  \`,
  styles: \`
    .page {
      background: var(--theme-color-background);
      color: var(--theme-color-foreground);
      min-height: 100vh;
      padding: 2rem;
    }
    .primary {
      background: var(--theme-color-primary);
      color: var(--theme-color-primaryForeground);
      border: 0;
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
    }
    .card {
      background: var(--theme-color-card);
      border: 1px solid var(--theme-color-border);
      border-radius: 0.75rem;
      margin-top: 1.5rem;
      padding: 1rem;
    }
    .muted {
      color: var(--theme-color-mutedForeground);
    }
  \`,
})
export class ThemeSwitcherComponent {
  // Must be public — Angular templates cannot access private members.
  state = injectTheme();

  toggle() {
    this.state().toggleTheme();
  }
}`,
    },
    snippet2: {
      title: "src/app/history-controls.component.ts",
      caption: "`ThemeScopeDirective` bound to `plum-dark` through `[themvoraScope]`, with the history injectables driving the buttons.",
      lang: "ts",
      code: `import { Component } from "@angular/core";
import type { ThemeTransitionOptions } from "@themvora/core";
import {
  injectThemeHistory,
  ThemeScopeDirective,
} from "@themvora/angular";

@Component({
  selector: "history-controls",
  standalone: true,
  imports: [ThemeScopeDirective],
  template: \`
    <div [themvoraScope]="'plum-dark'" [themvoraScopeTransition]="transition">
      Scoped to plum-dark
    </div>
    <button (click)="undo()" [disabled]="!canUndo()">Undo</button>
    <button (click)="redo()" [disabled]="!canRedo()">Redo</button>
  \`,
})
export class HistoryControlsComponent {
  // \`history\` is a signal of \`{ canUndo, canRedo }\`; \`undo\`/\`redo\` are actions.
  private history = injectThemeHistory();

  transition: ThemeTransitionOptions = { duration: 300, easing: "ease" };

  canUndo() { return this.history.history().canUndo; }
  canRedo() { return this.history.history().canRedo; }
  undo() { this.history.undo(); }
  redo() { this.history.redo(); }
}`,
    },
    snippet3: {
      title: "src/app/app.component.ts",
      caption: "The standalone root component that imports both children — the tree the snippets above assume.",
      lang: "ts",
      code: `import { Component } from "@angular/core";
import { ThemeSwitcherComponent } from "./theme-switcher.component";
import { HistoryControlsComponent } from "./history-controls.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ThemeSwitcherComponent, HistoryControlsComponent],
  template: \`
    <header><theme-switcher /></header>
    <main><history-controls /></main>
  \`,
})
export class AppComponent {}`,
    },
    zeroFlashNote:
      "Automatic during SSR. `provideTheme()` emits the critical CSS and blocking bootstrap into the rendered `<head>` before the bundle loads. `createBlockingScriptContent()` remains available when you need custom server placement.",
    modeNote:
      "`provideTheme({ defaultTheme, initialMode })` chooses the starting theme. `initialMode: \"system\"` follows the visitor's OS.",
    configNote:
      "Themes and the starting mode are passed to `provideTheme()` when the app bootstraps. Angular does not use Vite, so there is no bundler plugin to add: the provider emits the pre-paint script. The stylesheet lives in `src/styles.css`, which the Angular CLI already registers in `angular.json`.",
    styles: {
      title: "src/styles.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package. The injectables, the directive and the components ship together.",
        install: true,
      },
      {
        label: "Set up",
        desc: "There is no provider component to wrap the app in. `provideTheme()` goes into `bootstrapApplication`'s providers, where it creates the runtime and wires Angular's persistence.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. The component template uses a static `class` attribute; `[class.some-class]` is for state-dependent classes.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The component calls the signal's `toggleTheme()`. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "A scoped panel and the component that hosts it",
      intro: "The directive does the scoping, and a second component assembles the two children so the guide shows a real tree rather than one file in isolation.",
    },
    noTheme: {
      title: "src/main.ts",
      lang: "ts",
      code: `import { AppComponent } from "./app/app.component";
import { provideTheme } from "@themvora/angular";
import { bootstrapApplication } from "@angular/platform-browser";

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ defaultTheme: "light", initialMode: "system" })],
});`,
    },
  },
  {
    slug: "web",
    name: "Web Components",
    icon: icons.web,
    pkg: "@themvora/web",
    uiExample: {
      title: "index.html",
      lang: "html",
      caption: "Plain HTML. The custom elements upgrade around it; the card itself needs no JavaScript because it only reads CSS variables.",
      code: `<div class="themvora-example-card">
  <div class="themvora-example-header">
    <h3 class="themvora-example-title">Design system</h3>
    <span class="themvora-example-status">Active</span>
  </div>
  <p class="themvora-example-description">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="themvora-example-meta">Updated 2 minutes ago</p>
  <button class="themvora-example-button" type="button">View themes</button>
</div>`,
    },
    tagline:
      "HTML-first theming for any page: import the package once, then write custom elements and CSS variables.",
    mark: "W",
    tags: ["No framework", "Custom elements", "HTML-first"],
    projectPrerequisite:
      "Any HTML page served over HTTP — or a fresh Vite project: npm create vite@latest my-app -- --template vanilla-ts",
    groups: [
      {
        label: "Setup",
        features: [
          {
            name: 'import "@themvora/web"',
            desc: "One side-effect import registers `<themvora-provider>`, `<themvora-scope>`, `<themvora-toggle>`, `<themvora-select>`, `<themvora-scrollbar>` and `<themvora-inspector>`, and injects their stylesheet once. No manual registration step.",
          },
          {
            name: "defineCustomElements()",
            desc: "The explicit form, kept for advanced cases: call it yourself, or register a single element under your own tag with `ThemvoraProvider.define(\"my-provider\")`. Idempotent, and a no-op on the server.",
          },
          {
            name: "themvoraVitePlugin()",
            desc: "Zero flash on Vite, with no `<script>` tag of your own. Add the plugin from `@themvora/core/vite` to `vite.config.ts`, declare the catalog once in `theme.config.ts`, and the blocking pre-paint script is injected into the served HTML. The provider adopts what that script painted. Pass `scrollbar: true` as well when the page uses `<themvora-scrollbar>` — the same pre-paint pass then hides the native bar. Keep `theme.config.ts` and the `themes` attribute listing the same catalog.",
          },
          {
            name: "VS Code IntelliSense",
            desc: "The package ships `html-data.json`, an HTML custom-data file covering every element and attribute. Point VS Code at it with `\"html.customData\": [\"./node_modules/@themvora/web/html-data.json\"]` for tag completion, attribute suggestions and hover documentation. VS Code does not load it automatically.",
          },
        ],
      },
      {
        label: "Configuration",
        features: [
          {
            name: "themes",
            desc: 'Two syntaxes. Names: `themes="light dark plum-dark"` resolves each identifier against the registered catalog. Definitions: `themes=\'[{"name":"brand","tokens":{…}}]\'` registers your own. An unknown name is reported and skipped; nothing is constructed from a bare name.',
          },
          {
            name: "default-theme",
            desc: "The theme used when nothing is persisted. Changing it re-resolves the selection; removing it does not disturb the live selection.",
          },
          {
            name: "initial-mode",
            desc: '`"light"`, `"dark"` or `"system"` (case-insensitive). Any other value is reported and ignored, and the mode falls back to the one derived from `default-theme`.',
          },
          {
            name: "initial-family",
            desc: "The family used when nothing is persisted. An unregistered family is reported by the runtime (`TV_THEME_FAMILY_UNKNOWN`) and normalised.",
          },
          {
            name: "transition",
            desc: 'JSON: `true`, `false`, or `{"enabled":true,"duration":250,"easing":"ease-in-out"}`. Changing it reconfigures the live bindings; removing it returns to no configured transition.',
          },
          {
            name: "scheduled",
            desc: 'JSON sunrise/sunset options, e.g. `{"latitude":27.7,"longitude":85.3}`. Removing the attribute tears the schedule down.',
          },
        ],
      },
      {
        label: "Elements",
        features: [
          {
            name: "<themvora-provider>",
            desc: "Owns the runtime for a page or subtree and applies the active theme to the document. Reacts to every configuration attribute without a reload.",
          },
          {
            name: "<themvora-scope>",
            desc: "Applies a theme to its subtree via the `theme` attribute, in the light DOM. Accepts an exact theme name or a family name — a family follows the provider's mode, an exact name pins its own. Re-resolves when the provider's catalog changes, and falls back to the catalog's first theme (reported) when the name is unknown. Removing the attribute destroys the binding, so the subtree inherits the surrounding theme.",
          },
          {
            name: "<themvora-toggle>",
            desc: "A native button with built-in sun, moon and monitor icons. It reports three states, not two: `data-mode` is `light`, `dark` or `system`, and `aria-pressed` is `true`, `false` or `mixed` — so a page following the OS reads as `system` rather than pretending to be light or dark. Activating it pins an explicit mode. No icon package, stylesheet or script required.",
          },
          {
            name: "<themvora-select>",
            desc: 'A native `<select>` for `type="mode"` or `type="family"`. Options come from the runtime, so a catalog change updates them; `label` sets the accessible name.',
          },
          {
            name: "<themvora-scrollbar>",
            desc: "Overlay scrollbar bound to the provider runtime. Every option is an attribute; changing one rebuilds the overlay. It needs the pre-paint class: pass `scrollbar: true` to `themvoraVitePlugin()`, or load the pre-paint script yourself. Without it the browser paints a native scrollbar for a frame before the overlay mounts.",
          },
          {
            name: "<themvora-inspector>",
            desc: "Floating theme inspector: identity, selection, tokens and resolved CSS variables, live.",
          },
        ],
      },
      {
        label: "Events",
        features: [
          {
            name: "theme-ready",
            desc: "Dispatched once by `<themvora-provider>` after its runtime exists and the first theme is applied. Bubbles and is composed, so a `document` listener sees it.",
          },
          {
            name: "themes-change",
            desc: "Dispatched when the runtime's catalog changed — a `themes` attribute, `runtime.use(pack)` or `runtime.restore()` — with `detail.themes` naming the new catalog. A catalog change can leave the active theme untouched, so `store.subscribe()` alone cannot report it. Dispatched on a microtask, after the change has been applied, so a listener may safely write back to `themes`.",
          },
          {
            name: "runtime.store.subscribe()",
            desc: "The canonical subscription for the active theme. Re-read state inside the callback; the runtime's helpers are getters, not subscriptions.",
          },
          {
            name: "runtime.selection.subscribe()",
            desc: "Fires for a selection change that resolves to the same theme (`system` following the OS, for example), which the store subscription does not report.",
          },
        ],
      },
      {
        label: "Imperative",
        features: [
          {
            name: "getProviderRuntime(providerEl)",
            desc: "The runtime attached to a specific provider. Returns `undefined` before that element has upgraded — use it whenever more than one provider exists.",
          },
          {
            name: "useThemeRuntime()",
            desc: "Page-level convenience: the runtime of the first initialized provider in document order. Throws when none has initialized.",
          },
          {
            name: "Mode and family control",
            desc: 'From the runtime: `selection.setMode("dark")`, `setFamily("plum")` and `toggleTheme()`. The built-in controls call exactly these, so a custom control needs no other API.',
          },
          {
            name: "useEffectiveThemeMode() / observeEffectiveThemeMode()",
            desc: "The mode actually applied (`light` or `dark`) and a subscription to it. Render this in a label that states the current appearance: `useThemeMode()` reports the configured mode, which does not move at a sunrise/sunset transition.",
          },
        ],
      },
    ],
    quickStart: {
      title: "index.html",
      lang: "html",
      code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <!-- The provider owns the runtime. Every option is an attribute: a theme
         list, the starting theme, and the starting mode. -->
    <themvora-provider themes="light dark plum-light plum-dark" default-theme="light" initial-mode="system">
      <!-- src/main.ts renders the active theme here. Keep the id when you
           replace this markup: that module throws without it. -->
      <p>Current theme: <strong id="theme-name"></strong></p>

      <themvora-toggle></themvora-toggle>
      <themvora-select type="mode"></themvora-select>
      <themvora-select type="family"></themvora-select>
    </themvora-provider>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    },
    setupExtra: {
      title: "src/main.ts",
      lang: "ts",
      code: `// The whole setup. This one import registers the elements and injects their
// stylesheet, so the markup in index.html upgrades on its own. The page's own
// stylesheet is a <link> in index.html, not an import here — see the comment
// in that file.
import "@themvora/web";

// Optional: read the current theme in application code. The runtime's helpers
// are getters, so subscribe and re-read.
import { useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();
const readout = document.querySelector<HTMLElement>("#theme-name");

if (!readout) {
  throw new Error("index.html must contain a #theme-name element.");
}

const render = () => {
  readout.textContent = runtime.store.get().name;
};

runtime.store.subscribe(render);
render();`,
    },
    buildConfig: {
      title: "vite.config.ts",
      caption: "The whole build integration. The plugin discovers theme.config.ts at the project root.",
      lang: "ts",
      code: `import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

export default defineConfig({
  plugins: [themvoraVitePlugin()],
});`,
    },
    themeConfig: {
      title: "theme.config.ts",
      caption: "One declaration drives the generated CSS, the boot script and the provider's transported configuration.",
      lang: "ts",
      code: `import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  initialMode: "system",
});`,
    },
    noTheme: {
      title: "index.html",
      lang: "html",
      code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
    <!-- Render-blocking on purpose: a CSS file imported from main.ts is
         injected by JavaScript, so in dev the first paint happens before it
         exists and the page flashes unstyled. -->
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <!-- No controls, no script beyond the module import: the provider applies
         the theme and ordinary HTML reads the variables. -->
    <themvora-provider default-theme="light" initial-mode="system">
      <h1>Hello, themed world</h1>
      <p>Current theme: <strong id="theme-name"></strong></p>
    </themvora-provider>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    },
    styles: {
      title: "src/styles.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package, no framework and no build step. A module import registers the elements.",
        install: true,
      },
      {
        label: "Set up",
        desc: "`<themvora-provider>` owns the runtime and applies the theme to the document. Its attributes are the configuration, so the whole setup is visible in the markup and survives a server render. The module import is what registers the elements.",
        ref: "noTheme",
        refExtra: "setupExtra",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card in ordinary HTML with `class` attributes. The custom elements upgrade around it; the card itself needs no JavaScript because it only reads CSS variables.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "`<themvora-toggle>` is a real `<button>` that reads and writes the runtime. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "Scoping, and a pre-paint script without the Vite plugin",
      intro: "Both are optional. The first pins a subtree to a theme and offers a native `<select>`; the second is how to get the blocking bootstrap when your build is not Vite.",
    },
    snippet: {
      title: "index.html",
      lang: "html",
      code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <themvora-provider default-theme="light" initial-mode="system">
      <h1>Themvora</h1>
      <p>Current theme: <strong id="theme-name"></strong></p>

      <p>
        <themvora-toggle></themvora-toggle>
        <themvora-select type="family"></themvora-select>
      </p>

      <section class="themvora-example-card">
        <div class="themvora-example-header">
          <h2 class="themvora-example-title">Themed card</h2>
          <span class="themvora-example-status">Active</span>
        </div>
        <p class="themvora-example-description">
          Surface, border and text follow the active theme.
        </p>
        <p class="themvora-example-meta">Updated 2 minutes ago</p>
        <button class="themvora-example-button" type="button">View themes</button>
      </section>
    </themvora-provider>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    },
    snippet2: {
      title: "index.html",
      caption: "A `<themvora-select type=\"mode\">` and a `theme=\"cocoa-dark\"` scope in plain markup, with no script of its own.",
      lang: "html",
      code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <themvora-provider default-theme="light" initial-mode="system">
      <p>Current theme: <strong id="theme-name"></strong></p>

      <themvora-select type="mode"></themvora-select>

      <!-- theme="cocoa-dark" names one registered theme, so this subtree keeps
           that theme whatever the rest of the page selects. A bare family name
           ("cocoa") also resolves, to that family's theme for the current mode.
           Nested scopes override their ancestor, never the reverse. -->
      <themvora-scope theme="cocoa-dark">
        <section class="themvora-example-card">
          <h2 class="themvora-example-title">Scoped section</h2>
          <p class="themvora-example-description">
            This subtree is always themed "cocoa-dark".
          </p>
        </section>

        <themvora-scope theme="berry-light">
          <p>And this one is always "berry-light".</p>
        </themvora-scope>
      </themvora-scope>
    </themvora-provider>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
    },
    snippet3: {
      title: "scripts/write-pre-paint.mjs",
      caption: "A build step that writes the blocking bootstrap to a file, for any server or bundler that is not the Vite plugin.",
      lang: "js",
      code: `// Zero flash without the Vite plugin — for any other server or bundler.
// Writes a classic script that applies the saved theme before the first
// paint. Run it before you build, then load the output from <head> in
// index.html, above the main.ts module script:
//
//   <script src="/theme-bootstrap.js"></script>
import { writeFileSync } from "node:fs";
import { createThemeBootstrapScript, getBuiltInThemes } from "@themvora/core";

writeFileSync(
  "public/theme-bootstrap.js",
  createThemeBootstrapScript({
    themes: getBuiltInThemes(),
    defaultTheme: "light",
    initialMode: "system",
  }),
);`,
    },
    zeroFlashNote:
      "Two ways, one outcome. On Vite, `themvoraVitePlugin()` from `@themvora/core/vite` injects the blocking pre-paint script for you: declare the catalog once in `theme.config.ts` and add the plugin to `vite.config.ts` — no `<script>` tag, no build step of your own. Everywhere else, generate the script with `createThemeBootstrapScript()` and load it in `<head>` before the module script (see More Examples). Either way the provider adopts the selection the script painted instead of replacing it with a different default. Loading the package from a CDN with no pre-paint script has no zero-flash guarantee.",
    modeNote:
      '`default-theme` chooses the starting theme and `initial-mode="system"` follows the visitor\'s OS instead of the theme\'s own mode. Give the pre-paint script the same `defaultTheme` and `initialMode`, or the script and the runtime resolve different themes and the page flashes.',
    configNote:
      'Every provider option is an attribute, and every attribute is live: changing one reconciles the running runtime, so controls, scopes, variables and displayed text update without a reload. `themes` accepts either a list of registered names (`themes="light dark plum-dark"`) or a JSON array of theme definitions. Removing `themes`, `default-theme`, `initial-mode` or `initial-family` stops that attribute contributing without resetting the live selection; `transition` and `scheduled` are the exception, where removing the attribute turns the feature off. Invalid values are reported once through the standard diagnostic pipeline and ignored, never thrown.',
  },
  {
    slug: "tailwind",
    name: "Tailwind CSS v4",
    icon: icons.tailwind,
    pkg: "@themvora/tailwind",
    extraPackages: ["tailwindcss"],
    uiExample: {
      title: "index.html",
      lang: "html",
      caption: "Tailwind reads the same tokens through the `@theme` block in `@themvora/tailwind/theme.css`, so the utilities resolve to the active theme instead of a palette baked into the build.",
      code: `<div class="grid max-w-sm gap-2.5 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
  <div class="flex items-center justify-between gap-2">
    <h3 class="text-[15px] font-semibold">Design system</h3>
    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-success">
      Active
    </span>
  </div>
  <p class="text-[13px] text-muted-foreground">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="text-xs text-muted-foreground">Updated 2 minutes ago</p>
  <button
    type="button"
    class="justify-self-start rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:brightness-110"
  >
    View themes
  </button>
</div>`,
    },
    cssOnly: true,
    tagline:
      "Map every semantic token to Tailwind v4 utilities and theme variables.",
    mark: "TW",
    tags: ["CSS", "Design tokens", "v4"],
    groups: [
      {
        label: "Integration",
        features: [
          {
            name: '@import "@themvora/tailwind"',
            desc: "One import maps tokens to `@theme` variables: `--color-*`, `--radius-*`, `--spacing-*`, `--font-*`, `--shadow-*`.",
          },
          {
            name: "Dark-mode variant",
            desc: "`@custom-variant dark (&:where(.dark, .dark *))` — scoped to the `.dark` class Themvora maintains.",
          },
          {
            name: "synchronizeDarkClass(theme)",
            desc: "Keeps the `.dark` class in sync with the active theme.",
          },
          {
            name: "CSS layers",
            desc: "Ships `theme.css`, `dark.css` and `preflight.css` layers.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "CSS transition variables",
            desc: "Themvora exposes transition variables for Tailwind-aware styling, while the runtime owns the actual theme-change orchestration; you do not need to hand-author a global transition block just to get smooth theme changes.",
          },
          {
            name: "createTailwindPlugin({ themes, defaultTheme })",
            desc: "Registers Themvora tokens with Tailwind from a JS config, for projects that configure Tailwind in JavaScript rather than CSS.",
          },
          {
            name: "themeCSS",
            desc: "Tailwind-compatible `@theme` variable block generated from your Themvora tokens, imported via the package's CSS entry.",
          },
        ],
      },
    ],
    quickStart: {
      title: "src/index.css",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/tailwind";

body {
  @apply bg-background text-foreground;
}`,
    },
    snippet: {
      title: "index.html",
      lang: "html",
      code: `<!-- Plain HTML — no framework, no component library. Every class here is a
     Tailwind utility that resolves to a Themvora token, so a theme switch
     repaints all of it. -->
<main class="min-h-screen bg-background text-foreground p-8">
  <h1 class="text-2xl font-semibold">Themvora + Tailwind</h1>
  <p class="mt-1 text-sm text-muted-foreground">
    Switch the theme and everything below follows.
  </p>

  <section class="mt-6 max-w-sm rounded-xl border border-border bg-card p-4">
    <h2 class="font-semibold text-card-foreground">Your plan</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      \`bg-card\`, \`text-card-foreground\` and \`border-border\` — all token-backed.
    </p>
    <button
      type="button"
      data-theme-toggle
      class="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
    >
      Toggle theme
    </button>
  </section>
</main>`,
    },
    snippet2: {
      title: "src/globals.css — token → utility map",
      caption: "The token → utility map, as a reference rather than something to copy.",
      lang: "css",
      code: `/* @themvora/tailwind maps every semantic token onto a Tailwind v4 utility.
   The ones you will reach for most:

     .bg-background          .text-foreground
     .bg-card                .text-card-foreground
     .bg-popover             .text-popover-foreground
     .bg-primary             .text-primary-foreground
     .bg-secondary           .text-secondary-foreground
     .bg-muted               .text-muted-foreground
     .bg-accent              .text-accent-foreground
     .bg-destructive         .text-destructive-foreground
     .bg-success             .text-success-foreground
     .border-border          .bg-input          .ring-ring

   Plus the token-driven scales, all reading --theme-* variables:

     .rounded-lg             --theme-radius-lg
     .p-4 .gap-2 .mt-6       --theme-spacing-*
     .shadow-md              --theme-shadow-md
     .border-2               --theme-border-width-*
     .z-40                   --theme-z-index-*

   Because the variables are live, Tailwind's \`dark:\` variant is optional —
   the runtime already swapped the values behind these utilities. */`,
    },
    zeroFlashNote:
      "Tailwind is build-time only — it maps tokens to utilities and never runs. Zero-flash comes from whichever Themvora runtime you mount (`@themvora/react`, `-vue`, `-svelte`, `-solid`, `-angular` or `-web`); Tailwind does not choose one for you.",
    modeNote:
      "Tailwind maps tokens to utilities — it has no runtime of its own, so the starting mode comes from the adapter you install alongside it.",
    configNote:
      "This CSS import is the whole Tailwind integration — Tailwind maps tokens to utilities at build time and never runs in the browser. Switching themes needs a Themvora runtime, a separate package of your choosing.",
    styles: {
      title: "src/index.css",
      lang: "css",
      code: `/* Pick one of the two document rules below. Both rely only on the
   required \`background\` and \`foreground\` colours. */

/* 1. Tailwind utility approach */
html,
body {
  @apply bg-background text-foreground;
}

/* 2. Direct CSS-variable approach */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}`,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "`@themvora/tailwind` is build-time only: it generates utilities from the token set and needs Tailwind v4 itself. A runtime that applies a theme is a separate package.",
        install: true,
      },
      {
        label: "Set up",
        desc: "Two imports in the same file: Tailwind itself, then Themvora's mapping. The mapping emits a utility for every semantic token, so there is no theme config to write.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "The same card with Tailwind utilities. Every class resolves to a semantic token, so a theme switch repaints the markup without a re-render.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "Paint the document with the two required colours — `background` and `foreground` — using either `@apply` utilities or the CSS variables directly. No typography token is involved.",
        ref: "styles",
        note: "styles",
      },
    ],
    moreExamples: {
      title: "The dark variant and the token map",
      intro: "Tailwind's `dark:` variant has to agree with Themvora's resolved mode, and each utility needs a token behind it. These two files are that contract.",
    },
    noTheme: {
      title: "src/index.css",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/tailwind";`,
    },
    switchSnippet: {
      title: "src/theme.ts — keep Tailwind's dark class in sync",
      caption: "Keeping Tailwind's `dark` class in step with the runtime's resolved mode, so `dark:` utilities and Themvora tokens flip together.",
      lang: "ts",
      code: `import { synchronizeDarkClass } from "@themvora/tailwind";
import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

// Tailwind is build-time only, so it has no provider and no hook. Create the
// runtime yourself and let Tailwind's own helper mirror it onto the \`.dark\`
// class, which is what the \`dark:\` variant keys off.
const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "plum-light",
});

runtime.store.subscribe((theme) => synchronizeDarkClass(theme));

// Switching is the runtime's, not Tailwind's.
export function setMode(mode: "light" | "dark" | "system") {
  runtime.selection.setMode(mode);
}

export function toggleTheme() {
  runtime.selection.toggleTheme();
}`,
    },
  },
  {
    slug: "astro",
    name: "Astro",
    icon: icons.astro,
    pkg: "@themvora/astro",
    uiExample: {
      title: "src/components/WorkspaceCard.astro",
      lang: "astro",
      caption: "Native `.astro` markup. Inside a React island the same tree uses `className`, because that is JSX — see the React guide.",
      code: `---
// Nothing to run here: the classes read the variables the provider applies.
---

<div class="themvora-example-card">
  <div class="themvora-example-header">
    <h3 class="themvora-example-title">Design system</h3>
    <span class="themvora-example-status">Active</span>
  </div>
  <p class="themvora-example-description">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="themvora-example-meta">Updated 2 minutes ago</p>
  <button class="themvora-example-button" type="button">View themes</button>
</div>`,
    },
    tagline:
      "Astro-native theming: an integration for the pre-paint bootstrap, a React-free <html> layout, a native <ThemeToggle />, and opt-in client islands.",
    mark: "As",
    tags: ["Integration", "Components", "Islands", "Zero-flash"],
    groups: [
      {
        label: "Astro integration",
        features: [
          {
            name: "theme.config.ts discovery",
            desc: "`themvora()` finds `theme.config.ts` at the project root and derives everything from it — the pre-paint bootstrap and the runtime's configuration. Nothing is repeated in `astro.config.mjs`.",
          },
          {
            name: "Configuration transport",
            desc: "Injects the bootstrap projection as `window.__THEMVORA_CONFIG__` from `<head>`. The island reads it instead of taking theme props, so its server-rendered and hydrated markup come from the same registry.",
          },
          {
            name: "themvora() in astro.config.mjs",
            desc: "Registers the integration and injects the pre-paint bootstrap into every page's <head> with `injectScript(\"head-inline\")`.",
          },
          {
            name: "Zero-flash bootstrap",
            desc: "Reads the persisted cookies, resolves the effective mode against `prefers-color-scheme`, and applies the CSS variables plus `data-theme` before first paint.",
          },
          {
            name: "navigation: true (default)",
            desc: "Keeps the resolved theme across `<ClientRouter />` navigations — Astro otherwise copies each incoming page's `<html>` attributes over the live root. Inert without `<ClientRouter />`.",
          },
          {
            name: "No client framework required",
            desc: "`@themvora/astro` imports no React — the integration, the server helpers, the `<ThemeToggle />` component and the browser runtime are all framework-neutral. React is an optional peer, pulled in only by an island.",
          },
        ],
      },
      {
        label: "Astro components (no React)",
        features: [
          {
            name: "provider.astro",
            desc: "Server-renders the themed `<html data-theme>` from the request cookies. A concrete mode inlines that theme's variables; `system` emits both schemes as media blocks instead, since an inline variable would outrank the dark block.",
          },
          {
            name: "ThemeToggle.astro",
            desc: "A native Astro toggle: a real `<button>`, so keyboard and focus behaviour come from the platform. No island, no `client:load`, and no per-page `initialMode` / `initialFamily`. `showMode` makes its text the live mode.",
          },
          {
            name: "ThemeFamilySelect.astro",
            desc: "A native `<select>` over the families in the registry. It renders from `theme.config.ts`, forwards `class` to the `<select>` itself, and needs no script of its own. A mode select is the same contract by hand: `<select data-tv-select=\"mode\">`.",
          },
          {
            name: "data-tv-select",
            desc: "The selection-control contract. A `change` event is delegated from `document`, and the live selection is written back into the element's `value` — so every control of a kind agrees, a restored selection is shown rather than the first option, and a control swapped in by navigation works without re-running a script. The pre-paint bootstrap writes it too, so a `<select>` never shows its first option on a page painted in another theme.",
          },
          {
            name: "ThemeScope.astro",
            desc: "A subtree painted with a theme of its own, resolved in the frontmatter — so the server markup already carries the scoped variables and nothing repaints. Independent of the app-wide selection, and it ships no client JavaScript unless a runtime already exists.",
          },
          {
            name: "ThemeScrollbar.astro",
            desc: "The overlay scrollbar as a native component — no island, no client framework. Pair it with `scrollbar` on `provider.astro` (or `themvora({ scrollbar })`), which is what puts the hiding class and CSS in the server-rendered HTML so the native bar is never painted. The component installs the app-wide runtime itself when the page has none, so the overlay is live on the first load instead of waiting for a theme change.",
          },
          {
            name: "getThemeController()",
            desc: "The framework-neutral browser API, from `@themvora/astro/runtime`. Not a hook: a plain object with `getMode()`, `setMode()`, `setFamily()`, `toggleTheme()` and `subscribe()`, valid in any `<script>`. Idempotent — one runtime per document, shared with every other consumer.",
          },
          {
            name: "installThemeBindings()",
            desc: "Registers the delegated `click` / `change` listeners for `[data-tv-toggle]` and `[data-tv-select]` once per document, and mirrors the live selection into `[data-tv-select]` and `[data-tv-pressed]` on every change. The Themvora components call it for you; call it yourself when the markup is hand-written.",
          },
          {
            name: "data-tv-readout",
            desc: "Marks an element whose text Themvora owns. `theme` (the machine name), `label` (the theme's `meta.label`), `mode`, `family`, or `var:--theme-color-primary`. The pre-paint bootstrap patches it from `<head>`, before the body is parsed, and the controller keeps it in sync afterwards — so a server-rendered label is never painted and then corrected.",
          },
          {
            name: "data-tv-pressed",
            desc: "Marks an element as one option of a segmented control: `data-tv-pressed=\"mode\"` or `\"family\"`, with `data-tv-value` naming the option it represents. Themvora owns its `aria-pressed` — written before the first paint and kept live afterwards — so a server-rendered control never asserts a selection the page is not showing. Only `aria-pressed` is written, which is what lets a token class keyed off it (`aria-pressed:bg-primary`) keep the visual and accessible states in step.",
          },
          {
            name: "getInitialThemeState()",
            desc: "Resolves the initial state from `Astro.request` so a client island hydrates against exactly what the document rendered. Needs the registry (`config` or `themes`) and a request, so it belongs on a server-rendered page.",
          },
          {
            name: "createAstroThemePersistence() / computeFingerprint()",
            desc: "Cookie + localStorage persistence adapter, plus config fingerprinting to reject stale cookies.",
          },
        ],
      },
      {
        label: "Scoped themes",
        features: [
          {
            name: "ThemeScope.astro",
            desc: "Wrap any subtree and give it its own theme: `<ThemeScope theme=\"cocoa-dark\">`. The variables are resolved during render, so the scoped panel is correct in the first paint — an implementation that applied them from a `<script>` would paint the page theme first and repaint, which is a visible flash on every load.",
          },
          {
            name: "Props",
            desc: "`theme` (required), `themes` (only outside a provider), `as` (wrapper element, default `div`), `class`, `id`, `transition`. `class` merges with the `dark` marker the component adds for a dark theme, so Tailwind's `dark:` variants work inside the scope on the first paint.",
          },
          {
            name: "Independent of the selection",
            desc: "A scope does not read or change the app-wide selection. A page can show a cocoa panel next to a mint page, and switching the page theme leaves the panel alone.",
          },
          {
            name: "No client JavaScript by default",
            desc: "A scope is static markup. The component's script only refreshes an existing runtime's scopes when the registry is reconfigured, and honours `transition` — it never creates a runtime, so a page that only displays a scoped panel stays a page with no client framework on it.",
          },
          {
            name: "Any number per page",
            desc: "Scopes are matched by the `data-tv-scope` attribute, not by an id, so the same component can be rendered as many times as the page needs.",
          },
        ],
      },
      {
        label: "Client islands (opt-in)",
        features: [
          {
            name: "@themvora/astro/client",
            desc: "The only entry that depends on React. Exports the `ThemeProviderClient` island, the `useTheme*` hooks, the React `ThemeScope`, and `ThemeReadout`.",
          },
          {
            name: "No theme props needed",
            desc: "The registry, default theme and initial mode/family come from the transported `theme.config.ts`. Restating `initialMode` / `initialFamily` is a second source of truth: when it drifts from the config, the island's server markup disagrees with its hydrated markup (React error #418) and the text fluctuates on every load.",
          },
          {
            name: "client:load, not client:only",
            desc: "Astro server-renders the island and hydrates it in place, so the panel is in the first paint and hydration only attaches handlers. `client:only` renders nothing on the server, which is the flash the integration exists to prevent.",
          },
          {
            name: "One island, not several",
            desc: "Astro hydrates islands in an unspecified order, so two separate islands would race. Write one island whose tree contains both the provider and its consumers — `ThemeProviderClient` renders nothing itself; it is the provider half of that tree.",
          },
          {
            name: "One runtime, shared",
            desc: "`ThemeProviderClient` adopts a runtime that already exists — one a `<ThemeToggle />` or `getThemeController()` script created — instead of making a second one, and leaves its destruction to the owner. Islands and native controls can share a page.",
          },
          {
            name: "Framework renderers stay optional",
            desc: "React is an optional peer dependency. Astro-only projects never install it — choosing a React island is what pulls it in.",
          },
          {
            name: "Adding the renderer",
            desc: "Opting in is one explicit step: install `@astrojs/react` and `react`, then add `react()` next to `themvora()` in `astro.config.mjs`. The Astro + React path shows that config; the Astro-only path never registers a renderer.",
          },
          {
            name: "Client bundle cost",
            desc: "`<ThemeToggle />` and `getThemeController()` pull in the theme runtime — persistence, cross-tab sync and the DOM contract all come from `@themvora/core` rather than a second implementation. A page that only needs the *themed* document, with no interactive control, ships no client JavaScript at all: `provider.astro` and the inline bootstrap do that work on the server.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition in theme.config.ts",
            desc: "Declare `transition` once in `theme.config.ts` — `{ enabled, duration, easing, useViewTransition }`, or `true` / `false`. The runtime is built from the transported config, so native controls, the overlay scrollbar and a React island all cross-fade without per-island props. The island provider still accepts `transition` as an override for that island.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Applies the theme immediately, without animating. Use it for a one-off instant switch. The configured `transition` is live: change it on the runtime and the next theme change uses the new options (no reload, no remount). Compose the core diff/plan/runner APIs for custom animation.",
          },
        ],
      },
      {
        label: "Scrolling",
        features: [
          {
            name: "Zero-flash scroll restoration",
            desc: "On a reload or cross-document back/forward, `<ClientRouter />` stores the position in `history.state` and restores it from its deferred module — which can run after the first paint. `@themvora/astro` restores that same Astro-managed position from an inline end-of-body script, so the first frame is already at the saved position. Native restoration is left alone, no sessionStorage key is involved, and there is nothing to enable.",
          },
          {
            name: "ThemeScrollbar keeps native scrolling",
            desc: "The overlay draws rails over the page and never replaces `document.scrollingElement` or changes document height. Reload, back/forward and client-side navigation keep working with or without it. Pass `scrollbar` to the provider (or `themvora({ scrollbar })`) only to hide the native bar before first paint.",
          },
        ],
      },
    ],
    quickStart: {
      title: "theme.config.ts",
      lang: "ts",
      code: `import { defineTheme, defineThemvoraConfig } from "@themvora/core";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint Light", order: 10 },
    tokens: { colors: { background: "#f8fafc", foreground: "#0f172a" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark", order: 20 },
    tokens: { colors: { background: "#0f172a", foreground: "#f8fafc" } },
  }),
];

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
  initialFamily: "mint",
});`,
    },
    snippet: {
      title: "src/layouts/BaseLayout.astro",
      lang: "astro",
      code: `---
// The one place the provider is mounted.
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "../styles/global.css";
---

<Provider config={themeConfig} lang="en" bootstrap={false}>
  <slot />
</Provider>`,
    },
    styles: {
      title: "src/styles/global.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    snippet2: {
      title: "src/pages/index.astro",
      lang: "astro",
      code: `---
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<BaseLayout>
  <h1>Themed with no client framework</h1>

  <!-- class is forwarded to the real <button>, so your own token-driven class
       styles it — here the example button the stylesheet defines. -->
  <ThemeToggle class="themvora-example-button" />

  <!-- showMode makes the visible text the live mode. The accessible name stays
       an action, because "dark" does not say what the button does. -->
  <ThemeToggle class="themvora-example-button" showMode ariaLabel="Toggle colour scheme" />
</BaseLayout>`,
    },
    snippet3: {
      title: "src/pages/index.astro",
      lang: "astro",
      code: `---
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<BaseLayout>
  <main>
    <h1>Themed with no client framework</h1>

    <ThemeToggle />
    <ThemeToggle showMode />

    <section class="themvora-example-card">
      <div class="themvora-example-header">
        <h2 class="themvora-example-title">Semantic tokens</h2>
        <span class="themvora-example-status">Connected</span>
      </div>
      <p class="themvora-example-description">
        This panel is themed by <code>--theme-color-card</code>, a
        <code>--theme-color-border</code> outline and
        <code>--theme-color-cardForeground</code> text — no hardcoded color.
      </p>
      <p class="themvora-example-meta">
        mode: <span data-tv-readout="mode">—</span>
      </p>
      <button class="themvora-example-button" type="button">View themes</button>
    </section>
  </main>
</BaseLayout>`,
    },
    snippet4: {
      title: "getThemeController()",
      lang: "ts",
      code: `// The one runtime the provider, <ThemeToggle /> and any island share.
import { getThemeController } from "@themvora/astro/runtime";

const theme = getThemeController();

theme.getTheme();        // the resolved ThemeDefinition
theme.getMode();         // "light" | "dark" | "system" — the *selection*
theme.getResolvedMode(); // "light" | "dark" — what is actually painted
theme.getFamily();
theme.setMode("dark");
theme.setFamily("mint");
theme.toggleTheme();
theme.subscribe(({ theme, mode, family }) => { /* ... */ });`,
    },
    snippet6: {
      title: "src/pages/custom-toggle.astro",
      lang: "astro",
      code: `---
// No <ThemeToggle />, no island.
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout>
  <h1>Your own toggle</h1>

  <!-- The attribute *is* the contract. Nothing binds to this element by id. -->
  <button class="btn" data-tv-toggle>Toggle theme</button>

  <script>
    // One call, once per document. It delegates clicks from any element
    // carrying data-tv-toggle, so it does not matter how many toggles this page
    // rendered, and a toggle that a client-side navigation swaps in later works
    // without this script running again.
    import { installThemeBindings } from "@themvora/astro/runtime";

    installThemeBindings();
  </script>
</BaseLayout>`,
    },
    snippet7: {
      title: "src/pages/settings.astro",
      lang: "astro",
      code: `---
// Native controls, no script of your own.
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeFamilySelect from "@themvora/astro/ThemeFamilySelect.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<BaseLayout>
  <h1>Appearance</h1>

  <!-- Renders one <select> per dimension from theme.config.ts. -->
  <ThemeFamilySelect />

  <!-- Or hand-write the markup: data-tv-select is the whole contract. -->
  <label>
    Mode
    <select data-tv-select="mode">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  </label>

  <ThemeToggle />

  <p>
    mode: <span data-tv-readout="mode">—</span> ·
    family: <span data-tv-readout="family">—</span> ·
    theme: <span data-tv-readout="theme">—</span>
  </p>
</BaseLayout>`,
    },
    snippet8: {
      title: "src/pages/pricing.astro",
      lang: "astro",
      code: `---
// A panel that is always one theme.
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeScope from "@themvora/astro/ThemeScope.astro";
---

<BaseLayout>
  <h1>Pricing</h1>

  <!--
    Painted cocoa-dark whatever the visitor selects. The variables are in the
    server markup, so the panel is never painted with the page theme first.
  -->
  <ThemeScope theme="cocoa-dark" as="section" class="rounded-xl p-6">
    <h2>Team</h2>
    <p>Everything inside reads the scoped tokens.</p>
  </ThemeScope>

  <!-- Scopes are matched by attribute, not id: render as many as you like. -->
  <ThemeScope theme="ocean-dark" as="section" class="rounded-xl p-6">
    <h2>Enterprise</h2>
  </ThemeScope>
</BaseLayout>`,
    },
    snippet9: {
      title: "src/layouts/BaseLayout.astro",
      lang: "astro",
      code: `---
// With client-side navigation.
import { ClientRouter } from "astro:transitions";
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "../styles/global.css";
---

<Provider config={themeConfig} lang="en" bootstrap={false}>
  <!--
    With <ClientRouter />, Astro swaps the body and never re-executes a
    page's module <script> again. themvora() injects a \`before-swap\` script
    that carries the live theme onto the incoming document, so the theme,
    the readouts and every data-tv-select control survive navigation.
  -->
  <ClientRouter slot="head" />
  <slot />
</Provider>`,
    },
    reactSetup: {
      title: "astro.config.mjs",
      lang: "js",
      code: `// The only addition is the React renderer.
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora(), react()],
});`,
    },
    zeroFlashNote:
      "Included. `themvora()` injects the pre-paint bootstrap and `provider.astro` server-renders the themed `<html>`, so the first paint is already correct.",
    modeNote:
      "`theme.config.ts` declares the starting theme and mode once, and both the integration and the provider read it.",
    configNote:
      "Declared in `theme.config.ts` at the project root. `themvora()` in `astro.config.mjs` discovers it and injects the pre-paint bootstrap, and `provider.astro` reads the same file — so nothing is repeated.",
    noTheme: {
      title: "astro.config.mjs",
      lang: "js",
      code: `import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});`,
    },
    switchSnippet: {
      title: "src/components/ThemeIsland.tsx",
      lang: "tsx",
      code: `import { ThemeProviderClient, useTheme } from "@themvora/astro/client";

function Panel() {
  const { theme, mode, setMode, toggleTheme } = useTheme();

  return (
    <main
      style={{
        background: "var(--theme-color-background)",
        color: "var(--theme-color-foreground)",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button
        onClick={toggleTheme}
        style={{
          background: "var(--theme-color-primary)",
          color: "var(--theme-color-primaryForeground)",
          border: 0,
          borderRadius: "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        Toggle theme
      </button>

      <section
        style={{
          background: "var(--theme-color-card)",
          border: "1px solid var(--theme-color-border)",
          borderRadius: "0.75rem",
          marginTop: "1.5rem",
          padding: "1rem",
        }}
      >
        <h2>Themed card</h2>
        <p style={{ color: "var(--theme-color-mutedForeground)" }}>
          Surface, border and text follow the theme.
        </p>
      </section>
    </main>
  );
}

// ThemeProviderClient renders nothing — it installs the runtime. Panel is a
// sibling that reads it, and both hydrate as one island.
export default function ThemeIsland() {
  return (
    <>
      {/*
        No theme props. The registry, the default theme and the initial
        mode/family all come from the theme.config.ts the integration
        transported to the browser, so restating initialMode/initialFamily here
        would be a second source of truth for a decision the app already made.
      */}
      <ThemeProviderClient />
      <Panel />
    </>
  );
}

// Mount it from a page:
//   <ThemeIsland client:load />`,
    },
    setupGuide: {
      overview: [
        "Astro is not one setup. Themvora supports two application shapes here, and they differ in exactly one thing: whether the app ships a client framework runtime at all.",
        "The theme registry, the pre-paint bootstrap, the server-rendered `<html>` and the readout contract are identical in both. Only the interactive UI changes — a native Astro component plus a plain browser `<script>`, or a React island.",
        "Pick the shape first, then follow one path. The snippets in each path are complete for that shape, and the two paths do not overlap.",
      ],
      choose: {
        title: "Choose your setup",
        intro:
          "Both paths are fully supported. Pick the one that matches how you build interactive UI in this app — the setup switch below shows that path's steps only, and the shared behavior is explained once, after both.",
        paths: [
          {
            id: "astro-only",
            name: "Astro-only",
            badge: "No React runtime",
            summary: "Astro-native theming. No client framework, no island.",
            useWhen:
              "Use this when your application is Astro-native and does not need a client framework for Themvora UI.",
            steps: [
              {
                label: "Install",
                desc: "Two packages, neither of which pulls in a client framework.",
                install: "base",
              },
              {
                label: "Configure",
                desc: "Three files. `theme.config.ts` declares the themes and the starting mode, `astro.config.mjs` registers the integration, and the layout mounts `provider.astro`, which server-renders the themed `<html>`.",
                refs: ["quickStart", "noTheme", "snippet"],
                note: "`themvora()` discovers `theme.config.ts` at the project root, and the integration, `provider.astro` and any island all read that one file — so nothing is restated. Nothing in this path imports a client framework: the integration, the server helpers and the native components are framework-neutral, so this path installs no renderer and loads no client framework bundle on the page.",
              },
              {
                label: "Add a small UI",
                desc: "A status card with a heading, a description, a status label and a primary button. Native `.astro` markup uses `class`; inside a React island the same tree uses `className`. Nothing is styled yet.",
                refs: ["uiExample"],
                note: "The markup is framework-neutral apart from the class attribute and the file extension: the same `.themvora-example-*` classes are used by every framework guide in these docs.",
              },
              {
                label: "Use Themvora",
                desc: "`<ThemeToggle />` is a real `<button>`, so keyboard and focus behavior come from the platform. `class` is forwarded to that button, so a token-driven class of your own is the whole styling story — there is no `::part`, no wrapper element and no theme prop to learn.",
                refs: ["snippet2"],
                note: "`showMode` makes the visible text the live mode, and `ariaLabel` keeps the accessible name an action — with `showMode` the visible text is a state (\"dark\"), which does not say what the button does. `label` is the static alternative, and is ignored while `showMode` is set.",
              },
              {
                label: "Toggle without the component",
                desc: "`<ThemeToggle />` is a convenience, not the contract. The same runtime is reachable from a plain `<script>`, so you can render whatever markup you like and drive it yourself — still with no client framework.",
                refs: ["snippet6", "snippet4"],
                note: "The component also sets `data-tv-toggle` on its button and delegates clicks from any element carrying that attribute, so your own markup can be a toggle once the component is on the page. Delegation is not a style preference: Astro bundles a page's module `<script>` and never re-executes it across a `<ClientRouter />` navigation, so a per-element `getElementById(...).addEventListener(...)` binds once, matches at most one node, and is dead for any page you navigate back to. `installThemeBindings()` registers the delegated listeners once per document, which is what makes them survive. `data-tv-readout` is the matching contract for text Themvora owns: the pre-paint bootstrap patches it from `<head>`, so a server-rendered label is never painted and then corrected.",
              },
              {
                label: "Select a theme family",
                desc: "`<ThemeFamilySelect />` renders one `<select>` per dimension from `theme.config.ts`. Hand-written markup uses the same contract: put `data-tv-select=\"family\"` or `\"mode\"` on the element.",
                refs: ["snippet7"],
                note: "`data-tv-select` owns both directions. A `change` event is delegated from `document`, so every control is live however many the page rendered; and the live selection is written back into the element's `value`, so two controls of a kind never disagree and a selection restored from a cookie is displayed rather than shown as the first option. This is the case a per-element binding cannot cover: one id matches one node, and a module script that already ran will not run again.",
              },
              {
                label: "Scope a subtree",
                desc: "`<ThemeScope />` paints its children with a theme of its own. The variables are resolved in the frontmatter, so the scoped panel is correct in the server markup — no first-frame flash, and no client JavaScript unless the page already has a runtime.",
                refs: ["snippet8"],
                note: "`theme` is required and must exist in the registry; an unknown name throws with the available names rather than silently falling back to the page theme. `as` chooses the wrapper element, `class` merges with the `dark` marker the component adds for a dark theme, and `transition` is honoured once a runtime exists. Outside a `<Provider>` — or against a different registry — pass `themes`.",
              },
              {
                label: "Client-side navigation",
                desc: "With `<ClientRouter />`, Astro replaces the body and never re-executes a page's module `<script>`. `themvora()` injects a `before-swap` script that carries the live theme, the readouts and the selection onto the incoming document.",
                refs: ["snippet9"],
                note: "Without it the destination page's `<html>` attributes would be whatever that page was built with, so the theme would revert on every navigation until an island re-hydrated. The script is inert on a site that does not use `<ClientRouter />`, and `navigation: false` turns it off.",
              },
              {
                label: CANONICAL_STYLES_STEP.label,
                desc: CANONICAL_STYLES_STEP.desc,
                refs: ["styles"],
                note: "Nothing in this stylesheet is theme-specific, and it is the same one every framework guide in these docs uses. Import it from the layout — `import \"../styles.css\"` — so the rules apply to every page.",
              },
              {
                label: "Complete example",
                desc: "The same page with a themed panel, two toggles and a live readout.",
                refs: ["snippet3"],
                note: "The markup is complete without the stylesheet — it only decides how `.themvora-example-card` looks. Because those classes read variables, switching the theme re-paints them with no re-render and no per-theme CSS.",
              },
            ],
          },
          {
            id: "astro-react",
            name: "Astro + React",
            badge: "React islands",
            summary: "Astro pages with interactive React islands.",
            useWhen:
              "Use this when Astro renders the page shell but interactive themed UI is implemented with React islands.",
            steps: [
              {
                label: "Install",
                desc: "The same two Themvora packages, plus the React renderer Astro needs to hydrate an island.",
                install: "renderer",
                note: "This path additionally installs `@astrojs/react`, `react` and `react-dom`. The Themvora side is unchanged — `@themvora/astro/client` is a subpath of the package you already have, not a second package.",
              },
              {
                label: "Configure",
                desc: "Add the React integration next to `themvora()`. That registration is the whole configuration difference between the two paths.",
                refs: ["reactSetup"],
                note: "`theme.config.ts` is unchanged from the Astro-only path. The integration, `provider.astro` and the island all read that one file, so there is nothing to restate here.",
              },
              {
                label: "Add a small UI",
                desc: "The same status card as a React component. Because the island is JSX, the class attribute is `className`; the classes and the stylesheet are identical to the Astro-only path.",
                refs: ["uiExample"],
                note: "The React guide shows the same component as `WorkspaceCard.tsx`. In this shape it lives inside the island's tree, so it hydrates alongside the provider rather than in a separate island.",
              },
              {
                label: "Add React island",
                desc: "Write one island whose tree contains both the provider and its consumers. `ThemeProviderClient` renders nothing — it installs the runtime — so the panel that reads it is a sibling inside the same React tree.",
                refs: ["switchSnippet"],
                note: "Astro hydrates islands in an unspecified order, so two separate islands would race: a consumer island could hydrate before the one that installs the runtime. One island, one React tree, cannot.",
              },
              {
                label: "Native controls need no client runtime",
                desc: "Adding a renderer does not take the native component away. `<ThemeToggle />` is still a real `<button>` with no island and no `client:load`, `class` still styles it, and a plain `<script>` can drive the runtime instead of the component — so a page can mix native controls with the island.",
                refs: ["snippet2", "snippet6"],
                note: "The island adopts the runtime `<ThemeToggle />` or a `getThemeController()` script already installed, rather than creating a second one. A page that only needs the themed document — no interactive control at all — still ships no client JavaScript: `provider.astro` and the inline bootstrap do that work on the server.",
              },
              {
                label: "Use React APIs",
                desc: "Read the theme with `useTheme()` and render values with `ThemeReadout`. The `.astro` page only mounts the island with a hydration directive.",
                snippets: [
                  {
                    title: "src/components/ThemePanel.tsx",
                    lang: "tsx",
                    code: `// The React half of the island.
import { ThemeReadout, useTheme } from "@themvora/astro/client";

export function ThemePanel() {
  // Setters only. The values this hook returns are for behaviour, not display:
  // they read through \`useSyncExternalStore\`, so during hydration they hold the
  // server's resolution and a line rendered from them changes a few frames
  // after paint.
  const { setMode, setFamily, toggleTheme } = useTheme();

  return (
    <section>
      <p>
        theme: <ThemeReadout kind="theme" fallback="—" /> · mode:{" "}
        <ThemeReadout kind="mode" fallback="—" /> · family:{" "}
        <ThemeReadout kind="family" fallback="—" />
      </p>

      <button onClick={() => toggleTheme()}>Toggle light / dark</button>
      <button onClick={() => setMode("system")}>System</button>
      <button onClick={() => setFamily("mint")}>Mint family</button>

      <p>
        Resolved: <ThemeReadout kind="label" fallback="—" /> · selection:{" "}
        <ThemeReadout kind="mode" fallback="—" /> /{" "}
        <ThemeReadout kind="family" fallback="—" />
      </p>
    </section>
  );
}`,
                  },
                  {
                    title: "src/pages/island.astro",
                    lang: "astro",
                    code: `---
// The Astro half: mount the island, nothing else.
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeIsland from "../components/ThemeIsland";
---

<BaseLayout>
  <h1>React island</h1>
  <p>
    Interactive themed UI lives inside the island. The page itself stays Astro.
  </p>

  <ThemeIsland client:load />
</BaseLayout>`,
                  },
                ],
                note: "React hooks are not available inside `.astro` files, and `useTheme()` cannot be called from frontmatter. The boundary is explicit: an Astro page renders a React island, the island renders React components, and only those components call the React Themvora API. Note that every theme value on screen is a `ThemeReadout`, including the ones `useTheme()` also returns: those are read through `useSyncExternalStore`, so during hydration they still hold the server's resolution — which cannot know the persisted selection or `prefers-color-scheme` — and a line rendered from them changes from one theme name to another a few frames after paint. Compare and derive with them; display with a readout.",
              },
              {
                label: "Scope a subtree",
                desc: "`ThemeScope` from `@themvora/astro/client` is the island-side equivalent of `ThemeScope.astro`: the same props, the same resolved-in-render variables, and the same independence from the app-wide selection.",
                snippets: [
                  {
                    title: "src/components/PricingPanel.tsx",
                    lang: "tsx",
                    code: `// A React subtree with its own theme.
import { ThemeScope } from "@themvora/astro/client";

export function PricingPanel() {
  return (
    <>
      <ThemeScope theme="cocoa-dark" className="rounded-xl p-6">
        <h2>Team</h2>
        <p>Always cocoa-dark, whatever the visitor selects.</p>
      </ThemeScope>

      <ThemeScope theme="ocean-dark" className="rounded-xl p-6">
        <h2>Enterprise</h2>
      </ThemeScope>
    </>
  );
}`,
                  },
                ],
                note: "Pick the component by where the subtree lives, not by capability: `ThemeScope.astro` inside an `.astro` page, `ThemeScope` from `@themvora/astro/client` inside a React island. Both resolve the variables during render, so neither flashes; both are independent of the selection, and both are matched by attribute rather than id, so a page can render as many as it needs.",
              },
              {
                label: CANONICAL_STYLES_STEP.label,
                desc: CANONICAL_STYLES_STEP.desc,
                refs: ["styles"],
                note: "The Astro-only path imports this same file from the shared layout, so the two paths look identical for the same theme — the React island changes which framework renders the controls, not what the tokens paint.",
              },
              {
                label: "Complete example",
                desc: "The React path is these three files: the island component, the panel it renders, and the Astro page that mounts it. The island adopts the runtime the native controls use, so this page and the Astro-only page can coexist in one app.",
                note: "`src/components/ThemeIsland.tsx` (the island), `src/components/ThemePanel.tsx` (the React UI), `src/pages/island.astro` (the hydration directive). The themed document itself is still rendered by `provider.astro` in the shared layout.",
              },
            ],
          },
        ],
        columns: ["Astro-only", "Astro + React"],
        decision: {
          title: "Which one should I use?",
          lines: [
            "Choose Astro-only when your UI can stay in Astro and browser scripts, and you do not need a client UI framework for Themvora UI.",
            "Choose Astro + React when interactive themed UI is implemented inside React islands.",
            "Neither is more capable than the other: both paths drive one runtime, and a page can mix them — an island adopts a runtime that a `<ThemeToggle />` or `getThemeController()` script already installed, instead of creating a second one.",
          ],
        },
        comparison: [
          { area: "Astro integration — `themvora()`", a: "yes", b: "yes" },
          { area: "`@astrojs/react` + `react`", a: "no", b: "yes" },
          { area: "React runtime in the bundle", a: "no", b: "yes" },
          { area: "React island", a: "no", b: "optional — only for React UI" },
          { area: "React hooks (`useTheme`)", a: "no", b: "yes" },
          {
            area: "Astro-native usage — `<ThemeToggle />`, `getThemeController()`",
            a: "yes",
            b: "yes",
          },
          { area: "SSR + pre-paint bootstrap", a: "shared", b: "shared" },
          { area: "Theme definitions — `theme.config.ts`", a: "shared", b: "shared" },
        ],
      },
      boundary: `Astro page
   ↓
React island   (client:load)
   ↓
React Themvora API   (@themvora/astro/client)`,
      shared: {
        title: "Shared behavior",
        intro:
          "These are identical in both paths — there is one implementation, and choosing a path does not change any of it. They are explained once, here.",
        sections: [
          {
            id: "shared-themes",
            title: "Themes and tokens",
            body: "Themes are declared once, in `theme.config.ts`, with `defineTheme` — a name, optional `meta` (family, mode, label) and a `tokens` object. `themvora()` discovers that file at the project root and `provider.astro` renders from the same object, so both paths share one registry. Tokens reach CSS as `--theme-color-*` custom properties. The file is optional: with no discoverable config, the integration and the provider both fall back to the built-in themes and nothing fails. It is still where an app's own palette belongs, and both paths below declare it.",
          },
          {
            id: "shared-bootstrap",
            title: "Bootstrap and zero-flash",
            body: "`themvora()` injects the pre-paint bootstrap at the `head-inline` stage, so the persisted selection is applied before the first paint rather than after hydration. For a `system` selection the server emits both schemes as `prefers-color-scheme` media blocks instead of inline variables — an inline variable would outrank the media query meant to correct it. A page that only needs the themed document ships no client JavaScript at all.",
          },
          {
            id: "shared-ssr",
            title: "SSR",
            body: "On a server-rendered page there is a request, so resolve the selection once with `getInitialThemeState()` and hand the result to `provider.astro` as `initial` — and to the island as `initial` if this page has one. Both then render the one resolution and cannot drift. A prerendered page has no request: the server cannot read the theme cookies, so the injected bootstrap applies the persisted selection in the browser and the runtime adopts what it painted.",
          },
          {
            id: "shared-readouts",
            title: "Readouts and the hydration contract",
            body: "`data-tv-readout` marks an element whose text Themvora owns. The pre-paint bootstrap patches it from `<head>`, before the body is parsed, and the runtime keeps it in sync afterwards — so a server-rendered value is never painted and then corrected. In React the same contract is `ThemeReadout` from `@themvora/astro/client`, which carries `suppressHydrationWarning` so React does not overwrite the patched text with its own server render. A plain `<span>{mode}</span>` inside an island is painted with the server's value and corrects itself after hydration — the `text fluctuates on reload` symptom.",
          },
          {
            id: "shared-controls",
            title: "Selection controls",
            body: "Interactive controls are attributes, not element bindings. `data-tv-toggle` marks a toggle, `data-tv-select=\"family\"` or `\"mode\"` marks a `<select>`, and `installThemeBindings()` registers one delegated listener per document for both. That is what makes the contract hold in Astro specifically: the page's module `<script>` is bundled once and never re-executed across a `<ClientRouter />` navigation, so a `document.getElementById(...)` binding matches at most one node, misses any second control of the same kind, and is dead for a page you navigate back to. `<ThemeToggle />` and `<ThemeFamilySelect />` call `installThemeBindings()` themselves; a hand-written page calls it once.",
          },
          {
            id: "shared-navigation",
            title: "Client-side navigation",
            body: "With `<ClientRouter />`, Astro parses the destination into a detached document and copies its `<html>` attributes over the live root. Because the pre-paint bootstrap is byte-identical on every page, it is de-duplicated and does not run again — so without help the theme would revert to whatever the destination page was built with. `themvora()` injects a `before-swap` script that copies the live classes, `data-theme*` attributes, inline variables and `tv-scrollbar` state onto the incoming document, and carries the parts that live inside the body: `[data-tv-readout]` text, matched by kind, and the selected option of every `[data-tv-select]`, read from `data-theme-selection-*`. It registers one listener and never touches the runtime, so a site without `<ClientRouter />` is unaffected; `navigation: false` opts out.",
          },
        ],
      },
      examples: {
        title: "Examples",
        intro:
          "Two complete, runnable apps — one per path, each built from this guide alone. They share no code, so either can be read on its own and copied into a project as-is.",
        apps: [
          {
            label: "Astro-only",
            path: "examples/apps/astro-native",
            note: "`src/pages/index.astro` — themed, toggled, selected and read out with no client framework. It uses `<ThemeToggle />`, `<ThemeFamilySelect />` and `<ThemeScope />`; no React is loaded on any page.",
          },
          {
            label: "Astro + React",
            path: "examples/apps/astro-react",
            note: "`src/pages/index.astro` + `src/components/ThemeIsland.tsx` — one island (`client:load`) containing the provider and its consumers, and a `/native` page that shows the native controls and the island sharing one runtime.",
          },
        ],
      },
      caveatsIntro:
        "Both paths share one core, so the Astro-specific behavior below applies to either one.",
    },
  },
  {
    slug: "nuxt",
    name: "Nuxt 4",
    icon: icons.nuxt,
    pkg: "@themvora/nuxt",
    uiExample: {
      title: "app/components/WorkspaceCard.vue",
      lang: "vue",
      code: `<template>
  <div class="themvora-example-card">
    <div class="themvora-example-header">
      <h3 class="themvora-example-title">Design system</h3>
      <span class="themvora-example-status">Active</span>
    </div>
    <p class="themvora-example-description">
      Tokens resolve at runtime, so this card follows whichever theme is active.
    </p>
    <p class="themvora-example-meta">Updated 2 minutes ago</p>
    <button class="themvora-example-button" type="button">View themes</button>
  </div>
</template>`,
    },
    tagline:
      "Nuxt 4 module with server-rendered theming, cookie sync, auto-imported composables, and config-driven options.",
    mark: "Nu",
    tags: ["Module", "SSR", "Zero-flash", "Auto-import"],
    groups: [
      {
        label: "Server",
        features: [
          {
            name: "SSR-first theme resolution",
            desc: "Reads `theme-name`, `theme-mode`, `theme-family`, `theme-fingerprint` cookies, validates the fingerprint, resolves the initial theme, and renders `<html data-theme>` with inline CSS variables before hydration.",
          },
          {
            name: "Blocking bootstrap script",
            desc: "Emits a blocking script in `<head>` that applies the persisted theme before first paint.",
          },
          {
            name: "Dark-mode CSS fallback",
            desc: "Emits `@media (prefers-color-scheme: dark)` styles when the persisted mode is `system`.",
          },
          {
            name: "Cookie + localStorage sync",
            desc: "The client mirrors selection back to cookies so the server renders the right theme on the next request — same contract as `@themvora/next`.",
          },
        ],
      },
      {
        label: "Client",
        features: [
          {
            name: "Runtime plugin",
            desc: "A Nuxt plugin installs one app-wide runtime, provided to `useTheme()`, `useThemeRuntime()` and every auto-imported composable.",
          },
          {
            name: "Auto-imports",
            desc: "Composables (`useTheme`, `useThemeMode`, `useThemeHistory`, …) and components (`ThemeScope`, `ThemeScrollbar`) are auto-imported — no manual imports. Outside the auto-import scope, import them from `@themvora/vue`; Nuxt's import protection rejects a module's entry point in app code.",
          },
          {
            name: 'configKey: "themvora"',
            desc: "Configure `themes`, `defaultTheme`, `initialMode`, `initialFamily`, `transition`, `scrollbar`, `storageKey` and `scheduled` in `nuxt.config.ts`.",
          },
          {
            name: "useThemeSchedule()",
            desc: "Auto-imported composable exposing the sunrise/sunset schedule: reactive `state` (`enabled`, `status`, `sunrise`, `sunset`, `nextTransition`) plus `enable()`/`disable()`/`set()`. Configure via `scheduled` in the module config.",
          },
          {
            name: "useProvidedThemes()",
            desc: "The auto-imported family catalogue, as a `ref` the template unwraps. Each entry is a family: select by `entry.family`, not `entry.name`, because the name is only the display label.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition in nuxt.config.ts",
            desc: "Configure `transition` in the `themvora` config object to enable CSS transitions on theme changes. Duration/easing are set once; Themvora generates the transition styles at runtime.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Per-update escape hatch: `runtime.store.set(theme, { suppressTransition: true })` skips the configured animation. For custom animation orchestration, compose the core diff/plan/runner APIs.",
          },
        ],
      },
      {
        label: "Scrollbar",
        features: [
          {
            name: "scrollbar: true",
            desc: "Enables Themvora's custom overlay scrollbar. The SSR bootstrap hides the native scrollbar before first paint, then the overlay engine synchronizes with browser scrolling without replacing native scroll behavior.",
          },
          {
            name: "scrollbar option",
            desc: "Configure the overlay appearance (thickness, radius, colors, auto-hide, …) from the `themvora` config; the overlay stays theme-aware and updates with runtime theme changes.",
          },
        ],
      },
    ],
    quickStart: {
      title: "nuxt.config.ts",
      lang: "ts",
      code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  // Keep your stylesheet, and add the scrollbar styles that ship with core
  // (not the module) whenever scrollbar is enabled.
  css: ["~/assets/css/main.css", "@themvora/core/scrollbar.css"],
  themvora: {
    defaultTheme: "mint-light",
    initialMode: "system",
    transition: { duration: 360, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    scrollbar: true,
  },
});`,
    },
    snippet: {
      title: "app/components/ThemeSwitcher.vue",
      lang: "vue",
      code: `<script setup lang="ts">
// useTheme is auto-imported by the module — no import statement needed.
const { theme, mode, toggleTheme } = useTheme();
</script>

<template>
  <main class="page">
    <h1>Themvora</h1>
    <p>Current theme: {{ theme.name }} ({{ mode }})</p>

    <button class="primary" @click="toggleTheme">Toggle theme</button>

    <section class="card">
      <h2>Themed card</h2>
      <p class="muted">Surface, border and text follow the theme.</p>
    </section>
  </main>
</template>

<style scoped>
  .page {
    background: var(--theme-color-background);
    color: var(--theme-color-foreground);
    min-height: 100vh;
    padding: 2rem;
  }
  .primary {
    background: var(--theme-color-primary);
    color: var(--theme-color-primaryForeground);
    border: 0;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
  }
  .card {
    background: var(--theme-color-card);
    border: 1px solid var(--theme-color-border);
    border-radius: 0.75rem;
    margin-top: 1.5rem;
    padding: 1rem;
  }
  .muted {
    color: var(--theme-color-mutedForeground);
  }
</style>`,
    },
    snippet2: {
      title: "app/components/ThemeHistoryControls.vue",
      caption: "Undo, redo and the two can-do refs, with no import statements — the module supplies them.",
      lang: "vue",
      code: `<script setup lang="ts">
// Both composables and both components are auto-imported by the module.
const { undo, redo, canUndo, canRedo } = useThemeHistory();
const { theme, setFamily } = useTheme();
</script>

<template>
  <ThemeScope theme="plum-dark" :transition="{ duration: 300, easing: 'ease' }">
    <p>This subtree is always plum-dark.</p>
  </ThemeScope>

  <button @click="undo" :disabled="!canUndo">Undo</button>
  <button @click="redo" :disabled="!canRedo">Redo</button>

  <button @click="setFamily('mint')">{{ theme.name }}</button>

  <ThemeScrollbar :behavior="{ autoHide: true }" />
</template>`,
    },
    zeroFlashNote:
      "Included. The module emits the pre-paint bootstrap and server-renders the themed `<html>`.",
    modeNote:
      "`themvora.initialMode` in `nuxt.config.ts` decides the starting mode, and `themvora.defaultTheme` picks the theme.",
    configNote:
      "Declared in `nuxt.config.ts` under the `themvora` key. The module reads it and emits the pre-paint bootstrap, so nothing is repeated elsewhere.",
    styles: {
      title: "app/assets/css/main.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One module. It registers the runtime plugin and generates the auto-imports.",
        install: true,
      },
      {
        label: "Set up",
        desc: "The module resolves the initial theme on the server from cookies, registers the client runtime once as a plugin, and auto-imports the composables and components. In Nuxt 4 the app lives in `app/`, so `~` points at `app/` and `~/assets/css/main.css` is `app/assets/css/main.css`.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. `useTheme()` is auto-imported, so the component needs no import for it; the next step styles the classes.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "Render the auto-imported component in `app/app.vue` (Nuxt registers anything in `app/components/`). It reads and writes the runtime: pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "History controls in a component",
      intro: "The module auto-imports everything the component needs, so the file below is the component and nothing else.",
    },
    appFile: {
      title: "app/app.vue",
      lang: "vue",
      code: `<template>
  <div>
    <ThemeSwitcher />
    <WorkspaceCard />
  </div>
</template>`,
    },
    noTheme: {
      title: "nuxt.config.ts",
      lang: "ts",
      code: `export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  // Nuxt 4: the app lives in app/, so "~" resolves this to
  // app/assets/css/main.css (the file from the styling step).
  css: ["~/assets/css/main.css"],
  themvora: {
    defaultTheme: "light",
  },
});`,
    },
  },
  {
    slug: "remix",
    name: "Remix",
    icon: icons.remix,
    pkg: "@themvora/remix",
    uiExample: {
      title: "app/components/workspace-card.tsx",
      lang: "tsx",
      code: `export function WorkspaceCard() {
  return (
    <div className="themvora-example-card">
      <div className="themvora-example-header">
        <h3 className="themvora-example-title">Design system</h3>
        <span className="themvora-example-status">Active</span>
      </div>
      <p className="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p className="themvora-example-meta">Updated 2 minutes ago</p>
      <button className="themvora-example-button" type="button">View themes</button>
    </div>
  );
}`,
    },
    tagline:
      "Resolve the theme in a loader, paint it before first paint, then hydrate a matching runtime.",
    mark: "Re",
    tags: ["SSR", "Loaders", "Hydration"],
    groups: [
      {
        label: "Server",
        features: [
          {
            name: "createThemeDocument()",
            desc: "Pass the registry, fallback theme, `mode` and the optional `transition` / `scrollbar` settings once. Returns `resolveInitial(request)` plus a `Document` component that renders the blocking head script, the matching `<html>` shell and the runtime provider from the same configuration. This is the preferred root setup.",
          },
          {
            name: "theming.resolveInitial()",
            desc: "Reads the `theme-mode` / `theme-family` / `theme-fingerprint` cookies off the request and resolves them against the frozen configuration. Call it in the root loader; request state is never stored on the handle, so concurrent requests stay isolated.",
          },
          {
            name: "getInitialThemeState()",
            desc: "The lower-level resolver behind `resolveInitial()`, imported from `@themvora/remix/server`. Reach for it only when you assemble the document yourself — the factory exists so the loader, script, shell and provider cannot drift apart.",
          },
          {
            name: "ThemeHead",
            desc: "The lower-level head script: emits the blocking bootstrap so the page paints already themed, plus the `prefers-color-scheme` dark fallback for `system` mode. `<theming.Document>` renders it for you; use it directly only in a hand-written `<head>`.",
          },
          {
            name: "getThemeShellProps()",
            desc: "The lower-level `<html>` shell: the attributes and CSS variables the blocking script writes, plus `suppressHydrationWarning` for the resolved mode the server cannot know. `<theming.Document>` spreads it for you — hand-copying seven attributes is what this prevents.",
          },
          {
            name: "SSR-first resolution",
            desc: "Request → root loader → resolve initial state → HTML document → browser hydration. The server resolves the theme, so the first paint already matches the hydrated client.",
          },
        ],
      },
      {
        label: "Client",
        features: [
          {
            name: "ThemeProvider",
            desc: "Mounted by `Document` around the route tree with the loader-resolved state, and it mirrors the selection back to cookies on change. Mount the provider once, in `app/root.tsx`; nested routes inherit it through `<Outlet />`.",
          },
          {
            name: "createRemixThemePersistence()",
            desc: "Builds the adapter the provider uses: localStorage plus the `theme-mode`, `theme-family` and `theme-fingerprint` cookies the loader reads on the next request.",
          },
          {
            name: "Full hook set + ThemeScope",
            desc: "Every React hook plus scoped subtrees — re-exported from `@themvora/react`.",
          },
          {
            name: "Intentional React dependency",
            desc: "Remix is a React framework, so `@themvora/remix` depends on `@themvora/core` + `@themvora/react` directly. No other framework or adapter package is pulled in.",
          },
        ],
      },
      {
        label: "Routing",
        features: [
          {
            name: "Provider lives in the root",
            desc: "`app/root.tsx` declares the document once; nested routes and layouts inherit the runtime through `<Outlet />`.",
          },
          {
            name: "Route-level scopes",
            desc: "Wrap a route subtree in `ThemeScope` to pin it to a theme without changing the global selection.",
          },
        ],
      },
      {
        label: "Transition",
        features: [
          {
            name: "transition option",
            desc: "Pass `transition` to `createThemeDocument()` to animate theme changes — `true`, `false`, or `{ enabled, duration, easing, preset }`. The provider receives the same object, so the document and the runtime cannot disagree.",
          },
          {
            name: "runtime.store.set(theme, { suppressTransition: true })",
            desc: "Per-update escape hatch: `runtime.store.set(theme, { suppressTransition: true })` skips the configured animation. For custom animation orchestration, compose the core diff/plan/runner APIs.",
          },
        ],
      },
      {
        label: "Scrollbar",
        features: [
          {
            name: "scrollbar option",
            desc: "The `scrollbar` option in `createThemeDocument()` adds `tv-scrollbar` to `<html>` and emits the pre-paint hiding stylesheet in `<head>`, so the native bar is never painted. Import `@themvora/core/scrollbar.css` yourself — a CSS import is a bundler concern.",
          },
          {
            name: "Import the pre-paint styles",
            desc: "Both halves are required: the class without the stylesheet hides nothing, and the stylesheet without the class has no effect. `Document` renders the class; your global stylesheet supplies the import.",
          },
        ],
      },
    ],
    quickStart: {
      title: "app/root.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import "@themvora/core/scrollbar.css";
import { createThemeDocument } from "@themvora/remix";
import styles from "./styles.css?url";

// The stylesheet is linked, not imported for side effects: Remix's Vite
// plugin expects the \`links\` export to own the document's CSS.
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

const themes = getBuiltInThemes();

// One static configuration. The loader helper, the blocking head script, the
// <html> shell and the runtime are all derived from this object, so they
// cannot drift apart — which is what removes both the flash and the
// hydration mismatch.
const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  transition: { enabled: true, duration: 250 },
  scrollbar: true,
});

export async function loader({ request }: { request: Request }) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  const { theme } = useLoaderData<typeof loader>();

  return (
    // Remix owns the document; Document supplies the theme-owned parts: the
    // blocking bootstrap, the matching <html> shell and the runtime provider.
    // \`scrollbar\` adds the tv-scrollbar class the pre-paint stylesheet is
    // scoped to, and \`transition\` reaches the runtime through the provider.
    <theming.Document
      initial={theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1"
        />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return <Outlet />;
}`,
    },
    snippet: {
      title: "app/routes/_index.tsx",
      lang: "tsx",
      code: `// The document in app/root.tsx supplies the runtime, so a route just reads it.
import { useTheme } from "@themvora/remix";

export default function Index() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main
      style={{
        background: "var(--theme-color-background)",
        color: "var(--theme-color-foreground)",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <h1>Themvora</h1>
      <p>
        Current theme: {theme.name} ({mode})
      </p>

      <button
        onClick={toggleTheme}
        style={{
          background: "var(--theme-color-primary)",
          color: "var(--theme-color-primaryForeground)",
          border: 0,
          borderRadius: "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        Toggle theme
      </button>

      <section
        style={{
          background: "var(--theme-color-card)",
          border: "1px solid var(--theme-color-border)",
          borderRadius: "0.75rem",
          marginTop: "1.5rem",
          padding: "1rem",
        }}
      >
        <h2>Themed card</h2>
        <p style={{ color: "var(--theme-color-mutedForeground)" }}>
          Surface, border and text follow the theme.
        </p>
      </section>
    </main>
  );
}`,
    },
    snippet2: {
      title: "app/themes.ts",
      caption: "The theme array the root loader imports: the one place the catalogue is defined.",
      lang: "ts",
      code: `// Imported as \`./themes\` from app/root.tsx.
import { defineTheme } from "@themvora/core";

export const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: {
      colors: { primary: "#10b981", background: "#f0fdf9" },
    },
  }),
];`,
    },
    snippet3: {
      title: "app/components/history-scope.tsx",
      caption: "`ThemeScope` inside a route component, with the history controls next to it.",
      lang: "tsx",
      code: `// Used inside the root provider, so it does NOT create a second runtime of its own.
import { ThemeScope, useThemeHistory } from "@themvora/remix";

export function HistoryScope() {
  const { undo, redo, canUndo, canRedo } = useThemeHistory();

  return (
    <div>
      <div>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>

      <ThemeScope theme="plum-dark" transition={{ duration: 300, easing: "ease" }}>
        <span>Always plum-dark</span>
      </ThemeScope>
    </div>
  );
}`,
    },
    zeroFlashNote:
      "Included: `createThemeDocument()` derives the pre-paint script, the `<html>` shell and the provider from one configuration, so the first byte already carries the resolved theme. The lower-level `ThemeHead` + `getThemeShellProps()` pair does the same thing when you assemble the document by hand.",
    modeNote:
      "The loader resolves the initial state from the request cookies, so the first paint already matches. `mode` in `createThemeDocument()` is the single value the pre-paint script and the runtime both read — there is no second copy to keep in step.",
    configNote:
      "Themes and the starting mode are declared once, in `createThemeDocument()`, and the loader, the script, the shell and the runtime all read that object. Remix renders its own document, so there is no bundler plugin to add.",
    styles: {
      title: "app/styles.css",
      lang: "css",
      code: CANONICAL_STYLES,
    },
    guideSteps: [
      {
        label: "Install",
        desc: "One package. It depends on the core and the React integration directly, because Remix is a React framework and there is no framework-neutral layer to preserve.",
        install: true,
      },
      {
        label: "Set up",
        desc: "Remix renders `<html>`, so the root route is where the theme goes: `createThemeDocument()` declares the configuration once, a loader resolves the selection from it, and `<theming.Document>` renders the pre-paint script, the `<html>` shell and the runtime provider together.",
        ref: "noTheme",
        note: "mode",
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. It is an ordinary route component; the classes are styled in the next step.",
        ref: "uiExample",
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles",
      },
      {
        label: "Run and choose a theme",
        desc: "The document in `app/root.tsx` installs the runtime, and a route component toggles it. Pick another supplied family or a custom theme and the card repaints — its colours never name a hex value.",
        ref: "snippet",
      },
    ],
    moreExamples: {
      title: "The theme catalogue, and a scoped route",
      intro: "One file defines the themes the loader reads; the other scopes a subtree inside a route and puts history controls next to it.",
    },
    noTheme:     {
      title: "app/root.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { createThemeDocument } from "@themvora/remix";
import styles from "./styles.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
});

export async function loader({ request }: { request: Request }) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  const { theme } = useLoaderData<typeof loader>();

  return (
    // Remix owns the document; Document supplies the theme-owned parts: the
    // blocking bootstrap, the matching <html> shell and the runtime provider.
    <theming.Document
      initial={theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return <Outlet />;
}`,
    },
  },
  {
    slug: "react-router",
    name: "React Router",
    icon: icons.reactRouter,
    pkg: "@themvora/remix",
    path: "/framework-guides/remix/react-router",
    nested: true,
    projectPrerequisite: "A React Router Framework Mode project created with create-react-router (react-router 8.5.1, @react-router/dev, SSR enabled). A Remix v2 project uses the Remix guide instead — the two frameworks share this package but not their root-route conventions.",
    uiExample: {
      title: "app/components/workspace-card.tsx",
      lang: "tsx",
      code: `export function WorkspaceCard() {
  return (
    <div className="themvora-example-card">
      <div className="themvora-example-header">
        <h3 className="themvora-example-title">Design system</h3>
        <span className="themvora-example-status">Active</span>
      </div>
      <p className="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p className="themvora-example-meta">Updated 2 minutes ago</p>
      <button className="themvora-example-button" type="button">View themes</button>
    </div>
  );
}`
    },
    tagline: "One configuration for the root loader, the blocking head script, the document shell and the runtime.",
    mark: "RR",
    tags: ["SSR", "Framework Mode", "Hydration"],
    groups: [
      {
        label: "Server",
        features: [
          {
            name: "createThemeDocument()",
            desc: "Pass the registry, default theme, mode and scrollbar option once. Returns `resolveInitial(request)` and the `Document` component, so the loader, script, shell and provider cannot disagree."
          },
          {
            name: "theming.resolveInitial()",
            desc: "Reads `theme-mode` / `theme-family` / `theme-fingerprint` from the request and resolves them against the same frozen configuration. Request state is never stored on the handle."
          },
          {
            name: "SSR-first resolution",
            desc: "Root loader → static configuration → resolved `initial` state → server-rendered document → hydration. The first byte already carries the correct theme."
          }
        ]
      },
      {
        label: "Client",
        features: [
          {
            name: "ThemeProvider",
            desc: "Mounted by `Document` around the route tree, with the request-resolved state. Selection changes mirror back to the cookies the root loader reads."
          },
          {
            name: "Full hook set + ThemeScope",
            desc: "Every React hook plus scoped subtrees, re-exported from `@themvora/react` through this package."
          },
          {
            name: "createRemixThemePersistence()",
            desc: "The adapter behind the provider: localStorage plus the cookie contract the root loader reads. The name is historical; it is framework-neutral."
          }
        ]
      },
      {
        label: "Routing",
        features: [
          {
            name: "Root route owns the document",
            desc: "The root `Layout` still renders `<html>`, `<head>` and `<body>`; `Document` only supplies the theme-owned parts. Ownership stays with React Router."
          },
          {
            name: "Route-level scopes",
            desc: "Wrap a route subtree in `ThemeScope` to pin it to a theme without changing the global selection."
          },
          {
            name: "Error-boundary fallback",
            desc: "`Layout` can render while the root loader is unavailable. Passing a missing `initial` falls back to the configuration's static resolution instead of throwing inside the boundary."
          }
        ]
      },
      {
        label: "Scrollbar",
        features: [
          {
            name: "scrollbar option",
            desc: "The `scrollbar` option in `createThemeDocument()` adds `tv-scrollbar` to `<html>` and emits the pre-paint hiding stylesheet in `<head>`."
          },
          {
            name: "Import the pre-paint styles",
            desc: "Import `@themvora/core/scrollbar.css`; the class and the stylesheet are both required, and `Document` renders the class for you."
          }
        ]
      }
    ],
    quickStart: {
      title: "app/root.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { getBuiltInThemes } from "@themvora/core";
import "@themvora/core/scrollbar.css";
import { ThemeScrollbar } from "@themvora/remix";
import { createThemeDocument } from "@themvora/remix/react-router";
import type { Route } from "./+types/root";
import "./app.css";

const themes = getBuiltInThemes();

// One static configuration. The loader helper, the blocking head script, the
// <html> shell and the runtime are all derived from this object.
const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  // The layout can render while the root loader is unavailable (an error
  // response). Document then uses its static fallback instead of throwing.
  const data = useRouteLoaderData<typeof loader>("root");

  return (
    <theming.Document
      initial={data?.theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1"
        />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return (
    <>
      <ThemeScrollbar />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error)
    ? error.status === 404
      ? "404"
      : "Error"
    : "Oops!";

  return <main className="page">{message}</main>;
}`
    },
    quickStartExtra: {
      title: "app/routes.ts",
      lang: "ts",
      code: `import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Framework Mode route config. The root route itself is implicit: app/root.tsx
// owns the document, and the loader there resolves the theme for every request.
export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;`
    },
    snippet: {
      title: "app/routes/home.tsx",
      lang: "tsx",
      code: `// The root document mounted the provider, so a route just reads the runtime.
import {
  useProvidedThemes,
  useSetThemeFamily,
  useTheme,
} from "@themvora/remix";
import type { Route } from "./+types/home";

const modes = ["system", "light", "dark"] as const;

export function meta({}: Route.MetaArgs) {
  return [{ title: "Themvora + React Router" }];
}

export default function Home() {
  const { theme, mode, effectiveMode, setMode, toggleTheme } = useTheme();
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <main>
      <p>
        {theme.name} · requested {mode} · showing {effectiveMode}
      </p>

      <div role="group" aria-label="Theme mode">
        {modes.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <label>
        Family
        <select
          value={theme.meta?.family ?? ""}
          onChange={(event) => setFamily(event.target.value)}
        >
          {families.map((family) => (
            <option key={family.id} value={family.family}>
              {family.name}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={toggleTheme}>
        Toggle light/dark
      </button>
    </main>
  );
}`
    },
    snippet2: {
      title: "app/themes.ts",
      caption: "The registry the root configuration imports: defined once, shared by every layer.",
      lang: "ts",
      code: `// Imported as \`./themes\` from app/root.tsx.
import { defineTheme } from "@themvora/core";

export const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: {
      colors: { primary: "#10b981", background: "#f0fdf9" },
    },
  }),
];`
    },
    snippet3: {
      title: "app/routes/pricing.tsx",
      caption: "A route scoped to one theme, inside the root provider.",
      lang: "tsx",
      code: `import { ThemeScope } from "@themvora/remix";

export default function Pricing() {
  return (
    <ThemeScope theme="plum-dark">
      <h1>Pricing</h1>
    </ThemeScope>
  );
}`
    },
    zeroFlashNote: "The root loader resolves the request cookies and `Document` emits the blocking script in `<head>` before the runtime mounts. The shell renders the same attributes the script writes, so hydration matches.",
    modeNote: "The `mode` in `createThemeDocument()` is the only starting-mode input. The loader, the pre-paint script and the provider all read it from the same object — there is no second constant to keep in sync.",
    configNote: "The configuration lives in `app/root.tsx`: `createThemeDocument({ themes, defaultTheme, mode, scrollbar })`. React Router itself is configured in `app/routes.ts`, `vite.config.ts` and `react-router.config.ts`.",
    prerequisiteInstall: {
      label: "Only if you haven't created the React Router project yet",
      packages: ["react-router", "@react-router/dev", "@react-router/node", "@react-router/serve"]
    },
    styles: {
      title: "app/app.css",
      lang: "css",
      code: `/* Themvora emits its design tokens as CSS custom properties on the root
   element, so a stylesheet only has to read them. Nothing here is
   theme-specific: these rules render every theme, including ones you add
   later. */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.themvora-example-card {
  display: grid;
  gap: 10px;
  max-width: 22rem;
  padding: 16px;
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  font-family: inherit;
  line-height: 1.5;
  box-shadow: var(--theme-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.06));
}

.themvora-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.themvora-example-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.themvora-example-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-color-success);
}

.themvora-example-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}

.themvora-example-description {
  margin: 0;
  font-size: 13px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-meta {
  margin: 0;
  font-size: 12px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-button {
  justify-self: start;
  padding: 8px 14px;
  border: 0;
  /* Presets and generated themes emit --theme-radius-lg and nothing else on
     the radius scale, so the smaller step is derived from it rather than
     assumed — the same proportion the utility-class mapping uses. */
  border-radius: calc(var(--theme-radius-lg, 12px) * 0.8);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.themvora-example-button:hover {
  filter: brightness(1.08);
}

.themvora-example-button:focus-visible {
  outline: 2px solid var(--theme-color-ring);
  outline-offset: 2px;
}`
    },
    guideSteps: [
      {
        label: "Install",
        desc: "Install the core runtime and the integration. React Router, `@react-router/dev`, `@react-router/node` and `@react-router/serve` already come from the official Framework Mode template; `@themvora/remix` provides both the Remix v2 root entry and the `/react-router` entry.",
        install: true
      },
      {
        label: "Set up",
        desc: "The root route owns the document: a loader resolves the request, and `theming.Document` renders the blocking script, the matching `<html>` shell and the provider. `app/routes.ts` is the Framework Mode route config.",
        ref: "noTheme",
        refExtra: "setupExtra",
        note: "mode"
      },
      {
        label: "Add a small UI",
        desc: "A status card with a heading, a description, a status label and a primary button. It is an ordinary route component; the classes are styled in the next step.",
        ref: "uiExample"
      },
      {
        label: "Style it with Themvora tokens",
        desc: "The document rule paints the page with `background` and `foreground`; the component rules read the required semantic colours. No typography token is required.",
        ref: "styles",
        note: "styles"
      },
      {
        label: "Run and choose a theme",
        desc: "The root provider installs the runtime, and a route component reads and writes it. The mode buttons choose system, light or dark, the family select switches registries, and reloading keeps the choice.",
        ref: "snippet"
      }
    ],
    moreExamples: {
      title: "The registry, and a scoped route",
      intro: "One file defines the themes the root configuration reads; the other pins a route subtree to a theme without moving the global selection."
    },
    noTheme: {
      title: "app/root.tsx",
      lang: "tsx",
      code: `import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { getBuiltInThemes } from "@themvora/core";
import "@themvora/core/scrollbar.css";
import { ThemeScrollbar } from "@themvora/remix";
import { createThemeDocument } from "@themvora/remix/react-router";
import type { Route } from "./+types/root";
import "./app.css";

const themes = getBuiltInThemes();

const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");

  return (
    <theming.Document
      initial={data?.theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return (
    <>
      <ThemeScrollbar />
      <Outlet />
    </>
  );
}`
    },
    setupExtra: {
      title: "app/routes.ts",
      lang: "ts",
      code: `import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;`
    },
  },
];

/**
 * Every framework entry, including the nested ones.
 *
 * `featureCount` is derived here rather than written into each entry, so a
 * feature added to a group cannot leave a stale count behind.
 */
export const allFrameworks: FrameworkItem[] = rawFrameworks.map((f) => ({
  ...f,
  featureCount: f.groups.reduce((sum, g) => sum + g.features.length, 0),
}));

/**
 * The frameworks a reader can pick between.
 *
 * Nested targets (React Router under Remix) keep their pages and examples but
 * are not separate frameworks, so they never appear in a picker or card list.
 */
export const frameworks: FrameworkItem[] = allFrameworks.filter((f) => !f.nested);

/**
 * Canonical guide URL for a framework slug.
 *
 * Most guides are `/framework-guides/<slug>`; an entry with a `path` overrides
 * it for nested integrations such as React Router under Remix.
 */
export function frameworkGuidePath(slug: string): string {
  const framework = allFrameworks.find((entry) => entry.slug === slug);
  return framework?.path ?? `/framework-guides/${slug}`;
}

/** Canonical examples URL for a framework slug. */
export function frameworkExamplesPath(slug: string): string {
  return `${frameworkGuidePath(slug)}/examples`;
}
