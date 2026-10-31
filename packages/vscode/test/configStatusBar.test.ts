/**
 * The contextual status bar item.
 *
 * The item is the extension's own mark beside the file the user is looking at,
 * because the Explorer icon belongs to the user's icon theme. What matters is
 * that it appears for the right files and that its click does what the label
 * promises — a "Preview" that cannot preview is worse than no button.
 */

import { afterEach, describe, expect, it } from "vitest";

import { registerConfigStatusBar, targetForFile } from "../src/adapters/configStatusBar";
import { __openDocument, __reset, __setActiveEditor, __state } from "./stubs/vscode";

afterEach(() => {
  __reset();
});

/** The item the registration created. */
function item() {
  const found = __state.statusBarItems[0];
  if (found === undefined) throw new Error("no status bar item was created");
  return found;
}

describe("targetForFile", () => {
  it("offers the preview for a JSON theme document", () => {
    for (const name of ["theme.json", "brand.theme.json"]) {
      const target = targetForFile(name);
      expect(target?.command).toBe("themvora.previewTheme");
      expect(target?.text).toContain("Preview");
    }
  });

  it("offers the panel for a configuration module, because it cannot be previewed", () => {
    // A TypeScript configuration is not readable by the extension, so a preview
    // command would fail and fall back to a file dialog. The panel is honest.
    for (const name of ["theme.config.ts", "theme.config.js", "themes.ts", "themes.mjs"]) {
      const target = targetForFile(name);
      expect(target?.command).toBe("themvora.workspace.focus");
      expect(target?.tooltip).toContain(name);
    }
  });

  it("offers nothing for an unrelated file", () => {
    for (const name of ["main.tsx", "vite.config.ts", "package.json", "themes.css"]) {
      expect(targetForFile(name)).toBeUndefined();
    }
  });
});

describe("registerConfigStatusBar", () => {
  it("starts hidden when no editor is focused", () => {
    registerConfigStatusBar();
    expect(item().visible).toBe(false);
  });

  it("shows for a theme config and hides for anything else", () => {
    registerConfigStatusBar();
    expect(item().visible).toBe(false);

    __setActiveEditor(__openDocument("/app/src/theme/theme.config.ts", "export {}"));
    expect(item().visible).toBe(true);
    expect(item().text).toContain("Themvora");
    expect(item().command).toBe("themvora.workspace.focus");

    __setActiveEditor(__openDocument("/app/src/main.tsx", "export {}"));
    expect(item().visible).toBe(false);
  });

  it("switches to the preview action for a JSON theme document", () => {
    registerConfigStatusBar();

    __setActiveEditor(__openDocument("/app/theme.json", "{}"));
    expect(item().visible).toBe(true);
    expect(item().command).toBe("themvora.previewTheme");
  });

  it("is visible immediately when a theme file is already focused at activation", () => {
    // The extension activates on a JSON file, so this is the common case rather
    // than an edge one.
    __setActiveEditor(__openDocument("/app/theme.json", "{}"));
    registerConfigStatusBar();

    expect(item().visible).toBe(true);
  });

  it("removes the item and its listener on dispose", () => {
    const registration = registerConfigStatusBar();
    const listeners = __state.activeEditorListeners.length;

    registration.dispose();

    expect(item().disposed).toBe(true);
    expect(__state.activeEditorListeners.length).toBe(listeners - 1);
  });
});
