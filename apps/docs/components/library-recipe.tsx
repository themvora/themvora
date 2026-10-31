"use client";

import { useState, type ReactNode } from "react";

import { CodeBlock } from "./code-block";
import { InstallCommand, type PackageManager } from "./install-command";
import type { CodeVariant } from "../lib/code-variants";
import { FRAMEWORK_PACKAGE } from "../lib/libraries";
import { supportedFrameworks } from "../lib/framework-support";

/** The four package-manager variants of one command list. */
export type ManagerBlocks = Record<PackageManager, { code: string; html: string }>;

/** One file inside a recipe section. */
export type RecipeFile = {
  filename?: string | undefined;
  code: string;
  html: string;
  lang: string;
  /** Both language forms of the file, when it has a JavaScript counterpart. */
  variants?: CodeVariant[] | undefined;
  /**
   * The compatibility badge — `TS / JS`, `TSX / JSX`, `TS`, …
   *
   * Derived on the server with the compiler, so the client only displays it.
   */
  displayLanguage?: string | undefined;
};

/**
 * A recipe section, as one or more files.
 *
 * Sections that need more than one file carry them as separate entries rather
 * than as one block with a banner comment. A single block showing
 * `app/layout.tsx` and then `app/theme-zone.tsx` under one toolbar filename
 * reads as one long file — and the toolbar, which exists to tell the reader
 * where to paste, lies about it.
 */
export type RecipeSnippet = { lang: string; files: RecipeFile[] };

/**
 * One framework's recipe, with every snippet already highlighted.
 *
 * The server does the highlighting (shiki) and builds these from the library
 * data, falling back to the library-level snippet where a framework has not been
 * written yet. This component only chooses which block to show.
 */
export type RecipeFrameworkExample = {
  label: string;
  code: string;
  lang: string;
  /** Highlighted HTML for `code` (the adapter wiring). */
  codeHtml: string;
  /** Both language forms of the adapter wiring, when it has a JavaScript one. */
  codeVariants?: CodeVariant[] | undefined;
  /** The compatibility badge for `code` — `TS / JS`, `TSX / JSX`, `TS`, … */
  displayLanguage?: string | undefined;
  filename?: string | undefined;
  mountProvider?: RecipeSnippet | undefined;
  completeExample?: RecipeSnippet | undefined;
  componentExample?: RecipeSnippet | undefined;
  themeSwitchExample?: RecipeSnippet | undefined;
};

/**
 * The framework picker **and every snippet that follows it**.
 *
 * These live in one component on purpose. The picker previously changed only the
 * Quick Start snippet while Mount the provider, Components, Theme switching,
 * Before/after and the complete example stayed React — so picking Next.js left
 * the reader looking at React code, which is worse than not offering the picker.
 * A picker is a promise that everything below it follows; that promise is only
 * keepable if the state and the snippets are in the same component.
 *
 * `Astro` is why this is not a find-and-replace job: its snippets are vanilla
 * (`createThemeController`), not React. Its entries simply carry different code.
 */
/**
 * Renders a section's files, one block each.
 *
 * Each block gets its own filename in the toolbar, so a two-file section shows
 * two blocks with two paths instead of one block whose toolbar names only the
 * first.
 */
function RecipeBlocks({
  block,
  className,
}: {
  block: RecipeSnippet;
  className?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      {block.files.map((file, i) => (
        <CodeBlock
          key={`${file.filename ?? "file"}-${i}`}
          html={file.html}
          filename={file.filename}
          code={file.code}
          language={file.lang}
          {...(file.displayLanguage
            ? { displayLanguage: file.displayLanguage }
            : {})}
          {...(file.variants ? { variants: file.variants } : {})}
          className={className ?? "rounded-lg m-0"}
        />
      ))}
    </div>
  );
}

