import { defineTheme, getBuiltInThemes } from "@themvora/core";

import { buildChromeAccentCss } from "../../lib/chrome-accent";

interface scrollThumbProps {
  size?: number;
  color?: string;
  className?: string;
}

export const themvora = [
  defineTheme({
    name: "themvora-default-light",
    meta: {
      family: "themvora",
      mode: "light",
      label: "Themvora Light",
      order: 10,
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#fafbff",
        foreground: "#0d0f1f",

        card: "#ffffff",
        cardForeground: "#0d0f1f",

        popover: "#ffffff",
        popoverForeground: "#0d0f1f",

        primary: "#5046e5",
        primaryForeground: "#ffffff",

        secondary: "#eef0fb",
        secondaryForeground: "#171a2e",

        muted: "#f2f3fb",
        mutedForeground: "#555c70",

        accent: "#e8e6ff",
        accentForeground: "#4338ca",

        destructive: "#dc2626",
        destructiveForeground: "#ffffff",

        success: "#15803d",
        successForeground: "#ffffff",

        border: "#e4e6f2",
        input: "#8388ae",

        ring: "#5046e5",
      },
      radius: {
        lg: "12px",
      },
      code: {
        background: "#f6f7fc",
        foreground: "#0f172a",
        comment: "#5f6778",
        keyword: "#6d28d9",
        string: "#047857",
        number: "#b45309",
        function: "#1d4ed8",
        variable: "#0f172a",
        type: "#be185d",
        property: "#0369a1",
        operator: "#6d28d9",
        punctuation: "#475569",
        tag: "#be123c",
        attribute: "#0369a1",
        lineNumber: "#7a8194",
        selection: "rgba(80, 70, 229, 0.16)",
        highlight: "rgba(80, 70, 229, 0.07)",
        gutter: "#f6f7fc",
        border: "#e4e6f2",
      },
    },
  }),
  defineTheme({
    name: "themvora-default-dark",
    meta: {
      family: "themvora",
      mode: "dark",
      label: "Themvora Dark",
      order: 10,
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#0b0d1a",
        foreground: "#eceeff",

        card: "#111322",
        cardForeground: "#eceeff",

        popover: "#141627",
        popoverForeground: "#eceeff",

        primary: "#8b7ff5",
        primaryForeground: "#0b0d1a",

        secondary: "#1a1c2e",
        secondaryForeground: "#eceeff",

        muted: "#16182a",
        mutedForeground: "#9ea3ba",

        accent: "#22244a",
        accentForeground: "#d4d0ff",

        destructive: "#f87171",
        destructiveForeground: "#0b0d1a",

        success: "#4ade80",
        successForeground: "#0b0d1a",

        border: "#262938",
        input: "#656b94",

        ring: "#8b7ff5",
      },
      radius: {
        lg: "12px",
      },
      code: {
        background: "#111322",
        foreground: "#eceeff",
        comment: "#8a93a6",
        keyword: "#b4a0ff",
        string: "#34d399",
        number: "#fbbf24",
        function: "#6cb2ff",
        variable: "#eceeff",
        type: "#f78fc0",
        property: "#7dd3fc",
        operator: "#b4a0ff",
        punctuation: "#a0a9bd",
        tag: "#f78fc0",
        attribute: "#7dd3fc",
        lineNumber: "#6b7390",
        selection: "rgba(139, 127, 245, 0.28)",
        highlight: "rgba(139, 127, 245, 0.10)",
        gutter: "#111322",
        border: "#262938",
      },
    },
  }),
];

export const labThemes = [
  defineTheme({
    name: "lab-light",
    meta: {
      mode: "light",
      label: "Lab Light",
      family: "lab",
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#fef7ed",
        foreground: "#1c1917",
        card: "#ffffff",
        cardForeground: "#1c1917",
        popover: "#ffffff",
        popoverForeground: "#1c1917",
        muted: "#f5e6d3",
        mutedForeground: "#6b5d4d",
        secondary: "#fbeedd",
        secondaryForeground: "#7c2d12",
        accent: "#fed7aa",
        accentForeground: "#7c2d12",
        primary: "#ea580c",
        primaryForeground: "#ffffff",
        destructive: "#dc2626",
        destructiveForeground: "#ffffff",
        success: "#16a34a",
        successForeground: "#ffffff",
        border: "#e7d5bf",
        input: "#e7d5bf",
        ring: "#ea580c",
      },
      radius: { lg: "14px" },
      shadows: { lg: "0 10px 30px rgba(28,25,23,0.10)" },
    },
  }),
  defineTheme({
    name: "lab-dark",
    meta: {
      mode: "dark",
      label: "Lab Dark",
      family: "lab",
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#1c1917",
        foreground: "#fafaf9",
        card: "#292524",
        cardForeground: "#fafaf9",
        popover: "#292524",
        popoverForeground: "#fafaf9",
        muted: "#44403c",
        mutedForeground: "#d6d3d1",
        secondary: "#3b3532",
        secondaryForeground: "#fafaf9",
        accent: "#7c2d12",
        accentForeground: "#fed7aa",
        primary: "#fb923c",
        primaryForeground: "#1c1917",
        destructive: "#f87171",
        destructiveForeground: "#1c1917",
        success: "#4ade80",
        successForeground: "#1c1917",
        border: "#44403c",
        input: "#44403c",
        ring: "#fb923c",
      },
      radius: { lg: "14px" },
      shadows: { lg: "0 10px 30px rgba(0,0,0,0.45)" },
    },
  }),
];

