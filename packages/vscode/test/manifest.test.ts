/**
 * Contribution integrity.
 *
 * The manifest is the only thing that decides whether a feature is visible: a
 * command, view or menu entry that is declared wrongly is contributed but never
 * shown, and nothing fails at runtime. These checks are cheap and catch the
 * failure mode where a view is declared under a container that does not exist —
 * which is exactly how the tree ended up with no Activity Bar icon.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import manifest from "../package.json";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Containers VS Code provides; a `views` key may name one of these. */
const BUILT_IN_CONTAINERS = ["explorer", "debug", "scm", "test", "references"];

const contributes = manifest.contributes as {
  commands: { command: string; title: string; category?: string }[];
  viewsContainers?: { activitybar?: { id: string; title: string; icon: string }[] };
  views?: Record<string, { id: string; name: string }[]>;
  menus?: Record<string, { command: string; when?: string }[]>;
};

const activityContainers = contributes.viewsContainers?.activitybar ?? [];

describe("manifest — views", () => {
  it("contributes at least one Activity Bar container", () => {
    // Without this there is no icon and no panel to open or close: the tree is
    // reachable only by finding it inside the built-in Explorer.
    expect(activityContainers.length).toBeGreaterThan(0);
  });

  it("declares a unique id and a title for every container", () => {
    const ids = activityContainers.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of activityContainers) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("ships every container icon", () => {
    for (const entry of activityContainers) {
      const file = join(root, entry.icon);
      expect(existsSync(file), `missing icon: ${entry.icon}`).toBe(true);
      // An SVG is required: a raster icon cannot follow the Activity Bar theme.
      expect(entry.icon.endsWith(".svg")).toBe(true);
    }
  });

  it("places every view in a container that exists", () => {
    const declared = new Set(activityContainers.map((entry) => entry.id));

    for (const container of Object.keys(contributes.views ?? {})) {
      const known = declared.has(container) || BUILT_IN_CONTAINERS.includes(container);
      // A view under an unknown container is silently never rendered, which is
      // indistinguishable from "the extension does nothing".
      expect(known, `views.${container} is not a declared or built-in container`).toBe(true);
    }
  });

  it("keeps the project tree in the Themvora container", () => {
    const containers = Object.keys(contributes.views ?? {});
    const holders = containers.filter((container) =>
      (contributes.views?.[container] ?? []).some((view) => view.id === "themvora.workspace"),
    );

    expect(holders).toEqual(["themvora"]);
  });
});

describe("manifest — commands and menus", () => {
  it("declares every command a menu refers to", () => {
    const declared = new Set(contributes.commands.map((entry) => entry.command));

    for (const [location, items] of Object.entries(contributes.menus ?? {})) {
      for (const item of items) {
        expect(
          declared.has(item.command),
          `menus.${location} references undeclared command ${item.command}`,
        ).toBe(true);
      }
    }
  });

  it("gives every command a title and a category", () => {
    for (const entry of contributes.commands) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.category).toBe("Themvora");
    }
  });
});

describe("manifest — icons and menus", () => {
  it("ships the icon of every command that declares one", () => {
    for (const entry of contributes.commands) {
      const icon = (entry as { icon?: string | Record<string, string> }).icon;
      if (icon === undefined) continue;

      // An icon may be a codicon reference (`$(refresh)`) instead of a file; only
      // file paths can be checked for existence.
      const paths = (typeof icon === "string" ? [icon] : Object.values(icon)).filter(
        (path) => !path.startsWith("$("),
      );
      for (const path of paths) {
        // A command with an icon path that does not exist renders as a blank
        // button in the editor title — visible, but anonymous.
        expect(existsSync(join(root, path)), `missing icon: ${path}`).toBe(true);
      }
    }
  });

  it("gates the editor-title button to theme files", () => {
    const entry = contributes.menus?.["editor/title"]?.find(
      (item) => item.command === "themvora.previewTheme",
    );
    expect(entry).toBeDefined();

    // The `when` clause is the only thing deciding when the button appears, and
    // nothing else in the suite evaluates it — so it is executed here.
    const source = /resourceFilename =~ \/(.+)\/$/.exec(entry?.when ?? "")?.[1];
    expect(source).toBeDefined();
    const pattern = new RegExp(source!);

    for (const name of ["theme.config.ts", "theme.config.js", "theme.config.mts", "themes.ts", "themes.mjs"]) {
      expect(pattern.test(name), name).toBe(true);
    }
    for (const name of ["main.tsx", "vite.config.ts", "package.json", "themes.css"]) {
      expect(pattern.test(name), name).toBe(false);
    }
  });
});

describe("manifest — packaging", () => {
  it("does not exclude the container icon from the archive", () => {
    // `.vscodeignore` is applied to the whole folder. A rule that swallows
    // `media/` would ship a manifest pointing at a file that is not there, and
    // the Activity Bar would show a blank slot.
    const ignore = readFileSync(join(root, ".vscodeignore"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    const offenders = ignore.filter((rule) => /^media(\/\*\*)?\/?$/.test(rule));
    expect(offenders).toEqual([]);
  });
});
