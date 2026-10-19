export type ApiPackage = {
  slug: string;
  name: string;
  tagline: string;
  submodules?: string[];
};

export const apiPackages: ApiPackage[] = [
  {
    slug: "core",
    name: "@themvora/core",
    tagline:
      "The framework-agnostic heart of Themvora: store, model, registry, runtime, adapters, generation, validation, history, lifecycle and plugins.",
    submodules: ["vanilla", "vite", "config"],
  },
  {
    slug: "react",
    name: "@themvora/react",
    tagline:
      "Provider-first theming for React with hooks, scoped themes, adapters, runtime transitions, and an optional optimized client bootstrap.",
  },
  {
    slug: "next",
    name: "@themvora/next",
    tagline: "Next.js App Router integration: SSR-safe hydration, cookie persistence and zero-flash.",
    submodules: ["client"],
  },
  {
    slug: "vue",
    name: "@themvora/vue",
    tagline: "Vue 3 provider, composables and scopes over the shared runtime.",
  },
  {
    slug: "svelte",
    name: "@themvora/svelte",
    tagline: "Svelte 5 provider, context stores and runes-based reactivity.",
  },
  {
    slug: "solid",
    name: "@themvora/solid",
    tagline: "Solid provider, signals and scopes with fine-grained reactivity.",
  },
  {
    slug: "angular",
    name: "@themvora/angular",
    tagline: "Angular providers, injectables and an element-scoped directive.",
  },
  {
    slug: "web",
    name: "@themvora/web",
    tagline: "Framework-free theming for any HTML page via custom elements.",
  },
  {
    slug: "tailwind",
    name: "@themvora/tailwind",
    tagline: "Tailwind CSS v4 mappings from theme tokens to utility variables.",
  },
  {
    slug: "astro",
    name: "@themvora/astro",
    tagline: "Astro islands integration with a zero-flash blocking script.",
    submodules: ["client"],
  },
  {
    slug: "nuxt",
    name: "@themvora/nuxt",
    tagline: "Nuxt 3 module with SSR-first theming, zero-flash bootstrap, cookie sync and auto-imported composables.",
  },
  {
    slug: "remix",
    name: "@themvora/remix",
    tagline: "Remix loader-based SSR theming with a blocking head script.",
    submodules: ["server"],
  },
  {
    slug: "cli",
    name: "@themvora/cli",
    tagline: "Generate, validate, migrate, inspect and export themes from the command line.",
  },
  {
    slug: "devtools",
    name: "@themvora/devtools",
    tagline: "Runtime inspector, plugin and panel for debugging theme changes.",
  },
  {
    slug: "mui",
    name: "@themvora/mui",
    tagline: "MUI adapter: map theme tokens onto MUI's theme, palette and CSS variables.",
  },
  {
    slug: "chakra",
    name: "@themvora/chakra",
    tagline: "Chakra UI adapter: map theme tokens onto Chakra's config and semantic tokens.",
  },
  {
    slug: "antd",
    name: "@themvora/antd",
    tagline: "Ant Design adapter: map theme tokens onto Ant Design's theme algorithm input.",
  },
  {
    slug: "mantine",
    name: "@themvora/mantine",
    tagline: "Mantine bridge: build a Mantine theme from the active Themvora theme.",
  },
  {
    slug: "shadcn",
    name: "@themvora/shadcn",
    tagline: "shadcn/ui adapter: token variables plus framework bindings for React, Vue, Svelte, Solid and Angular.",
    submodules: ["factory", "react", "vue", "svelte", "solid", "angular"],
  },
  {
    slug: "bootstrap",
    name: "@themvora/bootstrap",
    tagline: "Bootstrap adapter: concrete --bs-* variables (including -rgb triplets) kept in sync with the runtime.",
    submodules: ["factory", "react", "vue", "svelte", "solid", "angular"],
  },
  {
    slug: "daisyui",
    name: "@themvora/daisyui",
    tagline: "daisyUI adapter: theme variables mapped onto daisyUI's CSS variable contract.",
    submodules: ["factory", "react", "vue", "svelte", "solid", "angular"],
  },
  {
    slug: "open-props",
    name: "@themvora/open-props",
    tagline: "Open Props adapter: map theme tokens onto Open Props custom properties.",
    submodules: ["factory", "react", "vue", "svelte", "solid", "angular"],
  },
  {
    slug: "unocss",
    name: "@themvora/unocss",
    tagline: "UnoCSS preset mapping theme tokens to utilities.",
  },
  {
    slug: "adapters",
    name: "@themvora/adapters",
    tagline: "Shared adapter toolkit: source resolution, token/color readers and React helpers.",
    submodules: ["react"],
  },
];

export const submoduleLabels: Record<string, string> = {
  vanilla: "Vanilla class API",
  vite: "Vite plugin",
  client: "Client entry",
  server: "Server entry",
  factory: "Adapter factory",
  react: "React binding",
  vue: "Vue binding",
  svelte: "Svelte binding",
  solid: "Solid binding",
  angular: "Angular binding",
};
