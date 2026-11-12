"use client";

import { useState } from "react";

import { CodeBlock } from "./code-block";
import { SectionHeading } from "./ui/section-heading";
import { StepperSection } from "./ui/stepper-section";
import { InstallCommand, type PackageManager } from "./install-command";
import type { CodeVariant } from "../lib/code-variants";
import { forManager } from "../lib/install-commands";
import {
  FAMILY_SNIPPET_LANG,
  familySnippet,
} from "../lib/family-snippet";

/** The four package-manager variants of one command list. */
export type ManagerBlocks = Record<
  PackageManager,
  { code: string; html?: string }
>;

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
 * data. This component only chooses which block to show — and, because the
 * picker changes *everything* below it, every field here is per framework.
 */
export type RecipeFrameworkExample = {
  label: string;
  lang: string;
  /** Highlighted HTML for `code` (the adapter wiring). */
  codeHtml: string;
  /** Both language forms of the adapter wiring, when it has a JavaScript one. */
  codeVariants?: CodeVariant[] | undefined;
  /** The compatibility badge for `code` — `TS / JS`, `TSX / JSX`, `TS`, … */
  displayLanguage?: string | undefined;
  filename?: string | undefined;

  /** The library and its build toolchain, for this framework. */
  install: string[];
  /** The Themvora packages, for this framework. */
  themvora: string[];
  /** Build configuration and the global stylesheet. */
  setup?: RecipeSnippet | undefined;
  /** The entry file: provider, runtime, stylesheet import. */
  mountProvider?: RecipeSnippet | undefined;
  /** The adapter hookup. */
  code: RecipeSnippet;
  /** Real library components. */
  componentExample?: RecipeSnippet | undefined;
  /** Theme controls built from the library's own components. */
  themeSwitchExample?: RecipeSnippet | undefined;
  /** The assembly: the file that ties the others together. */
  completeExample?: RecipeSnippet | undefined;

  /** Verified Node / framework / library versions, shown before the install. */
  prereqs?: { label: string; value: string }[] | undefined;
};


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

/** A numbered step heading. The number is the point: order is the instruction. */
function Step({
  n,
  title,
  lead,
}: {
  n: number;
  title: string;
  lead?: string;
}) {
  // Shared with the framework guides: one numbered badge, one style, both pages.
  return (
    <SectionHeading num={n} stepper desc={lead}>
      {title}
    </SectionHeading>
  );
}

/** A label above a block, e.g. "Install the library" or "Global styles". */
function SubStep({ label }: { label: string }) {
  return <div className="mb-2 text-sm font-medium">{label}</div>;
}

function managerBlocks(commands: string[]): ManagerBlocks {
  return Object.fromEntries(
    (["pnpm", "npm", "yarn", "bun"] as PackageManager[]).map((manager) => [
      manager,
      { code: commands.map((cmd) => forManager(cmd, manager)).join("\n") },
    ]),
  ) as ManagerBlocks;
}

