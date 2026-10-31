import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { RelatedLinks } from "../../components/ui/related-links";
import { ThemeShot } from "../../components/vscode/theme-shot";
import { GITHUB_ISSUES, GITHUB_URL, docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/vscode") },
  title: "Themvora for VS Code",
  description:
    "Explore, preview, create, inspect, compare and validate Themvora themes without leaving VS Code. A theme library, live preview canvas, token inspector and generator for the themes in your app.",
};

/** The canonical screenshot set, shared with the extension and repository READMEs. */
const SHOT = "/vscode";

interface Command {
  readonly label: string;
  readonly summary: string;
  readonly when: string;
}

const COMMANDS: readonly Command[] = [
  {
    label: "Themvora: Open Theme Studio",
    summary:
      "Opens the Studio: theme library, preview canvas and inspector in one panel.",
    when: "Your starting point for any project that uses Themvora.",
  },
  {
    label: "Themvora: Browse Presets",
    summary:
      "Lists the built-in preset catalog with the recipe behind each preset.",
    when: "You want inspiration, or you have no project set up yet.",
  },
  {
    label: "Themvora: Preview Theme",
    summary:
      "Opens the preview panel for the theme file you are editing. Running it again updates the same panel.",
    when: "You are editing a theme file and want to see it without switching windows.",
  },
  {
    label: "Themvora: Generate Theme…",
    summary:
      "Asks for a seed colour, generates a light and dark pair, and opens it as an unsaved draft.",
    when: "You want a starting point instead of hand-picking every token.",
  },
  {
    label: "Themvora: Validate Theme…",
    summary:
      "Checks a theme file and reports what fails, on which token, and by how much.",
    when: "Before you commit a palette, or after editing one by hand.",
  },
  {
    label: "Themvora: Compare Themes…",
    summary: "Shows what actually differs between two themes, mode by mode.",
    when: "You are weighing a new palette against the one already in use.",
  },
  {
    label: "Themvora: Copy CSS Variables",
    summary:
      "Validates a theme, turns it into CSS custom properties and copies them.",
    when: "You need the variables in a stylesheet, a prototype or a design tool.",
  },
  {
    label: "Themvora: Refresh Project",
    summary: "Re-reads every workspace folder and updates the panel.",
    when: "A file changed without a save event — a branch switch, or a CLI run.",
  },
];

const STEPS: readonly { readonly title: string; readonly body: string }[] = [
  {
    title: "Install the extension",
    body: "Install Themvora for VS Code and reload the window. A Themvora icon appears in the Activity Bar.",
  },
  {
    title: "Open a project — or skip this",
    body: "Studio reads themes from the folder you have open. No project yet? Browse Presets works anywhere, because the catalog ships with the extension.",
  },
  {
    title: "Run Themvora: Open Theme Studio",
    body: "Press Ctrl+Shift+P (Cmd+Shift+P on macOS), type “Themvora”, and pick Open Theme Studio.",
  },
  {
    title: "Pick a theme or preset",
    body: "The library lists your project's themes, then the catalog. Select one and the canvas and inspector both follow it.",
  },
  {
    title: "Look at it, then read it",
    body: "Switch the canvas between Dashboard and Components, toggle light and dark where the family has both, and read each token's value and contrast in the inspector.",
  },
  {
    title: "Validate, compare, or start a draft",
    body: "Check a palette against the validator, diff it against another theme, or open New theme to generate or define your own.",
  },
  {
    title: "Save or copy what you need",
    body: "Save a draft as JSON, TypeScript with defineTheme(), or CSS variables — or copy the variables straight to the clipboard.",
  },
];

const BEHAVIOUR: readonly { readonly title: string; readonly body: string }[] =
  [
    {
      title: "Unsaved drafts live in memory",
      body: "A draft you have not saved survives closing the Studio, but not restarting VS Code. Nothing is written to your project until you save.",
    },
    {
      title: "Studio works on one folder",
      body: "In a multi-root workspace the workspace panel lists every folder, but Studio reads the first one.",
    },
    {
      title: "Source analysis is not runtime state",
      body: "Studio can prove that a component receives a theme. Which theme an app actually selects at runtime depends on storage, media queries and user choice, so Studio never claims a theme is active.",
    },
    {
      title: "Themes that compute their values are not read",
      body: "Themes written as plain definitions are read. A theme assembled from function calls or computed values is listed with the reason it could not be read, rather than guessed at.",
    },
    {
      title: "Some CLI commands are not in the editor",
      body: "The extension does not run init, add, doctor or export from the CLI. Use the CLI for those.",
    },
  ];

