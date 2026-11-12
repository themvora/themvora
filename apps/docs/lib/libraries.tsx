import { type ReactElement } from "react";
import { Icon } from "@iconify/react";

const icons = {
  shadcn: <Icon icon="simple-icons:shadcnui" width={24} height={24} />,
  bootstrap: <Icon icon="devicon:bootstrap" width={24} height={24} />,
  daisyui: <Icon icon="simple-icons:daisyui" width={24} height={24} />,
  openprops: <Icon icon="simple-icons:css3" width={24} height={24} />,
  mui: <Icon icon="simple-icons:mui" width={24} height={24} />,
  chakra: <Icon icon="simple-icons:chakraui" width={24} height={24} />,
  antd: <Icon icon="simple-icons:antdesign" width={24} height={24} />,
  mantine: <Icon icon="simple-icons:mantine" width={24} height={24} />,
  unocss: <Icon icon="simple-icons:unocss" width={24} height={24} />,
};

export type LibraryFeature = {
  name: string;
  desc: string;
};

export type LibraryGroup = {
  label: string;
  features: LibraryFeature[];
};

export type LibrarySnippet = {
  title: string;
  lang: string;
  code: string;
};

/**
 * One framework's version of the whole recipe.
 *
 * The page shows a framework picker, and **every snippet below it has to follow
 * that choice** — otherwise picking Next.js leaves the reader looking at React
 * code, which is worse than not offering the picker at all. Each field falls
 * back to the library-level snippet when a framework has not been written yet.
 */
export type FrameworkSnippet = { lang: string; code: string };

/**
 * One prerequisite row on a library guide: what the reader must already have,
 * and the version the recipe was verified against.
 *
 * The type lives here rather than in the generated block because the generator
 * rewrites everything between `FRAMEWORK_RECIPES` and `FRAMEWORK_LANG`.
 */
export type RecipePrerequisite = { label: string; value: string };

export type LibraryFrameworkExample = {
  label: string;
  lang: string;
  /** The adapter wiring for this framework. */
  code: string;
  /** File name shown above the snippet. */
  filename?: string | undefined;
  /** What to install before Themvora — the library plus its build toolchain. */
  install?: string[] | undefined;
  /** The Themvora packages for this framework. */
  themvora?: string[] | undefined;
  /** Build configuration and the global stylesheet this framework needs. */
  setup?: FrameworkSnippet | undefined;
  /** Mounting the provider / creating the runtime — the entry file. */
  mountProvider?: FrameworkSnippet | undefined;
  /** The complete app. */
  completeExample?: FrameworkSnippet | undefined;
  /** Ordinary library components. */
  componentExample?: FrameworkSnippet | undefined;
  /** Switching theme at runtime. */
  themeSwitchExample?: FrameworkSnippet | undefined;
  /** Verified Node / framework / library versions, shown before the install. */
  prereqs?: RecipePrerequisite[] | undefined;
  /** The same thing without Themvora. */
  beforeExample?: FrameworkSnippet | undefined;
};

/**
 * How the adapter bridges Themvora and the library.
 *
 * This is the field that does the most work on the page: it selects the
 * "How it works" diagram, and it is the honest answer to the question readers
 * keep asking — why aren't all the adapters built the same way?
 *
 * - `generated-theme` — Themvora builds the library's *native theme object*
 *   and hands it to the library's own provider. MUI, Chakra, Mantine, Ant Design.
 * - `css-variable` — Themvora writes the library's *own CSS custom properties*
 *   and the library's stylesheet consumes them. shadcn, Bootstrap, DaisyUI,
 *   Open Props.
 * - `build-time` — the mapping is compiled, not resolved at runtime.
 */
export type LibraryArchitecture =
  "css-variable" | "generated-theme" | "build-time";

/** One row of the "what gets mapped" table. */
export type LibraryMapping = {
  /** Themvora's semantic role, e.g. `primaryForeground`. */
  role: string;
  /** How the target library spells it, e.g. `palette.primary.contrastText`. */
  target: string;
};

export type LibraryItem = {
  slug: string;
  name: string;
  icon: ReactElement;
  pkg: string;
  tagline: string;
  mark: string;
  tags: string[];
  kind: string;
  groups: LibraryGroup[];
  snippet2: LibrarySnippet;
  frameworks?: LibraryFrameworkExample[] | undefined;
  /** Import path for the adapter's CSS file (e.g. "@themvora/shadcn/shadcn.css").
   *  Only adapters that map CSS variables ship a stylesheet; others are
   *  runtime-only and need no CSS import. */
  css?: string | undefined;
  featureCount: number;

  // ---------------------------------------------------------------------
  // Integration-recipe fields.
  //
  // The page used to be an adapter API page: it assumed the UI library was
  // already installed and stopped at the provider. Both are dead ends for
  // someone who arrives saying "I use MUI" — so these carry the rest of the
  // recipe. `architecture` and `install` are set for every library; the code
  // examples are filled in per library as they are written.
  // ---------------------------------------------------------------------

  /** The UI library's own documentation. */
  officialUrl: string;
  /** How the adapter bridges the two — decides the diagram. */
  architecture: LibraryArchitecture;
  // Install commands are per framework, not per library: shadcn's CLI differs
  // between React, Vue and Svelte, and daisyUI's build plugin differs between
  // Vite and PostCSS. They live in `FRAMEWORK_RECIPES` (`install` / `themvora`).
  /** The app half: your components plus the provider that bridges them. */
  quickStart?: LibrarySnippet | undefined;
  /** The root half: mounting ThemeProvider. Separate because someone adding
   *  Themvora to an existing app needs this, and someone starting fresh needs
   *  both — one combined block makes each scroll past the other's half. */
  quickStartRoot?: LibrarySnippet | undefined;
  /** Ordinary library components. No Themvora props anywhere. */
  componentExample?: LibrarySnippet | undefined;
  /** Switching theme at runtime, with real components underneath. */
  themeSwitchExample?: LibrarySnippet | undefined;
  /** What you'd write instead, without Themvora. */
  beforeExample?: LibrarySnippet | undefined;
  /** Themvora role → library token. */
  mapping?: LibraryMapping[] | undefined;
};

type RawLibrary = Omit<LibraryItem, "featureCount">;

