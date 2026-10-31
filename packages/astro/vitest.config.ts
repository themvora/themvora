import { getViteConfig } from "astro/config";

// `getViteConfig` rather than a bare `defineConfig`: `test/theme-scope.test.ts`
// renders `src/ThemeScope.astro` through `astro/container`, which needs the
// Astro Vite plugin to compile it. The plugin only transforms `.astro` files,
// so the rest of the suite is unaffected.
export default getViteConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
