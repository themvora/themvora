import tailwindcss from "@tailwindcss/vite";
import {
  themes,
  defaultTheme,
  initialMode,
  transition,
} from "@themvora/app-shared/themes";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme,
    initialMode,
    transition,
    // Server-side half of the overlay scrollbar: emits the native-hiding CSS
    // and the tv-scrollbar class on <html> so the native bar never paints.
    // <ThemeScrollbar> in app.vue draws the overlay itself.
    scrollbar: true,
  },
  css: [
    "~/assets/css/main.css",
    "@themvora/core/scrollbar.css",
  ],
  vite: {
    // Tailwind v4's Vite plugin is typed against a different Vite copy than the
    // one Nuxt resolves in this pnpm store; the production build is unaffected,
    // so the plugin is cast to keep `nuxt typecheck` focused on app code.
    plugins: [tailwindcss() as never],
  },
});
