export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
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
});