export const scopeThemes = [
  defineTheme({
    name: "scope-light",
    meta: {
      mode: "light",
      label: "Scope Light",
      family: "scope",
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#0f1225",
        foreground: "#e6e9f5",
        card: "#151a2e",
        cardForeground: "#e6e9f5",
        popover: "#131a30",
        popoverForeground: "#e6e9f5",
        primary: "#10b981",
        primaryForeground: "#0f1225",
        secondary: "#18203a",
        secondaryForeground: "#d7e0f2",
        muted: "#181f36",
        mutedForeground: "#9aa7c9",
        accent: "#1b2440",
        accentForeground: "#a7b8f0",
        destructive: "#f87171",
        destructiveForeground: "#0f1225",
        success: "#34d399",
        successForeground: "#0f1225",
        border: "#2a3150",
        input: "#2a3150",
        ring: "#10b981",
      },
      radius: { lg: "12px" },
    },
  }),
  defineTheme({
    name: "scope-dark",
    meta: {
      mode: "dark",
      label: "Scope Dark",
      family: "scope",
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#1a1033",
        foreground: "#f8fafc",
        card: "#13141b",
        cardForeground: "#f8fafc",
        popover: "#171029",
        popoverForeground: "#f8fafc",
        primary: "#f472b6",
        primaryForeground: "#1a1033",
        secondary: "#251b43",
        secondaryForeground: "#f3d8e8",
        muted: "#241a45",
        mutedForeground: "#bda8d4",
        accent: "#341f5c",
        accentForeground: "#f9b8dd",
        destructive: "#f87171",
        destructiveForeground: "#1a1033",
        success: "#4ade80",
        successForeground: "#1a1033",
        border: "#2a3150",
        input: "#2a3150",
        ring: "#f472b6",
      },
      radius: { lg: "16px" },
    },
  }),
];

export const DEFAULT_THEME = "themvora-default-light";

export const scrollThumbIcon = ({
  size = 24,
  color = "currentColor",
  className = "",
}: scrollThumbProps) => {
  return {
    arrowUpIcon: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M12 19V5M12 5L5 12M12 5L19 12"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),

    arrowDownIcon: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M12 5V19M12 19L19 12M12 19L5 12"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };
};

/**
 * The scrollbar's brand tint.
 *
 * Mixed from `--docs-accent`, not `--theme-color-primary`. The overlay is a
 * `position: fixed` node on `<body>`, so it inherits the page accent — and the
 * accent is the role that has already been checked for visibility against the
 * canvas. Mixing the raw `primary` here put a 1.42:1 aubergine thumb on the
 * `slack-dark` canvas, which is the exact failure the engine's own
 * `primary → accent → foreground` chain exists to avoid; supplying an explicit
 * colour overrode that chain.
 */
export const themeScrollbarColor = {
  thumbColor: "color-mix(in srgb, var(--docs-accent) 70%, transparent)",
  trackColor: "color-mix(in srgb, var(--docs-accent) 30%, transparent)",
  activeThumbColor: "var(--docs-accent)",
  thumbHoverColor: "var(--docs-accent)",
};

/**
 * The full theme set the site ships: built-in neutral/preset/brand/
 * accessibility themes plus the docs-site themvora, lab, and scope families.
 */
export const themes = [
  ...getBuiltInThemes(),
  ...themvora,
  ...labThemes,
  ...scopeThemes,
];

/**
 * The `--docs-accent` rules for every shipped theme whose `primary` is too dark
 * (or too pale) to read as a mark against its own canvas.
 *
 * Rendered as a stylesheet in the root layout. `slack-dark` is the theme this
 * exists for — its anchored aubergine is 1.42:1 on its canvas, which made the
 * logo mark, the TOC rail, the active sidebar link, the code-block syntax roles
 * and the scrollbar effectively invisible — but the rule is written against the
 * measurement, not the theme, so any future preset that anchors a low-contrast
 * fill is covered without a second edit. See `lib/chrome-accent.ts`.
 */
export const chromeAccentCss = buildChromeAccentCss(themes);

const scrollThumbIcons = scrollThumbIcon({ size: 24 });

/** ThemeScrollbar options **/
export const scrollbarConfig = {
  behavior: { autoHide: true },
  /**
   * Excluding the rail is the only place this can be done. The overlay is a
   * `position: fixed` node appended to `<body>` — not a pseudo-element of the
   * scrollport — so no amount of CSS on the rail itself can suppress it.
   *
   * Code panes are deliberately **not** excluded. Excluding them silenced the
   * overlay and left nothing in its place — the pre-paint CSS keeps the native
   * scrollbar invisible (it reserves a transparent 15px gutter so the overlay
   * never reflows the page), so a code block that overflowed horizontally
   * scrolled with no visible bar at all. The rails are wanted there; what was
   * wrong was *when* they appeared, which is fixed in the engine (a nested rail
   * now needs the pointer or its own scrolling, not merely being on screen).
   */
  scope: { exclude: ["[data-toc-rail]", "[data-doc-nav]"] },
  icons: {
    up: scrollThumbIcons.arrowUpIcon,
    down: scrollThumbIcons.arrowDownIcon,
  },
  appearance: {
    ...themeScrollbarColor,
    thickness: 8.5,
    offset: 2,
    animationDuration: 130,
  },
};

export const scheduleConfig = {
  autoDetectLocation: true,
  enabled: false,
} as const;

export const transitionConfig = {
  enabled: true,
  preset: "smooth",
  duration: 180,
  useViewTransition: true,
} as const;