export function LibraryRecipe({
  libraryName,
  description,
  examples,
  officialUrl,
  architecture,
  slug,
  className: sectionClass,
}: {
  slug: string;
  libraryName: string;
  description: string;
  examples: RecipeFrameworkExample[];
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
  const [index, setIndex] = useState(0);
  const current = examples[index] ?? examples[0];
  if (!current) return null;

  const installBlocks = managerBlocks(current.install);
  const themvoraBlocks = managerBlocks(current.themvora);

  const libraryNoun =
    architecture === "build-time"
      ? "utility engine"
      : slug === "open-props"
        ? "token system"
        : ["shadcn", "bootstrap", "daisyui"].includes(slug)
          ? "CSS framework"
          : "component library";

  return (
    <>
      {/* ---------------------------------------------------------------- 1 */}
      <StepperSection id="pick-framework" className={sectionClass} first>
        <Step n={1} title="Pick your framework" lead={description} />
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist">
          {examples.map((example, i) => (
            <button
              key={example.label}
              type="button"
              role="tab"
              aria-selected={i === index}
              data-testid="framework-tab"
              onClick={() => setIndex(i)}
              className={`chip ${i === index ? "chip-active" : ""}`}
            >
              {example.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm opacity-70">
          Every step below follows this choice — the install commands, the build
          configuration, the file paths, the code and the run command.
        </p>
      </StepperSection>

      {/* ---------------------------------------------------------------- 2 */}
      <StepperSection id="installation" className={sectionClass}>
        <Step
          n={2}
          title="Install"
          lead={`${libraryName} first, then Themvora. ${libraryName} is a ${libraryNoun}; Themvora's adapter is what connects it to the active theme.`}
        />

        {current.prereqs && current.prereqs.length > 0 && (
          <div
            className="mt-4 overflow-hidden rounded-xl border border-border"
            data-testid="recipe-prerequisites"
          >
            <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider opacity-60">
              Prerequisites for {current.label}
            </div>
            <dl className="divide-y divide-border">
              {current.prereqs.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[10rem_1fr]"
                >
                  <dt className="font-medium opacity-70">{item.label}</dt>
                  <dd className="opacity-80">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-6">
          <div>
            <SubStep label={`${libraryName} for ${current.label}`} />
            <InstallCommand commands={installBlocks} />
            <p className="mt-2 text-sm opacity-70">
              Build tooling is installed as a dev dependency where it only runs
              at build time. See {libraryName}&apos;s{" "}
              <a href={officialUrl} target="_blank" rel="noreferrer">
                installation guide
              </a>{" "}
              for anything beyond this.
            </p>
          </div>

          <div>
            <SubStep label={`Themvora for ${current.label}`} />
            <InstallCommand commands={themvoraBlocks} />
            <p className="mt-2 text-sm opacity-70">
              <code className="mono text-[0.9em]">@themvora/core</code> is a
              normal dependency of both packages, so it is installed for you —
              naming it here pins the runtime version in your own manifest.
            </p>
          </div>
        </div>
      </StepperSection>

      {/* ---------------------------------------------------------------- 3 */}
      <StepperSection id="configure" className={sectionClass}>
        <Step
          n={3}
          title="Connect Themvora"
          lead={`Three files: the build and stylesheet configuration, the entry that mounts the runtime, and the component that attaches the adapter to it.`}
        />

        <div className="mt-4 flex flex-col gap-6">
          {current.setup && (
            <div>
              <SubStep label="Build configuration and global styles" />
              <RecipeBlocks block={current.setup} className="rounded-lg m-0" />
              <p className="mt-2 text-sm opacity-70">
                The library&apos;s own stylesheet is imported first, the
                adapter&apos;s variable map second — that order is what lets the
                adapter&apos;s values win over the library&apos;s defaults.
              </p>
            </div>
          )}

          {current.mountProvider && (
            <div>
              <SubStep label="Mount the runtime" />
              <RecipeBlocks
                block={current.mountProvider}
                className="rounded-lg m-0"
              />
            </div>
          )}

          <div>
            <SubStep label="Attach the adapter" />
            <RecipeBlocks block={current.code} className="rounded-lg m-0" />
            <p className="mt-2 text-sm opacity-70">
              The adapter runs inside the runtime, so it re-applies on every
              theme change without re-rendering your components.
            </p>
          </div>
        </div>
      </StepperSection>

      {/* ---------------------------------------------------------------- 4 */}
      {current.componentExample && (
        <StepperSection id="components" className={sectionClass}>
          <Step
            n={4}
            title={`Use ${libraryName}`}
            lead={
              architecture === "generated-theme"
                ? `Real ${libraryName} components. None of them take a Themvora prop — the theme reaches them through ${libraryName}'s own provider.`
                : architecture === "build-time"
                  ? `${libraryName}'s own utility classes. Each one resolves to a live theme variable, so a theme change is a variable change, not a rebuild.`
                  : `${libraryName}'s own classes and components. Nothing here is Themvora-specific markup — the variables are already written.`
            }
          />
          <div className="mt-4">
            <RecipeBlocks
              block={current.componentExample}
              className="rounded-lg m-0"
            />
          </div>
        </StepperSection>
      )}

      {/* ---------------------------------------------------------------- 5 */}
      {current.themeSwitchExample && (
        <StepperSection id="theme-switching" className={sectionClass}>
          <Step
            n={5}
            title="Theme switching"
            lead={`Mode changes go through Themvora's runtime. The controls below are ${libraryName}'s own components, and they are the only code that changes when the theme does.`}
          />
          <div className="mt-4">
            <RecipeBlocks
              block={current.themeSwitchExample}
              className="rounded-lg m-0"
            />
          </div>
          <div
            className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm leading-relaxed opacity-80"
            data-testid="recipe-family-switch"
          >
            <p>
              The same hook returns the theme family and a setter for it. Adding
              a family picker is one more control beside the ones above — the
              library re-themes itself the moment the family changes, because the
              adapter is subscribed to the runtime rather than to a snapshot:
            </p>
            <CodeBlock
              code={familySnippet(current.label)}
              language={FAMILY_SNIPPET_LANG[current.label] ?? "tsx"}
              bordered={false}
              className="m-0 mt-3"
            />
          </div>
        </StepperSection>
      )}

      {/* ---------------------------------------------------------------- 6 */}
      {current.completeExample && (
        <StepperSection id="full-example" className={sectionClass} last>
          <Step
            n={6}
            title="Put it together"
            lead={`The last file: it composes the runtime, the adapter zone, the components and the controls. Everything it imports was created in steps 3 to 5.`}
          />
          <div className="mt-4">
            <RecipeBlocks
              block={current.completeExample}
              className="rounded-lg m-0"
            />
          </div>
        </StepperSection>
      )}

    </>
  );
}
