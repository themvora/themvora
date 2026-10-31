/**
 * What a workspace is set up for.
 *
 * The distinctions here are the ones a user acts on differently: install
 * something, open the Studio, or nothing to do. They are derived from evidence
 * the inspector already produced, so these tests build inspections rather than
 * files.
 */
import { describe, expect, it } from "vitest";

import type { ProjectProfile } from "../src/domain/projectProfile";
import type { ProjectInspection, RegistryEntry } from "../src/domain/registry";
import { SETUP_LINKS, setupLink, workspaceSetup } from "../src/domain/workspaceSetup";

/** A registry entry with a number of themes. */
function registry(themes: number, status: RegistryEntry["status"] = "supported"): RegistryEntry {
  return {
    kind: "theme-module",
    path: "src/theme/theme.ts",
    status,
    detail: "src/theme/theme.ts",
    themes: Array.from({ length: themes }, (_, index) => ({
      name: `brand-${index % 2 === 0 ? "light" : "dark"}`,
      meta: { mode: index % 2 === 0 ? "light" : "dark", family: "brand" },
      tokens: { colors: {} },
    })),
  };
}

/** An inspection over the given registries. */
function inspection(overrides: Partial<ProjectInspection> = {}): ProjectInspection {
  return {
    root: "C:/app",
    status: "missing",
    packages: [],
    registries: [],
    notes: [],
    providers: [],
    relationships: [],
    ...overrides,
  };
}

/** A profile declaring the given packages. */
function profile(packages: { name: string; status: string }[]): ProjectProfile {
  return {
    framework: "react",
    frameworkEvidence: "react is declared",
    packageManager: "npm",
    packageManagerEvidence: "package-lock.json is present",
    packages: packages.map((entry) => ({
      name: entry.name,
      declaredRange: "^1.0.0",
      field: "dependencies",
      status: entry.status as never,
      ...(entry.status === "installed" ? { installedVersion: "1.0.0" } : {}),
    })),
  };
}

describe("workspaceSetup", () => {
  it("reports a folder with no evidence as not configured", () => {
    const setup = workspaceSetup(inspection(), profile([]));

    expect(setup.kind).toBe("not-configured");
    expect(setup.studioEnabled).toBe(false);
    // The catalog ships with the extension, so it is never unavailable.
    expect(setup.catalogAvailable).toBe(true);
    expect(setup.evidence.join(" ")).toContain("No @themvora/* package is declared");
  });

  it("reports a declared but uninstalled package as unresolved", () => {
    const setup = workspaceSetup(
      inspection({ packages: [] }),
      profile([{ name: "@themvora/core", status: "declared" }]),
    );

    expect(setup.kind).toBe("dependency-unresolved");
    expect(setup.summary).toContain("@themvora/core");
    expect(setup.evidence.join(" ")).toContain("Declared: @themvora/core");
  });

  it("reports an installed package with no theme of its own", () => {
    const setup = workspaceSetup(
      inspection({ packages: ["@themvora/core"], status: "missing" }),
      profile([{ name: "@themvora/core", status: "installed" }]),
    );

    expect(setup.kind).toBe("no-project-themes");
    // The Studio stays usable and falls back to the catalog.
    expect(setup.studioEnabled).toBe(true);
  });

  it("reports a project with readable themes as configured", () => {
    const setup = workspaceSetup(
      inspection({ registries: [registry(2)], status: "supported", packages: ["@themvora/core"] }),
      profile([{ name: "@themvora/core", status: "installed" }]),
    );

    expect(setup.kind).toBe("configured");
    expect(setup.studioEnabled).toBe(true);
    expect(setup.evidence.join(" ")).toContain("2 themes in 1 file");
  });

  it("keeps unreadable theme source distinct from not configured", () => {
    const setup = workspaceSetup(
      inspection({ registries: [registry(0, "unsupported")], status: "unsupported", packages: ["@themvora/core"] }),
      profile([{ name: "@themvora/core", status: "installed" }]),
    );

    expect(setup.kind).toBe("unsupported");
    expect(setup.studioEnabled).toBe(true);
  });

  it("does not treat a provider without a package as configured", () => {
    const setup = workspaceSetup(
      inspection({
        providers: [{ path: "src/main.tsx", names: ["theme"] } as never],
      }),
      profile([]),
    );

    // A provider is real usage, so this is not "not configured" — but with no
    // package declared the install is incomplete, which is what the user needs
    // to know.
    expect(setup.kind).toBe("dependency-unresolved");
    expect(setup.summary).toContain("references Themvora in a provider");
    expect(setup.evidence.join(" ")).toContain("pass themes to a provider");
  });

  it("treats an uninspected folder as not configured", () => {
    const setup = workspaceSetup(undefined, undefined);

    expect(setup.kind).toBe("not-configured");
    expect(setup.studioEnabled).toBe(false);
  });
});

describe("setup links", () => {
  it("accepts only the three fixed destinations", () => {
    expect(setupLink("framework-guides")).toBe("framework-guides");
    expect(setupLink("npm")).toBe("npm");
    expect(setupLink("github")).toBe("github");
  });

  it("rejects a URL or an unknown id", () => {
    // The webview may name an id, never a destination.
    for (const value of ["https://example.com", "docs", "", 1, null, undefined, {}]) {
      expect(setupLink(value)).toBeUndefined();
    }
  });

  it("points at the canonical destinations", () => {
    expect(SETUP_LINKS["framework-guides"]).toBe("https://themvora-dev.vercel.app/framework-guides");
    expect(SETUP_LINKS.npm).toBe("https://www.npmjs.com/org/themvora");
    expect(SETUP_LINKS.github).toBe("https://github.com/themvora/themvora");
  });
});