export const rawLibraries: RawLibrary[] = [
  {
    slug: "shadcn",
    name: "shadcn/ui",
    icon: icons.shadcn,
    pkg: "@themvora/shadcn",
    tagline:
      "Drive shadcn/ui components with Themvora semantic tokens via a CSS-variable adapter that stays in sync at runtime.",
    mark: "SH",
    mapping: [
      { role: "background", target: "--background" },
      { role: "foreground", target: "--foreground" },
      { role: "card", target: "--card" },
      { role: "cardForeground", target: "--card-foreground" },
      { role: "primary", target: "--primary" },
      { role: "primaryForeground", target: "--primary-foreground" },
      { role: "secondary", target: "--secondary" },
      { role: "muted", target: "--muted" },
      { role: "mutedForeground", target: "--muted-foreground" },
      { role: "accent", target: "--accent" },
      { role: "destructive", target: "--destructive" },
      { role: "border", target: "--border" },
      { role: "ring", target: "--ring" },
    ],

    officialUrl: "https://ui.shadcn.com/docs/installation/vite",
    architecture: "css-variable",
    kind: "CSS Variables",
    tags: ["Radix", "CSS vars", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createShadcnAdapter(options)",
            desc: "Installs a tagged `:root` style element whose `--*` variables (colors, radius, border, shadow, typography) update as the theme changes.",
          },
          {
            name: "createShadcnVariables(tokens)",
            desc: "Deprecated — prefer `createShadcnAdapter`. Generates the shadcn CSS-variable map from a token set (`theme.tokens`), without touching the DOM. Passing a theme definition yields empty values.",
          },
          {
            name: "useShadcnTheme(runtime, options?)",
            desc: "React hook (from `@themvora/shadcn/react`) that installs and disposes the adapter onto an explicit runtime. Call once in your app root.",
          },
          {
            name: "injectShadcnCSS()",
            desc: "Idempotent, SSR-safe helper that injects the shadcn compatibility stylesheet. Called automatically by the hook.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateShadcnAdapterOptions",
            desc: "Accepts `strategy` to hand a custom token→variable mapping to the adapter.",
          },
          {
            name: "ShadcnAdapterOptions",
            desc: "Typed options for how semantic tokens map to shadcn CSS custom properties.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Standalone variables",
      lang: "ts",
      code: `import { createShadcnVariables } from "@themvora/shadcn";
import { getBuiltInThemes } from "@themvora/core";

// These factories read \`tokens\` as-is — pass the token set, not a theme and
// not a \`{ family, mode }\` pair. Built-in themes ship a complete token set.
const [theme] = getBuiltInThemes();

const css = createShadcnVariables(theme.tokens!);
// css -> { "--background": "#f8fafc", "--foreground": "#0f172a", … }`,
    },
  },
  {
    slug: "bootstrap",
    name: "Bootstrap",
    icon: icons.bootstrap,
    pkg: "@themvora/bootstrap",
    tagline:
      "Compile Bootstrap 5 with Themvora semantic tokens through a CSS-variable adapter that refreshes variables as themes change.",
    mark: "BS",
    mapping: [
      { role: "primary", target: "--bs-primary" },
      { role: "secondary", target: "--bs-secondary" },
      { role: "destructive", target: "--bs-danger" },
      { role: "background", target: "--bs-body-bg" },
      { role: "foreground", target: "--bs-body-color" },
      { role: "border", target: "--bs-border-color" },
      { role: "radius", target: "--bs-border-radius" },
    ],

    officialUrl: "https://getbootstrap.com/docs/5.3/getting-started/download/",
    architecture: "css-variable",
    kind: "CSS Variables",
    tags: ["v5", "Sass", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createBootstrapAdapter(options)",
            desc: "Maintains a tagged `:root` style element with concrete Bootstrap variables, including derived color pairs, kept in sync at runtime.",
          },
          {
            name: "createBootstrapVariables(tokens)",
            desc: "Produces the concrete Bootstrap CSS custom-property map from a token set (`theme.tokens`) — no DOM required. A theme definition leaves the derived color pairs empty.",
          },
          {
            name: "useBootstrapTheme(runtime, options?)",
            desc: "React hook (from `@themvora/bootstrap/react`) that installs and disposes the adapter on the current runtime.",
          },
          {
            name: "injectBootstrapCSS()",
            desc: "SSR-safe, idempotent helper that injects Bootstrap compatibility CSS on first use.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateBootstrapAdapterOptions",
            desc: "Accepts `strategy` to customize how tokens become Bootstrap variables.",
          },
          {
            name: "BootstrapAdapterOptions",
            desc: "Options covering derived-color handling (e.g. primary/tint pairs) and defaults.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static variables",
      lang: "ts",
      code: `import { createBootstrapVariables } from "@themvora/bootstrap";
import { getBuiltInThemes } from "@themvora/core";

// Pass the token set — a \`{ family, mode }\` pair is not a ThemeTokens and
// silently yields empty values ("--bs-body-bg": "").
const [theme] = getBuiltInThemes();

const css = createBootstrapVariables(theme.tokens!);
// css -> { "--bs-body-bg": "#f8fafc", "--bs-body-color": "#0f172a", … }`,
    },
  },
  {
    slug: "daisyui",
    name: "daisyUI",
    icon: icons.daisyui,
    pkg: "@themvora/daisyui",
    tagline:
      "Wire daisyUI components to Themvora semantic tokens with a CSS-variable adapter that stays in sync as themes and modes change.",
    mark: "DU",
    mapping: [
      { role: "background", target: "--color-base-100" },
      { role: "secondary", target: "--color-base-200" },
      { role: "border", target: "--color-base-300" },
      { role: "foreground", target: "--color-base-content" },
      { role: "primary", target: "--color-primary" },
      { role: "primaryForeground", target: "--color-primary-content" },
      { role: "secondary", target: "--color-secondary" },
      { role: "secondaryForeground", target: "--color-secondary-content" },
      { role: "accent", target: "--color-accent" },
      { role: "muted", target: "--color-neutral" },
      { role: "mutedForeground", target: "--color-neutral-content" },
      { role: "destructive", target: "--color-error" },
      { role: "destructiveForeground", target: "--color-error-content" },
    ],

    officialUrl: "https://daisyui.com/docs/install/",
    architecture: "css-variable",
    kind: "CSS Variables",
    tags: ["Tailwind", "Framework", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createDaisyAdapter(options)",
            desc: "Installs a tagged `:root` style element with concrete daisyUI variables (background, foreground, base-100/200/300, primary, etc.).",
          },
          {
            name: "createDaisyVariables(tokens)",
            desc: "Generates the daisyUI CSS custom-property map from a token set (`theme.tokens`). A theme definition collapses the output to radius tokens only.",
          },
          {
            name: "useDaisyTheme(runtime, options?)",
            desc: "React hook (from `@themvora/daisyui/react`) that installs the daisyUI adapter onto an explicit runtime.",
          },
          {
            name: "injectDaisyCSS()",
            desc: "Idempotent, SSR-safe helper to inject daisyUI compatibility CSS.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateDaisyAdapterOptions",
            desc: "Accepts `strategy` to map semantic tokens to daisyUI variables.",
          },
          {
            name: "DaisyAdapterOptions",
            desc: "Options controlling daisyUI variable derivation and defaults.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static variables",
      lang: "ts",
      code: `import { createDaisyVariables } from "@themvora/daisyui";
import { getBuiltInThemes } from "@themvora/core";

// Pass the token set — a \`{ family, mode }\` pair yields only the radius and
// border variables, with every color missing.
const [theme] = getBuiltInThemes();

const css = createDaisyVariables(theme.tokens!);
// css -> { "--color-base-100": "#f8fafc", "--color-primary": "…", … }`,
    },
  },
  {
    slug: "open-props",
    name: "Open Props",
    icon: icons.openprops,
    pkg: "@themvora/open-props",
    tagline:
      "Expose Themvora semantic tokens as Open Props style variables for any design that uses CSS custom properties.",
    mark: "OP",
    mapping: [
      { role: "background", target: "--color-background" },
      { role: "foreground", target: "--color-foreground" },
      { role: "card", target: "--color-canvas" },
      { role: "muted", target: "--color-muted" },
      { role: "mutedForeground", target: "--color-muted-foreground" },
      { role: "primary", target: "--color-primary" },
      { role: "secondary", target: "--color-secondary" },
      { role: "accent", target: "--color-accent" },
      { role: "destructive", target: "--color-danger" },
      { role: "border", target: "--color-border" },
    ],

    officialUrl: "https://open-props.style/",
    architecture: "css-variable",
    kind: "CSS Variables",
    tags: ["CSS", "Design tokens", "Runtime"],
    groups: [
      {
        label: "Adapter",
        features: [
          {
            name: "createOpenPropsAdapter(options)",
            desc: "Installs a tagged `:root` style element holding the semantic colour layer (`--color-canvas`, `--color-text`, `--color-primary`, …) plus the Open Props scales it derives (`--radius-*`, `--shadow-*`, `--size-*`), updated as the theme changes.",
          },
          {
            name: "createOpenPropsVariables(tokens)",
            desc: "Builds the Open Props variable map from a token set (`theme.tokens`). A theme definition leaves the color entries empty.",
          },
          {
            name: "useOpenPropsTheme(runtime, options?)",
            desc: "React hook (from `@themvora/open-props/react`) that installs the Open Props adapter onto an explicit runtime.",
          },
          {
            name: "injectOpenPropsCSS()",
            desc: "Idempotent, SSR-safe helper for injecting Open Props compatibility CSS.",
          },
        ],
      },
      {
        label: "Options",
        features: [
          {
            name: "CreateOpenPropsAdapterOptions",
            desc: "Accepts `strategy` to customize token→variable mapping.",
          },
          {
            name: "OpenPropsAdapterOptions",
            desc: "Options for Open Props variable derivation and defaults.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static variables",
      lang: "ts",
      code: `import { createOpenPropsVariables } from "@themvora/open-props";
import { getBuiltInThemes } from "@themvora/core";

const [theme] = getBuiltInThemes();

const css = createOpenPropsVariables(theme.tokens!);
// css -> { "--color-canvas": "#f8fafc", "--color-text": "#0f172a", … }`,
    },
  },
  {
    slug: "mui",
    name: "Material UI",
    icon: icons.mui,
    pkg: "@themvora/mui",
    tagline:
      "Derive a Material UI theme from Themvora semantic tokens and rebuild it automatically whenever the active theme changes.",
    mark: "MUI",
    // The complete recipe, in the order someone actually needs it:
    // install both halves, see a real component, then watch it react.
    // Deliberately a second snippet: the provider half is what you drop into
    // an existing tree, the root half is only for a fresh app. One combined
    // block makes both readers scroll past the part that is not theirs.
    mapping: [
      { role: "primary", target: "palette.primary.main" },
      { role: "primaryForeground", target: "palette.primary.contrastText" },
      { role: "secondary", target: "palette.secondary.main" },
      { role: "background", target: "palette.background.default" },
      { role: "card", target: "palette.background.paper" },
      { role: "foreground", target: "palette.text.primary" },
      { role: "mutedForeground", target: "palette.text.secondary" },
      { role: "destructive", target: "palette.error.main" },
      { role: "success", target: "palette.success.main" },
      { role: "border", target: "palette.divider" },
      { role: "radius", target: "shape.borderRadius" },
      { role: "typography.fontFamilies.sans", target: "typography.fontFamily" },
    ],

    officialUrl: "https://mui.com/material-ui/getting-started/installation/",
    architecture: "generated-theme",
    kind: "Generated Theme",
    tags: ["React", "Provider", "createTheme"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "MuiThemeProvider",
            desc: "Wraps MUI's own `ThemeProvider` with a theme derived from Themvora semantic tokens (palette, shape, typography, shadows, breakpoints).",
          },
          {
            name: "useMuiTheme(runtime)",
            desc: "Subscribes to a Themvora runtime and returns a `Theme` rebuilt whenever the theme changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createMuiTheme(source)",
            desc: "Builds a MUI `Theme` from a theme definition, its tokens, or a runtime.",
          },
          {
            name: "buildMuiThemeOptions(theme)",
            desc: "Maps an `AdapterResolvedTheme` to MUI `ThemeOptions` — colors, spacing, shape, shadows, breakpoints.",
          },
        ],
      },
      {
        label: "Registry",
        features: [
          {
            name: "createMuiAdapter(options)",
            desc: "Framework-neutral `ThemeAdapter` you register via `runtime.adapters.use()` — alternative to the provider, with `getSnapshot`/`subscribe` for use outside React.",
          },
          {
            name: "MUI_ADAPTER_ID",
            desc: 'The registry id (`"mui"`) used to identify and replace the adapter.',
          },
          {
            name: "CreateMuiAdapterOptions",
            desc: "Options for the registry adapter — including `strategy` for how faithfully tokens map onto MUI's theme.",
          },
          {
            name: "MuiAdapterOptions",
            desc: "Base adapter options type (strategy + defaults) used by both the provider and the registry adapter.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createMuiTheme } from "@themvora/mui";
import { getBuiltInThemes } from "@themvora/core";

// createMuiTheme accepts a runtime, a store, a theme definition, or raw
// tokens. A \`{ family, mode }\` object is none of those — the factory then
// falls back to MUI's stock palette instead of the theme you asked for.
const themes = getBuiltInThemes();
const theme = themes.find((t) => t.name === "mint-light")!;

const muiTheme = createMuiTheme(theme);`,
    },
  },
  {
    slug: "chakra",
    name: "Chakra UI",
    icon: icons.chakra,
    pkg: "@themvora/chakra",
    tagline:
      "Bootstrap a Chakra UI system from Themvora semantic tokens, rebuilt automatically as themes change.",
    mark: "CH",
    mapping: [
      { role: "primary", target: "colors.primary (50–950 scale)" },
      { role: "primaryForeground", target: "colors.primary.contrast" },
      { role: "background", target: "colors.background" },
      { role: "foreground", target: "colors.foreground" },
      { role: "card", target: "colors.card" },
      { role: "muted", target: "colors.muted" },
      { role: "mutedForeground", target: "colors.mutedForeground" },
      { role: "border", target: "colors.border" },
      { role: "ring", target: "colors.ring" },
      { role: "radius", target: "radii.lg" },
    ],

    officialUrl: "https://chakra-ui.com/docs/get-started/installation",
    architecture: "generated-theme",
    kind: "Generated Theme",
    tags: ["React", "System", "Provider"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "ChakraThemeProvider",
            desc: "Wraps Chakra's `ChakraProvider` with a system derived from Themvora semantic tokens.",
          },
          {
            name: "useChakraTheme(runtime)",
            desc: "Subscribes to a Themvora runtime and returns a Chakra `system` rebuilt on theme changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createChakraTheme(source)",
            desc: "Builds a Chakra UI system from a theme definition, its tokens, or a runtime.",
          },
          {
            name: "buildChakraConfig(theme)",
            desc: "Maps an `AdapterResolvedTheme` to a Chakra `SystemStyleObject`/config shape.",
          },
        ],
      },
      {
        label: "Registry",
        features: [
          {
            name: "createChakraAdapter(options)",
            desc: "Framework-neutral `ThemeAdapter` you register via `runtime.adapters.use()` — alternative to the provider, for use outside React.",
          },
          {
            name: "CHAKRA_ADAPTER_ID",
            desc: 'The registry id (`"chakra"`) used to identify and replace the adapter.',
          },
          {
            name: "CreateChakraAdapterOptions",
            desc: "Options for the registry adapter — including `strategy` for how faithfully tokens map onto Chakra's system.",
          },
          {
            name: "ChakraAdapterOptions",
            desc: "Base adapter options type (strategy + defaults) used by both the provider and the registry adapter.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createChakraTheme } from "@themvora/chakra";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const theme = themes.find((t) => t.name === "mint-dark")!;

const system = createChakraTheme(theme);`,
    },
  },
  {
    slug: "antd",
    name: "Ant Design",
    icon: icons.antd,
    pkg: "@themvora/antd",
    tagline:
      "Drive Ant Design's config-based theming from Themvora semantic tokens, rebuilt on every theme change.",
    mark: "AN",
    mapping: [
      { role: "primary", target: "colorPrimary" },
      { role: "background", target: "colorBgLayout" },
      { role: "card", target: "colorBgBase" },
      { role: "popover", target: "colorBgElevated" },
      { role: "foreground", target: "colorTextBase" },
      { role: "border", target: "colorBorder" },
      { role: "destructive", target: "colorError" },
      { role: "success", target: "colorSuccess" },
      { role: "warning", target: "colorWarning" },
    ],

    officialUrl: "https://ant.design/docs/react/getting-started",
    architecture: "generated-theme",
    kind: "Generated Theme",
    tags: ["React", "ConfigProvider", "Token"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "AntdThemeProvider",
            desc: "Wraps Ant Design's `ConfigProvider` with a `theme` derived from Themvora semantic tokens.",
          },
          {
            name: "useAntdTheme(runtime)",
            desc: "Subscribes to a Themvora runtime and returns an AntD `ThemeConfig` on changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createAntdTheme(source)",
            desc: "Builds an Ant Design `ThemeConfig` from a theme definition, its tokens, or a runtime.",
          },
          {
            name: "buildAntdConfig(theme)",
            desc: "Maps an `AdapterResolvedTheme` to AntD token configuration (colorPrimary, borderRadius, etc.).",
          },
        ],
      },
      {
        label: "Registry",
        features: [
          {
            name: "createAntdAdapter(options)",
            desc: "Framework-neutral `ThemeAdapter` you register via `runtime.adapters.use()` — alternative to the provider, for use outside React.",
          },
          {
            name: "ANTD_ADAPTER_ID",
            desc: 'The registry id (`"antd"`) used to identify and replace the adapter.',
          },
          {
            name: "CreateAntdAdapterOptions",
            desc: "Options for the registry adapter — including `strategy` for how faithfully tokens map onto Ant Design's config.",
          },
          {
            name: "AntdAdapterOptions",
            desc: "Base adapter options type (strategy + defaults) used by both the provider and the registry adapter.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static config",
      lang: "ts",
      code: `import { createAntdTheme } from "@themvora/antd";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const theme = themes.find((t) => t.name === "plum-dark")!;

const config = createAntdTheme(theme);`,
    },
  },
  {
    slug: "mantine",
    name: "Mantine",
    icon: icons.mantine,
    pkg: "@themvora/mantine",
    tagline:
      "Map Theme semantic tokens onto a Mantine theme, with color-scheme forced to match the active Themvora mode.",
    mark: "MN",
    mapping: [
      { role: "primary", target: 'primaryColor: "primary"' },
      { role: "primary", target: "primaryShade.light / .dark" },
      {
        role: "primaryForeground",
        target: "primary.contrast (via variantColorResolver)",
      },
      { role: "radius", target: "defaultRadius" },
    ],

    officialUrl: "https://mantine.dev/getting-started/",
    architecture: "generated-theme",
    kind: "Generated Theme",
    tags: ["React", "Provider", "ColorScheme"],
    groups: [
      {
        label: "Provider",
        features: [
          {
            name: "MantineThemeProvider",
            desc: "Wraps Mantine's `MantineProvider`, forcing the color scheme to match the active Themvora mode.",
          },
          {
            name: "useMantineTheme(runtime)",
            desc: "Subscribes to a runtime and returns a Mantine `Theme` rebuilt on changes.",
          },
        ],
      },
      {
        label: "Create",
        features: [
          {
            name: "createMantineTheme(source)",
            desc: "Builds a Mantine theme from a theme definition, its tokens, or a runtime — colors (with generated shades), fonts, radius, spacing, shadows, breakpoints.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createMantineTheme } from "@themvora/mantine";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();
const builtIn = themes.find((t) => t.name === "cocoa-dark")!;

const theme = createMantineTheme(builtIn);`,
    },
  },
  {
    slug: "unocss",
    name: "UnoCSS",
    icon: icons.unocss,
    pkg: "@themvora/unocss",
    tagline:
      "Expose Theme semantic tokens as UnoCSS utilities (`bg-primary`, `rounded-lg`) that reference live CSS variables.",
    mark: "UN",
    officialUrl: "https://unocss.dev/integrations/vite",
    architecture: "build-time",
    kind: "Build Time",
    tags: ["UnoCSS", "Preset", "Runtime vars"],
    groups: [
      {
        label: "Preset",
        features: [
          {
            name: "presetThemvora()",
            desc: "UnoCSS preset mapping semantic tokens to utilities: `bg-primary`, `text-foreground`, `border-border`, `rounded-lg`, `shadow-lg`. Values reference `--theme-*` variables and update at runtime.",
          },
          {
            name: "createUnoTheme(source)",
            desc: "Returns a static UnoCSS theme object (colors, radii, shadows) with concrete values for build-time generation.",
          },
        ],
      },
      {
        label: "Types",
        features: [
          {
            name: "ThemeTokens",
            desc: "Re-exports the semantic token shape from `@themvora/core`.",
          },
        ],
      },
    ],
    snippet2: {
      title: "Static theme",
      lang: "ts",
      code: `import { createUnoTheme } from "@themvora/unocss";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

// A theme definition, not { family } — createUnoTheme takes an AdapterSource.
const themes = getBuiltInThemes();
const theme = createUnoTheme(resolveTheme(themes, "berry-dark"));
// theme.colors.primary === "#..."`,
    },
  },
];


/**
 * Per-framework recipe content.
 *
 * Only the parts that genuinely differ per framework live here — the runtime
 * import and the file you mount the provider in. Everything else falls back to
 * the library-level snippet, so a page stays readable while its per-framework
 * content is incomplete.
 *
 * Astro is the reason this cannot be a find-and-replace: its entries are
 * vanilla (`createThemeController`), not React.
 */
export const FRAMEWORK_RECIPES: Record<string, Record<string, string | string[] | RecipePrerequisite[]>> = {
  "antd/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"6.1.0"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add antd"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/antd"],
    "setup": "// ---- src/styles/global.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction Bridged({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <AntdThemeProvider runtime={runtime}>{children}</AntdThemeProvider>;\n}\n// Astro cannot hand React children to a client:only island, so the island\n// renders the example and the controls inside the provider itself.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <Bridged>\n        <Example />\n        <ThemeControls />\n      </Bridged>\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nimport { Button, Card, Space, Typography } from \"antd\";\nexport function Example() {\n  return (\n    <Card>\n      <Space direction=\"vertical\" size=\"middle\">\n        <Typography.Title level={5} style={{ margin: 0 }}>\n          Themvora + Ant Design\n        </Typography.Title>\n        <Typography.Text type=\"secondary\">\n          These are Ant Design's own components — the tokens come from the theme.\n        </Typography.Text>\n        <Button type=\"primary\">Primary action</Button>\n      </Space>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nimport { Button, Space, Typography } from \"antd\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Space size=\"small\" align=\"center\">\n      <Typography.Text type=\"secondary\">Mode: {mode}</Typography.Text>\n      <Button type=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Space>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "antd/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"6.1.0"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add antd"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/antd"],
    "setup": "// ---- app/globals.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n// Rebuilds Ant Design's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <AntdThemeProvider runtime={runtime}>{children}</AntdThemeProvider>;\n}",
    "componentExample": "// app/example.tsx\n\"use client\";\n\nimport { Button, Card, Space, Typography } from \"antd\";\nexport function Example() {\n  return (\n    <Card>\n      <Space direction=\"vertical\" size=\"middle\">\n        <Typography.Title level={5} style={{ margin: 0 }}>\n          Themvora + Ant Design\n        </Typography.Title>\n        <Typography.Text type=\"secondary\">\n          These are Ant Design's own components — the tokens come from the theme.\n        </Typography.Text>\n        <Button type=\"primary\">Primary action</Button>\n      </Space>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Space, Typography } from \"antd\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Space size=\"small\" align=\"center\">\n      <Typography.Text type=\"secondary\">Mode: {mode}</Typography.Text>\n      <Button type=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Space>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "antd/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"6.1.0"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add antd"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/antd"],
    "setup": "// ---- src/index.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n// Rebuilds Ant Design's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <AntdThemeProvider runtime={runtime}>{children}</AntdThemeProvider>;\n}",
    "componentExample": "// src/Example.tsx\nimport { Button, Card, Space, Typography } from \"antd\";\nexport function Example() {\n  return (\n    <Card>\n      <Space direction=\"vertical\" size=\"middle\">\n        <Typography.Title level={5} style={{ margin: 0 }}>\n          Themvora + Ant Design\n        </Typography.Title>\n        <Typography.Text type=\"secondary\">\n          These are Ant Design's own components — the tokens come from the theme.\n        </Typography.Text>\n        <Button type=\"primary\">Primary action</Button>\n      </Space>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nimport { Button, Space, Typography } from \"antd\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Space size=\"small\" align=\"center\">\n      <Typography.Text type=\"secondary\">Mode: {mode}</Typography.Text>\n      <Button type=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Space>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "antd/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"6.1.0"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add antd"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/antd"],
    "setup": "// ---- app/styles.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { AntdThemeProvider } from \"@themvora/antd\";\n// Rebuilds Ant Design's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <AntdThemeProvider runtime={runtime}>{children}</AntdThemeProvider>;\n}",
    "componentExample": "// app/components/example.tsx\nimport { Button, Card, Space, Typography } from \"antd\";\nexport function Example() {\n  return (\n    <Card>\n      <Space direction=\"vertical\" size=\"middle\">\n        <Typography.Title level={5} style={{ margin: 0 }}>\n          Themvora + Ant Design\n        </Typography.Title>\n        <Typography.Text type=\"secondary\">\n          These are Ant Design's own components — the tokens come from the theme.\n        </Typography.Text>\n        <Button type=\"primary\">Primary action</Button>\n      </Space>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nimport { Button, Space, Typography } from \"antd\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Space size=\"small\" align=\"center\">\n      <Typography.Text type=\"secondary\">Mode: {mode}</Typography.Text>\n      <Button type=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button onClick={() => setMode(\"light\")}>Light</Button>\n      <Button onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Space>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "bootstrap/Angular": {
    "lang": "ts",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Angular","value":"22.2.5 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Angular 20+ standalone application. Global styles live in `src/styles.css`, referenced by `angular.json`."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/angular @themvora/bootstrap"],
    "setup": "// ---- src/styles.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport { AppComponent } from \"./app/app.component\";\nbootstrapApplication(AppComponent, {\n  providers: [provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" })],\n});",
    "code": "// src/app/theme-zone.component.ts\nimport { Component } from \"@angular/core\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectBootstrapTheme } from \"@themvora/bootstrap/angular\";\n@Component({\n  selector: \"app-theme-zone\",\n  standalone: true,\n  template: \"<ng-content />\",\n})\nexport class ThemeZoneComponent {\n  constructor() {\n    // A constructor is an injection context, so the adapter attaches to the\n    // runtime `provideTheme()` created in src/main.ts.\n    injectBootstrapTheme(injectThemeRuntime());\n  }\n}",
    "componentExample": "// src/app/example.component.ts\nimport { Component } from \"@angular/core\";\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n    <div class=\"card\">\n      <div class=\"card-body\">\n        <h2 class=\"card-title h5\">Themvora + Bootstrap</h2>\n        <p class=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n        <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  `,\n})\nexport class ExampleComponent {}",
    "themeSwitchExample": "// src/app/theme-controls.component.ts\nimport { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n@Component({\n  selector: \"app-theme-controls\",\n  standalone: true,\n  // injectTheme returns a signal, so it is read as state().\n  template: `\n    <div class=\"d-flex gap-2 align-items-center\">\n      <span class=\"text-body-secondary small\">Mode: {{ state().mode }}</span>\n      <button type=\"button\" class=\"btn btn-primary\" (click)=\"state().toggleTheme()\">Toggle</button>\n      <button type=\"button\" class=\"btn btn-outline-secondary\" (click)=\"state().setMode('light')\">Light</button>\n      <button type=\"button\" class=\"btn btn-outline-secondary\" (click)=\"state().setMode('dark')\">Dark</button>\n    </div>\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "completeExample": "// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { ThemeZoneComponent } from \"./theme-zone.component\";\nimport { ExampleComponent } from \"./example.component\";\nimport { ThemeControlsComponent } from \"./theme-controls.component\";\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [ThemeZoneComponent, ExampleComponent, ThemeControlsComponent],\n  template: `\n    <app-theme-zone>\n      <app-example />\n      <app-theme-controls />\n    </app-theme-zone>\n  `,\n})\nexport class AppComponent {}",
  },
  "bootstrap/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/bootstrap"],
    "setup": "// ---- src/styles/global.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction InstallAdapter() {\n  useBootstrapTheme(useThemeRuntime());\n  return null;\n}\n// One client island owns the runtime, the adapter and the UI. Astro cannot\n// hand React children to a client:only island, so the island renders the\n// example itself rather than receiving it from the page.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <InstallAdapter />\n      <Example />\n      <ThemeControls />\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title h5\">Themvora + Bootstrap</h2>\n        <p className=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n        <button type=\"button\" className=\"btn btn-primary\">\n          Primary action\n        </button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"d-flex gap-2 align-items-center\">\n      <span className=\"text-body-secondary small\">Mode: {mode}</span>\n      <button type=\"button\" className=\"btn btn-primary\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "bootstrap/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/bootstrap"],
    "setup": "// ---- app/globals.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useBootstrapTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/example.tsx\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title h5\">Themvora + Bootstrap</h2>\n        <p className=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n        <button type=\"button\" className=\"btn btn-primary\">\n          Primary action\n        </button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"d-flex gap-2 align-items-center\">\n      <span className=\"text-body-secondary small\">Mode: {mode}</span>\n      <button type=\"button\" className=\"btn btn-primary\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "bootstrap/Nuxt": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Nuxt","value":"4.2.0 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Nuxt 4 project. Install `@themvora/vue` alongside `@themvora/nuxt`."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/nuxt @themvora/bootstrap @themvora/vue"],
    "setup": "// ---- app/assets/css/main.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// nuxt.config.ts\nexport default defineNuxtConfig({\n  modules: [\"@themvora/nuxt\"],\n  // Nuxt loads this stylesheet globally; it is where the library's CSS and\n  // the adapter's variable map are imported, in that order.\n  css: [\"~/assets/css/main.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "code": "<!-- app/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\n// `useThemeRuntime` is auto-imported by @themvora/nuxt.\nimport { useBootstrapTheme } from \"@themvora/bootstrap/vue\";\nuseBootstrapTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- app/components/Example.vue -->\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h2 class=\"card-title h5\">Themvora + Bootstrap</h2>\n      <p class=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n</template>",
    "themeSwitchExample": "<!-- app/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"d-flex gap-2 align-items-center\">\n    <span class=\"text-body-secondary small\">Mode: {{ mode }}</span>\n    <button type=\"button\" class=\"btn btn-primary\" @click=\"toggleTheme\">Toggle</button>\n    <button type=\"button\" class=\"btn btn-outline-secondary\" @click=\"setMode('light')\">Light</button>\n    <button type=\"button\" class=\"btn btn-outline-secondary\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>",
    "completeExample": "<!-- app/app.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "bootstrap/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/bootstrap"],
    "setup": "// ---- src/index.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\n// Registers the adapter on the runtime from the provider above.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useBootstrapTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// src/Example.tsx\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title h5\">Themvora + Bootstrap</h2>\n        <p className=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n        <button type=\"button\" className=\"btn btn-primary\">\n          Primary action\n        </button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"d-flex gap-2 align-items-center\">\n      <span className=\"text-body-secondary small\">Mode: {mode}</span>\n      <button type=\"button\" className=\"btn btn-primary\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "bootstrap/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/bootstrap"],
    "setup": "// ---- app/styles.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useBootstrapTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/components/example.tsx\nexport function Example() {\n  return (\n    <div className=\"card\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title h5\">Themvora + Bootstrap</h2>\n        <p className=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n        <button type=\"button\" className=\"btn btn-primary\">\n          Primary action\n        </button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"d-flex gap-2 align-items-center\">\n      <span className=\"text-body-secondary small\">Mode: {mode}</span>\n      <button type=\"button\" className=\"btn btn-primary\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button type=\"button\" className=\"btn btn-outline-secondary\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "bootstrap/Solid": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Solid","value":"1.9.18 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Solid + Vite project (`npm create vite@latest -- --template solid-ts`)."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/solid @themvora/bootstrap"],
    "setup": "// ---- src/index.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/index.tsx\nimport { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"./index.css\";\nimport { App } from \"./App\";\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { JSX } from \"solid-js\";\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/solid\";\nexport function ThemeZone(props: { children: JSX.Element }) {\n  useBootstrapTheme(useThemeRuntime());\n  return <>{props.children}</>;\n}",
    "componentExample": "// src/Example.tsx\nexport function Example() {\n  return (\n    <div class=\"card\">\n      <div class=\"card-body\">\n        <h2 class=\"card-title h5\">Themvora + Bootstrap</h2>\n        <p class=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n        <button type=\"button\" class=\"btn btn-primary\">\n          Primary action\n        </button>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/solid\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div class=\"d-flex gap-2 align-items-center\">\n      <span class=\"text-body-secondary small\">Mode: {mode()}</span>\n      <button type=\"button\" class=\"btn btn-primary\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" class=\"btn btn-outline-secondary\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" class=\"btn btn-outline-secondary\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "bootstrap/Svelte": {
    "lang": "svelte",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Svelte","value":"5.57.3 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`)."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/svelte @themvora/bootstrap"],
    "setup": "// ---- src/index.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "<!-- src/lib/ThemeRoot.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"../index.css\";\n  let { children }: { children: Snippet } = $props();\n</script>\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  {@render children()}\n</ThemeProvider>\n// ---- src/main.ts\nimport { mount } from \"svelte\";\nimport App from \"./App.svelte\";\nmount(App, { target: document.getElementById(\"app\")! });",
    "code": "<!-- src/lib/ThemeZone.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { getThemeRuntime } from \"@themvora/svelte\";\n  import { useBootstrapTheme } from \"@themvora/bootstrap/svelte\";\n  let { children }: { children: Snippet } = $props();\n  // Runs during component initialisation, so the variables exist before paint.\n  useBootstrapTheme(getThemeRuntime());\n</script>\n{@render children()}",
    "componentExample": "<!-- src/lib/Example.svelte -->\n<script lang=\"ts\">\n  // Markup only — but a Svelte component without a script block emits no\n  // module declaration, so importing it fails `svelte-check` under strict.\n</script>\n<div class=\"card\">\n  <div class=\"card-body\">\n    <h2 class=\"card-title h5\">Themvora + Bootstrap</h2>\n    <p class=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n    <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n  </div>\n</div>",
    "themeSwitchExample": "<!-- src/lib/ThemeControls.svelte -->\n<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n  const { mode, setMode, toggleTheme } = useTheme();\n</script>\n<div class=\"d-flex gap-2 align-items-center\">\n  <span class=\"text-body-secondary small\">Mode: {$mode}</span>\n  <button type=\"button\" class=\"btn btn-primary\" onclick={toggleTheme}>Toggle</button>\n  <button type=\"button\" class=\"btn btn-outline-secondary\" onclick={() => setMode(\"light\")}>Light</button>\n  <button type=\"button\" class=\"btn btn-outline-secondary\" onclick={() => setMode(\"dark\")}>Dark</button>\n</div>",
    "completeExample": "<!-- src/App.svelte -->\n<script lang=\"ts\">\n  import ThemeRoot from \"./lib/ThemeRoot.svelte\";\n  import ThemeZone from \"./lib/ThemeZone.svelte\";\n  import Example from \"./lib/Example.svelte\";\n  import ThemeControls from \"./lib/ThemeControls.svelte\";\n</script>\n<ThemeRoot>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</ThemeRoot>",
  },
  "bootstrap/Vue 3": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Vue 3","value":"3.5.44 (verified)"},{"label":"Library","value":"5.3.8"},{"label":"Project","value":"Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`)."}],
    "install": ["pnpm add bootstrap"],
    "themvora": ["pnpm add @themvora/core @themvora/vue @themvora/bootstrap"],
    "setup": "// ---- src/index.css\n@import \"bootstrap/dist/css/bootstrap.min.css\";\n@import \"@themvora/bootstrap/bootstrap.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { createApp, h } from \"vue\";\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"./index.css\";\nimport App from \"./App.vue\";\ncreateApp({\n  render: () =>\n    h(\n      ThemeProvider,\n      { defaultTheme: \"plum-light\", initialMode: \"system\" },\n      () => h(App),\n    ),\n}).mount(\"#app\");",
    "code": "<!-- src/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\nimport { useThemeRuntime } from \"@themvora/vue\";\nimport { useBootstrapTheme } from \"@themvora/bootstrap/vue\";\n// Installs on mount, disposes on unmount.\nuseBootstrapTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- src/components/Example.vue -->\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h2 class=\"card-title h5\">Themvora + Bootstrap</h2>\n      <p class=\"card-text text-body-secondary\">This card is a plain Bootstrap 5 card. Its colours come from the theme.</p>\n      <button type=\"button\" class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"d-flex gap-2 align-items-center\">\n    <span class=\"text-body-secondary small\">Mode: {{ mode }}</span>\n    <button type=\"button\" class=\"btn btn-primary\" @click=\"toggleTheme\">Toggle</button>\n    <button type=\"button\" class=\"btn btn-outline-secondary\" @click=\"setMode('light')\">Light</button>\n    <button type=\"button\" class=\"btn btn-outline-secondary\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>",
    "completeExample": "<!-- src/App.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "chakra/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"3.30.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add @chakra-ui/react @emotion/react"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/chakra"],
    "setup": "// ---- src/styles/global.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction Bridged({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <ChakraThemeProvider runtime={runtime}>{children}</ChakraThemeProvider>;\n}\n// Astro cannot hand React children to a client:only island, so the island\n// renders the example and the controls inside the provider itself.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <Bridged>\n        <Example />\n        <ThemeControls />\n      </Bridged>\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nimport { Box, Button, Card, Heading, Stack, Text } from \"@chakra-ui/react\";\nexport function Example() {\n  return (\n    <Card.Root variant=\"outline\">\n      <Card.Body>\n        <Stack gap=\"3\">\n          <Heading size=\"md\">Themvora + Chakra UI</Heading>\n          <Text color=\"fg.muted\">\n            These are Chakra's own components — the system comes from the theme.\n          </Text>\n          <Box>\n            <Button colorPalette=\"primary\">Primary action</Button>\n          </Box>\n        </Stack>\n      </Card.Body>\n    </Card.Root>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nimport { Button, HStack, Text } from \"@chakra-ui/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <HStack gap=\"2\">\n      <Text color=\"fg.muted\" fontSize=\"sm\">\n        Mode: {mode}\n      </Text>\n      <Button colorPalette=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </HStack>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "chakra/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"3.30.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add @chakra-ui/react @emotion/react @emotion/cache"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/chakra"],
    "setup": "// ---- app/globals.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// ---- app/emotion-registry.tsx\n\"use client\";\nimport createCache from \"@emotion/cache\";\nimport { CacheProvider } from \"@emotion/react\";\nimport { useServerInsertedHTML } from \"next/navigation\";\nimport { useState, type ReactNode } from \"react\";\n// Chakra UI renders its Emotion styles inline while streaming. Flushing them\n// into <head> is what lets the client hydrate without re-rendering the tree\n// (React error #418). This is Chakra's registry, not MUI's cache provider.\nexport function EmotionRegistry({ children }: { children: ReactNode }) {\n  const [{ cache, flush }] = useState(() => {\n    const cache = createCache({ key: \"css\" });\n    cache.compat = true;\n    const insert = cache.insert;\n    let inserted: string[] = [];\n    cache.insert = (...args) => {\n      const serialized = args[1];\n      if (cache.inserted[serialized.name] === undefined) {\n        inserted.push(serialized.name);\n      }\n      return insert(...args);\n    };\n    const flush = () => {\n      const names = inserted;\n      inserted = [];\n      return names;\n    };\n    return { cache, flush };\n  });\n  useServerInsertedHTML(() => {\n    const names = flush();\n    if (names.length === 0) return null;\n    return (\n      <style\n        data-emotion={`${cache.key} ${names.join(\" \")}`}\n        dangerouslySetInnerHTML={{\n          __html: names.map((name) => cache.inserted[name]).join(\"\"),\n        }}\n      />\n    );\n  });\n  return <CacheProvider value={cache}>{children}</CacheProvider>;\n}\n// ---- app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport { EmotionRegistry } from \"./emotion-registry\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\n// Chakra needs its own Emotion registry around the streamed subtree so the\n// styles it generates during SSR are emitted into <head>.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      <EmotionRegistry>{children}</EmotionRegistry>\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n// Rebuilds Chakra UI's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <ChakraThemeProvider runtime={runtime}>{children}</ChakraThemeProvider>;\n}",
    "componentExample": "// app/example.tsx\n\"use client\";\n\nimport { Box, Button, Card, Heading, Stack, Text } from \"@chakra-ui/react\";\nexport function Example() {\n  return (\n    <Card.Root variant=\"outline\">\n      <Card.Body>\n        <Stack gap=\"3\">\n          <Heading size=\"md\">Themvora + Chakra UI</Heading>\n          <Text color=\"fg.muted\">\n            These are Chakra's own components — the system comes from the theme.\n          </Text>\n          <Box>\n            <Button colorPalette=\"primary\">Primary action</Button>\n          </Box>\n        </Stack>\n      </Card.Body>\n    </Card.Root>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, HStack, Text } from \"@chakra-ui/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <HStack gap=\"2\">\n      <Text color=\"fg.muted\" fontSize=\"sm\">\n        Mode: {mode}\n      </Text>\n      <Button colorPalette=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </HStack>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "chakra/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"3.30.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add @chakra-ui/react @emotion/react"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/chakra"],
    "setup": "// ---- src/index.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n// Rebuilds Chakra UI's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <ChakraThemeProvider runtime={runtime}>{children}</ChakraThemeProvider>;\n}",
    "componentExample": "// src/Example.tsx\nimport { Box, Button, Card, Heading, Stack, Text } from \"@chakra-ui/react\";\nexport function Example() {\n  return (\n    <Card.Root variant=\"outline\">\n      <Card.Body>\n        <Stack gap=\"3\">\n          <Heading size=\"md\">Themvora + Chakra UI</Heading>\n          <Text color=\"fg.muted\">\n            These are Chakra's own components — the system comes from the theme.\n          </Text>\n          <Box>\n            <Button colorPalette=\"primary\">Primary action</Button>\n          </Box>\n        </Stack>\n      </Card.Body>\n    </Card.Root>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nimport { Button, HStack, Text } from \"@chakra-ui/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <HStack gap=\"2\">\n      <Text color=\"fg.muted\" fontSize=\"sm\">\n        Mode: {mode}\n      </Text>\n      <Button colorPalette=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </HStack>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "chakra/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"3.30.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add @chakra-ui/react @emotion/react"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/chakra"],
    "setup": "// ---- app/styles.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { ChakraThemeProvider } from \"@themvora/chakra\";\n// Rebuilds Chakra UI's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <ChakraThemeProvider runtime={runtime}>{children}</ChakraThemeProvider>;\n}",
    "componentExample": "// app/components/example.tsx\nimport { Box, Button, Card, Heading, Stack, Text } from \"@chakra-ui/react\";\nexport function Example() {\n  return (\n    <Card.Root variant=\"outline\">\n      <Card.Body>\n        <Stack gap=\"3\">\n          <Heading size=\"md\">Themvora + Chakra UI</Heading>\n          <Text color=\"fg.muted\">\n            These are Chakra's own components — the system comes from the theme.\n          </Text>\n          <Box>\n            <Button colorPalette=\"primary\">Primary action</Button>\n          </Box>\n        </Stack>\n      </Card.Body>\n    </Card.Root>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nimport { Button, HStack, Text } from \"@chakra-ui/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <HStack gap=\"2\">\n      <Text color=\"fg.muted\" fontSize=\"sm\">\n        Mode: {mode}\n      </Text>\n      <Button colorPalette=\"primary\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </HStack>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "daisyui/Angular": {
    "lang": "ts",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Angular","value":"22.2.5 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Angular 20+ standalone application. Global styles live in `src/styles.css`, referenced by `angular.json`."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/postcss"],
    "themvora": ["pnpm add @themvora/core @themvora/angular @themvora/daisyui"],
    "setup": "// .postcssrc.json\n// ---- .postcssrc.json\n{ \"plugins\": { \"@tailwindcss/postcss\": {} } }\n// ---- src/styles.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport { AppComponent } from \"./app/app.component\";\nbootstrapApplication(AppComponent, {\n  providers: [provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" })],\n});",
    "code": "// src/app/theme-zone.component.ts\nimport { Component } from \"@angular/core\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectDaisyTheme } from \"@themvora/daisyui/angular\";\n@Component({\n  selector: \"app-theme-zone\",\n  standalone: true,\n  template: \"<ng-content />\",\n})\nexport class ThemeZoneComponent {\n  constructor() {\n    // A constructor is an injection context, so the adapter attaches to the\n    // runtime `provideTheme()` created in src/main.ts.\n    injectDaisyTheme(injectThemeRuntime());\n  }\n}",
    "componentExample": "// src/app/example.component.ts\nimport { Component } from \"@angular/core\";\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n    <div class=\"card bg-base-100 shadow-sm\">\n      <div class=\"card-body\">\n        <h2 class=\"card-title\">Themvora + daisyUI</h2>\n        <p class=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n        <div class=\"card-actions justify-end\">\n          <button class=\"btn btn-primary\">Primary action</button>\n        </div>\n      </div>\n    </div>\n  `,\n})\nexport class ExampleComponent {}",
    "themeSwitchExample": "// src/app/theme-controls.component.ts\nimport { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n@Component({\n  selector: \"app-theme-controls\",\n  standalone: true,\n  template: `\n    <div class=\"flex items-center gap-2\">\n      <span class=\"text-sm text-base-content/70\">Mode: {{ state().mode }}</span>\n      <button class=\"btn btn-primary btn-sm\" (click)=\"state().toggleTheme()\">Toggle</button>\n      <button class=\"btn btn-ghost btn-sm\" (click)=\"state().setMode('light')\">Light</button>\n      <button class=\"btn btn-ghost btn-sm\" (click)=\"state().setMode('dark')\">Dark</button>\n    </div>\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "completeExample": "// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { ThemeZoneComponent } from \"./theme-zone.component\";\nimport { ExampleComponent } from \"./example.component\";\nimport { ThemeControlsComponent } from \"./theme-controls.component\";\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [ThemeZoneComponent, ExampleComponent, ThemeControlsComponent],\n  template: `\n    <app-theme-zone>\n      <app-example />\n      <app-theme-controls />\n    </app-theme-zone>\n  `,\n})\nexport class AppComponent {}",
  },
  "daisyui/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/daisyui"],
    "setup": "// ---- astro.config.mjs\nimport { defineConfig } from \"astro/config\";\nimport react from \"@astrojs/react\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  integrations: [react()],\n  vite: { plugins: [tailwindcss()] },\n});\n// ---- src/styles/global.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction InstallAdapter() {\n  useDaisyTheme(useThemeRuntime());\n  return null;\n}\n// One client island owns the runtime, the adapter and the UI. Astro cannot\n// hand React children to a client:only island, so the island renders the\n// example itself rather than receiving it from the page.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <InstallAdapter />\n      <Example />\n      <ThemeControls />\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nexport function Example() {\n  return (\n    <div className=\"card bg-base-100 shadow-sm\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title\">Themvora + daisyUI</h2>\n        <p className=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n        <div className=\"card-actions justify-end\">\n          <button className=\"btn btn-primary\">Primary action</button>\n        </div>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-base-content/70\">Mode: {mode}</span>\n      <button className=\"btn btn-primary btn-sm\" onClick={toggleTheme}>Toggle</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"light\")}>Light</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "daisyui/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/postcss"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/daisyui"],
    "setup": "// ---- postcss.config.mjs\nexport default {\n  plugins: { \"@tailwindcss/postcss\": {} },\n};\n// ---- app/globals.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useDaisyTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/example.tsx\nexport function Example() {\n  return (\n    <div className=\"card bg-base-100 shadow-sm\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title\">Themvora + daisyUI</h2>\n        <p className=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n        <div className=\"card-actions justify-end\">\n          <button className=\"btn btn-primary\">Primary action</button>\n        </div>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-base-content/70\">Mode: {mode}</span>\n      <button className=\"btn btn-primary btn-sm\" onClick={toggleTheme}>Toggle</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"light\")}>Light</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "daisyui/Nuxt": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Nuxt","value":"4.2.0 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Nuxt 4 project. Install `@themvora/vue` alongside `@themvora/nuxt`."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/nuxt @themvora/daisyui @themvora/vue"],
    "setup": "// ---- nuxt.config.ts\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineNuxtConfig({\n  css: [\"~/assets/css/main.css\"],\n  vite: { plugins: [tailwindcss()] },\n});\n// ---- app/assets/css/main.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// nuxt.config.ts\nexport default defineNuxtConfig({\n  modules: [\"@themvora/nuxt\"],\n  // Nuxt loads this stylesheet globally; it is where the library's CSS and\n  // the adapter's variable map are imported, in that order.\n  css: [\"~/assets/css/main.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "code": "<!-- app/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\n// `useThemeRuntime` is auto-imported by @themvora/nuxt.\nimport { useDaisyTheme } from \"@themvora/daisyui/vue\";\nuseDaisyTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- app/components/Example.vue -->\n<template>\n  <div class=\"card bg-base-100 shadow-sm\">\n    <div class=\"card-body\">\n      <h2 class=\"card-title\">Themvora + daisyUI</h2>\n      <p class=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n      <div class=\"card-actions justify-end\">\n        <button class=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  </div>\n</template>",
    "themeSwitchExample": "<!-- app/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"flex items-center gap-2\">\n    <span class=\"text-sm text-base-content/70\">Mode: {{ mode }}</span>\n    <button class=\"btn btn-primary btn-sm\" @click=\"toggleTheme\">Toggle</button>\n    <button class=\"btn btn-ghost btn-sm\" @click=\"setMode('light')\">Light</button>\n    <button class=\"btn btn-ghost btn-sm\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>",
    "completeExample": "<!-- app/app.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "daisyui/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/daisyui"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport react from \"@vitejs/plugin-react\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n});\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\n// Registers the adapter on the runtime from the provider above.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useDaisyTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// src/Example.tsx\nexport function Example() {\n  return (\n    <div className=\"card bg-base-100 shadow-sm\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title\">Themvora + daisyUI</h2>\n        <p className=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n        <div className=\"card-actions justify-end\">\n          <button className=\"btn btn-primary\">Primary action</button>\n        </div>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-base-content/70\">Mode: {mode}</span>\n      <button className=\"btn btn-primary btn-sm\" onClick={toggleTheme}>Toggle</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"light\")}>Light</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "daisyui/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/daisyui"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport { vitePlugin as remix } from \"@remix-run/dev\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  plugins: [remix(), tailwindcss()],\n});\n// ---- app/styles.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { useDaisyTheme } from \"@themvora/daisyui/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useDaisyTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/components/example.tsx\nexport function Example() {\n  return (\n    <div className=\"card bg-base-100 shadow-sm\">\n      <div className=\"card-body\">\n        <h2 className=\"card-title\">Themvora + daisyUI</h2>\n        <p className=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n        <div className=\"card-actions justify-end\">\n          <button className=\"btn btn-primary\">Primary action</button>\n        </div>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-base-content/70\">Mode: {mode}</span>\n      <button className=\"btn btn-primary btn-sm\" onClick={toggleTheme}>Toggle</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"light\")}>Light</button>\n      <button className=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "daisyui/Solid": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Solid","value":"1.9.18 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Solid + Vite project (`npm create vite@latest -- --template solid-ts`)."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/solid @themvora/daisyui"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport solid from \"vite-plugin-solid\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  plugins: [solid(), tailwindcss()],\n});\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/index.tsx\nimport { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"./index.css\";\nimport { App } from \"./App\";\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { JSX } from \"solid-js\";\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useDaisyTheme } from \"@themvora/daisyui/solid\";\nexport function ThemeZone(props: { children: JSX.Element }) {\n  useDaisyTheme(useThemeRuntime());\n  return <>{props.children}</>;\n}",
    "componentExample": "// src/Example.tsx\nexport function Example() {\n  return (\n    <div class=\"card bg-base-100 shadow-sm\">\n      <div class=\"card-body\">\n        <h2 class=\"card-title\">Themvora + daisyUI</h2>\n        <p class=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n        <div class=\"card-actions justify-end\">\n          <button class=\"btn btn-primary\">Primary action</button>\n        </div>\n      </div>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/solid\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div class=\"flex items-center gap-2\">\n      <span class=\"text-sm text-base-content/70\">Mode: {mode()}</span>\n      <button class=\"btn btn-primary btn-sm\" onClick={() => toggleTheme()}>Toggle</button>\n      <button class=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"light\")}>Light</button>\n      <button class=\"btn btn-ghost btn-sm\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "daisyui/Svelte": {
    "lang": "svelte",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Svelte","value":"5.57.3 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`)."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/svelte @themvora/daisyui"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport { svelte } from \"@sveltejs/vite-plugin-svelte\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  plugins: [svelte(), tailwindcss()],\n});\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "<!-- src/lib/ThemeRoot.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"../index.css\";\n  let { children }: { children: Snippet } = $props();\n</script>\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  {@render children()}\n</ThemeProvider>\n// ---- src/main.ts\nimport { mount } from \"svelte\";\nimport App from \"./App.svelte\";\nmount(App, { target: document.getElementById(\"app\")! });",
    "code": "<!-- src/lib/ThemeZone.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { getThemeRuntime } from \"@themvora/svelte\";\n  import { useDaisyTheme } from \"@themvora/daisyui/svelte\";\n  let { children }: { children: Snippet } = $props();\n  // Runs during component initialisation, so the variables exist before paint.\n  useDaisyTheme(getThemeRuntime());\n</script>\n{@render children()}",
    "componentExample": "<!-- src/lib/Example.svelte -->\n<script lang=\"ts\">\n  // Markup only — but a Svelte component without a script block emits no\n  // module declaration, so importing it fails `svelte-check` under strict.\n</script>\n<div class=\"card bg-base-100 shadow-sm\">\n  <div class=\"card-body\">\n    <h2 class=\"card-title\">Themvora + daisyUI</h2>\n    <p class=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n    <div class=\"card-actions justify-end\">\n      <button class=\"btn btn-primary\">Primary action</button>\n    </div>\n  </div>\n</div>",
    "themeSwitchExample": "<!-- src/lib/ThemeControls.svelte -->\n<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n  const { mode, setMode, toggleTheme } = useTheme();\n</script>\n<div class=\"flex items-center gap-2\">\n  <span class=\"text-sm text-base-content/70\">Mode: {$mode}</span>\n  <button class=\"btn btn-primary btn-sm\" onclick={toggleTheme}>Toggle</button>\n  <button class=\"btn btn-ghost btn-sm\" onclick={() => setMode(\"light\")}>Light</button>\n  <button class=\"btn btn-ghost btn-sm\" onclick={() => setMode(\"dark\")}>Dark</button>\n</div>",
    "completeExample": "<!-- src/App.svelte -->\n<script lang=\"ts\">\n  import ThemeRoot from \"./lib/ThemeRoot.svelte\";\n  import ThemeZone from \"./lib/ThemeZone.svelte\";\n  import Example from \"./lib/Example.svelte\";\n  import ThemeControls from \"./lib/ThemeControls.svelte\";\n</script>\n<ThemeRoot>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</ThemeRoot>",
  },
  "daisyui/Vue 3": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Vue 3","value":"3.5.44 (verified)"},{"label":"Library","value":"5.1.10"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3"},{"label":"Project","value":"Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`)."}],
    "install": ["pnpm add daisyui","pnpm add -D tailwindcss @tailwindcss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/vue @themvora/daisyui"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport vue from \"@vitejs/plugin-vue\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  plugins: [vue(), tailwindcss()],\n});\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/daisyui/daisyui.css\";\n@plugin \"daisyui\";\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { createApp, h } from \"vue\";\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"./index.css\";\nimport App from \"./App.vue\";\ncreateApp({\n  render: () =>\n    h(\n      ThemeProvider,\n      { defaultTheme: \"plum-light\", initialMode: \"system\" },\n      () => h(App),\n    ),\n}).mount(\"#app\");",
    "code": "<!-- src/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\nimport { useThemeRuntime } from \"@themvora/vue\";\nimport { useDaisyTheme } from \"@themvora/daisyui/vue\";\n// Installs on mount, disposes on unmount.\nuseDaisyTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- src/components/Example.vue -->\n<template>\n  <div class=\"card bg-base-100 shadow-sm\">\n    <div class=\"card-body\">\n      <h2 class=\"card-title\">Themvora + daisyUI</h2>\n      <p class=\"text-base-content/70\">This card is a plain daisyUI card. Its colours come from the theme.</p>\n      <div class=\"card-actions justify-end\">\n        <button class=\"btn btn-primary\">Primary action</button>\n      </div>\n    </div>\n  </div>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"flex items-center gap-2\">\n    <span class=\"text-sm text-base-content/70\">Mode: {{ mode }}</span>\n    <button class=\"btn btn-primary btn-sm\" @click=\"toggleTheme\">Toggle</button>\n    <button class=\"btn btn-ghost btn-sm\" @click=\"setMode('light')\">Light</button>\n    <button class=\"btn btn-ghost btn-sm\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>",
    "completeExample": "<!-- src/App.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "mantine/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"7.17.0"},{"label":"Peer dependencies","value":"@mantine/hooks 7.17.0"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add @mantine/core @mantine/hooks"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/mantine"],
    "setup": "// ---- src/styles/global.css\n@import \"@mantine/core/styles.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction Bridged({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>;\n}\n// Astro cannot hand React children to a client:only island, so the island\n// renders the example and the controls inside the provider itself.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <Bridged>\n        <Example />\n        <ThemeControls />\n      </Bridged>\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nimport { Button, Card, Group, Stack, Text, Title } from \"@mantine/core\";\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\" radius=\"md\">\n      <Stack gap=\"sm\">\n        <Title order={5}>Themvora + Mantine</Title>\n        <Text c=\"dimmed\" size=\"sm\">\n          These are Mantine's own components — the theme comes from Themvora.\n        </Text>\n        <Group>\n          <Button>Primary action</Button>\n        </Group>\n      </Stack>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nimport { Button, Group, Text } from \"@mantine/core\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Group gap=\"xs\">\n      <Text size=\"sm\" c=\"dimmed\">Mode: {mode}</Text>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Group>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "mantine/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"7.17.0"},{"label":"Peer dependencies","value":"@mantine/hooks 7.17.0"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add @mantine/core @mantine/hooks"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/mantine"],
    "setup": "// ---- app/globals.css\n@import \"@mantine/core/styles.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n// Rebuilds Mantine's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>;\n}",
    "componentExample": "// app/example.tsx\n\"use client\";\n\nimport { Button, Card, Group, Stack, Text, Title } from \"@mantine/core\";\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\" radius=\"md\">\n      <Stack gap=\"sm\">\n        <Title order={5}>Themvora + Mantine</Title>\n        <Text c=\"dimmed\" size=\"sm\">\n          These are Mantine's own components — the theme comes from Themvora.\n        </Text>\n        <Group>\n          <Button>Primary action</Button>\n        </Group>\n      </Stack>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Group, Text } from \"@mantine/core\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Group gap=\"xs\">\n      <Text size=\"sm\" c=\"dimmed\">Mode: {mode}</Text>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Group>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "mantine/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"7.17.0"},{"label":"Peer dependencies","value":"@mantine/hooks 7.17.0"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add @mantine/core @mantine/hooks"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/mantine"],
    "setup": "// ---- src/index.css\n@import \"@mantine/core/styles.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n// Rebuilds Mantine's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>;\n}",
    "componentExample": "// src/Example.tsx\nimport { Button, Card, Group, Stack, Text, Title } from \"@mantine/core\";\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\" radius=\"md\">\n      <Stack gap=\"sm\">\n        <Title order={5}>Themvora + Mantine</Title>\n        <Text c=\"dimmed\" size=\"sm\">\n          These are Mantine's own components — the theme comes from Themvora.\n        </Text>\n        <Group>\n          <Button>Primary action</Button>\n        </Group>\n      </Stack>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nimport { Button, Group, Text } from \"@mantine/core\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Group gap=\"xs\">\n      <Text size=\"sm\" c=\"dimmed\">Mode: {mode}</Text>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Group>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "mantine/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"7.17.0"},{"label":"Peer dependencies","value":"@mantine/hooks 7.17.0"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add @mantine/core @mantine/hooks"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/mantine"],
    "setup": "// ---- app/styles.css\n@import \"@mantine/core/styles.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { MantineThemeProvider } from \"@themvora/mantine\";\n// Rebuilds Mantine's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>;\n}",
    "componentExample": "// app/components/example.tsx\nimport { Button, Card, Group, Stack, Text, Title } from \"@mantine/core\";\nexport function Example() {\n  return (\n    <Card withBorder padding=\"lg\" radius=\"md\">\n      <Stack gap=\"sm\">\n        <Title order={5}>Themvora + Mantine</Title>\n        <Text c=\"dimmed\" size=\"sm\">\n          These are Mantine's own components — the theme comes from Themvora.\n        </Text>\n        <Group>\n          <Button>Primary action</Button>\n        </Group>\n      </Stack>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nimport { Button, Group, Text } from \"@mantine/core\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Group gap=\"xs\">\n      <Text size=\"sm\" c=\"dimmed\">Mode: {mode}</Text>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"light\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Group>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "mui/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"9.0.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0, @emotion/styled 11.14.0"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add @mui/material @emotion/react @emotion/styled"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/mui"],
    "setup": "// ---- src/styles/global.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction Bridged({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;\n}\n// Astro cannot hand React children to a client:only island, so the island\n// renders the example and the controls inside the provider itself.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <Bridged>\n        <Example />\n        <ThemeControls />\n      </Bridged>\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nimport { Button, Card, CardContent, Stack, Typography } from \"@mui/material\";\nexport function Example() {\n  return (\n    <Card variant=\"outlined\">\n      <CardContent>\n        <Stack spacing={1.5}>\n          <Typography variant=\"h6\">Themvora + Material UI</Typography>\n          <Typography variant=\"body2\" color=\"text.secondary\">\n            These are MUI's own components — the palette comes from the theme.\n          </Typography>\n          <Button variant=\"contained\">Primary action</Button>\n        </Stack>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nimport { Button, Stack, Typography } from \"@mui/material\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Stack direction=\"row\" spacing={1} sx={{ alignItems: \"center\" }}>\n      <Typography variant=\"body2\" color=\"text.secondary\">\n        Mode: {mode}\n      </Typography>\n      <Button variant=\"contained\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "mui/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"9.0.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0, @emotion/styled 11.14.0"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add @mui/material @emotion/react @emotion/styled","pnpm add @mui/material-nextjs @emotion/cache @emotion/server"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/mui"],
    "setup": "// ---- app/globals.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\n// The subpath follows the Next.js major: v15-appRouter for Next 15,\n// v16-appRouter for Next 16.\nimport { AppRouterCacheProvider } from \"@mui/material-nextjs/v15-appRouter\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\n// AppRouterCacheProvider collects the Emotion styles MUI generates during\n// streaming SSR and flushes them into <head>; without it they arrive in\n// the streamed body chunk and hydration fails with React error #418.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      <AppRouterCacheProvider options={{ key: \"mui\" }}>\n        {children}\n      </AppRouterCacheProvider>\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n// Rebuilds Material UI's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;\n}",
    "componentExample": "// app/example.tsx\n\"use client\";\n\nimport { Button, Card, CardContent, Stack, Typography } from \"@mui/material\";\nexport function Example() {\n  return (\n    <Card variant=\"outlined\">\n      <CardContent>\n        <Stack spacing={1.5}>\n          <Typography variant=\"h6\">Themvora + Material UI</Typography>\n          <Typography variant=\"body2\" color=\"text.secondary\">\n            These are MUI's own components — the palette comes from the theme.\n          </Typography>\n          <Button variant=\"contained\">Primary action</Button>\n        </Stack>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button, Stack, Typography } from \"@mui/material\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Stack direction=\"row\" spacing={1} sx={{ alignItems: \"center\" }}>\n      <Typography variant=\"body2\" color=\"text.secondary\">\n        Mode: {mode}\n      </Typography>\n      <Button variant=\"contained\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "mui/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"9.0.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0, @emotion/styled 11.14.0"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add @mui/material @emotion/react @emotion/styled"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/mui"],
    "setup": "// ---- src/index.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n// Rebuilds Material UI's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;\n}",
    "componentExample": "// src/Example.tsx\nimport { Button, Card, CardContent, Stack, Typography } from \"@mui/material\";\nexport function Example() {\n  return (\n    <Card variant=\"outlined\">\n      <CardContent>\n        <Stack spacing={1.5}>\n          <Typography variant=\"h6\">Themvora + Material UI</Typography>\n          <Typography variant=\"body2\" color=\"text.secondary\">\n            These are MUI's own components — the palette comes from the theme.\n          </Typography>\n          <Button variant=\"contained\">Primary action</Button>\n        </Stack>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nimport { Button, Stack, Typography } from \"@mui/material\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Stack direction=\"row\" spacing={1} sx={{ alignItems: \"center\" }}>\n      <Typography variant=\"body2\" color=\"text.secondary\">\n        Mode: {mode}\n      </Typography>\n      <Button variant=\"contained\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "mui/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"9.0.0"},{"label":"Peer dependencies","value":"@emotion/react 11.14.0, @emotion/styled 11.14.0"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add @mui/material @emotion/react @emotion/styled"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/mui"],
    "setup": "// ---- app/styles.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { MuiThemeProvider } from \"@themvora/mui\";\n// Rebuilds Material UI's own theme object on every selection change.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  const runtime = useThemeRuntime();\n  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;\n}",
    "componentExample": "// app/components/example.tsx\nimport { Button, Card, CardContent, Stack, Typography } from \"@mui/material\";\nexport function Example() {\n  return (\n    <Card variant=\"outlined\">\n      <CardContent>\n        <Stack spacing={1.5}>\n          <Typography variant=\"h6\">Themvora + Material UI</Typography>\n          <Typography variant=\"body2\" color=\"text.secondary\">\n            These are MUI's own components — the palette comes from the theme.\n          </Typography>\n          <Button variant=\"contained\">Primary action</Button>\n        </Stack>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nimport { Button, Stack, Typography } from \"@mui/material\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <Stack direction=\"row\" spacing={1} sx={{ alignItems: \"center\" }}>\n      <Typography variant=\"body2\" color=\"text.secondary\">\n        Mode: {mode}\n      </Typography>\n      <Button variant=\"contained\" onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"light\")}>Light</Button>\n      <Button variant=\"outlined\" onClick={() => setMode(\"dark\")}>Dark</Button>\n    </Stack>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "open-props/Angular": {
    "lang": "ts",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Angular","value":"22.2.5 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Angular 20+ standalone application. Global styles live in `src/styles.css`, referenced by `angular.json`."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/angular @themvora/open-props"],
    "setup": "// ---- src/styles.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { bootstrapApplication } from \"@angular/platform-browser\";\nimport { provideTheme } from \"@themvora/angular\";\nimport { AppComponent } from \"./app/app.component\";\nbootstrapApplication(AppComponent, {\n  providers: [provideTheme({ defaultTheme: \"plum-light\", initialMode: \"system\" })],\n});",
    "code": "// src/app/theme-zone.component.ts\nimport { Component } from \"@angular/core\";\nimport { injectThemeRuntime } from \"@themvora/angular\";\nimport { injectOpenPropsTheme } from \"@themvora/open-props/angular\";\n@Component({\n  selector: \"app-theme-zone\",\n  standalone: true,\n  template: \"<ng-content />\",\n})\nexport class ThemeZoneComponent {\n  constructor() {\n    // A constructor is an injection context, so the adapter attaches to the\n    // runtime `provideTheme()` created in src/main.ts.\n    injectOpenPropsTheme(injectThemeRuntime());\n  }\n}",
    "componentExample": "// src/app/example.component.ts\nimport { Component } from \"@angular/core\";\n@Component({\n  selector: \"app-example\",\n  standalone: true,\n  template: `\n    <section class=\"op-card\">\n      <h2 class=\"op-title\">Themvora + Open Props</h2>\n      <p class=\"op-text\">Open Props ships design tokens, not components — this is ordinary markup.</p>\n      <button class=\"op-button\" type=\"button\">Primary action</button>\n    </section>\n  `,\n  styles: `\n    .op-card { background: var(--color-canvas); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-3); padding: var(--size-5); display: grid; gap: var(--size-3); box-shadow: var(--shadow-2); }\n    .op-title { margin: 0; font-size: var(--font-size-3); font-weight: 600; }\n    .op-text { margin: 0; color: var(--color-muted-foreground); font-size: var(--font-size-1); }\n    .op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-4); font: inherit; cursor: pointer; }\n  `,\n})\nexport class ExampleComponent {}",
    "themeSwitchExample": "// src/app/theme-controls.component.ts\nimport { Component } from \"@angular/core\";\nimport { injectTheme } from \"@themvora/angular\";\n@Component({\n  selector: \"app-theme-controls\",\n  standalone: true,\n  template: `\n    <div class=\"op-bar\">\n      <span class=\"op-muted\">Mode: {{ state().mode }}</span>\n      <button type=\"button\" class=\"op-button\" (click)=\"state().toggleTheme()\">Toggle</button>\n      <button type=\"button\" class=\"op-button op-button-quiet\" (click)=\"state().setMode('light')\">Light</button>\n      <button type=\"button\" class=\"op-button op-button-quiet\" (click)=\"state().setMode('dark')\">Dark</button>\n    </div>\n  `,\n  styles: `\n    .op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }\n    .op-muted { color: var(--color-muted-foreground); }\n    .op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }\n    .op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }\n  `,\n})\nexport class ThemeControlsComponent {\n  state = injectTheme();\n}",
    "completeExample": "// src/app/app.component.ts\nimport { Component } from \"@angular/core\";\nimport { ThemeZoneComponent } from \"./theme-zone.component\";\nimport { ExampleComponent } from \"./example.component\";\nimport { ThemeControlsComponent } from \"./theme-controls.component\";\n@Component({\n  selector: \"app-root\",\n  standalone: true,\n  imports: [ThemeZoneComponent, ExampleComponent, ThemeControlsComponent],\n  template: `\n    <app-theme-zone>\n      <app-example />\n      <app-theme-controls />\n    </app-theme-zone>\n  `,\n})\nexport class AppComponent {}",
  },
  "open-props/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/open-props"],
    "setup": "// ---- src/styles/global.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction InstallAdapter() {\n  useOpenPropsTheme(useThemeRuntime());\n  return null;\n}\n// One client island owns the runtime, the adapter and the UI. Astro cannot\n// hand React children to a client:only island, so the island renders the\n// example itself rather than receiving it from the page.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <InstallAdapter />\n      <Example />\n      <ThemeControls />\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nimport type { CSSProperties } from \"react\";\n// Open Props is a token set, so the styling is a stylesheet — inline here\n// only to keep the example to one file.\nconst card: CSSProperties = { \"background\": \"var(--color-canvas)\", \"color\": \"var(--color-text)\", \"border\": \"1px solid var(--color-border)\", \"borderRadius\": \"var(--radius-3)\", \"padding\": \"var(--size-5)\", \"display\": \"grid\", \"gap\": \"var(--size-3)\", \"boxShadow\": \"var(--shadow-2)\" };\nconst title: CSSProperties = { \"margin\": \"0\", \"fontSize\": \"var(--font-size-3)\", \"fontWeight\": \"600\" };\nconst text: CSSProperties = { \"margin\": \"0\", \"color\": \"var(--color-muted-foreground)\", \"fontSize\": \"var(--font-size-1)\" };\nconst button: CSSProperties = { \"background\": \"var(--color-primary)\", \"color\": \"var(--color-primary-foreground)\", \"border\": \"0\", \"borderRadius\": \"var(--radius-2)\", \"padding\": \"var(--size-2) var(--size-4)\", \"font\": \"inherit\", \"cursor\": \"pointer\" };\nexport function Example() {\n  return (\n    <section style={card}>\n      <h2 style={title}>Themvora + Open Props</h2>\n      <p style={text}>Open Props ships design tokens, not components — this is ordinary markup.</p>\n      <button type=\"button\" style={button}>\n        Primary action\n      </button>\n    </section>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"op-bar\">\n      <span className=\"op-muted\">Mode: {mode}</span>\n      <button type=\"button\" className=\"op-button\" onClick={toggleTheme}>Toggle</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "open-props/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/open-props"],
    "setup": "// ---- app/globals.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useOpenPropsTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/example.tsx\nimport type { CSSProperties } from \"react\";\n// Open Props is a token set, so the styling is a stylesheet — inline here\n// only to keep the example to one file.\nconst card: CSSProperties = { \"background\": \"var(--color-canvas)\", \"color\": \"var(--color-text)\", \"border\": \"1px solid var(--color-border)\", \"borderRadius\": \"var(--radius-3)\", \"padding\": \"var(--size-5)\", \"display\": \"grid\", \"gap\": \"var(--size-3)\", \"boxShadow\": \"var(--shadow-2)\" };\nconst title: CSSProperties = { \"margin\": \"0\", \"fontSize\": \"var(--font-size-3)\", \"fontWeight\": \"600\" };\nconst text: CSSProperties = { \"margin\": \"0\", \"color\": \"var(--color-muted-foreground)\", \"fontSize\": \"var(--font-size-1)\" };\nconst button: CSSProperties = { \"background\": \"var(--color-primary)\", \"color\": \"var(--color-primary-foreground)\", \"border\": \"0\", \"borderRadius\": \"var(--radius-2)\", \"padding\": \"var(--size-2) var(--size-4)\", \"font\": \"inherit\", \"cursor\": \"pointer\" };\nexport function Example() {\n  return (\n    <section style={card}>\n      <h2 style={title}>Themvora + Open Props</h2>\n      <p style={text}>Open Props ships design tokens, not components — this is ordinary markup.</p>\n      <button type=\"button\" style={button}>\n        Primary action\n      </button>\n    </section>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nconst bar: React.CSSProperties = {\n  display: \"flex\",\n  alignItems: \"center\",\n  gap: \"var(--size-2)\",\n  fontSize: \"var(--font-size-0)\",\n};\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div style={bar}>\n      <span style={{ color: \"var(--color-muted-foreground)\" }}>Mode: {mode}</span>\n      <button type=\"button\" className=\"op-button\" onClick={toggleTheme}>Toggle</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "open-props/Nuxt": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Nuxt","value":"4.2.0 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Nuxt 4 project. Install `@themvora/vue` alongside `@themvora/nuxt`."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/nuxt @themvora/open-props @themvora/vue"],
    "setup": "// ---- app/assets/css/main.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// nuxt.config.ts\nexport default defineNuxtConfig({\n  modules: [\"@themvora/nuxt\"],\n  // Nuxt loads this stylesheet globally; it is where the library's CSS and\n  // the adapter's variable map are imported, in that order.\n  css: [\"~/assets/css/main.css\"],\n  themvora: {\n    defaultTheme: \"plum-light\",\n    initialMode: \"system\",\n  },\n});",
    "code": "<!-- app/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\n// `useThemeRuntime` is auto-imported by @themvora/nuxt.\nimport { useOpenPropsTheme } from \"@themvora/open-props/vue\";\nuseOpenPropsTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- app/components/Example.vue -->\n<template>\n  <section class=\"op-card\">\n    <h2 class=\"op-title\">Themvora + Open Props</h2>\n    <p class=\"op-text\">Open Props ships design tokens, not components — this is ordinary markup.</p>\n    <button class=\"op-button\" type=\"button\">Primary action</button>\n  </section>\n</template>\n<style scoped>\n.op-card { background: var(--color-canvas); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-3); padding: var(--size-5); display: grid; gap: var(--size-3); box-shadow: var(--shadow-2); }\n.op-title { margin: 0; font-size: var(--font-size-3); font-weight: 600; }\n.op-text { margin: 0; color: var(--color-muted-foreground); font-size: var(--font-size-1); }\n.op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-4); font: inherit; cursor: pointer; }\n</style>",
    "themeSwitchExample": "<!-- app/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"op-bar\">\n    <span class=\"op-muted\">Mode: {{ mode }}</span>\n    <button type=\"button\" class=\"op-button\" @click=\"toggleTheme\">Toggle</button>\n    <button type=\"button\" class=\"op-button op-button-quiet\" @click=\"setMode('light')\">Light</button>\n    <button type=\"button\" class=\"op-button op-button-quiet\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>\n<style scoped>\n.op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }\n.op-muted { color: var(--color-muted-foreground); }\n.op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }\n.op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }\n</style>",
    "completeExample": "<!-- app/app.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "open-props/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/open-props"],
    "setup": "// ---- src/index.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\n// Registers the adapter on the runtime from the provider above.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useOpenPropsTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// src/Example.tsx\nimport type { CSSProperties } from \"react\";\n// Open Props is a token set, so the styling is a stylesheet — inline here\n// only to keep the example to one file.\nconst card: CSSProperties = { \"background\": \"var(--color-canvas)\", \"color\": \"var(--color-text)\", \"border\": \"1px solid var(--color-border)\", \"borderRadius\": \"var(--radius-3)\", \"padding\": \"var(--size-5)\", \"display\": \"grid\", \"gap\": \"var(--size-3)\", \"boxShadow\": \"var(--shadow-2)\" };\nconst title: CSSProperties = { \"margin\": \"0\", \"fontSize\": \"var(--font-size-3)\", \"fontWeight\": \"600\" };\nconst text: CSSProperties = { \"margin\": \"0\", \"color\": \"var(--color-muted-foreground)\", \"fontSize\": \"var(--font-size-1)\" };\nconst button: CSSProperties = { \"background\": \"var(--color-primary)\", \"color\": \"var(--color-primary-foreground)\", \"border\": \"0\", \"borderRadius\": \"var(--radius-2)\", \"padding\": \"var(--size-2) var(--size-4)\", \"font\": \"inherit\", \"cursor\": \"pointer\" };\nexport function Example() {\n  return (\n    <section style={card}>\n      <h2 style={title}>Themvora + Open Props</h2>\n      <p style={text}>Open Props ships design tokens, not components — this is ordinary markup.</p>\n      <button type=\"button\" style={button}>\n        Primary action\n      </button>\n    </section>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nconst bar: React.CSSProperties = {\n  display: \"flex\",\n  alignItems: \"center\",\n  gap: \"var(--size-2)\",\n  fontSize: \"var(--font-size-0)\",\n};\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div style={bar}>\n      <span style={{ color: \"var(--color-muted-foreground)\" }}>Mode: {mode}</span>\n      <button type=\"button\" className=\"op-button\" onClick={toggleTheme}>Toggle</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "open-props/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/open-props"],
    "setup": "// ---- app/styles.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useOpenPropsTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/components/example.tsx\nimport type { CSSProperties } from \"react\";\n// Open Props is a token set, so the styling is a stylesheet — inline here\n// only to keep the example to one file.\nconst card: CSSProperties = { \"background\": \"var(--color-canvas)\", \"color\": \"var(--color-text)\", \"border\": \"1px solid var(--color-border)\", \"borderRadius\": \"var(--radius-3)\", \"padding\": \"var(--size-5)\", \"display\": \"grid\", \"gap\": \"var(--size-3)\", \"boxShadow\": \"var(--shadow-2)\" };\nconst title: CSSProperties = { \"margin\": \"0\", \"fontSize\": \"var(--font-size-3)\", \"fontWeight\": \"600\" };\nconst text: CSSProperties = { \"margin\": \"0\", \"color\": \"var(--color-muted-foreground)\", \"fontSize\": \"var(--font-size-1)\" };\nconst button: CSSProperties = { \"background\": \"var(--color-primary)\", \"color\": \"var(--color-primary-foreground)\", \"border\": \"0\", \"borderRadius\": \"var(--radius-2)\", \"padding\": \"var(--size-2) var(--size-4)\", \"font\": \"inherit\", \"cursor\": \"pointer\" };\nexport function Example() {\n  return (\n    <section style={card}>\n      <h2 style={title}>Themvora + Open Props</h2>\n      <p style={text}>Open Props ships design tokens, not components — this is ordinary markup.</p>\n      <button type=\"button\" style={button}>\n        Primary action\n      </button>\n    </section>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nconst bar: React.CSSProperties = {\n  display: \"flex\",\n  alignItems: \"center\",\n  gap: \"var(--size-2)\",\n  fontSize: \"var(--font-size-0)\",\n};\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div style={bar}>\n      <span style={{ color: \"var(--color-muted-foreground)\" }}>Mode: {mode}</span>\n      <button type=\"button\" className=\"op-button\" onClick={toggleTheme}>Toggle</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" className=\"op-button op-button-quiet\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "open-props/Solid": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Solid","value":"1.9.18 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Solid + Vite project (`npm create vite@latest -- --template solid-ts`)."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/solid @themvora/open-props"],
    "setup": "// ---- src/index.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/index.tsx\nimport { render } from \"solid-js/web\";\nimport { ThemeProvider } from \"@themvora/solid\";\nimport \"./index.css\";\nimport { App } from \"./App\";\nrender(\n  () => (\n    <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n      <App />\n    </ThemeProvider>\n  ),\n  document.getElementById(\"root\")!,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { JSX } from \"solid-js\";\nimport { useThemeRuntime } from \"@themvora/solid\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/solid\";\nexport function ThemeZone(props: { children: JSX.Element }) {\n  useOpenPropsTheme(useThemeRuntime());\n  return <>{props.children}</>;\n}",
    "componentExample": "// src/Example.tsx\nimport type { JSX } from \"solid-js\";\nconst card: JSX.CSSProperties = { \"background\": \"var(--color-canvas)\", \"color\": \"var(--color-text)\", \"border\": \"1px solid var(--color-border)\", \"border-radius\": \"var(--radius-3)\", \"padding\": \"var(--size-5)\", \"display\": \"grid\", \"gap\": \"var(--size-3)\", \"box-shadow\": \"var(--shadow-2)\" };\nconst title: JSX.CSSProperties = { \"margin\": \"0\", \"font-size\": \"var(--font-size-3)\", \"font-weight\": \"600\" };\nconst text: JSX.CSSProperties = { \"margin\": \"0\", \"color\": \"var(--color-muted-foreground)\", \"font-size\": \"var(--font-size-1)\" };\nconst button: JSX.CSSProperties = { \"background\": \"var(--color-primary)\", \"color\": \"var(--color-primary-foreground)\", \"border\": \"0\", \"border-radius\": \"var(--radius-2)\", \"padding\": \"var(--size-2) var(--size-4)\", \"font\": \"inherit\", \"cursor\": \"pointer\" };\nexport function Example() {\n  return (\n    <section style={card}>\n      <h2 style={title}>Themvora + Open Props</h2>\n      <p style={text}>\n        Open Props ships design tokens, not components — this is ordinary markup.\n      </p>\n      <button type=\"button\" style={button}>\n        Primary action\n      </button>\n    </section>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/solid\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div class=\"op-bar\">\n      <span class=\"op-muted\">Mode: {mode()}</span>\n      <button type=\"button\" class=\"op-button\" onClick={() => toggleTheme()}>Toggle</button>\n      <button type=\"button\" class=\"op-button op-button-quiet\" onClick={() => setMode(\"light\")}>Light</button>\n      <button type=\"button\" class=\"op-button op-button-quiet\" onClick={() => setMode(\"dark\")}>Dark</button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "open-props/Svelte": {
    "lang": "svelte",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Svelte","value":"5.57.3 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`)."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/svelte @themvora/open-props"],
    "setup": "// ---- src/index.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "<!-- src/lib/ThemeRoot.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"../index.css\";\n  let { children }: { children: Snippet } = $props();\n</script>\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  {@render children()}\n</ThemeProvider>\n// ---- src/main.ts\nimport { mount } from \"svelte\";\nimport App from \"./App.svelte\";\nmount(App, { target: document.getElementById(\"app\")! });",
    "code": "<!-- src/lib/ThemeZone.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { getThemeRuntime } from \"@themvora/svelte\";\n  import { useOpenPropsTheme } from \"@themvora/open-props/svelte\";\n  let { children }: { children: Snippet } = $props();\n  // Runs during component initialisation, so the variables exist before paint.\n  useOpenPropsTheme(getThemeRuntime());\n</script>\n{@render children()}",
    "componentExample": "<!-- src/lib/Example.svelte -->\n<script lang=\"ts\">\n  // Markup only — but a Svelte component without a script block emits no\n  // module declaration, so importing it fails `svelte-check` under strict.\n</script>\n<section class=\"op-card\">\n  <h2 class=\"op-title\">Themvora + Open Props</h2>\n  <p class=\"op-text\">Open Props ships design tokens, not components — this is ordinary markup.</p>\n  <button class=\"op-button\" type=\"button\">Primary action</button>\n</section>\n<style>\n  .op-card { background: var(--color-canvas); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-3); padding: var(--size-5); display: grid; gap: var(--size-3); box-shadow: var(--shadow-2); }\n  .op-title { margin: 0; font-size: var(--font-size-3); font-weight: 600; }\n  .op-text { margin: 0; color: var(--color-muted-foreground); font-size: var(--font-size-1); }\n  .op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-4); font: inherit; cursor: pointer; }\n</style>",
    "themeSwitchExample": "<!-- src/lib/ThemeControls.svelte -->\n<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n  const { mode, setMode, toggleTheme } = useTheme();\n</script>\n<div class=\"op-bar\">\n  <span class=\"op-muted\">Mode: {$mode}</span>\n  <button type=\"button\" class=\"op-button\" onclick={toggleTheme}>Toggle</button>\n  <button type=\"button\" class=\"op-button op-button-quiet\" onclick={() => setMode(\"light\")}>Light</button>\n  <button type=\"button\" class=\"op-button op-button-quiet\" onclick={() => setMode(\"dark\")}>Dark</button>\n</div>\n<style>\n  .op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }\n  .op-muted { color: var(--color-muted-foreground); }\n  .op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }\n  .op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }\n</style>",
    "completeExample": "<!-- src/App.svelte -->\n<script lang=\"ts\">\n  import ThemeRoot from \"./lib/ThemeRoot.svelte\";\n  import ThemeZone from \"./lib/ThemeZone.svelte\";\n  import Example from \"./lib/Example.svelte\";\n  import ThemeControls from \"./lib/ThemeControls.svelte\";\n</script>\n<ThemeRoot>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</ThemeRoot>",
  },
  "open-props/Vue 3": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Vue 3","value":"3.5.44 (verified)"},{"label":"Library","value":"1.7.23"},{"label":"Project","value":"Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`)."}],
    "install": ["pnpm add open-props"],
    "themvora": ["pnpm add @themvora/core @themvora/vue @themvora/open-props"],
    "setup": "// ---- src/index.css\n@import \"open-props/style\";\n@import \"@themvora/open-props/open-props.css\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { createApp, h } from \"vue\";\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"./index.css\";\nimport App from \"./App.vue\";\ncreateApp({\n  render: () =>\n    h(\n      ThemeProvider,\n      { defaultTheme: \"plum-light\", initialMode: \"system\" },\n      () => h(App),\n    ),\n}).mount(\"#app\");",
    "code": "<!-- src/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\nimport { useThemeRuntime } from \"@themvora/vue\";\nimport { useOpenPropsTheme } from \"@themvora/open-props/vue\";\n// Installs on mount, disposes on unmount.\nuseOpenPropsTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- src/components/Example.vue -->\n<template>\n  <section class=\"op-card\">\n    <h2 class=\"op-title\">Themvora + Open Props</h2>\n    <p class=\"op-text\">Open Props ships design tokens, not components — this is ordinary markup.</p>\n    <button class=\"op-button\" type=\"button\">Primary action</button>\n  </section>\n</template>\n<style scoped>\n.op-card { background: var(--color-canvas); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-3); padding: var(--size-5); display: grid; gap: var(--size-3); box-shadow: var(--shadow-2); }\n.op-title { margin: 0; font-size: var(--font-size-3); font-weight: 600; }\n.op-text { margin: 0; color: var(--color-muted-foreground); font-size: var(--font-size-1); }\n.op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-4); font: inherit; cursor: pointer; }\n</style>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"op-bar\">\n    <span class=\"op-muted\">Mode: {{ mode }}</span>\n    <button type=\"button\" class=\"op-button\" @click=\"toggleTheme\">Toggle</button>\n    <button type=\"button\" class=\"op-button op-button-quiet\" @click=\"setMode('light')\">Light</button>\n    <button type=\"button\" class=\"op-button op-button-quiet\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>\n<style scoped>\n.op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }\n.op-muted { color: var(--color-muted-foreground); }\n.op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }\n.op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }\n</style>",
    "completeExample": "<!-- src/App.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "shadcn/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"CLI-generated"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3, class-variance-authority 0.7.1, tailwind-variants 3.3.1"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add -D tailwindcss @tailwindcss/vite","pnpm dlx shadcn@latest init","pnpm dlx shadcn@latest add button card"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/shadcn @themvora/tailwind"],
    "setup": "// ---- astro.config.mjs\nimport { defineConfig } from \"astro/config\";\nimport { fileURLToPath } from \"node:url\";\nimport react from \"@astrojs/react\";\nimport tailwindcss from \"@tailwindcss/vite\";\nexport default defineConfig({\n  integrations: [react()],\n  vite: {\n    plugins: [tailwindcss()],\n    resolve: {\n      alias: { \"@\": fileURLToPath(new URL(\"./src\", import.meta.url)) },\n    },\n  },\n});\n// ---- tsconfig.json\n{\n  \"extends\": \"astro/tsconfigs/strict\",\n  \"compilerOptions\": {\n    \"baseUrl\": \".\",\n    \"paths\": { \"@/*\": [\"./src/*\"] }\n  }\n}\n// ---- src/styles/global.css\n@import \"tailwindcss\";\n@import \"@themvora/shadcn/shadcn.css\";\n@import \"@themvora/tailwind\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport { ThemeProviderClient, useThemeRuntime } from \"@themvora/astro/client\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nfunction InstallAdapter() {\n  useShadcnTheme(useThemeRuntime());\n  return null;\n}\n// Astro cannot pass React children to a client:only island — the children\n// become static HTML. The island therefore renders the example and the\n// controls itself, inside the same client tree as the runtime.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <InstallAdapter />\n      <Example />\n      <ThemeControls />\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nexport function Example() {\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>Themvora + shadcn/ui</CardTitle>\n        <CardDescription>\n          These are the components the CLI generated into your project.\n        </CardDescription>\n      </CardHeader>\n      <CardContent>\n        <Button>Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nimport { Button } from \"@/components/ui/button\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>\n        Light\n      </Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </Button>\n    </div>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "shadcn/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"CLI-generated"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3, class-variance-authority 0.7.1, tailwind-variants 3.3.1"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add -D tailwindcss @tailwindcss/postcss","pnpm dlx shadcn@latest init","pnpm dlx shadcn@latest add button card"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/shadcn @themvora/tailwind"],
    "setup": "// ---- postcss.config.mjs\nexport default { plugins: { \"@tailwindcss/postcss\": {} } };\n// ---- tsconfig.json\n{\n  \"compilerOptions\": {\n    \"baseUrl\": \".\",\n    \"paths\": { \"@/*\": [\"./*\"] }\n  }\n}\n// ---- app/globals.css\n@import \"tailwindcss\";\n@import \"@themvora/shadcn/shadcn.css\";\n@import \"@themvora/tailwind\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/next/client\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useShadcnTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/example.tsx\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nexport function Example() {\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>Themvora + shadcn/ui</CardTitle>\n        <CardDescription>\n          These are the components the CLI generated into your project.\n        </CardDescription>\n      </CardHeader>\n      <CardContent>\n        <Button>Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nimport { Button } from \"@/components/ui/button\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>\n        Light\n      </Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </Button>\n    </div>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "shadcn/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"CLI-generated"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3, class-variance-authority 0.7.1, tailwind-variants 3.3.1"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add -D tailwindcss @tailwindcss/vite","pnpm dlx shadcn@latest init","pnpm dlx shadcn@latest add button card"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/shadcn @themvora/tailwind"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport react from \"@vitejs/plugin-react\";\nimport tailwindcss from \"@tailwindcss/vite\";\nimport path from \"node:path\";\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n  resolve: { alias: { \"@\": path.resolve(__dirname, \"./src\") } },\n});\n// ---- tsconfig.json\n{\n  \"compilerOptions\": {\n    \"baseUrl\": \".\",\n    \"paths\": { \"@/*\": [\"./src/*\"] }\n  }\n}\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/shadcn/shadcn.css\";\n@import \"@themvora/tailwind\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/react\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\n// Registers the adapter on the runtime from the provider above.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useShadcnTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// src/Example.tsx\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nexport function Example() {\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>Themvora + shadcn/ui</CardTitle>\n        <CardDescription>\n          These are the components the CLI generated into your project.\n        </CardDescription>\n      </CardHeader>\n      <CardContent>\n        <Button>Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nimport { Button } from \"@/components/ui/button\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>\n        Light\n      </Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </Button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "shadcn/Remix": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Remix","value":"2.17.0 (verified)"},{"label":"Library","value":"CLI-generated"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3, class-variance-authority 0.7.1, tailwind-variants 3.3.1"},{"label":"Project","value":"Remix (Vite) project. The recipe edits `app/root.tsx`."}],
    "install": ["pnpm add -D tailwindcss @tailwindcss/vite","pnpm dlx shadcn@latest init","pnpm dlx shadcn@latest add button card"],
    "themvora": ["pnpm add @themvora/core @themvora/remix @themvora/shadcn @themvora/tailwind"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport { vitePlugin as remix } from \"@remix-run/dev\";\nimport tailwindcss from \"@tailwindcss/vite\";\nimport path from \"node:path\";\nexport default defineConfig({\n  plugins: [remix(), tailwindcss()],\n  resolve: { alias: { \"@\": path.resolve(__dirname, \"./src\") } },\n});\n// ---- tsconfig.json\n{\n  \"compilerOptions\": {\n    \"baseUrl\": \".\",\n    \"paths\": { \"@/*\": [\"./src/*\"] }\n  }\n}\n// ---- app/styles.css\n@import \"tailwindcss\";\n@import \"@themvora/shadcn/shadcn.css\";\n@import \"@themvora/tailwind\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/root.tsx\nimport type { ReactNode } from \"react\";\nimport type { LinksFunction } from \"@remix-run/node\";\nimport {\n  Links,\n  Meta,\n  Outlet,\n  Scripts,\n  ScrollRestoration,\n  useLoaderData,\n} from \"@remix-run/react\";\nimport { getBuiltInThemes } from \"@themvora/core\";\nimport { createThemeDocument } from \"@themvora/remix\";\nimport styles from \"./styles.css?url\";\nexport const links: LinksFunction = () => [\n  { rel: \"stylesheet\", href: styles },\n];\nconst themes = getBuiltInThemes();\nconst theming = createThemeDocument({\n  themes,\n  defaultTheme: \"plum-light\",\n  mode: \"system\",\n});\n// Resolve the selection on the server so hydration matches exactly.\nexport async function loader({ request }: { request: Request }) {\n  return { theme: await theming.resolveInitial(request) };\n}\nexport function Layout({ children }: { children: ReactNode }) {\n  const { theme } = useLoaderData<typeof loader>();\n  return (\n    // Remix owns the document; Document supplies the theme-owned parts: the\n    // blocking bootstrap, the matching <html> shell and the runtime provider.\n    <theming.Document\n      initial={theme}\n      htmlProps={{ lang: \"en\" }}\n      head={[\n        <meta key=\"charset\" charSet=\"utf-8\" />,\n        <Meta key=\"meta\" />,\n        <Links key=\"links\" />,\n      ]}\n      afterContent={\n        <>\n          <ScrollRestoration />\n          <Scripts />\n        </>\n      }\n    >\n      {children}\n    </theming.Document>\n  );\n}\nexport default function App() {\n  return <Outlet />;\n}",
    "code": "// app/components/theme-zone.tsx\nimport type { ReactNode } from \"react\";\nimport { useThemeRuntime } from \"@themvora/remix\";\nimport { useShadcnTheme } from \"@themvora/shadcn/react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  useShadcnTheme(useThemeRuntime());\n  return <>{children}</>;\n}",
    "componentExample": "// app/components/example.tsx\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nexport function Example() {\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>Themvora + shadcn/ui</CardTitle>\n        <CardDescription>\n          These are the components the CLI generated into your project.\n        </CardDescription>\n      </CardHeader>\n      <CardContent>\n        <Button>Primary action</Button>\n      </CardContent>\n    </Card>\n  );\n}",
    "themeSwitchExample": "// app/components/theme-controls.tsx\nimport { useTheme } from \"@themvora/remix\";\nimport { Button } from \"@/components/ui/button\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <Button onClick={toggleTheme}>Toggle</Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"light\")}>\n        Light\n      </Button>\n      <Button variant=\"outline\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </Button>\n    </div>\n  );\n}",
    "completeExample": "// app/routes/_index.tsx\nimport { ThemeZone } from \"../components/theme-zone\";\nimport { Example } from \"../components/example\";\nimport { ThemeControls } from \"../components/theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "shadcn/Svelte": {
    "lang": "svelte",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Svelte","value":"5.57.3 (verified)"},{"label":"Library","value":"CLI-generated"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3, class-variance-authority 0.7.1, tailwind-variants 3.3.1"},{"label":"Project","value":"Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`)."}],
    "install": ["pnpm add -D tailwindcss @tailwindcss/vite","pnpm dlx shadcn-svelte@latest init","pnpm dlx shadcn-svelte@latest add button card"],
    "themvora": ["pnpm add @themvora/core @themvora/svelte @themvora/shadcn @themvora/tailwind"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport { svelte } from \"@sveltejs/vite-plugin-svelte\";\nimport tailwindcss from \"@tailwindcss/vite\";\nimport path from \"node:path\";\nexport default defineConfig({\n  plugins: [svelte(), tailwindcss()],\n  resolve: { alias: { $lib: path.resolve(__dirname, \"./src/lib\") } },\n});\n// ---- tsconfig.json\n{\n  \"compilerOptions\": {\n    \"baseUrl\": \".\",\n    \"paths\": {\n      \"$lib\": [\"./src/lib\"],\n      \"$lib/*\": [\"./src/lib/*\"]\n    }\n  }\n}\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/shadcn/shadcn.css\";\n@import \"@themvora/tailwind\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "<!-- src/lib/ThemeRoot.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"../index.css\";\n  let { children }: { children: Snippet } = $props();\n</script>\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  {@render children()}\n</ThemeProvider>\n// ---- src/main.ts\nimport { mount } from \"svelte\";\nimport App from \"./App.svelte\";\nmount(App, { target: document.getElementById(\"app\")! });",
    "code": "<!-- src/lib/ThemeZone.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { getThemeRuntime } from \"@themvora/svelte\";\n  import { useShadcnTheme } from \"@themvora/shadcn/svelte\";\n  let { children }: { children: Snippet } = $props();\n  // Runs during component initialisation, so the variables exist before paint.\n  useShadcnTheme(getThemeRuntime());\n</script>\n{@render children()}",
    "componentExample": "<!-- src/lib/Example.svelte -->\n<script lang=\"ts\">\n  import * as Card from \"$lib/components/ui/card/index.js\";\n  import { Button } from \"$lib/components/ui/button/index.js\";\n</script>\n<Card.Root>\n  <Card.Header>\n    <Card.Title>Themvora + shadcn/ui</Card.Title>\n    <Card.Description>\n      These are the components the CLI generated into your project.\n    </Card.Description>\n  </Card.Header>\n  <Card.Content>\n    <Button>Primary action</Button>\n  </Card.Content>\n</Card.Root>",
    "themeSwitchExample": "<!-- src/lib/ThemeControls.svelte -->\n<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n  import { Button } from \"$lib/components/ui/button/index.js\";\n  const { mode, setMode, toggleTheme } = useTheme();\n</script>\n<div class=\"flex items-center gap-2\">\n  <span class=\"text-sm text-muted-foreground\">Mode: {$mode}</span>\n  <Button onclick={toggleTheme}>Toggle</Button>\n  <Button variant=\"outline\" onclick={() => setMode(\"light\")}>Light</Button>\n  <Button variant=\"outline\" onclick={() => setMode(\"dark\")}>Dark</Button>\n</div>",
    "completeExample": "<!-- src/App.svelte -->\n<script lang=\"ts\">\n  import ThemeRoot from \"./lib/ThemeRoot.svelte\";\n  import ThemeZone from \"./lib/ThemeZone.svelte\";\n  import Example from \"./lib/Example.svelte\";\n  import ThemeControls from \"./lib/ThemeControls.svelte\";\n</script>\n<ThemeRoot>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</ThemeRoot>",
  },
  "shadcn/Vue 3": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Vue 3","value":"3.5.44 (verified)"},{"label":"Library","value":"CLI-generated"},{"label":"Peer dependencies","value":"tailwindcss 4.3.3, class-variance-authority 0.7.1, tailwind-variants 3.3.1"},{"label":"Project","value":"Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`)."}],
    "install": ["pnpm add -D tailwindcss @tailwindcss/vite","pnpm dlx shadcn-vue@latest init","pnpm dlx shadcn-vue@latest add button card"],
    "themvora": ["pnpm add @themvora/core @themvora/vue @themvora/shadcn @themvora/tailwind"],
    "setup": "// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport vue from \"@vitejs/plugin-vue\";\nimport tailwindcss from \"@tailwindcss/vite\";\nimport path from \"node:path\";\nexport default defineConfig({\n  plugins: [vue(), tailwindcss()],\n  resolve: { alias: { \"@\": path.resolve(__dirname, \"./src\") } },\n});\n// ---- tsconfig.json\n{\n  \"compilerOptions\": {\n    \"baseUrl\": \".\",\n    \"paths\": { \"@/*\": [\"./src/*\"] }\n  }\n}\n// ---- src/index.css\n@import \"tailwindcss\";\n@import \"@themvora/shadcn/shadcn.css\";\n@import \"@themvora/tailwind\";\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { createApp, h } from \"vue\";\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"./index.css\";\nimport App from \"./App.vue\";\ncreateApp({\n  render: () =>\n    h(\n      ThemeProvider,\n      { defaultTheme: \"plum-light\", initialMode: \"system\" },\n      () => h(App),\n    ),\n}).mount(\"#app\");",
    "code": "<!-- src/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\nimport { useThemeRuntime } from \"@themvora/vue\";\nimport { useShadcnTheme } from \"@themvora/shadcn/vue\";\n// Installs on mount, disposes on unmount.\nuseShadcnTheme(useThemeRuntime());\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- src/components/Example.vue -->\n<script setup lang=\"ts\">\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\n</script>\n<template>\n  <Card>\n    <CardHeader>\n      <CardTitle>Themvora + shadcn/ui</CardTitle>\n      <CardDescription>\n        These are the components the CLI generated into your project.\n      </CardDescription>\n    </CardHeader>\n    <CardContent>\n      <Button>Primary action</Button>\n    </CardContent>\n  </Card>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nimport { Button } from \"@/components/ui/button\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"flex items-center gap-2\">\n    <span class=\"text-sm text-muted-foreground\">Mode: {{ mode }}</span>\n    <Button @click=\"toggleTheme\">Toggle</Button>\n    <Button variant=\"outline\" @click=\"setMode('light')\">Light</Button>\n    <Button variant=\"outline\" @click=\"setMode('dark')\">Dark</Button>\n  </div>\n</template>",
    "completeExample": "<!-- src/App.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
  "unocss/Astro": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Astro","value":"5.14.1 (verified)"},{"label":"Library","value":"66.7.5"},{"label":"Project","value":"Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island."}],
    "install": ["pnpm add -D unocss @unocss/astro"],
    "themvora": ["pnpm add @themvora/core @themvora/astro @themvora/unocss"],
    "setup": "// ---- uno.config.ts\nimport { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});\n// ---- astro.config.mjs\nimport { defineConfig } from \"astro/config\";\nimport react from \"@astrojs/react\";\nimport UnoCSS from \"unocss/astro\";\nexport default defineConfig({ integrations: [UnoCSS(), react()] });\n// ---- src/styles/global.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "---\n// src/layouts/BaseLayout.astro\nimport ThemeIsland from \"../components/ThemeIsland\";\nimport \"../styles/global.css\";\n---\n<html lang=\"en\">\n  <body>\n    <ThemeIsland client:only=\"react\" />\n    <slot />\n  </body>\n</html>",
    "code": "// src/components/ThemeIsland.tsx\nimport { ThemeProviderClient } from \"@themvora/astro/client\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\n// No adapter to install — the preset's utilities already read the live\n// variables, so the runtime alone is enough. The island renders the UI\n// because Astro cannot pass React children to a client:only island.\nexport default function ThemeIsland() {\n  return (\n    <>\n      <ThemeProviderClient defaultTheme=\"plum-light\" initialMode=\"system\" />\n      <Example />\n      <ThemeControls />\n    </>\n  );\n}",
    "componentExample": "// src/components/Example.tsx\nexport function Example() {\n  return (\n    <div className=\"bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3\">\n      <h2 className=\"text-lg font-semibold\">Themvora + UnoCSS</h2>\n      <p className=\"text-sm text-muted-foreground\">\n        Every utility resolves to a live --theme-* variable.\n      </p>\n      <button className=\"bg-primary text-primary-foreground rounded px-4 py-2 self-start\">\n        Primary action\n      </button>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/components/ThemeControls.tsx\nimport { useTheme } from \"@themvora/astro/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <button className=\"bg-primary text-primary-foreground rounded px-3 py-1.5\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button className=\"border border-border rounded px-3 py-1.5\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button className=\"border border-border rounded px-3 py-1.5\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "---\nimport BaseLayout from \"../layouts/BaseLayout.astro\";\n---\n<BaseLayout>\n  <h1>Themvora</h1>\n  <p>Every colour on this page comes from the active theme.</p>\n</BaseLayout>",
  },
  "unocss/Next.js": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Next.js","value":"15.5.28 (verified)"},{"label":"Library","value":"66.7.5"},{"label":"Project","value":"Next.js App Router project. The recipe edits `app/layout.tsx`."}],
    "install": ["pnpm add -D unocss @unocss/postcss"],
    "themvora": ["pnpm add @themvora/core @themvora/next @themvora/unocss"],
    "setup": "// ---- uno.config.ts\nimport { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});\n// ---- postcss.config.mjs\n// The PostCSS plugin expands the @unocss at-rule in the global sheet.\nexport default { plugins: { \"@unocss/postcss\": {} } };\n// ---- app/globals.css\n@unocss all;\n\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// app/layout.tsx\nimport type { ReactNode } from \"react\";\nimport { ThemeProvider } from \"@themvora/next\";\nimport \"./globals.css\";\n// ThemeProvider renders <html> and <body> itself — do not wrap it in them.\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <ThemeProvider defaultTheme=\"plum-light\">\n      {children}\n    </ThemeProvider>\n  );\n}",
    "code": "// app/theme-zone.tsx\n\"use client\";\nimport type { ReactNode } from \"react\";\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  return <>{children}</>;\n}",
    "componentExample": "// app/example.tsx\nexport function Example() {\n  return (\n    <div className=\"bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3\">\n      <h2 className=\"text-lg font-semibold\">Themvora + UnoCSS</h2>\n      <p className=\"text-sm text-muted-foreground\">\n        Every utility resolves to a live --theme-* variable.\n      </p>\n      <button className=\"bg-primary text-primary-foreground rounded px-4 py-2 self-start\">\n        Primary action\n      </button>\n    </div>\n  );\n}",
    "themeSwitchExample": "// app/theme-controls.tsx\n\"use client\";\n\nimport { useTheme } from \"@themvora/next/client\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <button className=\"bg-primary text-primary-foreground rounded px-3 py-1.5\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button className=\"border border-border rounded px-3 py-1.5\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button className=\"border border-border rounded px-3 py-1.5\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "// app/page.tsx\nimport { ThemeZone } from \"./theme-zone\";\nimport { Example } from \"./example\";\nimport { ThemeControls } from \"./theme-controls\";\nexport default function Page() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "unocss/React": {
    "lang": "tsx",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"React","value":"19.3.1 (verified)"},{"label":"Library","value":"66.7.5"},{"label":"Project","value":"Vite + React project (`npm create vite@latest -- --template react-ts`)."}],
    "install": ["pnpm add -D unocss @unocss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/react @themvora/unocss"],
    "setup": "// ---- uno.config.ts\nimport { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});\n// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport react from \"@vitejs/plugin-react\";\nimport UnoCSS from \"unocss/vite\";\nexport default defineConfig({ plugins: [react(), UnoCSS()] });\n// ---- src/index.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.tsx\nimport { createRoot } from \"react-dom/client\";\nimport { ThemeProvider } from \"@themvora/react\";\nimport \"./index.css\";\nimport \"virtual:uno.css\";\nimport { App } from \"./App\";\ncreateRoot(document.getElementById(\"root\")!).render(\n  <ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n    <App />\n  </ThemeProvider>,\n);",
    "code": "// src/ThemeZone.tsx\nimport type { ReactNode } from \"react\";\n// UnoCSS needs no adapter: the preset emits utilities whose values are\n// var(--theme-*), so the runtime's own writes are enough.\nexport function ThemeZone({ children }: { children: ReactNode }) {\n  return <>{children}</>;\n}",
    "componentExample": "// src/Example.tsx\nexport function Example() {\n  return (\n    <div className=\"bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3\">\n      <h2 className=\"text-lg font-semibold\">Themvora + UnoCSS</h2>\n      <p className=\"text-sm text-muted-foreground\">\n        Every utility resolves to a live --theme-* variable.\n      </p>\n      <button className=\"bg-primary text-primary-foreground rounded px-4 py-2 self-start\">\n        Primary action\n      </button>\n    </div>\n  );\n}",
    "themeSwitchExample": "// src/ThemeControls.tsx\nimport { useTheme } from \"@themvora/react\";\nexport function ThemeControls() {\n  const { mode, setMode, toggleTheme } = useTheme();\n  return (\n    <div className=\"flex items-center gap-2\">\n      <span className=\"text-sm text-muted-foreground\">Mode: {mode}</span>\n      <button className=\"bg-primary text-primary-foreground rounded px-3 py-1.5\" onClick={toggleTheme}>\n        Toggle\n      </button>\n      <button className=\"border border-border rounded px-3 py-1.5\" onClick={() => setMode(\"light\")}>\n        Light\n      </button>\n      <button className=\"border border-border rounded px-3 py-1.5\" onClick={() => setMode(\"dark\")}>\n        Dark\n      </button>\n    </div>\n  );\n}",
    "completeExample": "// src/App.tsx\nimport { ThemeZone } from \"./ThemeZone\";\nimport { Example } from \"./Example\";\nimport { ThemeControls } from \"./ThemeControls\";\nexport function App() {\n  return (\n    <ThemeZone>\n      <Example />\n      <ThemeControls />\n    </ThemeZone>\n  );\n}",
  },
  "unocss/Svelte": {
    "lang": "svelte",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Svelte","value":"5.57.3 (verified)"},{"label":"Library","value":"66.7.5"},{"label":"Project","value":"Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`)."}],
    "install": ["pnpm add -D unocss @unocss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/svelte @themvora/unocss"],
    "setup": "// ---- uno.config.ts\nimport { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});\n// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport { svelte } from \"@sveltejs/vite-plugin-svelte\";\nimport UnoCSS from \"unocss/vite\";\nexport default defineConfig({ plugins: [svelte(), UnoCSS()] });\n// ---- src/index.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "<!-- src/lib/ThemeRoot.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  import { ThemeProvider } from \"@themvora/svelte\";\n  import \"../index.css\";\n  let { children }: { children: Snippet } = $props();\n</script>\n<ThemeProvider defaultTheme=\"plum-light\" initialMode=\"system\">\n  {@render children()}\n</ThemeProvider>\n// ---- src/main.ts\nimport { mount } from \"svelte\";\nimport App from \"./App.svelte\";\nimport \"virtual:uno.css\";\nmount(App, { target: document.getElementById(\"app\")! });",
    "code": "<!-- src/lib/ThemeZone.svelte -->\n<script lang=\"ts\">\n  import type { Snippet } from \"svelte\";\n  let { children }: { children: Snippet } = $props();\n</script>\n{@render children()}",
    "componentExample": "<!-- src/lib/Example.svelte -->\n<script lang=\"ts\">\n  // Markup only — but a Svelte component without a script block emits no\n  // module declaration, so importing it fails `svelte-check` under strict.\n</script>\n<div class=\"bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3\">\n  <h2 class=\"text-lg font-semibold\">Themvora + UnoCSS</h2>\n  <p class=\"text-sm text-muted-foreground\">\n    Every utility resolves to a live --theme-* variable.\n  </p>\n  <button class=\"bg-primary text-primary-foreground rounded px-4 py-2 self-start\">\n    Primary action\n  </button>\n</div>",
    "themeSwitchExample": "<!-- src/lib/ThemeControls.svelte -->\n<script lang=\"ts\">\n  import { useTheme } from \"@themvora/svelte\";\n  const { mode, setMode, toggleTheme } = useTheme();\n</script>\n<div class=\"flex items-center gap-2\">\n  <span class=\"text-sm text-muted-foreground\">Mode: {$mode}</span>\n  <button class=\"bg-primary text-primary-foreground rounded px-3 py-1.5\" onclick={toggleTheme}>Toggle</button>\n  <button class=\"border border-border rounded px-3 py-1.5\" onclick={() => setMode(\"light\")}>Light</button>\n  <button class=\"border border-border rounded px-3 py-1.5\" onclick={() => setMode(\"dark\")}>Dark</button>\n</div>",
    "completeExample": "<!-- src/App.svelte -->\n<script lang=\"ts\">\n  import ThemeRoot from \"./lib/ThemeRoot.svelte\";\n  import ThemeZone from \"./lib/ThemeZone.svelte\";\n  import Example from \"./lib/Example.svelte\";\n  import ThemeControls from \"./lib/ThemeControls.svelte\";\n</script>\n<ThemeRoot>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</ThemeRoot>",
  },
  "unocss/Vue 3": {
    "lang": "vue",
    "prereqs": [{"label":"Node.js","value":"22.22.2 (verified)"},{"label":"Vue 3","value":"3.5.44 (verified)"},{"label":"Library","value":"66.7.5"},{"label":"Project","value":"Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`)."}],
    "install": ["pnpm add -D unocss @unocss/vite"],
    "themvora": ["pnpm add @themvora/core @themvora/vue @themvora/unocss"],
    "setup": "// ---- uno.config.ts\nimport { defineConfig, presetWind3 } from \"unocss\";\nimport { presetThemvora } from \"@themvora/unocss\";\nexport default defineConfig({\n  presets: [presetWind3(), presetThemvora()],\n});\n// ---- vite.config.ts\nimport { defineConfig } from \"vite\";\nimport vue from \"@vitejs/plugin-vue\";\nimport UnoCSS from \"unocss/vite\";\nexport default defineConfig({ plugins: [vue(), UnoCSS()] });\n// ---- src/index.css\nhtml,\nbody {\n  margin: 0;\n  background: var(--theme-color-background);\n  color: var(--theme-color-foreground);\n}",
    "mountProvider": "// src/main.ts\nimport { createApp, h } from \"vue\";\nimport { ThemeProvider } from \"@themvora/vue\";\nimport \"./index.css\";\nimport \"virtual:uno.css\";\nimport App from \"./App.vue\";\ncreateApp({\n  render: () =>\n    h(\n      ThemeProvider,\n      { defaultTheme: \"plum-light\", initialMode: \"system\" },\n      () => h(App),\n    ),\n}).mount(\"#app\");",
    "code": "<!-- src/components/ThemeZone.vue -->\n<script setup lang=\"ts\">\n// UnoCSS needs no adapter: the generated utilities reference var(--theme-*).\n</script>\n<template>\n  <slot />\n</template>",
    "componentExample": "<!-- src/components/Example.vue -->\n<script setup lang=\"ts\">\n// Utility classes only — UnoCSS generates them from the preset.\n</script>\n<template>\n  <div class=\"bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3\">\n    <h2 class=\"text-lg font-semibold\">Themvora + UnoCSS</h2>\n    <p class=\"text-sm text-muted-foreground\">\n      Every utility resolves to a live --theme-* variable.\n    </p>\n    <button class=\"bg-primary text-primary-foreground rounded px-4 py-2 self-start\">\n      Primary action\n    </button>\n  </div>\n</template>",
    "themeSwitchExample": "<!-- src/components/ThemeControls.vue -->\n<script setup lang=\"ts\">\nimport { useTheme } from \"@themvora/vue\";\nconst { mode, setMode, toggleTheme } = useTheme();\n</script>\n<template>\n  <div class=\"flex items-center gap-2\">\n    <span class=\"text-sm text-muted-foreground\">Mode: {{ mode }}</span>\n    <button class=\"bg-primary text-primary-foreground rounded px-3 py-1.5\" @click=\"toggleTheme\">Toggle</button>\n    <button class=\"border border-border rounded px-3 py-1.5\" @click=\"setMode('light')\">Light</button>\n    <button class=\"border border-border rounded px-3 py-1.5\" @click=\"setMode('dark')\">Dark</button>\n  </div>\n</template>",
    "completeExample": "<!-- src/App.vue -->\n<script setup lang=\"ts\">\nimport ThemeZone from \"./components/ThemeZone.vue\";\nimport Example from \"./components/Example.vue\";\nimport ThemeControls from \"./components/ThemeControls.vue\";\n</script>\n<template>\n  <ThemeZone>\n    <Example />\n    <ThemeControls />\n  </ThemeZone>\n</template>",
  },
};

