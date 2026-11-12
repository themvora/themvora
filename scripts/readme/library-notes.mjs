/**
 * README copy that has no documentation-page equivalent.
 *
 * Everything in this file is *prose about* an integration whose commands and
 * snippets are generated from `apps/docs/lib/libraries.tsx`. The split is
 * deliberate: anything a reader could copy — commands, file contents, versions
 * — must come from the canonical recipe, and lives there. What is left is the
 * writing a README needs and a docs page does not:
 *
 *   - `HOW_IT_WORKS`     one paragraph per adapter family, per library
 *   - `RUN_COMMANDS`     the scaffold's own dev/build/preview scripts
 *   - `TROUBLESHOOTING`  the failures each integration actually produces
 *
 * The troubleshooting entries are not generic advice. Each one names a specific
 * mechanism that is visible in the recipe or the adapter source: the Emotion
 * cache provider MUI needs under streaming SSR, the `@plugin "daisyui"` line
 * Tailwind 4 requires, the `@/*` alias `shadcn init` refuses to run without.
 */

/**
 * What the adapter actually does, per library.
 *
 * Two families, and they are not interchangeable: a provider adapter builds the
 * library's native theme object, a CSS-variable adapter writes the library's own
 * custom properties. The paragraph says which, and names the variables or the
 * provider, because "it just works" is not an explanation.
 */
export const HOW_IT_WORKS = {
  mui: "`@themvora/mui` builds Material UI's own theme object from the active Themvora theme and renders MUI's `ThemeProvider` with it. The object is rebuilt whenever the theme, family or mode changes, so MUI's palette, typography and component overrides all follow — including `sx` props and `color=\"text.secondary\"`. No MUI component takes a Themvora prop.",

  chakra: "`@themvora/chakra` builds a Chakra system from the active Themvora theme and renders `ChakraProvider` with it. Chakra's semantic tokens (`bg`, `fg`, `border`, `colorPalette`) resolve through that system, so a theme change re-themes every Chakra component without touching your markup.",

  antd: "`@themvora/antd` builds Ant Design's config-based theme — its token object plus the colour algorithm — from the active Themvora theme, and renders `ConfigProvider` with it. Ant Design's CSS-in-JS layer re-emits its styles when the config changes, so components follow a switch without a reload.",

  mantine: "`@themvora/mantine` maps Themvora tokens onto a Mantine theme and forces Mantine's colour scheme to match the active mode, so `c=\"dimmed\"`, `variant=\"light\"` and the rest resolve against the Themvora palette rather than Mantine's defaults.",

  bootstrap:
    "Bootstrap 5.3 exposes a semantic variable layer, but not every component reads it: `.btn-*`, `.badge`, `.alert`, `.list-group` and others hold literal colours in component-scoped variables. `@themvora/bootstrap` therefore ships two things — a variable map that re-points `--bs-*` at the live theme, and a compatibility stylesheet (`@themvora/bootstrap/bootstrap.css`) that reaches the declarations a variable override cannot. Both are imported into your global stylesheet, the library's CSS first.",

  daisyui:
    "daisyUI 5 is a Tailwind plugin whose components read `--color-*` variables. `@themvora/daisyui` maps them onto the live theme (`--color-primary`, `--color-base-100`, `--color-base-content`, …) and `@themvora/daisyui/daisyui.css` carries the aliases, so `btn btn-primary` and `card bg-base-100` follow a theme change with no markup of their own.",

  "open-props":
    "Open Props ships design tokens, not components. The adapter writes the semantic colour layer (`--color-canvas`, `--color-text`, `--color-primary`, …) and leaves Open Props' own scales — `--size-*`, `--radius-*`, `--shadow-*`, `--font-size-*` — untouched, so existing markup keeps its spacing and only the colours move.",

  shadcn:
    "shadcn/ui is not a component package: the CLI copies component source into your project, and those components read CSS custom properties. `@themvora/shadcn` writes the same properties (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--radius`) onto the document root from the active theme, so the copied components follow a theme change without being regenerated.",

  unocss:
    "`presetThemvora()` generates utilities — `bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg` — whose declarations reference `--theme-*` variables. The classes are produced at build time; the values resolve at runtime, so a theme change repaints without a rebuild and without a second utility set per theme.",
};

