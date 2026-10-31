/**
 * What the Studio library actually renders.
 *
 * The host-side tests prove the *data* the panel posts — draft rows, ids,
 * revisions. They cannot prove the library turns that data into a visible,
 * distinguishable row, and until now nothing did: the webview was covered by
 * typecheck and the built bundle only.
 *
 * These render `LibraryPanel` to static markup and assert the output. There is
 * no DOM in this repository's test environment, so this is markup coverage, not
 * click coverage: that a row is a `<button>` is asserted, and what the click
 * *does* is covered where the intent is handled.
 */
import { generateTheme } from "@themvora/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  StudioDraftRow,
  StudioSelection,
  StudioState,
  StudioTheme,
} from "../src/shared/studioProtocol";
import { LibraryPanel } from "../webview/studio/LibraryPanel";
import { initialUiState, type StudioUiState } from "../webview/studio/uiState";

const PAIR = generateTheme({ seed: "#10b981" });

/** A project theme row. */
function projectTheme(name = "ocean-light", mode = "light"): StudioTheme {
  return {
    name,
    source: "src/theme/theme.config.ts",
    mode,
    family: "ocean",
    valid: true,
    evidence: "registered",
    usedBy: ["src/main.tsx"],
    swatches: ["#0f172a", "#1e293b", "#4f46e5"],
  };
}

/** A draft row as the host builds it. */
function draftRow(overrides: Partial<StudioDraftRow> = {}): StudioDraftRow {
  return {
    id: "draft-1",
    name: "harbor",
    family: "harbor",
    modes: ["light", "dark"],
    origin: "generated",
    valid: true,
    dirty: true,
    revision: 1,
    saved: false,
    swatches: ["#eef3f0", "#171c19", "#4f46e5"],
    ...overrides,
  };
}

/** The state the host would post. */
function state(overrides: Partial<StudioState> = {}): StudioState {
  return {
    project: {
      name: "app",
      framework: "React",
      packageManager: "pnpm",
      status: "supported",
      themeCount: 1,
      familyCount: 1,
      catalogCount: 0,
      catalogFamilyCount: 0,
    },
    themes: [],
    sources: [],
    providers: [],
    presets: [],
    drafts: [],
    styles: ["balanced"],
    ...overrides,
  };
}

/** A draft selection, as the host posts it. */
function draftSelection(overrides: Partial<StudioSelection> = {}): StudioSelection {
  const token = (name: string, value: string) => ({
    name,
    label: name,
    group: "colors",
    type: "color" as const,
    value,
    changed: false,
    presentIn: ["light"],
    presentInSelected: true,
    optional: false,
    contrasts: [],
  });

  return {
    origin: "draft",
    name: PAIR.light.name,
    family: "harbor",
    modes: ["light", "dark"],
    valid: true,
    saved: false,
    draftKind: "generate",
    draftId: "draft-1",
    tokens: [token("background", "#eef3f0"), token("primary", "#4f46e5")],
    variants: [],
    ...overrides,
  };
}

/** Render the library with the given state. */
function render(
  studioState: StudioState,
  options: { readonly selected?: StudioSelection; readonly ui?: StudioUiState } = {},
): string {
  // `createElement`, not a direct call: a component invoked outside React's
  // render phase has no dispatcher, so every hook would throw.
  return renderToStaticMarkup(
    createElement(LibraryPanel, {
      state: studioState,
      selected: options.selected,
      ui: options.ui ?? initialUiState(),
      dispatch: () => undefined,
      actions: {
        onSelectTheme: () => undefined,
        onSelectPreset: () => undefined,
        onSelectDraft: () => undefined,
        onOpen: () => undefined,
        onCreate: () => undefined,
      },
    }),
  );
}

describe("registry drafts in the library", () => {
  it("renders a section listing them", () => {
    const markup = render(state({ drafts: [draftRow()] }));

    expect(markup).toContain(">Drafts · 1<");
    expect(markup).toContain("harbor");
    // The row states where it came from, the way a project row names its file.
    expect(markup).toContain("generated");
    expect(markup).toContain("light / dark");
  });

  it("distinguishes a draft that has been written from one that has not", () => {
    const unwritten = render(state({ drafts: [draftRow({ dirty: true })] }));
    const written = render(
      state({ drafts: [draftRow({ dirty: false, saved: true, revision: 3 })] }),
    );

    // Exact cells, because the two labels used to differ by a prefix only —
    // "unsaved draft" contains "saved draft", which is exactly how a reader
    // skims past it.
    expect(unwritten).toContain(">not written</span>");
    expect(written).toContain(">written</span>");
    expect(written).not.toContain(">not written</span>");
  });

  it("offers each draft as a button, so it is actionable", () => {
    const markup = render(state({ drafts: [draftRow()] }));

    // The click itself is handled by the host; what the markup must prove is
    // that the row is a control rather than a label.
    expect(markup).toMatch(/<button[^>]*class="theme-row-main"/u);
  });

  it("does not list the draft that is already open", () => {
    // The open draft has its own section above; listing it again would offer
    // the same theme twice.
    const markup = render(state({ drafts: [draftRow({ id: "draft-1" })] }), {
      selected: draftSelection({ draftId: "draft-1" }),
    });

    // The open draft keeps its own section; the list of others is absent.
    expect(markup).toContain(">Draft · 1<");
    expect(markup).not.toContain(">Drafts ·");
  });

  it("lists the others while one is open", () => {
    const markup = render(
      state({
        drafts: [
          draftRow({ id: "draft-1", name: "harbor" }),
          draftRow({ id: "draft-2", name: "meadow" }),
        ],
      }),
      { selected: draftSelection({ draftId: "draft-1" }) },
    );

    expect(markup).toContain(">Drafts · 1<");
    expect(markup).toContain("meadow");
    // The open draft appears exactly once — in its own section — and the other
    // draft exactly once, in the list. A duplicate would show up as a count of 2.
    expect(markup.split(">harbor<")).toHaveLength(2);
    expect(markup.split(">meadow<")).toHaveLength(2);
  });

  it("renders no section when the registry holds none", () => {
    const markup = render(state({ themes: [projectTheme()] }));

    expect(markup).not.toContain(">Drafts ·");
    // The project theme is still there: the section is additive, not a swap.
    expect(markup).toContain("ocean");
  });

  it("filters drafts by the search query", () => {
    const ui = { ...initialUiState(), query: "meadow" };
    const markup = render(
      state({ drafts: [draftRow({ id: "draft-1", name: "harbor" })] }),
      { ui },
    );

    expect(markup).not.toContain("harbor");
    expect(markup).toContain("Nothing matches");
  });

  it("renders a draft and a project theme as separate rows", () => {
    // Each name appears once. A draft that leaked into the project list would
    // show up twice, which is the failure this catches.
    const markup = render(
      state({ themes: [projectTheme()], drafts: [draftRow({ name: "harbor" })] }),
    );

    expect(markup.split(">harbor<")).toHaveLength(2);
    expect(markup.split(">ocean<")).toHaveLength(2);
    // And the draft sits under the draft heading, not the project one.
    expect(markup.indexOf(">Drafts ·")).toBeLessThan(markup.indexOf(">harbor<"));
  });
});
