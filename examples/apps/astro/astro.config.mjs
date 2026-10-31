import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
  vite: { plugins: [tailwindcss()] },
});
