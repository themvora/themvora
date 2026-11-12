/**
 * Renders one adapter README from the canonical data.
 *
 * Kept apart from the CLI so `check-readme-drift.mjs` can compare a README
 * against the renderer without spawning a process, and so the two scripts
 * cannot disagree about what the generated document is.
 *
 * Everything here is deterministic: no dates, no environment, no filesystem
 * order. The same canonical data always produces the same bytes.
 */
import {
  PACKAGE_MANAGERS,
  forManager,
} from "../../apps/docs/lib/install-commands.ts";
import {
  FAMILY_SNIPPET_LANG,
  familySnippet,
} from "../../apps/docs/lib/family-snippet.ts";
import {
  LANG_BY_EXT,
  LEADING_PATH,
  frameworksOf as frameworksFrom,
  readLibraries,
  readRecipes,
  splitFiles,
} from "./canonical.mjs";
import {
  COMPONENT_LEAD,
  HOW_IT_WORKS,
  RUN_COMMANDS,
  SETUP_LEAD,
  MOUNT_LEAD,
  TROUBLESHOOTING,
} from "./library-notes.mjs";

const REPO_URL = "https://github.com/themvora/themvora";
const SITE = "https://themvora-dev.vercel.app";
const BRANCH = "main";

/* ==========================================================================
   Canonical data.
   ========================================================================== */

const recipes = readRecipes();
const libraries = readLibraries();

/** The libraries this generator owns, in the order the docs list them. */
const SLUGS = Object.keys(libraries).filter((slug) =>
  Object.keys(recipes).some((key) => key.startsWith(`${slug}/`)),
);

const frameworksOf = (slug) => frameworksFrom(recipes, slug);

/* ==========================================================================
   Small renderers.
   ========================================================================== */

const fence = (lang, code) => ["```" + lang, code, "```"].join("\n");

/** GitHub's heading anchor for a framework name: `Next.js` → `nextjs`. */
const anchor = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/** A markdown table cell that cannot break the row. */
const cell = (text) => String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");

/**
 * Wraps one paragraph at 80 columns.
 *
 * Prose only: a line containing a markdown link is returned untouched, because
 * a soft break inside `[text](url)` is legal but reads badly in a diff. Code
 * fences never pass through here.
 *
 * `hang` indents continuation lines, which is what keeps a wrapped list item
 * inside its bullet instead of ending it at column 0.
 */
function para(text, { width = 80, hang = "" } = {}) {
  if (text.includes("](") || text.length <= width) return [text];
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (!line) line = word;
    else if (line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line += ` ${word}`;
  }
  if (line) lines.push(line);
  return [lines[0], ...lines.slice(1).map((l) => `${hang}${l}`)];
}

/** A path comment in the first lines of a snippet that could not be lifted. */
function pathInBody(code) {
  for (const line of code.split("\n").slice(0, 3)) {
    const m = line.trim().match(LEADING_PATH);
    if (m) return m[1];
  }
  return undefined;
}

/**
 * One or more blocks for a recipe field, each labelled with its file.
 *
 * The label carries the path the documentation shows in the block toolbar, and
 * the fence language comes from that path's extension — the same rule the page
 * applies (`langForFile`), because one "configure" step can hold a
 * `vite.config.ts`, a `tsconfig.json` and a `globals.css` at once.
 */
function snippetBlocks(code, fallbackLang) {
  if (!code) return [];
  return splitFiles(code).map((file) => {
    // An `.astro` page opens with frontmatter, so its path comment is on the
    // second line and stays in the body — the docs leave it there too, and name
    // the file in the surrounding copy. A label is still worth showing: a
    // README block with no path is a block the reader has to guess a home for.
    const filename = file.filename ?? pathInBody(file.code);
    const lang = filename
      ? (LANG_BY_EXT[filename.split(".").pop()] ?? fallbackLang)
      : fallbackLang;
    const label = filename ? `**\`${filename}\`**\n\n` : "";
    return `${label}${fence(lang, file.code)}`;
  });
}

