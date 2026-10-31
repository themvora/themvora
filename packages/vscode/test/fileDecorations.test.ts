/**
 * Theme-file badges.
 *
 * The provider is the only thing standing between "this file configures Themvora"
 * and "this file is called themes.ts", so the negative cases matter as much as
 * the positive one: a badge on the wrong file is a false claim about the project.
 */

import { afterEach, describe, expect, it } from "vitest";

import { registerThemeFileDecorations } from "../src/adapters/fileDecorations";
import type { RootView } from "../src/domain/rootView";
import type { ProjectInspection } from "../src/domain/registry";
import { __reset, __state, Uri } from "./stubs/vscode";

afterEach(() => {
  __reset();
});

/** An inspection for a root that declares Themvora packages. */
function inspection(root: string, packages: readonly string[] = ["@themvora/core"]): ProjectInspection {
  return {
    root,
    status: "missing",
    packages: [...packages],
    registries: [],
    notes: [],
    providers: [],
    relationships: [],
  };
}

/** Register the provider and return it, typed for direct calls. */
function providerFor(roots: readonly RootView[]): {
  provideFileDecoration(uri: Uri): { badge?: string; tooltip?: string } | undefined;
} {
  registerThemeFileDecorations({ roots: () => roots });
  const registered = __state.fileDecorationProviders.at(-1) as {
    provideFileDecoration(uri: Uri): { badge?: string; tooltip?: string } | undefined;
  };
  return registered;
}

describe("theme file decorations", () => {
  it("registers exactly one provider", () => {
    registerThemeFileDecorations({ roots: () => [] });
    expect(__state.fileDecorationProviders).toHaveLength(1);
  });

  it("badges a theme config anywhere in the project", () => {
    // The file the user keeps in `src/theme/` — the case that motivated this.
    const roots: RootView[] = [
      { name: "app", inspection: inspection("C:\\app") },
    ];
    const provider = providerFor(roots);

    const decoration = provider.provideFileDecoration(
      Uri.file("C:\\app\\src\\theme\\theme.config.ts"),
    );

    expect(decoration?.badge).toBe("TV");
    expect(decoration?.tooltip).toContain("Themvora");
  });

  it("badges a theme registry module", () => {
    const roots: RootView[] = [
      { name: "app", inspection: inspection("C:\\app") },
    ];
    const provider = providerFor(roots);

    expect(provider.provideFileDecoration(Uri.file("C:\\app\\src\\themes\\themes.ts"))?.badge).toBe(
      "TV",
    );
  });

  it("does not badge anything when the project has no Themvora dependency", () => {
    // The badge claims the file configures Themvora. Without the package it is
    // some other library's config file.
    const roots: RootView[] = [
      { name: "app", inspection: inspection("C:\\app", []) },
    ];
    const provider = providerFor(roots);

    expect(
      provider.provideFileDecoration(Uri.file("C:\\app\\theme.config.ts")),
    ).toBeUndefined();
  });

  it("does not badge an unrelated file", () => {
    const roots: RootView[] = [
      { name: "app", inspection: inspection("C:\\app") },
    ];
    const provider = providerFor(roots);

    expect(provider.provideFileDecoration(Uri.file("C:\\app\\src\\main.tsx"))).toBeUndefined();
    expect(provider.provideFileDecoration(Uri.file("C:\\app\\vite.config.ts"))).toBeUndefined();
  });

  it("does not badge a file outside every root", () => {
    const roots: RootView[] = [
      { name: "app", inspection: inspection("C:\\app") },
    ];
    const provider = providerFor(roots);

    expect(
      provider.provideFileDecoration(Uri.file("C:\\elsewhere\\theme.config.ts")),
    ).toBeUndefined();
  });

  it("does not treat a sibling folder with the same prefix as inside the root", () => {
    // `C:\app-other` starts with `C:\app`, which is exactly the bug a plain
    // `startsWith` would ship.
    const roots: RootView[] = [
      { name: "app", inspection: inspection("C:\\app") },
    ];
    const provider = providerFor(roots);

    expect(
      provider.provideFileDecoration(Uri.file("C:\\app-other\\theme.config.ts")),
    ).toBeUndefined();
  });

  it("follows the roots it is given, so a refresh can change the answer", () => {
    let roots: RootView[] = [{ name: "app", inspection: inspection("C:\\app", []) }];
    registerThemeFileDecorations({ roots: () => roots });
    const provider = __state.fileDecorationProviders.at(-1) as {
      provideFileDecoration(uri: Uri): { badge?: string } | undefined;
    };
    const file = Uri.file("C:\\app\\theme.config.ts");

    expect(provider.provideFileDecoration(file)).toBeUndefined();

    // A refresh finds the dependency; the badge appears without re-registering.
    roots = [{ name: "app", inspection: inspection("C:\\app") }];
    expect(provider.provideFileDecoration(file)?.badge).toBe("TV");
  });

  it("is disposed with the extension", () => {
    const registration = registerThemeFileDecorations({ roots: () => [] });
    expect(__state.fileDecorationProviders).toHaveLength(1);

    registration.dispose();
    expect(__state.fileDecorationProviders).toHaveLength(0);
  });
});
