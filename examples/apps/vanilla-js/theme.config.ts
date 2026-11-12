import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

/**
 * The application's theme catalog, declared once.
 *
 * `themvoraVitePlugin()` reads this file at build time and transports it to the
 * browser, so the pre-paint script and the runtime resolve against the same
 * registry, the same fallback theme and the same initial mode. `src/main.ts`
 * therefore constructs `new Themvora()` with no theme data of its own — there is
 * no second copy to drift out of step with the first painted frame.
 *
 * `getBuiltInThemes()` is the shipped catalog (34 variants across 15 families);
 * a real application would list its own `defineTheme()` pairs here instead, and
 * nothing else would change.
 */
export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  initialMode: "system",
  // Transition options are optional; the defaults crossfade over 300 ms and
  // honour `prefers-reduced-motion`. Uncomment to change or disable them:
  // transition: { enabled: false },
  transition: { enabled: true, duration: 200, easing: "ease-out" },
  scrollbar: true,
});
