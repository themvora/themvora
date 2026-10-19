import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ThemeTokens } from "@themvora/core";
import { generateBootstrapVariables } from "../src/generator";

/**
 * Semantic-mapping tests for the Bootstrap adapter.
 *
 * These assert the *mapping*, not the rendering: which Themvora role reaches
 * which Bootstrap variable. Component behaviour is verified separately in the
 * browser (`examples/apps/_tools/probe-bootstrap.mjs`), which is what separates
 * a mapping bug from a library-behaviour bug.
 */

const light: ThemeTokens = {
  colors: {
    background: "#ffffff",
    foreground: "#1f2933",
    card: "#f8fafc",
    muted: "#f3f4f6",
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    secondary: "#6b7280",
    secondaryForeground: "#ffffff",
    accent: "#f59e0b",
    accentForeground: "#1f1300",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    success: "#22c55e",
    successForeground: "#04240f",
    warning: "#facc15",
    warningForeground: "#2a1a00",
    info: "#06b6d4",
    border: "#e5e7eb",
    ring: "#3b82f6",
  },
  radius: { sm: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "1rem" },
  borderWidths: { thin: "1px", thick: "2px" },
};

/** Same roles, inverted — the shape a dark theme has. */
const dark: ThemeTokens = {
  ...light,
  colors: {
    ...light.colors,
    background: "#0b1120",
    foreground: "#e2e8f0",
    card: "#131c31",
    muted: "#1e293b",
    primary: "#60a5fa",
    primaryForeground: "#0b1120",
    border: "#1e293b",
  },
};

const ROLES = ["primary", "secondary", "success", "danger", "warning", "info"] as const;