/* ==========================================================================
   Derived facts.
   ========================================================================== */

/**
 * The prerequisites shared by every framework of one library.
 *
 * Node, library version and peers are asserted identical across a library's
 * frameworks: if one recipe is verified against a different library version,
 * the generator stops instead of printing two contradictory requirements. The
 * framework's own version and project note are per framework by definition.
 */
function sharedPrereqs(slug, frameworks) {
  const seen = new Map();
  for (const fw of frameworks) {
    for (const item of recipes[`${slug}/${fw}`].prereqs ?? []) {
      if (item.label === fw || item.label === "Project") continue;
      const prev = seen.get(item.label);
      if (prev && prev !== item.value) {
        throw new Error(
          `${slug}: "${item.label}" differs between frameworks (${prev} vs ${item.value})`,
        );
      }
      seen.set(item.label, item.value);
    }
  }
  return seen;
}

const stripVerified = (value) => String(value).replace(/\s*\(verified\)\s*$/, "");

/** `generated-theme` → `Generated theme`. */
const BRIDGE_LABEL = {
  "generated-theme": "Generated theme",
  "css-variable": "CSS variables",
  "build-time": "Build time",
};

/**
 * The library name as a possessive: "MUI's", "Open Props'".
 *
 * A name that already ends in "s" takes a bare apostrophe; doubling it reads
 * as a typo in prose a reader is meant to trust.
 */
const possessive = (name) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

/** Does this framework's setup import the adapter's own stylesheet? */
const importsAdapterCss = (recipe) =>
  /@import "@themvora\/[a-z-]+\/[a-z-]+\.css"/.test(recipe.setup ?? "");

/* ==========================================================================
   README.
   ========================================================================== */