export function LibraryRecipe({
  libraryName,
  description,
  examples,
  mountProvider,
  componentExample,
  themeSwitchExample,
  completeExample,
  installLibrary,
  installThemvora,
  officialUrl,
  architecture,
  slug,
  className: sectionClass,
}: {
  slug: string;
  libraryName: string;
  description: string;
  examples: RecipeFrameworkExample[];
  mountProvider?: RecipeSnippet | undefined;
  componentExample?: RecipeSnippet | undefined;
  themeSwitchExample?: RecipeSnippet | undefined;
  completeExample?: RecipeSnippet | undefined;
  /** Step 1 of the install block — the library's own packages. */
  installLibrary: ManagerBlocks;
  /** Step 2 — Themvora, with the picked framework's runtime package. */
  installThemvora: ManagerBlocks;
  /** Where to read more about installing the library itself. */
  officialUrl: string;
  /**
   * How the adapter bridges Themvora and the library. Drives the "How it works"
   * section, which this component renders.
   *
   * This is a primitive rather than a JSX node on purpose. Passing the section in
   * as a tree meant its three sibling conditionals crossed the server/client
   * boundary, where React serializes them as an array of children — producing a
   * "unique key" warning that looks like a false positive in both files. One side
   * owns the markup instead.
   */
  architecture: "generated-theme" | "css-variable" | "build-time";
  className?: string;
}) {
  // Only frameworks this adapter actually supports are offered. Everything the
  // selector shows has a recipe — there is no third state for the reader.
  const supported = new Set(supportedFrameworks(slug));
  const shown = examples.filter((e) => supported.has(e.label as never));
  const [index, setIndex] = useState(0);
  const current = shown[index] ?? shown[0];
  if (!current) return null;

  const mount = current.mountProvider ?? mountProvider;
  const components = current.componentExample ?? componentExample;
  const switching = current.themeSwitchExample ?? themeSwitchExample;
  const complete = current.completeExample ?? completeExample;

  // The install commands are authored with `@themvora/react`. Swapping the
  // package name in both the text and the pre-rendered HTML is safe because the
  // token shape is identical — only the identifier changes.
  const frameworkPkg = FRAMEWORK_PACKAGE[current.label];
  const swap = (blocks: ManagerBlocks): ManagerBlocks => {
    if (!frameworkPkg || frameworkPkg === "@themvora/react") return blocks;
    return Object.fromEntries(
      Object.entries(blocks).map(([manager, block]) => [
        manager,
        {
          code: block.code.replace(/@themvora\/react\b/g, frameworkPkg),
          html: block.html.replace(/@themvora\/react\b/g, frameworkPkg),
        },
      ]),
    ) as ManagerBlocks;
  };
  const themvoraInstall = swap(installThemvora);



  return (
    <>
      <section id="pick-framework" className={sectionClass}>
        <h2 className="text-lg font-semibold tracking-tight">
          Pick your framework
        </h2>
        <p className="text-sm opacity-70 mt-1 mb-3">{description}</p>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {shown.map((example) => {
            const i = examples.indexOf(example);
            return (
              <button
                key={example.label}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={`chip ${i === index ? "chip-active" : ""}`}
              >
                {example.label}
              </button>
            );
          })}
        </div>
      </section>

      <section id="installation" className={sectionClass}>
        <h2 className="text-lg font-semibold tracking-tight">Installation</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">
          Two installs. The first is {libraryName}&apos;s own — see its{" "}
          <a href={officialUrl} target="_blank" rel="noreferrer">
            installation guide
          </a>{" "}
          if you need more than this. The second is Themvora, and it names the
          runtime package for {current.label}.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-sm font-medium">
              1. Install {libraryName}
            </div>
            <InstallCommand commands={installLibrary} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">2. Install Themvora</div>
            <InstallCommand commands={themvoraInstall} />
          </div>
        </div>
      </section>

      <section id="how-it-works" className={sectionClass}>
        <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
        {architecture === "generated-theme" && (
          <p className="mt-1 text-sm leading-relaxed opacity-70">
            Themvora builds {libraryName}&apos;s own theme object from its tokens
            and hands it to {libraryName}&apos;s provider. The library keeps doing
            exactly what it always did — it just gets its theme from Themvora
            instead of from you. That is why this adapter is a provider component:
            there is a real theme object to hand over.
          </p>
        )}
        {architecture === "css-variable" && (
          <p className="mt-1 text-sm leading-relaxed opacity-70">
            Themvora writes {libraryName}&apos;s own CSS custom properties from
            its tokens, and {libraryName}&apos;s stylesheet consumes them. Nothing
            is rebuilt on a theme change — the variables change and the styles
            follow. That is why this adapter is a hook that registers a writer
            rather than a provider component, and why it also needs its stylesheet
            imported.
          </p>
        )}
        {architecture === "build-time" && (
          <p className="mt-1 text-sm leading-relaxed opacity-70">
            The mapping is compiled rather than resolved at runtime.{" "}
            {libraryName}&apos;s utilities are generated from Themvora tokens at
            build time, so there is no runtime mount and nothing to subscribe to —
            a theme change is a rebuild.
          </p>
        )}
      </section>

    <section id="quick-start" className={sectionClass}>
      <h2 className="text-lg font-semibold tracking-tight">Quick Start</h2>
      <p className="text-sm opacity-70 mt-1 mb-3">
        {libraryName} wired up for {current.label}. Switch the picker above and
        everything below changes with it.
      </p>
      <RecipeBlocks
        block={{
          lang: current.lang,
          files: [
            {
              filename: current.filename,
              code: current.code,
              html: current.codeHtml,
              lang: current.lang,
              ...(current.displayLanguage
                ? { displayLanguage: current.displayLanguage }
                : {}),
              ...(current.codeVariants ? { variants: current.codeVariants } : {}),
            },
          ],
        }}
        className="rounded-lg m-0"
      />
      </section>

      {mount && (
        <section id="mount-the-provider" className={sectionClass}>
          <h2 className="text-lg font-semibold tracking-tight">
            Mount the provider
          </h2>
          <p className="mt-1 text-sm opacity-70">
            Themvora&apos;s provider owns the active theme. Drop this at your app
            root — everything below it can read and change the theme, and the
            bridge above picks up each change automatically.
          </p>
          <RecipeBlocks block={mount} className="rounded-lg m-0" />
        </section>
      )}

      {components && (
        <section id="components" className={sectionClass}>
          <h2 className="text-lg font-semibold tracking-tight">
            Use {libraryName} components
          </h2>
          <RecipeBlocks block={components} className="rounded-lg m-0" />
          <p className="mt-3 text-sm opacity-70">
            These are ordinary {libraryName} components. No Themvora-specific
            props are required — the theme reaches them through {libraryName}
            &apos;s own mechanism.
          </p>
        </section>
      )}

      {switching && (
        <section id="theme-switching" className={sectionClass}>
          <h2 className="text-lg font-semibold tracking-tight">
            Theme switching
          </h2>
          <p className="mt-1 text-sm opacity-70">
            The point of an adapter is that this is the only code that changes —
            the components stay exactly as they are.
          </p>
          <RecipeBlocks block={switching} className="rounded-lg m-0" />
        </section>
      )}

      <section id="before-after" className={sectionClass}>
        <h2 className="text-lg font-semibold tracking-tight">
          Before and after
        </h2>

        <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed opacity-80">
          <div>
            <div className="mb-1 font-medium opacity-100">
              Without Themvora
            </div>
            <p>
              You own the theme object. You choose the colours, keep them in
              step with your design tokens by hand, write the dark variant
              yourself, and rebuild the object whenever anything changes. Every
              new token has to be added twice — once to your design system and
              once to {libraryName}.
            </p>
          </div>

          <div>
            <div className="mb-1 font-medium opacity-100">With Themvora</div>
            <p>
              Themvora owns the theme. The adapter derives the {libraryName}
              theme from Themvora&apos;s tokens and rebuilds it whenever the
              active theme changes — switching family or mode, or a persisted
              preference resolving on load. There is no second place to update,
              because there is no second theme.
            </p>
          </div>

          <p className="opacity-100">
            Your components stay {libraryName} components. Themvora becomes the
            source of the active theme.
          </p>
        </div>
      </section>

      {complete && (
        <section id="full-example" className={sectionClass}>
          <h2 className="text-lg font-semibold tracking-tight">
            A complete example
          </h2>
          <p className="mt-1 text-sm opacity-70">
            Everything together for {current.label}. Paste it in and it runs.
          </p>
          <RecipeBlocks block={complete} className="rounded-lg m-0" />
        </section>
      )}
    </>
  );
}

