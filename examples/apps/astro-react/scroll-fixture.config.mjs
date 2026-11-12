// scroll-fixture.config.mjs — a separate build target for the scroll
// restoration gate. It keeps the exercise pages out of the demo build by
// pointing Astro at its own `srcDir` and `outDir`.
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import themvora from "@themvora/astro";

export default defineConfig({
  srcDir: "./scroll-fixture/src",
  outDir: "./dist-scroll-fixture",
  integrations: [themvora(), react()],
});