/** Syntax-highlighting language for a framework's snippets. */

export const FRAMEWORK_LANG: Record<string, string> = {
  "React": "tsx",
  "Next.js": "tsx",
  "Remix": "tsx",
  "Astro": "tsx",
  "Vue 3": "vue",
  "Nuxt": "vue",
  "Svelte": "svelte",
  "Solid": "tsx",
  "Angular": "ts",
};
export const FRAMEWORK_PACKAGE: Record<string, string> = {
  React: "@themvora/react",
  "Next.js": "@themvora/next",
  Remix: "@themvora/remix",
  Astro: "@themvora/astro",
  "Vue 3": "@themvora/vue",
  Svelte: "@themvora/svelte",
  Solid: "@themvora/solid",
  Angular: "@themvora/angular",
  Nuxt: "@themvora/vue",
};

/** Swap the authored `@themvora/react` for the picked framework's package. */
export function installForFramework(
  commands: string[],
  frameworkLabel: string,
): string[] {
  const pkg = FRAMEWORK_PACKAGE[frameworkLabel];
  if (!pkg || pkg === "@themvora/react") return commands;
  return commands.map((cmd) => cmd.replace(/@themvora\/react\b/g, pkg));
}

/**
 * The order frameworks appear in the picker.
 *
 * React first because it is the reference integration for every library here;
 * then the other React-based frameworks, then the rest. A recipe that is not in
 * this list would still render, but at the end — which is a signal that the
 * public matrix and the recipes have drifted apart.
 */