/**
 * The scripts each framework's scaffold creates.
 *
 * `preview` is absent for Next.js, Remix and Angular because those scaffolds
 * serve the production build with `start` (or have no preview script at all),
 * not because the column was left out.
 */
export const RUN_COMMANDS = {
  React: { dev: "pnpm dev", build: "pnpm build", preview: "pnpm preview" },
  "Next.js": { dev: "pnpm dev", build: "pnpm build", preview: "pnpm start" },
  Remix: { dev: "pnpm dev", build: "pnpm build", preview: "pnpm start" },
  Astro: { dev: "pnpm dev", build: "pnpm build", preview: "pnpm preview" },
  "Vue 3": { dev: "pnpm dev", build: "pnpm build", preview: "pnpm preview" },
  Nuxt: { dev: "pnpm dev", build: "pnpm build", preview: "pnpm preview" },
  Svelte: { dev: "pnpm dev", build: "pnpm build", preview: "pnpm preview" },
  Solid: { dev: "pnpm dev", build: "pnpm build", preview: "pnpm preview" },
  Angular: { dev: "pnpm start", build: "pnpm build", preview: null },
};

/**
 * Overrides for the sentence above a library's build-configuration step.
 *
 * UnoCSS is the only one that needs it: its step is a *build* configuration
 * (the preset plus the framework's integration) followed by a stylesheet, not
 * the "library CSS, then the adapter's variable map" shape the CSS-variable
 * libraries share.
 */
export const SETUP_LEAD = {
  unocss:
    "`uno.config.ts` registers `presetThemvora()`; the framework's build configuration hands UnoCSS to the compiler. The global stylesheet then reads the variables the runtime writes.",
};

/**
 * Overrides for the sentence above a framework's provider-mounting step.
 *
 * Remix is the one framework where the entry file is not just a mount point.
 * Remix owns the document, so the file also declares the theme document — the
 * single configuration the loader, the pre-paint script, the `<html>` shell and
 * the runtime provider all read. Calling it "the file that mounts the provider"
 * would describe a third of what it does and hide the part that prevents the
 * flash.
 */
export const MOUNT_LEAD = {
  Remix:
    "Remix owns the document, so this file does more than mount a provider. `createThemeDocument()` declares the configuration once; the loader resolves the request's selection from it, and `<theming.Document>` renders the pre-paint script, the matching `<html>` shell and the runtime provider from that same configuration. The stylesheet is linked through `links` rather than imported for side effects.",
};

/**
 * Overrides for the sentence above a library's component example.
 *
 * Only Open Props needs one: the family default says "its own classes and
 * components", and Open Props ships neither — it ships tokens, so the example
 * is ordinary markup. Claiming otherwise would send a reader looking for an
 * `open-props` component package that does not exist.
 */
export const COMPONENT_LEAD = {
  "open-props":
    "Ordinary markup. Open Props ships tokens, not components, so the example below is a plain card styled with Open Props' scales and the adapter's colour layer — and it re-themes with everything else.",
};

/**
 * Failures that are specific to one integration, plus the three that apply to
 * all of them.
 *
 * The three shared entries come first and are repeated per library rather than
 * hoisted into a section of their own: a reader who lands on
 * `#mui` from a search result reads one section, not the whole file.
 */
const SHARED = [
  "**The components are themed but the page background is not.** The global stylesheet is missing the `html, body` rule from *Build configuration and global styles*. Themvora writes `--theme-color-*` on the root element; something has to read them.",
  "**Nothing happens when you switch themes.** The adapter is attached to a different runtime than the one the provider created. Call the adapter *inside* the provider — that is what the *Attach the adapter* file does — rather than beside it.",
  "**The library's own colours win.** Its stylesheet has to load before the adapter's variable map. The import order in the global stylesheet is an instruction, not a preference.",
];