describe("bootstrap semantic triads", () => {
  it("emits the -text-emphasis / -bg-subtle / -border-subtle triad for every role", () => {
    const vars = generateBootstrapVariables(light, { strategy: "native" });

    for (const role of ROLES) {
      expect(vars[`--bs-${role}`], `${role} base`).toBeTruthy();
      expect(vars[`--bs-${role}-text-emphasis`], `${role} text-emphasis`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(vars[`--bs-${role}-bg-subtle`], `${role} bg-subtle`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(vars[`--bs-${role}-border-subtle`], `${role} border-subtle`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("inverts the triads between light and dark, so they stay mode-correct", () => {
    const l = generateBootstrapVariables(light, { strategy: "native" });
    const d = generateBootstrapVariables(dark, { strategy: "native" });

    // On a light theme the emphasis is a darkening of the role colour and the
    // subtle fill is a tint; on a dark theme both must move the other way.
    expect(l["--bs-primary-text-emphasis"]).not.toBe(d["--bs-primary-text-emphasis"]);
    expect(l["--bs-primary-bg-subtle"]).not.toBe(d["--bs-primary-bg-subtle"]);

    const lum = (hex: string) => {
      const h = hex.replace("#", "");
      const c = (o: number) => {
        const v = parseInt(h.slice(o, o + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * c(0) + 0.7152 * c(2) + 0.0722 * c(4);
    };

    // Light theme: emphasis darker than the base, subtle fill lighter.
    expect(lum(l["--bs-primary-text-emphasis"])).toBeLessThan(lum(l["--bs-primary"]));
    expect(lum(l["--bs-primary-bg-subtle"])).toBeGreaterThan(lum(l["--bs-primary"]));
    // Dark theme: the relationship flips.
    expect(lum(d["--bs-primary-text-emphasis"])).toBeGreaterThan(lum(d["--bs-primary"]));
    expect(lum(d["--bs-primary-bg-subtle"])).toBeLessThan(lum(d["--bs-primary"]));
  });

  it("emits the contrast colour each role needs, which Bootstrap has no concept of", () => {
    const vars = generateBootstrapVariables(light, { strategy: "native" });

    expect(vars["--bs-primary-foreground"]).toBe("#ffffff");
    expect(vars["--bs-danger-foreground"]).toBe("#ffffff");
    expect(vars["--bs-warning-foreground"]).toBe("#2a1a00");
    expect(vars["--bs-success-foreground"]).toBe("#04240f");
  });

  it("maps the emphasis tiers and surfaces from the theme, not Bootstrap's palette", () => {
    const vars = generateBootstrapVariables(light, { strategy: "native" });

    expect(vars["--bs-emphasis-color"]).toBe("#1f2933");
    expect(vars["--bs-heading-color"]).toBe("#1f2933");
    expect(vars["--bs-secondary-bg"]).toBe("#f3f4f6");
    // secondary/tertiary text sit between foreground and background
    expect(vars["--bs-secondary-color"]).not.toBe("#1f2933");
    expect(vars["--bs-secondary-color"]).not.toBe("#ffffff");
  });

  it("derives the focus ring from the theme primary, not Bootstrap's literal blue", () => {
    const vars = generateBootstrapVariables(light, { strategy: "native" });
    const triplet = vars["--bs-primary-rgb"];

    expect(triplet).toBe("37, 99, 235");
    expect(vars["--bs-focus-ring-color"]).toBe("rgba(37, 99, 235, 0.25)");
    // The value Bootstrap hardcodes; it must not survive.
    expect(vars["--bs-focus-ring-color"]).not.toContain("13, 110, 253");
  });

  it("emits -rgb companions for the link and body pairs", () => {
    const vars = generateBootstrapVariables(light, { strategy: "native" });

    expect(vars["--bs-body-bg-rgb"]).toBe("255, 255, 255");
    expect(vars["--bs-body-color-rgb"]).toBe("31, 41, 51");
    expect(vars["--bs-link-color-rgb"]).toBe("37, 99, 235");
    expect(vars["--bs-emphasis-color-rgb"]).toBe("31, 41, 51");
  });

  it("maps validation feedback to the success / destructive roles", () => {
    const vars = generateBootstrapVariables(light, { strategy: "native" });

    expect(vars["--bs-form-valid-color"]).toBe("#22c55e");
    expect(vars["--bs-form-invalid-color"]).toBe("#ef4444");
  });
});

describe("bootstrap.css scoped-variable re-pointing", () => {
  const css = readFileSync(join(__dirname, "..", "src", "bootstrap.css"), "utf8");

  /** Extracts the body of a rule by its exact selector line. */
  function ruleBody(selector: string): string {
    const index = css.indexOf(selector);
    expect(index, `selector ${selector} missing from bootstrap.css`).toBeGreaterThan(-1);
    const open = css.indexOf("{", index);
    const close = css.indexOf("}", open);
    return css.slice(open + 1, close);
  }

  /**
   * The reported defect. `.list-group` hardcodes all three active values, so
   * overriding `--bs-primary` at `:root` cannot reach them. This asserts the
   * scoped variables are re-pointed at the semantic role AND its contrast pair —
   * asserting the *variable*, not a hex, because the point is semantic mapping.
   */
  it("re-points .list-group active state at the primary role and its contrast", () => {
    const body = ruleBody(".list-group {");
    expect(body).toContain("--bs-list-group-active-bg: var(--bs-primary)");
    expect(body).toContain("--bs-list-group-active-border-color: var(--bs-primary)");
    expect(body).toContain("--bs-list-group-active-color: var(--bs-primary-foreground");
    // Bootstrap's literal must be gone.
    expect(body).not.toContain("#0d6efd");
  });

  it("re-points the progress bar at the primary role", () => {
    const body = ruleBody(".progress,");
    expect(body).toContain("--bs-progress-bar-bg: var(--bs-primary)");
    expect(body).toContain("--bs-progress-bar-color: var(--bs-primary-foreground");
  });

  it.each([
    [".nav-pills {", "--bs-nav-pills-link-active-bg: var(--bs-primary)"],
    [".pagination {", "--bs-pagination-active-bg: var(--bs-primary)"],
    [".dropdown-menu {", "--bs-dropdown-link-active-bg: var(--bs-primary)"],
  ])("re-points %s at the primary role", (selector, declaration) => {
    expect(ruleBody(selector)).toContain(declaration);
  });

  it("routes form focus rings through the theme's focus ring variables", () => {
    const body = ruleBody(".form-control:focus,");
    expect(body).toContain("border-color: var(--bs-primary)");
    expect(body).toContain("box-shadow: 0 0 0 var(--bs-focus-ring-width) var(--bs-focus-ring-color)");
    expect(body).not.toContain("#86b7fe");
  });

  it("routes the checked control background through the primary role", () => {
    const body = ruleBody(".form-check-input:checked {");
    expect(body).toContain("background-color: var(--bs-primary)");
    expect(body).not.toContain("#0d6efd");
  });

  it("paints the check / radio glyph with the semantic contrast colour", () => {
    // The glyph colour is baked into an SVG data URI by Bootstrap, so it can
    // never follow a theme. It is redrawn as a mask painted with
    // --bs-primary-foreground.
    expect(css).toContain("background-color: var(--bs-primary-foreground");
    expect(css).toContain("--tv-checkmark");
    expect(css).toContain("--tv-radio-dot");
  });

  it("documents every component-property exception it had to make", () => {
    // The brief allows component-specific rules only where the library exposes
    // no semantic variable. Each one must be marked so it can be audited.
    const exceptions = css.match(/EXCEPTION \d+/g) ?? [];
    expect(exceptions.length).toBeGreaterThanOrEqual(3);
  });
});
