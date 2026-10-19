/**
 * The shared Vite-configuration edit.
 *
 * The generated integrations register **no Themvora Vite plugin**. Each
 * framework's `<ThemeProvider>` is flash-free on its own and takes the theme
 * registry as props, so there is nothing left for a plugin to do — the only
 * plugin a generated config ever gains is Tailwind's, and only under
 * `--styling tailwind`.
 *
 * That leaves this helper with a narrow job: add a plugin to a `plugins` array
 * the project owns, or refuse and emit a manual step when the array is not in a
 * recognised shape. It never produces a half-edited config.
 *
 * @packageDocumentation
 */
import { insertImport, planFile } from "../files.js";
import type { IntegrationContext } from "./context.js";
import type { FileOperation, ManualStep } from "../types.js";

/** The path of the file this helper edits. */
export const VITE_CONFIG = "vite.config.ts";

/** A plugin to register in the project's `plugins` array. */
export interface ExtraVitePlugin {
  /** The exact import line to add. */
  importLine: string;
  /** The call to place in the `plugins` array, e.g. `tailwindcss()`. */
  call: string;
}

/**
 * Plan the Vite-configuration edit.
 *
 * @param context - The integration context.
 * @param plugins - The plugins to register, in order.
 * @returns The operation to apply, or the manual step to emit instead.
 *
 * @remarks
 * With no plugins there is nothing to do, and the file is reported unchanged
 * rather than rewritten — a generated project should not churn a config it does
 * not need to touch.
 *
 * Idempotency is checked per call, so a second run that needs to add Tailwind to
 * an already-integrated config adds only what is missing.
 */
export function planViteConfig(
  context: IntegrationContext,
  plugins: readonly ExtraVitePlugin[] = [],
): { file: FileOperation } | { manual: ManualStep } {
  const existing = context.read(VITE_CONFIG);

  if (plugins.length === 0) {
    return {
      file: planFile({
        path: VITE_CONFIG,
        contents: existing ?? "",
        existing,
        generated: false,
        reason: "vite configuration",
        force: context.force,
      }),
    };
  }

  const snippet = [
    ...plugins.map((plugin) => plugin.importLine),
    "",
    "// ...inside defineConfig:",
    `plugins: [${plugins.map((plugin) => plugin.call).join(", ")}, /* your existing plugins */],`,
  ].join("\n");

  if (existing === null) {
    return {
      manual: {
        path: VITE_CONFIG,
        instruction: "Register the Tailwind Vite plugin.",
        snippet,
      },
    };
  }

  const missing = plugins.filter((plugin) => !existing.includes(plugin.call));

  if (missing.length === 0) {
    return {
      file: planFile({
        path: VITE_CONFIG,
        contents: existing,
        existing,
        generated: false,
        reason: "vite configuration",
        force: context.force,
      }),
    };
  }

  if (!existing.includes("plugins: [")) {
    return {
      manual: {
        path: VITE_CONFIG,
        instruction:
          "Register the Tailwind Vite plugin. Its `plugins` array was not in a shape init recognises, so the file was left untouched.",
        snippet,
      },
    };
  }

  // Insert every missing call at the head of the array, in declaration order.
  let contents = existing.replace(
    "plugins: [",
    `plugins: [${missing.map((plugin) => plugin.call).join(", ")}, `,
  );
  for (const plugin of missing) contents = insertImport(contents, plugin.importLine);

  return {
    file: planFile({
      path: VITE_CONFIG,
      contents,
      existing,
      generated: false,
      reason: "register the Tailwind Vite plugin",
      force: context.force,
    }),
  };
}