export const TROUBLESHOOTING = {
  mui: [
    ...SHARED,
    "**Next.js: styles arrive late and hydration warns (React error #418).** MUI generates Emotion styles during streaming SSR. `AppRouterCacheProvider` collects them and flushes them into `<head>`; without it they land in the streamed body. Keep its subpath in step with the Next.js major — `v15-appRouter` for Next 15, `v16-appRouter` for Next 16.",
    "**`@emotion/react` cannot be resolved at runtime.** It is a peer dependency, not a dependency. The install command names it for that reason.",
  ],

  chakra: [
    ...SHARED,
    "**Next.js: styles flash and hydration warns.** Chakra needs its own Emotion registry — `createCache` plus `useServerInsertedHTML` — which is the first file in the *Mount the runtime* snippet. MUI's `AppRouterCacheProvider` is not a substitute; the two caches are unrelated.",
    "**`@emotion/cache` cannot be resolved.** The registry imports it directly, so the Next.js install command names it alongside `@emotion/react`.",
  ],

  antd: [
    ...SHARED,
    "**A strict peer setup reports a missing `@ant-design/cssinjs`.** `antd` ships it as a normal dependency, so the documented install is enough for most resolvers; a setup that ignores transitive peers needs it installed explicitly.",
    "**`next` is reported as an unmet peer.** It is optional and is only needed by the `@themvora/antd/next` entry, which the App Router recipe uses for its SSR wiring.",
  ],

  mantine: [
    ...SHARED,
    "**Components render unstyled.** `@mantine/core/styles.css` is missing from the global stylesheet. Mantine's components have no styles without it, whatever the theme says.",
    "**`@mantine/hooks` cannot be resolved.** It is a peer of `@mantine/core`, and the install command names it so a pnpm consumer does not have to discover that.",
  ],

  bootstrap: [
    ...SHARED,
    "**Buttons, badges and alerts keep Bootstrap blue.** `@themvora/bootstrap/bootstrap.css` is either missing or imported before `bootstrap.min.css`. The compatibility stylesheet has to come second.",
    "**The `@import` rules are ignored.** CSS requires `@import` at the top of a stylesheet, before any other rule. Put both lines above the `html, body` block, not below it.",
  ],

  daisyui: [
    ...SHARED,
    "**Components render unstyled.** `@plugin \"daisyui\";` is missing from the stylesheet, or Tailwind is not wired into the build at all. Which plugin you need depends on the framework — `@tailwindcss/vite` for Vite-based ones, `@tailwindcss/postcss` for Next.js and Angular.",
    "**`bg-base-100` stays grey.** `@themvora/daisyui/daisyui.css` has to be imported after `@import \"tailwindcss\"`, so its aliases resolve against the theme rather than Tailwind's defaults.",
  ],

  "open-props": [
    ...SHARED,
    "**Spacing and type scale changed after installing.** The adapter writes only the colour layer. If `open-props/style` was replaced rather than kept, the scales are gone — import both, in the documented order.",
    "**`--color-canvas` is undefined.** `open-props/style` is being imported *after* `@themvora/open-props/open-props.css`. The adapter's aliases have to come second, or the primitives win.",
  ],

  shadcn: [
    ...SHARED,
    "**`shadcn init` stops at \"Could not find valid path aliases\".** The CLI validates the `@/*` alias in `tsconfig.json` before it generates anything, and the generated components import through it. The *Build configuration and global styles* snippet includes the block for each framework; Svelte needs `$lib` instead.",
    "**The generated components render unstyled.** `@import \"@themvora/tailwind\";` is missing. Without it Tailwind emits no utilities for the component classes the CLI wrote.",
  ],

  unocss: [
    ...SHARED,
    "**No utilities are generated.** `presetThemvora()` is missing from `uno.config.ts`, or the UnoCSS integration is not in the framework's build config — `unocss/vite`, `unocss/astro` or `@unocss/postcss`, depending on the framework.",
    "**Next.js: utilities are missing from the global sheet.** Next.js uses the PostCSS plugin and needs the `@unocss all;` directive in the stylesheet; the Vite plugin does not apply there.",
    "**Astro: utilities are missing in `.astro` files.** The `unocss/astro` integration scans them; the Vite plugin alone does not.",
  ],
};
