/**
 * Compatibility data sourced from the actual package manifests (normal
 * dependencies, peer dependencies and optional peers) plus source audits.
 * Last verified: 2026-11-12
 * Themvora release: 3.0.0 (core 1.6.0)
 */

export type SSRSupport = "Full" | "Helpers" | "Client-only" | "N/A";
export type ZeroFlashSupport = "Auto" | "Manual" | "None" | "N/A";
export type PersistenceSupport = "Cookie" | "LocalStorage" | "Both" | "None";
export type SyncSupport = "BroadcastChannel" | "Storage events" | "Both" | "None";
export type AdapterArchitecture = "CSS-variable" | "Generated-theme" | "Preset";
export type FrameworkSupport = "All" | "React" | "React+Vue+Svelte+Solid+Angular" | "None";

export interface FrameworkCompatibility {
  package: string;
  framework: string;
  frameworkVersion: string;
  ssr: SSRSupport;
  zeroFlash: ZeroFlashSupport;
  persistence: PersistenceSupport;
  sync: SyncSupport;
  scrollbar: "Provider prop" | "Component" | "Directive" | "Element" | "None";
  transitions: boolean;
  status: "Stable" | "Experimental";
  lastVerified: string;
  notes?: string;
}

export interface LibraryCompatibility {
  library: string;
  package: string;
  adapterType: AdapterArchitecture;
  frameworkSupport: FrameworkSupport;
  cssVarPrefix: string;
  libraryVersion: string;
  ssrSafe: boolean;
  lastVerified: string;
  notes?: string;
}

export const frameworkCompatibilityData: FrameworkCompatibility[] = [
  {
    package: "@themvora/core",
    framework: "Framework-agnostic",
    frameworkVersion: "N/A",
    ssr: "N/A",
    zeroFlash: "Manual",
    persistence: "None",
    sync: "Both",
    scrollbar: "None",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes: "Zero runtime dependencies. Provides core engine for all integrations.",
  },
  {
    package: "@themvora/react",
    framework: "React",
    frameworkVersion: "^19.0.0",
    ssr: "Client-only",
    zeroFlash: "Auto",
    persistence: "LocalStorage",
    sync: "Both",
    scrollbar: "Component",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes:
      "SSR-safe but cannot server-render theme. The provider injects the blocking bootstrap; use the Next.js adapter for server-resolved themes.",
  },
  {
    package: "@themvora/next",
    framework: "Next.js",
    frameworkVersion: "^15.5.22 || ^16",
    ssr: "Full",
    zeroFlash: "Auto",
    persistence: "Cookie",
    sync: "Both",
    scrollbar: "Provider prop",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes: "Server components read cookies, emit blocking script, render <html>. Zero-flash by default.",
  },
  {
    package: "@themvora/vue",
    framework: "Vue 3",
    frameworkVersion: "^3.4.0",
    ssr: "Client-only",
    zeroFlash: "Auto",
    persistence: "LocalStorage",
    sync: "Both",
    scrollbar: "Component",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes:
      "Runtime created on onMounted. The provider injects the blocking bootstrap; use the Nuxt adapter for server-resolved themes.",
  },
  {
    package: "@themvora/svelte",
    framework: "Svelte 5",
    frameworkVersion: "^5.56.0",
    ssr: "Client-only",
    zeroFlash: "Auto",
    persistence: "LocalStorage",
    sync: "Both",
    scrollbar: "Component",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-07",
    notes:
      "Requires Svelte 5.56 or newer: the compiled components use the runtime's Set-based rest-props argument, which older 5.x releases reject. SSR-safe; the bindings are skipped on the server. The provider injects the blocking bootstrap. In SvelteKit, add a server bootstrap for request-time cookie resolution.",
  },
  {
    package: "@themvora/solid",
    framework: "Solid",
    frameworkVersion: "^1.8.0",
    ssr: "Client-only",
    zeroFlash: "Auto",
    persistence: "LocalStorage",
    sync: "Both",
    scrollbar: "Component",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes:
      "SSR-safe; children not rendered on server. The provider injects the blocking bootstrap; add a server bootstrap for request-time cookie resolution.",
  },
  {
    package: "@themvora/angular",
    framework: "Angular",
    frameworkVersion: ">=17.0.0",
    ssr: "Helpers",
    zeroFlash: "Auto",
    persistence: "LocalStorage",
    sync: "Both",
    scrollbar: "Directive",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-07",
    notes:
      "Verified against Angular 22.2.5 with TypeScript 6.0.3 on Node 24.15.0 across the Bootstrap, daisyUI and Open Props recipes. provideTheme() emits the critical CSS and blocking bootstrap during SSR automatically. createBlockingScriptContent() remains available for custom server placement.",
  },
  {
    package: "@themvora/web",
    framework: "Web Components",
    frameworkVersion: "N/A",
    ssr: "Client-only",
    zeroFlash: "Manual",
    persistence: "LocalStorage",
    sync: "Both",
    scrollbar: "Element",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-05",
    notes:
      "Framework-free custom elements. The provider upgrades with the module, so zero-flash needs themvoraVitePlugin() from @themvora/web/vite (or createThemeBootstrapScript()/boot.js outside Vite). The plugin injects the generated CSS and blocking boot script. Runtime-only themes are not in the generated CSS.",
  },
  {
    package: "@themvora/tailwind",
    framework: "Tailwind CSS v4",
    frameworkVersion: "^4.0.0",
    ssr: "N/A",
    zeroFlash: "N/A",
    persistence: "None",
    sync: "None",
    scrollbar: "None",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes: "Maps semantic tokens to Tailwind utilities. Not a runtime package.",
  },
  {
    package: "@themvora/astro",
    framework: "Astro",
    frameworkVersion: "^5.0.0 || ^6.0.0 || ^7.0.0",
    ssr: "Full",
    zeroFlash: "Auto",
    persistence: "Cookie",
    sync: "Both",
    scrollbar: "Provider prop",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes: "Server-renders <html> shell. Supports partial hydration.",
  },
  {
    package: "@themvora/nuxt",
    framework: "Nuxt",
    frameworkVersion: ">=3.10.0",
    ssr: "Full",
    zeroFlash: "Auto",
    persistence: "Cookie",
    sync: "Both",
    scrollbar: "Provider prop",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes: "Module config, auto-imports, SSR bootstrap.",
  },
  {
    package: "@themvora/remix",
    framework: "Remix v2",
    frameworkVersion: "^2.16.0",
    ssr: "Full",
    zeroFlash: "Auto",
    persistence: "Cookie",
    sync: "Both",
    scrollbar: "Component",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes:
      "Remix v2 root route. createThemeDocument() emits the blocking script, renders the matching <html> shell and mounts the runtime; the lower-level ThemeHead/getThemeShellProps pair remains available for a hand-written document.",
  },
  {
    package: "@themvora/remix",
    framework: "React Router",
    frameworkVersion: "^8.5.1",
    ssr: "Full",
    zeroFlash: "Auto",
    persistence: "Cookie",
    sync: "Both",
    scrollbar: "Component",
    transitions: true,
    status: "Stable",
    lastVerified: "2026-11-04",
    notes:
      "React Router Framework Mode via @themvora/remix/react-router. Root loader + Layout; createThemeDocument() owns the pre-paint script and the document shell. Verified against react-router 8.5.1.",
  },
];