function renderReadme(slug) {
  const lib = libraries[slug];
  const frameworks = frameworksOf(slug);
  const pkgName = lib.pkg;
  const adapterDir = `packages/adapters/${slug}`;
  const prereqs = sharedPrereqs(slug, frameworks);
  const out = [];

  const push = (...lines) => out.push(...lines);

  /* ---------------------------------------------------------- header --- */

  push(
    "<!--",
    "  Generated file — do not edit by hand.",
    "",
    "  Integration content comes from apps/docs/lib/libraries.tsx",
    "  (FRAMEWORK_RECIPES); package prose from scripts/readme/library-notes.mjs.",
    "",
    "  Regenerate:  pnpm docs:sync-library-readmes",
    "  Verify:      pnpm docs:check-library-readmes",
    "-->",
    "",
    `# ${pkgName}`,
    "",
    `Themvora adapter for ${lib.name}.`,
    "",
    lib.tagline,
    "",
    `- **Package** — \`${pkgName}\``,
    `- **Library** — ${lib.name}`,
    `- **Bridge** — ${BRIDGE_LABEL[lib.architecture] ?? lib.architecture}`,
    `- **Frameworks** — ${frameworks.join(", ")}`,
    `- **Documentation** — [${SITE.replace("https://", "")}/libraries/${slug}](${SITE}/libraries/${slug})`,
    `- **License** — MIT`,
    "",
  );

  /* ------------------------------------------------------ how it works --- */

  push("## How it works", "", HOW_IT_WORKS[slug], "");

  if (lib.mapping.length) {
    push(
      "The adapter maps these Themvora roles onto the library's own vocabulary:",
      "",
      `| Themvora role | ${lib.name} target |`,
      "| --- | --- |",
      ...lib.mapping.map((m) => `| \`${cell(m.role)}\` | \`${cell(m.target)}\` |`),
      "",
    );
  }

  /* ---------------------------------------------------------- features --- */

  push("## Features", "");
  push(
    `\`${pkgName}\` ships ${lib.groups.reduce((n, g) => n + g.features.length, 0)} exports in ${lib.groups.length} categories. Each one is documented, with a runnable example, on the [library page](${SITE}/libraries/${slug}/examples).`,
    "",
  );
  for (const group of lib.groups) {
    push(`### ${group.label}`, "");
    for (const feature of group.features) {
      push(...para(`- **\`${feature.name}\`** — ${feature.desc}`, { hang: "  " }));
    }
    push("");
  }

  /* ----------------------------------------------- supported frameworks --- */

  push(
    "## Supported frameworks",
    "",
    `${lib.name} is documented for ${frameworks.length} framework${frameworks.length === 1 ? "" : "s"} here. Each combination below has its own recipe on the documentation page, and its own section in this README.`,
    "",
    "| Framework | Verified against | Setup |",
    "| --- | --- | --- |",
  );
  for (const fw of frameworks) {
    const version =
      (recipes[`${slug}/${fw}`].prereqs ?? []).find((p) => p.label === fw)
        ?.value ?? "—";
    push(
      `| ${fw} | ${cell(stripVerified(version))} | [${fw} setup](#${anchor(fw)}) |`,
    );
  }
  push("");

  /* ------------------------------------------------------ requirements --- */

  push("## Requirements", "");
  const node = prereqs.get("Node.js");
  if (node) {
    push(
      ...para(
        `- **Node.js** — ${stripVerified(node)}. This is the version the integration is verified against, not a hard floor.`,
        { hang: "  " },
      ),
    );
  }
  const libraryVersion = prereqs.get("Library");
  if (libraryVersion) {
    push(
      libraryVersion === "CLI-generated"
        ? `- **${lib.name}** — generated by the CLI; there is no version to pick.`
        : `- **${lib.name}** — ${stripVerified(libraryVersion)}.`,
    );
  }
  const peers = prereqs.get("Peer dependencies");
  if (peers) {
    // `@emotion/react 11.14.0, @emotion/styled 11.14.0` — the package names are
    // code, the versions are not.
    const formatted = peers
      .split(/,\s*/)
      .map((peer) => {
        const at = peer.lastIndexOf(" ");
        return at < 0
          ? `\`${peer}\``
          : `\`${peer.slice(0, at)}\` ${peer.slice(at + 1)}`;
      })
      .join(", ");
    push(...para(`- **Peer dependencies** — ${formatted}.`, { hang: "  " }));
  }
  push(
    "",
    "The project each framework expects is listed per framework:",
    "",
    "| Framework | Project |",
    "| --- | --- |",
  );
  for (const fw of frameworks) {
    const project =
      (recipes[`${slug}/${fw}`].prereqs ?? []).find((p) => p.label === "Project")
        ?.value ?? "—";
    push(`| ${fw} | ${cell(project)} |`);
  }
  push("");

  /* ------------------------------------------------------ installation --- */

  push(
    "## Installation",
    "",
    "Installing this integration is two commands: the library first, then Themvora.",
    "The commands are **framework-specific** — the library's own toolchain differs",
    "between Vite, Next.js, Nuxt, Angular and Astro, and shadcn/ui, daisyUI and",
    "UnoCSS install through a CLI or a build plugin rather than a plain package.",
    "There is therefore no single install line that is correct for every framework;",
    "the exact commands for yours are in its section below.",
    "",
    "The documentation page shows them behind package-manager tabs. A README cannot,",
    "so every section repeats the same commands under all four headings. The verbs",
    "each manager uses:",
    "",
    "| Package manager | Add a dependency | Add a dev dependency | Run a package |",
    "| --- | --- | --- | --- |",
    "| pnpm | `pnpm add` | `pnpm add -D` | `pnpm dlx` |",
    "| npm | `npm install` | `npm install -D` | `npx` |",
    "| yarn | `yarn add` | `yarn add -D` | `yarn dlx` |",
    "| bun | `bun add` | `bun add -d` | `bunx` |",
    "",
    `\`@themvora/core\` is a normal dependency of \`${pkgName}\` and of the framework`,
    "integration, so it arrives with them. Naming it in the command pins the",
    "runtime version in your own manifest.",
    "",
  );

  /* ----------------------------------------------------- per framework --- */

  for (const fw of frameworks) {
    const recipe = recipes[`${slug}/${fw}`];
    const lang = FAMILY_SNIPPET_LANG[fw] ?? "tsx";
    const install = recipe.install ?? [];
    const themvora = recipe.themvora ?? [];

    if (!install.length && !themvora.length) {
      throw new Error(`${slug}/${fw}: recipe has no install commands`);
    }

    push(`## ${fw}`, "");

    const version = stripVerified(
      (recipe.prereqs ?? []).find((p) => p.label === fw)?.value ?? "",
    );
    const nodeVersion = stripVerified(prereqs.get("Node.js") ?? "");
    // "Vue 3" + "3.5.44" reads as "Vue 3.5.44", not "Vue 3 3.5.44": the major in
    // the framework's name is the major in the version.
    const major = fw.match(/ (\d+)$/)?.[1];
    const fwLabel = major && version.startsWith(`${major}.`) ? fw.replace(/ \d+$/, "") : fw;
    push(
      version
        ? `Verified against ${fwLabel} ${version} and Node.js ${nodeVersion}.`
        : `Verified with Node.js ${nodeVersion}.`,
      "",
    );

    /* -- install -- */
    push("### Install", "");
    push(
      ...para(
        `Install ${lib.name} first, then Themvora. Both commands are the ones the documentation page shows for ${fw}.`,
      ),
      "",
    );
    for (const manager of PACKAGE_MANAGERS) {
      push(`#### ${manager}`, "", "```bash");
      for (const command of install) push(forManager(command, manager));
      for (const command of themvora) push(forManager(command, manager));
      push("```", "");
    }

    /* -- build configuration and global styles -- */
    if (recipe.setup) {
      push("### Build configuration and global styles", "");
      push(
        ...para(
          SETUP_LEAD[slug] ??
            (importsAdapterCss(recipe)
              ? `The library's own stylesheet is imported first, the adapter's variable map second. That order is what lets the adapter's values win over ${possessive(lib.name)} defaults — reversing it leaves the library looking themed until the first switch.`
              : "The global stylesheet. Themvora writes its tokens as CSS custom properties on the root element, so the document rule only has to read them."),
        ),
        "",
      );
      for (const block of snippetBlocks(recipe.setup, "css")) push(block, "");
    }

    /* -- mount the runtime -- */
    if (recipe.mountProvider) {
      push("### Mount the runtime", "");
      push(
        ...para(
          MOUNT_LEAD[fw] ??
            "The entry file that mounts Themvora's provider and loads the stylesheet above.",
        ),
        "",
      );
      for (const block of snippetBlocks(recipe.mountProvider, lang)) {
        push(block, "");
      }
    }

    /* -- attach the adapter -- */
    push("### Attach the adapter", "");
    push(
      ...para(
        slug === "unocss"
          ? "UnoCSS has no adapter to attach: `presetThemvora()` already emits utilities that read the live variables, so this file only mounts the runtime around the UI."
          : lib.architecture === "generated-theme"
            ? `This is where ${possessive(lib.name)} own theme object is built from the runtime and handed to ${possessive(lib.name)} provider. It re-runs on every theme, family and mode change.`
            : `This is where the adapter is registered on the runtime. It writes ${possessive(lib.name)} own CSS custom properties from the active theme, and disposes them on unmount.`,
      ),
      "",
    );
    for (const block of snippetBlocks(recipe.code, lang)) push(block, "");

    /* -- use the library -- */
    if (recipe.componentExample) {
      push(`### Use ${lib.name}`, "");
      push(
        ...para(
          COMPONENT_LEAD[slug] ??
            (lib.architecture === "generated-theme"
              ? `Real ${lib.name} components. None of them takes a Themvora prop — the theme reaches them through ${possessive(lib.name)} own provider.`
              : lib.architecture === "build-time"
                ? `${possessive(lib.name)} own utility classes. Each one resolves to a live theme variable, so a theme change is a variable change, not a rebuild.`
                : `${possessive(lib.name)} own classes and components. Nothing here is Themvora-specific markup — the variables are already written.`),
        ),
        "",
      );
      for (const block of snippetBlocks(recipe.componentExample, lang)) {
        push(block, "");
      }
    }

    /* -- theme switching -- */
    if (recipe.themeSwitchExample) {
      push("### Theme switching", "");
      push(
        ...para(
          `Mode changes go through Themvora's runtime. The controls below are ${possessive(lib.name)} own components, and they are the only code that changes when the mode does.`,
        ),
        "",
      );
      for (const block of snippetBlocks(recipe.themeSwitchExample, lang)) {
        push(block, "");
      }
    }

    /* -- theme family -- */
    push("### Theme family", "");
    push(
      ...para(
        "A family is the second axis: the same mode, a different palette. The runtime carries it beside the mode, so a family picker is one more control and needs no re-mount.",
      ),
      "",
    );
    push(fence(FAMILY_SNIPPET_LANG[fw] ?? "tsx", familySnippet(fw)), "");

    /* -- put it together -- */
    if (recipe.completeExample) {
      push("### Put it together", "");
      push(
        "The last file composes what the steps above created: the runtime, the adapter",
        "zone, the components and the controls.",
        "",
      );
      for (const block of snippetBlocks(recipe.completeExample, lang)) {
        push(block, "");
      }
    }
  }

  /* ------------------------------------------------------ run commands --- */

  push("## Development and production commands", "");
  push(
    ...para(
      `These are the scripts each framework's own scaffold creates; Themvora adds no build step to them. ${
        slug === "unocss"
          ? "The preset is a plugin in the existing UnoCSS pipeline, and the utilities it generates reference runtime variables."
          : lib.architecture === "css-variable"
            ? "The adapter writes CSS custom properties at runtime, and its stylesheet is a plain CSS import."
            : "The adapter builds the library's theme object at runtime, so nothing extra is compiled."
      }`,
    ),
    "",
    "| Framework | Development | Production build | Preview |",
    "| --- | --- | --- | --- |",
  );
  for (const fw of frameworks) {
    const run = RUN_COMMANDS[fw];
    push(
      `| ${fw} | \`${run.dev}\` | \`${run.build}\` | ${run.preview ? `\`${run.preview}\`` : "—"} |`,
    );
  }
  push(
    "",
    "With npm, yarn or bun the same scripts run as `npm run dev`, `yarn dev` and",
    "`bun run dev`.",
    "",
  );

  /* --------------------------------------------------- troubleshooting --- */

  push("## Troubleshooting", "");
  for (const item of TROUBLESHOOTING[slug]) {
    push(...para(`- ${item}`, { hang: "  " }));
  }
  push("");

  /* ----------------------------------------------------- documentation --- */

  push(
    "## Documentation",
    "",
    `- [${lib.name} integration](${SITE}/libraries/${slug}) — the page this README mirrors`,
    `- [Worked examples for every export](${SITE}/libraries/${slug}/examples)`,
    `- [${lib.name} installation guide](${lib.officialUrl})`,
    `- [Framework guides](${SITE}/framework-guides)`,
    "- [All packages on npm](https://www.npmjs.com/org/themvora)",
    `- [Changelog](${REPO_URL}/blob/${BRANCH}/${adapterDir}/CHANGELOG.md)`,
    "",
    "## License",
    "",
    `MIT — see [LICENSE](${REPO_URL}/blob/${BRANCH}/${adapterDir}/LICENSE).`,
    "",
  );

  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "\n");
}

export { renderReadme, SLUGS, recipes, libraries, frameworksOf };
