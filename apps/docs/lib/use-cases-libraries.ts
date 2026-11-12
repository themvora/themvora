import type { UseCase } from "./use-cases";

export const libraryUseCases: Record<string, UseCase[]> = {
  shadcn: [
    {
      title: "Mount the adapter on the runtime",
      desc: "Register the adapter so every theme change repaints shadcn's own variables — `--background`, `--primary`, `--border`.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createShadcnAdapter } from "@themvora/shadcn";

const runtime = createThemeRuntime();
runtime.adapters.use(createShadcnAdapter());
// Keep the handle to dispose later:
// const handle = runtime.adapters.use(createShadcnAdapter());
// handle.dispose();`,
    },
    {
      title: "Switch tone at runtime",
      desc: "The adapter keeps variables in sync as the active family changes.",
      lang: "ts",
      code: `// The adapter is already registered on the runtime.
// Switch the family and the adapter repaints --background, --primary, --border:

runtime.selection.setFamily("mint");
runtime.selection.setMode("dark");`,
    },
  ],
  bootstrap: [
    {
      title: "Mount the adapter on the runtime",
      desc: "The adapter generates `--bs-*` variables from the active theme.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createBootstrapAdapter } from "@themvora/bootstrap";

const runtime = createThemeRuntime();
runtime.adapters.use(createBootstrapAdapter());`,
    },
    {
      title: "Toggle Bootstrap dark mode",
      desc: "Variables update automatically when the active mode flips.",
      lang: "ts",
      code: `// The adapter is already registered — switching the mode
// repaints every --bs-* variable on the runtime:

runtime.selection.setMode("dark");
runtime.selection.setMode("light");`,
    },
  ],
  daisyui: [
    {
      title: "Mount the adapter on the runtime",
      desc: "The adapter maps tokens to daisyUI variable names.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createDaisyAdapter } from "@themvora/daisyui";

const runtime = createThemeRuntime();
runtime.adapters.use(createDaisyAdapter());`,
    },
    {
      title: "Switch Themvora theme + daisyUI stays in sync",
      desc: "Changing the active theme immediately repaints daisyUI variables like `--color-primary` and `--color-base-100`.",
      lang: "ts",
      code: `// The adapter is already registered — switch the family
// and every daisyUI variable updates to match:

runtime.selection.setFamily("mint");
runtime.selection.setFamily("plum");`,
    },
  ],
  "open-props": [
    {
      title: "Mount the adapter on the runtime",
      desc: "Register the Open Props adapter on an existing runtime.",
      lang: "ts",
      code: `import { createThemeRuntime } from "@themvora/core";
import { createOpenPropsAdapter } from "@themvora/open-props";

const runtime = createThemeRuntime();
runtime.adapters.use(createOpenPropsAdapter());`,
    },
    {
      title: "Reference Open Props variables in CSS",
      desc: "Open Props variables are plain custom properties, so any stylesheet can read them.",
      lang: "css",
      code: `.banner {
  /* Semantic colour layer written by the adapter. */
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  /* Open Props scale, derived from the theme by the adapter. */
  border-radius: var(--radius-3);
}`,
    },
  ],
  mui: [
    {
      title: "Build a static MUI theme",
      desc: "Generate a `Theme` at build time from concrete tokens.",
      lang: "ts",
      code: `import { createMuiTheme } from "@themvora/mui";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

// resolveTheme takes (themes, name) — not a { family, mode } object.
const themes = getBuiltInThemes();
const muiTheme = createMuiTheme(resolveTheme(themes, "plum-dark"));`,
    },
  ],
  chakra: [
    {
      title: "Build a static Chakra system",
      desc: "Turn a theme definition into a Chakra system at build time.",
      lang: "ts",
      code: `import { createChakraTheme } from "@themvora/chakra";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

// Pass a theme definition, not { family, mode } — the factory does not read that shape.
const themes = getBuiltInThemes();
const system = createChakraTheme(resolveTheme(themes, "mint-light"));`,
    },
  ],
  antd: [
    {
      title: "Build a static AntD config",
      desc: "Generate a `ThemeConfig` from concrete tokens at build time.",
      lang: "ts",
      code: `import { createAntdTheme } from "@themvora/antd";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

const themes = getBuiltInThemes();
const config = createAntdTheme(resolveTheme(themes, "plum-dark"));`,
    },
  ],
  mantine: [
    {
      title: "Build a static Mantine theme",
      desc: "Generate a Mantine theme (with shades, fonts, radius) from tokens.",
      lang: "ts",
      code: `import { createMantineTheme } from "@themvora/mantine";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

const themes = getBuiltInThemes();
const theme = createMantineTheme(resolveTheme(themes, "cocoa-dark"));`,
    },
  ],
  unocss: [
    {
      title: "Use Themvora utilities",
      desc: "Utilities resolve to live `--theme-*` variables, so they update at runtime.",
      lang: "tsx",
      code: `<div className="bg-primary text-primary-foreground rounded-lg shadow-md">
  This button tracks the active theme.
</div>`,
    },
    {
      title: "Generate a static theme",
      desc: "Resolve tokens to concrete `rem`/`px`/color values at build time.",
      lang: "ts",
      code: `import { createUnoTheme } from "@themvora/unocss";
import { getBuiltInThemes, resolveTheme } from "@themvora/core";

const themes = getBuiltInThemes();
const theme = createUnoTheme(resolveTheme(themes, "berry-dark"));
// theme.colors.primary === "#..."`,
    },
  ],
};