export const libraryCompatibilityData: LibraryCompatibility[] = [
  {
    library: "shadcn/ui",
    package: "@themvora/shadcn",
    adapterType: "CSS-variable",
    frameworkSupport: "React+Vue+Svelte+Solid+Angular",
    cssVarPrefix: "--background, --primary, --card, etc. (no shared prefix)",
    libraryVersion: "N/A (targets CSS var contract)",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "Framework-neutral factory. Exports /react /vue /svelte /solid /angular /factory.",
  },
  {
    library: "Bootstrap",
    package: "@themvora/bootstrap",
    adapterType: "CSS-variable",
    frameworkSupport: "React+Vue+Svelte+Solid+Angular",
    cssVarPrefix: "--bs-*",
    libraryVersion: "Bootstrap 5 (no peer dep)",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "Framework-neutral factory. Exports /react /vue /svelte /solid /angular /factory.",
  },
  {
    library: "daisyUI",
    package: "@themvora/daisyui",
    adapterType: "CSS-variable",
    frameworkSupport: "React+Vue+Svelte+Solid+Angular",
    cssVarPrefix: "--color-*",
    libraryVersion: "daisyUI 5 (no peer dep)",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "Framework-neutral factory. CSS var prefix is --color-*, NOT --dbg-* or --p-*.",
  },
  {
    library: "Open Props",
    package: "@themvora/open-props",
    adapterType: "CSS-variable",
    frameworkSupport: "React+Vue+Svelte+Solid+Angular",
    cssVarPrefix: "--color-*, --brand, --size-*, --shadow-*, --radius-*, --font-*",
    libraryVersion: "Open Props (no peer dep)",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "Framework-neutral factory. Exports /react /vue /svelte /solid /angular /factory.",
  },
  {
    library: "MUI",
    package: "@themvora/mui",
    adapterType: "Generated-theme",
    frameworkSupport: "React",
    cssVarPrefix: "Theme object",
    libraryVersion: "@mui/material ^9.0.0",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "React-only. Requires @emotion/react ^11, @emotion/styled ^11. No framework subpaths.",
  },
  {
    library: "Chakra UI",
    package: "@themvora/chakra",
    adapterType: "Generated-theme",
    frameworkSupport: "React",
    cssVarPrefix: "Theme object",
    libraryVersion: "@chakra-ui/react ^3.0.0",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "React-only. No framework subpaths.",
  },
  {
    library: "Ant Design",
    package: "@themvora/antd",
    adapterType: "Generated-theme",
    frameworkSupport: "React",
    cssVarPrefix: "Theme object",
    libraryVersion: "antd ^6.0.0",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "React-only. No framework subpaths.",
  },
  {
    library: "Mantine",
    package: "@themvora/mantine",
    adapterType: "Generated-theme",
    frameworkSupport: "React",
    cssVarPrefix: "Theme object",
    libraryVersion: "@mantine/core ^7.0.0 || ^9.0.0",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "React-only. Supports Mantine 7 and 9. Package lives at packages/adapters/mantine.",
  },
  {
    library: "UnoCSS",
    package: "@themvora/unocss",
    adapterType: "Preset",
    frameworkSupport: "All",
    cssVarPrefix: "References core --theme-* vars",
    libraryVersion: "unocss ^66.0.0",
    ssrSafe: true,
    lastVerified: "2026-11-04",
    notes: "Framework-agnostic preset. References core CSS vars (--theme-color-*, --theme-radius-*, etc.).",
  },
];

export const VERIFIED_DATE = "November 5, 2026";
export const VERIFIED_VERSION = "3.0.0";