export default function VSCodePage() {
  return (
    <DocsLayout wide>
      <div className="max-w-4xl">
        <PageHeader
          eyebrow="Editor extension"
          title="Themvora for VS Code"
          description={
            <>
              Explore, preview, create, inspect, compare and validate Themvora
              themes without leaving your editor. Studio reads the themes
              already in your project, shows you what they actually resolve to,
              and writes new ones back as a file you can commit.
            </>
          }
          badges={[
            { label: "Explore · Preview · Inspect", tone: "neutral" },
            { label: "Create · Compare · Validate", tone: "neutral" },
            { label: "No telemetry", tone: "success" },
          ]}
        />

        <p className="mb-6 text-sm leading-relaxed opacity-70">
          It works on the themes in <em>your application</em> — not your
          editor&apos;s colour theme, which it never changes.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:border-ring transition-colors"
          >
            See what you can do
          </a>
        </div>

        <p className="mb-6 text-xs opacity-55">
          Not yet published to the Visual Studio Marketplace.
        </p>

        <ThemeShot
          light={`${SHOT}/studio-overview-light.png`}
          dark={`${SHOT}/studio-overview-dark.png`}
          alt="Themvora Studio in VS Code: a theme library on the left, a live dashboard preview in the centre, and an inspector listing each colour token with its value and contrast ratio on the right."
          caption="Studio: your theme library, a live preview of the selected theme, and its tokens side by side."
          priority
        />

        <section id="capabilities" className="scroll-mt-24 mb-12">
          <SectionHeading
            num={1}
            desc="Everything below works on themes that are already in your project, plus a preset catalog that ships with the extension."
          >
            What you can do
          </SectionHeading>

          <h3 className="mt-2 mb-1.5 text-lg font-semibold">
            Explore your themes
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            See every theme Studio can find: the ones your project defines, the
            presets that ship with Themvora, and any draft you are working on.
            Each card shows its palette, its family, whether it is light or
            dark, where it came from and which file it lives in — so you can
            tell at a glance what you are working with.
          </p>
          <ThemeShot
            light={`${SHOT}/studio-library-light.png`}
            dark={`${SHOT}/studio-library-dark.png`}
            alt="The theme library filtered to presets, listing the built-in catalog with colour swatches, family names and origin for each preset."
            caption="Filter the library to presets to browse the catalog without touching your project."
          />

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">
            Preview before you commit to a theme
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            The canvas renders a dashboard or a component gallery from the
            selected theme&apos;s real tokens — navigation, cards, charts,
            tables, forms and status colours. Where a family has both light and
            dark variants, you can look at each one. Hovering a token name
            outlines every place it is used, so you can see what a single change
            would touch.
          </p>

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">
            Inspect design tokens
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            Every colour token shows its value, the CSS custom property it maps
            to, and its measured contrast against the surfaces it sits on. You
            do not have to work the ratio out yourself, and you do not have to
            guess which pair is the problem.
          </p>

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">
            Create your own theme
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            Start from a seed colour, copy a preset, or branch off a theme your
            project already has. The drawer previews every change as you make
            it, and nothing is written to disk until you choose to save. When
            you are ready, save as JSON, as TypeScript using{" "}
            <code className="mono text-[0.9em]">defineTheme()</code>, or as CSS
            variables.
          </p>
          <ThemeShot
            light={`${SHOT}/studio-create-light.png`}
            dark={`${SHOT}/studio-create-dark.png`}
            alt="The New theme drawer: a seed colour with its contrast badge, family and style options, and a live preview of the generated theme that has not been saved."
            caption="New theme: change a seed, watch the preview, and save only when it looks right."
          />

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">
            Validate a theme
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            The validator names the token that fails, the ratio it measures, the
            floor it has to reach, and which side is wrong — foreground too
            light, or background too dark. That is usually enough to know what
            to change without opening a contrast calculator. It checks the
            theme, not your application: a passing theme still has to be used
            well.
          </p>
          <ThemeShot
            light={`${SHOT}/studio-validation-light.png`}
            dark={`${SHOT}/studio-validation-dark.png`}
            alt="The Validation panel reporting a contrast failure: muted foreground on muted measures well below the 4.5:1 text floor and is flagged Critical, with the direction of the failure named."
            caption="Find contrast problems before a palette ships, and see exactly which pair fails."
          />

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">Compare themes</h3>
          <p className="text-sm leading-relaxed opacity-80">
            Comparing two themes shows what semantically differs between them,
            mode by mode, rather than a wall of changed lines. It is the
            quickest way to answer “what would actually change if we moved to
            this palette?” before switching a project over.
          </p>

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">
            Copy CSS variables
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            Select a theme, or one variant of a family, and copy its CSS custom
            properties. Useful when the variables need to land somewhere that is
            not a Themvora project — a stylesheet, a prototype, a design tool, a
            bug report.
          </p>

          <h3 className="mt-8 mb-1.5 text-lg font-semibold">
            Understand what your project actually has
          </h3>
          <p className="text-sm leading-relaxed opacity-80">
            The workspace panel answers the questions a file tree cannot: is
            this a Themvora project, which framework is it, which packages are
            declared, and are they installed. Declared and installed are listed
            separately, because a package in{" "}
            <code className="mono text-[0.9em]">package.json</code> that is
            missing from <code className="mono text-[0.9em]">node_modules</code>{" "}
            is exactly the state that breaks an app. Studio also shows where
            each theme is defined and which files receive it, and can open that
            exact line.
          </p>
          <ThemeShot
            light={`${SHOT}/studio-workspace-light.png`}
            dark={`${SHOT}/studio-workspace-dark.png`}
            alt="The Themvora workspace panel in the Activity Bar: framework and how it was detected, package manager, integration status, and the theme files found with the themes each one defines."
            caption="The workspace panel: framework, packages, and every theme file Studio found."
          />
        </section>

        <section id="get-started" className="scroll-mt-24 mb-12">
          <SectionHeading
            num={2}
            desc="From nothing installed to a saved theme file."
          >
            Get started
          </SectionHeading>
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-[11px] font-bold bg-muted text-foreground/60"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-sm leading-relaxed opacity-75">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="commands" className="scroll-mt-24 mb-12">
          <SectionHeading
            num={3}
            desc="Open the Command Palette with Ctrl+Shift+P (Cmd+Shift+P on macOS), then type “Themvora”. Every command sits under the Themvora category."
          >
            Commands
          </SectionHeading>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider opacity-50 text-xs">
                    Command
                  </th>
                  <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider opacity-50 text-xs">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMMANDS.map((command, index) => (
                  <tr
                    key={command.label}
                    className={
                      index < COMMANDS.length - 1
                        ? "border-b border-border"
                        : ""
                    }
                  >
                    <td className="px-4 py-3 align-top">
                      <span className="font-semibold">{command.label}</span>
                    </td>
                    <td className="px-4 py-3 align-top opacity-75">
                      {command.summary}
                      <span className="mt-1 block text-xs opacity-70">
                        {command.when}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-relaxed opacity-75">
            The Studio also adds inline help while you edit a theme file:
            diagnostics on failing tokens, hovers explaining what each semantic
            role is for, and colour swatches next to values.
          </p>
        </section>

        <section id="behaviour" className="scroll-mt-24 mb-12">
          <SectionHeading
            num={4}
            desc="Requirements, and the behaviour worth knowing before you rely on it."
          >
            Requirements and behaviour
          </SectionHeading>

          <ul className="mb-6 space-y-2 list-disc pl-5 text-sm leading-relaxed opacity-80">
            <li>
              <strong>VS Code 1.94.0 or newer.</strong>
            </li>
            <li>
              <strong>No global CLI install required.</strong> Everything the
              extension needs ships inside it, so it works in a project that has
              never run the Themvora CLI.
            </li>
            <li>
              <strong>No project required to browse presets.</strong> The
              catalog is built in.
            </li>
          </ul>

          <div className="space-y-3">
            {BEHAVIOUR.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border p-4"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed opacity-70">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm leading-relaxed opacity-80">
            <strong>Your code stays yours.</strong> The extension reads theme
            files and nothing else: it does not run your project&apos;s code,
            does not change your editor theme, sends no telemetry, and makes no
            network request.
          </p>
        </section>

        <section id="next" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={6}
            desc="Where to read more, and where to report a problem."
          >
            Documentation and support
          </SectionHeading>
          <ul className="space-y-2 list-disc pl-5 text-sm leading-relaxed">
            <li>
              <a
                href={`${GITHUB_URL}/blob/main/packages/vscode/README.md`}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                Extension README
              </a>{" "}
              — the same feature set, plus troubleshooting.
            </li>
            <li>
              <a
                href={`${GITHUB_URL}/blob/main/packages/vscode/architecture.md`}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                Architecture notes
              </a>{" "}
              — for contributors: boundaries, invariants and verification.
            </li>
            <li>
              <a
                href={GITHUB_ISSUES}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                Issue tracker
              </a>{" "}
              — bugs and feature requests.
            </li>
            <li>
              <Link href="/get-started" className="underline">
                Get started with Themvora
              </Link>{" "}
              — set up the library in an application first.
            </li>
            <li>
              <Link href="/cli" className="underline">
                CLI reference
              </Link>{" "}
              — the terminal counterpart, including the commands the editor does
              not run.
            </li>
          </ul>
        </section>

        <RelatedLinks
          links={[
            {
              title: "Theme Studio",
              href: "/theme-studio",
              description: "Generate a theme pair in the browser",
            },
            {
              title: "Core Concepts",
              href: "/core-concepts",
              description: "Semantic tokens, families and the runtime",
            },
            {
              title: "Custom Themes",
              href: "/custom-themes",
              description: "Hand-author a theme instead of generating one",
            },
            {
              title: "Known Limitations",
              href: "/known-limitations",
              description: "Honest boundaries across the ecosystem",
            },
          ]}
        />
      </div>
    </DocsLayout>
  );
}
