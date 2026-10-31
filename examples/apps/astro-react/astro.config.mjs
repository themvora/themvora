// astro.config.mjs — the only addition is the React renderer.
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora(), react()],
});
