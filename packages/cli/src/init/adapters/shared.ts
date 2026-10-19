/**
 * Templates shared by the framework adapters.
 *
 * The showcase itself lives in dedicated modules — `themes-module.ts`,
 * `showcase-classes.ts`, `showcase-css.ts`, `showcase-content.ts` and
 * `showcase/<framework>.ts` — because it is large enough to review on its own.
 * What remains here is the piece every adapter needs and none should own: the
 * knowledge of which files a framework's own scaffold leaves behind, and the
 * rules for removing them safely.
 *
 * @packageDocumentation
 */
import { planDeletion } from "../files.js";
import type { IntegrationContext } from "./context.js";
import type { FileOperation } from "../types.js";

/**
 * Files each official scaffold creates that the showcase does not use.
 *
 * @remarks
 * A path is on this list because it is a known artifact of a known template — a
 * demo component, a logo the generated UI never renders, a stylesheet that
 * declares its own palette. It is not a pattern match on the filename.
 *
 * The scaffold's **root stylesheet is deliberately absent**: `src/index.css`
 * (React, Solid), `src/style.css` (Vue), `src/app.css` (Svelte) and
 * `app/globals.css` (Next) are the files the generated project now owns, so they
 * are replaced rather than removed.
 *
 * `public/favicon.svg` and Next's `app/favicon.ico` are absent too: they are
 * referenced by the scaffold's HTML, and removing them would leave a dangling
 * reference.
 */
export const SCAFFOLD_RESIDUE: Record<string, readonly string[]> = {
  react: [
    "src/App.css",
    "src/assets/react.svg",
    "src/assets/vite.svg",
    "src/assets/hero.png",
    "public/icons.svg",
  ],
  vue: [
    "src/components/HelloWorld.vue",
    "src/assets/vue.svg",
    "src/assets/vite.svg",
    "src/assets/hero.png",
    "public/icons.svg",
  ],
  svelte: [
    "src/lib/Counter.svelte",
    "src/assets/svelte.svg",
    "src/assets/vite.svg",
    "src/assets/hero.png",
    "public/icons.svg",
  ],
  solid: [
    "src/App.css",
    "src/assets/solid.svg",
    "src/assets/vite.svg",
    "src/assets/hero.png",
    "public/icons.svg",
  ],
  next: [
    "app/page.module.css",
    "public/file.svg",
    "public/globe.svg",
    "public/next.svg",
    "public/vercel.svg",
    "public/window.svg",
  ],
};

/** Source extensions worth scanning for a reference to a candidate path. */
const REFERENCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".css",
  ".html",
  ".json",
];

/**
 * Plan the removal of a scaffold's unused files.
 *
 * @param context - The integration context, for reading the project.
 * @param frameworkId - Which scaffold produced the files.
 * @param planned - The files this run is writing, as path → intended contents.
 * @returns The `delete` operations to add to the plan.
 *
 * @remarks
 * Three independent conditions must hold before anything is removed:
 *
 * 1. **The project is one `init` scaffolded.** An `existing` project returns an
 *    empty list immediately — this function can never touch a user's files.
 * 2. **The path is on that framework's known-residue list.**
 * 3. **Nothing in the project still refers to it.**
 *
 * `planned` is what makes condition 3 correct. The reference check has to run
 * against the project *as it will be*, not as it is on disk: the scaffold's own
 * entry module imports its demo stylesheet, and that import is exactly what the
 * integration is about to replace. Reading only the on-disk contents therefore
 * finds every candidate "still referenced" and removes nothing.
 *
 * `planned` also covers collisions: a scaffold path that this run is writing must
 * not be both written and deleted.
 */
export function planScaffoldCleanup(
  context: IntegrationContext,
  frameworkId: string,
  planned: Readonly<Record<string, string>> = {},
): FileOperation[] {
  if (context.projectKind === "existing") return [];

  const candidates = SCAFFOLD_RESIDUE[frameworkId] ?? [];
  if (candidates.length === 0) return [];

  const remaining = candidates.filter((path) => !(path in planned));
  if (remaining.length === 0) return [];

  const candidateSet = new Set(remaining);
  const isSource = (file: string) => REFERENCE_EXTENSIONS.some((ext) => file.endsWith(ext));

  const haystack = [
    // The project as this run leaves it.
    ...Object.entries(planned).map(([file, contents]) => ({ file, contents })),
    // Everything else, as it is now.
    ...context
      .listProjectFiles()
      .filter((file) => !candidateSet.has(file) && !(file in planned))
      .filter(isSource)
      .map((file) => ({ file, contents: context.read(file) ?? "" })),
  ];

  const operations: FileOperation[] = [];
  for (const path of remaining) {
    const existing = context.read(path);
    if (existing === null) continue;

    const basename = path.split("/").pop() ?? path;
    const referenced = haystack.some(
      (entry) =>
        entry.contents.includes(path) ||
        entry.contents.includes(`/${basename}`) ||
        entry.contents.includes(`./${basename}`),
    );
    if (referenced) continue;

    const operation = planDeletion({
      path,
      existing,
      reason: "unused file from the framework's own scaffold — the showcase does not reference it",
    });
    if (operation) operations.push(operation);
  }

  return operations;
}
