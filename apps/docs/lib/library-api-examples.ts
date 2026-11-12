/**
 * Worked examples for every adapter's public API.
 *
 * Rendered by `/libraries/<slug>/examples`, one page per library, so a reader
 * can see what each export is for and how it is called without reading the
 * source or the API reference table.
 *
 * Every snippet uses an export that exists on the adapter's published surface
 * (verified against `packages/adapters/<lib>/src/index.ts`). Nothing here is
 * illustrative pseudo-code — a snippet that cannot be pasted into a real file
 * does not belong in this file.
 */

export type ApiExample = {
  /** The export this example demonstrates. */
  api: string;
  /** What it is for, in one sentence. */
  desc: string;
  /** Syntax-highlighting language. */
  lang: string;
  code: string;
};

export const libraryApiExamples: Record<string, ApiExample[]> = {
  shadcn: [
    {
      api: "createShadcnAdapter",
      desc: "Framework-neutral adapter. Register it on a runtime and shadcn's variables follow the active theme — no React required.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createShadcnAdapter } from "@themvora/shadcn";

const runtime = createThemeRuntime();

// \`use()\` returns a handle: dispose it when the runtime goes away.
const handle = runtime.adapters.use(createShadcnAdapter());

runtime.selection.setFamily("mint");
runtime.selection.setMode("dark");
// → --background, --primary, --border are rewritten

handle.dispose();`,
    },
    {
      api: "createShadcnVariables",
      desc: "Returns the variable map for a resolved theme, for build-time CSS or a snapshot you control yourself.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createShadcnVariables } from "@themvora/shadcn";

const theme = getBuiltInThemes().find((t) => t.name === "plum-dark")!;
const variables = createShadcnVariables(theme.tokens);

// { "--background": "…", "--primary": "…", "--radius": "…", … }
const css = Object.entries(variables)
  .map(([name, value]) => \`\${name}: \${value};\`)
  .join("\\n");`,
    },
    {
      api: "useShadcnTheme",
      desc: "The React binding. Installs the adapter on the runtime for you and returns the active theme — call it once, inside the provider.",
      lang: "tsx",
      code: `import { useShadcnTheme } from "@themvora/shadcn/react";

export function ThemeBadge() {
  const { theme, mode, family } = useShadcnTheme();

  return (
    <span data-theme={theme.name}>
      {family} · {mode}
    </span>
  );
}`,
    },
    {
      api: "injectShadcnCSS",
      desc: "Writes the shadcn compatibility stylesheet into the document head. Idempotent and SSR-safe; the React binding calls it for you.",
      lang: "ts",
      code: `import { injectShadcnCSS } from "@themvora/shadcn";

// Only needed if you mount the adapter yourself — the framework bindings
// already do this on first use.
injectShadcnCSS();`,
    },
    {
      api: "@themvora/shadcn/shadcn.css",
      desc: "The stylesheet that maps shadcn's variables onto Themvora's tokens. Import it once, after Tailwind and before your own rules.",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/shadcn/shadcn.css";
@import "@themvora/tailwind";`,
    },
  ],

  bootstrap: [
    {
      api: "createBootstrapAdapter",
      desc: "Framework-neutral adapter. Generates Bootstrap's own `--bs-*` variables from the active theme.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createBootstrapAdapter } from "@themvora/bootstrap";

const runtime = createThemeRuntime();
runtime.adapters.use(createBootstrapAdapter());

runtime.selection.setMode("dark");`,
    },
    {
      api: "createBootstrapVariables",
      desc: "Returns the `--bs-*` map for a resolved theme — the same values the adapter writes at runtime.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createBootstrapVariables } from "@themvora/bootstrap";

const theme = getBuiltInThemes().find((t) => t.name === "plum-light")!;
const variables = createBootstrapVariables(theme.tokens);

// { "--bs-body-bg": "…", "--bs-body-color": "…", "--bs-primary": "…", … }`,
    },
    {
      api: "useBootstrapTheme",
      desc: "The React binding — installs the adapter and returns the active theme.",
      lang: "tsx",
      code: `import { useBootstrapTheme } from "@themvora/bootstrap/react";

export function ThemeBadge() {
  const { theme, mode } = useBootstrapTheme();
  return <span className="badge text-bg-secondary">{theme.name} · {mode}</span>;
}`,
    },
    {
      api: "injectBootstrapCSS",
      desc: "Writes the Bootstrap compatibility stylesheet into the head. Idempotent and SSR-safe.",
      lang: "ts",
      code: `import { injectBootstrapCSS } from "@themvora/bootstrap";

injectBootstrapCSS();`,
    },
    {
      api: "createBootstrapPrePaintCss",
      desc: "Static CSS for the first frame, so components are themed before any script runs. Render it into the document head on the server.",
      lang: "ts",
      code: `import { createBootstrapPrePaintCss } from "@themvora/bootstrap/prepaint";

const css = createBootstrapPrePaintCss();

// <style dangerouslySetInnerHTML={{ __html: css }} />`,
    },
  ],

  daisyui: [
    {
      api: "createDaisyAdapter",
      desc: "Framework-neutral adapter. Writes daisyUI's theme variables so its component classes follow Themvora.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createDaisyAdapter } from "@themvora/daisyui";

const runtime = createThemeRuntime();
runtime.adapters.use(createDaisyAdapter());

runtime.selection.setFamily("berry");`,
    },
    {
      api: "createDaisyVariables",
      desc: "Returns daisyUI's variable map for a resolved theme, for a static stylesheet.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createDaisyVariables } from "@themvora/daisyui";

const theme = getBuiltInThemes().find((t) => t.name === "plum-light")!;
const variables = createDaisyVariables(theme.tokens);

// { "--color-primary": "…", "--color-base-100": "…", "--radius-box": "…", … }`,
    },
    {
      api: "useDaisyTheme",
      desc: "The React binding — installs the adapter and returns the active theme.",
      lang: "tsx",
      code: `import { useDaisyTheme } from "@themvora/daisyui/react";

export function ThemeBadge() {
  const { theme, mode } = useDaisyTheme();
  return <span className="badge badge-primary">{theme.name} · {mode}</span>;
}`,
    },
    {
      api: "injectDaisyCSS",
      desc: "Writes the daisyUI compatibility stylesheet into the head. Idempotent and SSR-safe.",
      lang: "ts",
      code: `import { injectDaisyCSS } from "@themvora/daisyui";

injectDaisyCSS();`,
    },
    {
      api: "@plugin daisyui",
      desc: "daisyUI is a Tailwind plugin. Load it after the adapter's variables so its classes resolve against them.",
      lang: "css",
      code: `@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";`,
    },
  ],

  "open-props": [
    {
      api: "createOpenPropsAdapter",
      desc: "Framework-neutral adapter. Maps Themvora tokens onto Open Props' custom properties.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createOpenPropsAdapter } from "@themvora/open-props";

const runtime = createThemeRuntime();
runtime.adapters.use(createOpenPropsAdapter());`,
    },
    {
      api: "createOpenPropsVariables",
      desc: "Returns the Open Props variable map for a resolved theme.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createOpenPropsVariables } from "@themvora/open-props";

const theme = getBuiltInThemes().find((t) => t.name === "plum-light")!;
const variables = createOpenPropsVariables(theme.tokens);

// { "--surface-1": "…", "--text-1": "…", "--brand": "…", … }`,
    },
    {
      api: "useOpenPropsTheme",
      desc: "The React binding — installs the adapter and returns the active theme.",
      lang: "tsx",
      code: `import { useOpenPropsTheme } from "@themvora/open-props/react";

export function ThemeBadge() {
  const { theme, mode } = useOpenPropsTheme();
  return <span style={{ color: "var(--text-2)" }}>{theme.name} · {mode}</span>;
}`,
    },
    {
      api: "injectOpenPropsCSS",
      desc: "Writes the Open Props compatibility stylesheet into the head. Idempotent and SSR-safe.",
      lang: "ts",
      code: `import { injectOpenPropsCSS } from "@themvora/open-props";

injectOpenPropsCSS();`,
    },
  ],

  unocss: [
    {
      api: "presetThemvora",
      desc: "The UnoCSS preset. It compiles the theme into utilities such as `bg-primary` and `text-foreground` at build time.",
      lang: "ts",
      code: `import { defineConfig, presetUno } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetUno(), presetThemvora()],
});`,
    },
    {
      api: "createUnoTheme",
      desc: "Returns the theme object the preset compiles from — useful when you need the same tokens in another tool.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createUnoTheme } from "@themvora/unocss";

const theme = getBuiltInThemes().find((t) => t.name === "plum-light")!;
const uno = createUnoTheme(theme);

// uno.colors.primary → "var(--theme-color-primary)"`,
    },
    {
      api: "utilities",
      desc: "The generated utilities read live CSS variables, so a theme change repaints without a rebuild.",
      lang: "html",
      code: `<div class="bg-background text-foreground p-4 rounded-lg border">
  <h2 class="text-primary font-semibold">Themed surface</h2>
  <button class="bg-primary text-primary-foreground px-3 py-1.5 rounded-md">
    Primary action
  </button>
</div>`,
    },
  ],

  mui: [
    {
      api: "MuiThemeProvider",
      desc: "Builds Material UI's own theme from the Themvora runtime and hands it to MUI's ThemeProvider. Every MUI component follows it.",
      lang: "tsx",
      code: `import { MuiThemeProvider } from "@themvora/mui";
import { useThemeRuntime } from "@themvora/react";

export function ThemeZone({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;
}`,
    },
    {
      api: "useMuiTheme",
      desc: "Returns the derived MUI theme object without rendering a provider — for reading tokens inside your own components.",
      lang: "tsx",
      code: `import { useMuiTheme } from "@themvora/mui";
import { useThemeRuntime } from "@themvora/react";

export function useSurface() {
  const runtime = useThemeRuntime();
  const theme = useMuiTheme(runtime);
  return theme.palette.background.paper;
}`,
    },
    {
      api: "createMuiTheme",
      desc: "Pure function: resolved Themvora theme in, MUI theme config out. Use it for a static theme or a test.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createMuiTheme } from "@themvora/mui";

const theme = getBuiltInThemes().find((t) => t.name === "plum-dark")!;
const config = createMuiTheme(theme);

// config.palette.primary.main, config.shape.borderRadius, …`,
    },
    {
      api: "createMuiAdapter",
      desc: "The registry adapter, for code that has no React tree — the same mapping as the provider.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createMuiAdapter } from "@themvora/mui";

const runtime = createThemeRuntime();
runtime.adapters.use(createMuiAdapter());`,
    },
  ],

  chakra: [
    {
      api: "ChakraThemeProvider",
      desc: "Builds Chakra's system from the Themvora runtime and mounts its provider, so every Chakra component follows the theme.",
      lang: "tsx",
      code: `import { ChakraThemeProvider } from "@themvora/chakra";
import { useThemeRuntime } from "@themvora/react";

export function ThemeZone({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <ChakraThemeProvider runtime={runtime}>{children}</ChakraThemeProvider>;
}`,
    },
    {
      api: "useChakraTheme",
      desc: "Returns the derived Chakra system — read semantic tokens without rendering a provider.",
      lang: "tsx",
      code: `import { useChakraTheme } from "@themvora/chakra";
import { useThemeRuntime } from "@themvora/react";

export function useSurface() {
  const runtime = useThemeRuntime();
  const system = useChakraTheme(runtime);
  return system.token("colors.bg.subtle");
}`,
    },
    {
      api: "createChakraTheme",
      desc: "Pure function: resolved Themvora theme in, Chakra system out.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createChakraTheme } from "@themvora/chakra";

const theme = getBuiltInThemes().find((t) => t.name === "plum-dark")!;
const system = createChakraTheme(theme);`,
    },
    {
      api: "createChakraAdapter",
      desc: "The registry adapter, for non-React code.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createChakraAdapter } from "@themvora/chakra";

const runtime = createThemeRuntime();
runtime.adapters.use(createChakraAdapter());`,
    },
  ],

  antd: [
    {
      api: "AntdThemeProvider",
      desc: "Derives an Ant Design theme config from the runtime and mounts ConfigProvider, so Ant Design's components pick up the tokens.",
      lang: "tsx",
      code: `import { AntdThemeProvider } from "@themvora/antd";
import { useThemeRuntime } from "@themvora/next/client";

export function ThemeZone({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <AntdThemeProvider runtime={runtime}>{children}</AntdThemeProvider>;
}`,
    },
    {
      api: "useAntdTheme",
      desc: "Returns the Ant Design theme config — the same object the provider passes to ConfigProvider.",
      lang: "tsx",
      code: `import { useAntdTheme } from "@themvora/antd";
import { useThemeRuntime } from "@themvora/next/client";

export function useContainerBg() {
  const runtime = useThemeRuntime();
  const config = useAntdTheme(runtime);
  return config.token?.colorBgContainer;
}`,
    },
    {
      api: "createAntdTheme",
      desc: "Pure function: resolved Themvora theme in, Ant Design `ThemeConfig` out. Selects the dark algorithm from the theme's mode.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createAntdTheme } from "@themvora/antd";

const theme = getBuiltInThemes().find((t) => t.name === "plum-dark")!;
const config = createAntdTheme(theme);

// config.algorithm → antd's darkAlgorithm
// config.token.colorBgContainer → the theme's card surface`,
    },
    {
      api: "createAntdAdapter",
      desc: "The registry adapter, for code without a React tree.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createAntdAdapter } from "@themvora/antd";

const runtime = createThemeRuntime();
runtime.adapters.use(createAntdAdapter());`,
    },
  ],

  mantine: [
    {
      api: "MantineThemeProvider",
      desc: "Builds a Mantine theme from the runtime and mounts MantineProvider. Mantine's components then read the theme's tokens.",
      lang: "tsx",
      code: `import { MantineThemeProvider } from "@themvora/mantine";
import { useThemeRuntime } from "@themvora/react";

export function ThemeZone({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>;
}`,
    },
    {
      api: "useMantineTheme",
      desc: "Returns the derived Mantine theme object.",
      lang: "tsx",
      code: `import { useMantineTheme } from "@themvora/mantine";
import { useThemeRuntime } from "@themvora/react";

export function useSurface() {
  const runtime = useThemeRuntime();
  const theme = useMantineTheme(runtime);
  return theme.colors.primary[6];
}`,
    },
    {
      api: "createMantineTheme",
      desc: "Pure function: resolved Themvora theme in, Mantine theme out.",
      lang: "ts",
      code: `import { getBuiltInThemes } from "@themvora/core";
import { createMantineTheme } from "@themvora/mantine";

const theme = getBuiltInThemes().find((t) => t.name === "plum-dark")!;
const mantine = createMantineTheme(theme);`,
    },
    {
      api: "createMantineCssVariables",
      desc: "The `cssVariablesResolver` Mantine's provider uses. Reach for it when you supply your own MantineProvider.",
      lang: "ts",
      code: `import { MantineProvider } from "@mantine/core";
import { createMantineCssVariables } from "@themvora/mantine";

const cssVariablesResolver = createMantineCssVariables(runtime);

<MantineProvider cssVariablesResolver={cssVariablesResolver}>
  {children}
</MantineProvider>;`,
    },
    {
      api: "createMantinePrePaintCss",
      desc: "Static CSS for the first frame. Mantine's variables only exist once its provider mounts, so without this a reload paints unthemed surfaces.",
      lang: "ts",
      code: `import { createMantinePrePaintCss } from "@themvora/mantine/prepaint";

const css = createMantinePrePaintCss();

// <style dangerouslySetInnerHTML={{ __html: css }} />`,
    },
  ],
};