const FRAMEWORK_ORDER = [
  "React",
  "Next.js",
  "Remix",
  "Astro",
  "Vue 3",
  "Nuxt",
  "Svelte",
  "Solid",
  "Angular",
] as const;

function asSnippet(
  value: string | string[] | RecipePrerequisite[] | undefined,
  lang: string,
): FrameworkSnippet | undefined {
  if (typeof value !== "string") return undefined;
  return { lang, code: value };
}

export const libraries: LibraryItem[] = rawLibraries.map((lib) => {
  // The picker is derived from the recipes, not from a second hand-written
  // list: a framework can only be offered if there is a recipe behind it, and
  // `audit-library-docs.mjs` checks that set against `PUBLIC_FRAMEWORKS`.
  const frameworks: LibraryFrameworkExample[] = Object.entries(FRAMEWORK_RECIPES)
    .filter(([key]) => key.startsWith(`${lib.slug}/`))
    .map(([key, recipe]) => {
      const label = key.slice(lib.slug.length + 1);
      const lang = FRAMEWORK_LANG[label] ?? "tsx";
      return {
        label,
        lang,
        code: recipe.code as string,
        install: recipe.install as string[],
        themvora: recipe.themvora as string[],
        ...(typeof recipe.setup === "string"
          ? { setup: { lang: "css", code: recipe.setup } }
          : {}),
        ...(asSnippet(recipe.mountProvider, lang)
          ? { mountProvider: asSnippet(recipe.mountProvider, lang) }
          : {}),
        ...(asSnippet(recipe.componentExample, lang)
          ? { componentExample: asSnippet(recipe.componentExample, lang) }
          : {}),
        ...(asSnippet(recipe.themeSwitchExample, lang)
          ? { themeSwitchExample: asSnippet(recipe.themeSwitchExample, lang) }
          : {}),
        ...(asSnippet(recipe.completeExample, lang)
          ? { completeExample: asSnippet(recipe.completeExample, lang) }
          : {}),
        ...(Array.isArray(recipe.prereqs)
          ? { prereqs: recipe.prereqs as RecipePrerequisite[] }
          : {}),
      } satisfies LibraryFrameworkExample;
    })
    .sort(
      (a, b) =>
        FRAMEWORK_ORDER.indexOf(a.label as never) -
        FRAMEWORK_ORDER.indexOf(b.label as never),
    );

  return {
    ...lib,
    frameworks,
    featureCount: lib.groups.reduce((sum, g) => sum + g.features.length, 0),
  };
});
