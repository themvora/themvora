import {
  defineTheme,
  getBuiltInThemes,
} from "@themvora/core";

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

        primary: "#5b54e8",
        primaryForeground: "#ffffff",

        secondary: "#eef0fb",
        secondaryForeground: "#171a2e",

        muted: "#f2f3fb",
        mutedForeground: "#5a6172",

        accent: "#e8e6ff",
        accentForeground: "#4f46c9",

        destructive: "#ef4444",
        destructiveForeground: "#ffffff",

        success: "#16a34a",
        successForeground: "#ffffff",

        border: "#e4e6f2",
        input: "#e4e6f2",

        ring: "#5b54e8",
      },
      radius: {
        lg: "12px",
      },
      code: {
        background: "#f6f7fc",
        foreground: "#0f172a",
        comment: "#6b7280",
        keyword: "#7c3aed",
        string: "#07865c",
        number: "#d97706",
        function: "#2563eb",
        variable: "#0f172a",
        type: "#db2777",
        property: "#0284c7",
        operator: "#7c3aed",
        punctuation: "#475569",
        tag: "#be185d",
        attribute: "#0284c7",
        lineNumber: "#9ca3af",
        selection: "rgba(91, 84, 232, 0.12)",
        highlight: "rgba(91, 84, 232, 0.06)",
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

        primary: "#7c6ff0",
        primaryForeground: "#0b0d1a",

        secondary: "#1a1c2e",
        secondaryForeground: "#eceeff",

        muted: "#16182a",
        mutedForeground: "#9094aa",

        accent: "#22244a",
        accentForeground: "#c9c5ff",

        destructive: "#f87171",
        destructiveForeground: "#0b0d1a",

        success: "#4ade80",
        successForeground: "#0b0d1a",

        border: "#262938",
        input: "#262938",

        ring: "#7c6ff0",
      },
      radius: {
        lg: "12px",
      },
      code: {
        background: "#111322",
        foreground: "#eceeff",
        comment: "#7b8494",
        keyword: "#a78bfa",
        string: "#34d399",
        number: "#fbbf24",
        function: "#60a5fa",
        variable: "#eceeff",
        type: "#f472b6",
        property: "#7dd3fc",
        operator: "#a78bfa",
        punctuation: "#94a3b8",
        tag: "#f472b6",
        attribute: "#7dd3fc",
        lineNumber: "#596079",
        selection: "rgba(124, 111, 240, 0.22)",
        highlight: "rgba(124, 111, 240, 0.08)",
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

export const themeScrollbarColor = {
  thumbColor: "color-mix(in srgb, var(--theme-color-primary) 70%, transparent)",
  trackColor: "color-mix(in srgb, var(--theme-color-primary) 30%, transparent)",
  activeThumbColor:
    "color-mix(in srgb, var(--theme-color-primary) 100%, transparent)",
  thumbHoverColor:
    "color-mix(in srgb, var(--theme-color-primary) 100%, transparent)",
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

const scrollThumbIcons = scrollThumbIcon({ size: 24 });

/** ThemeScrollbar options **/
export const scrollbarConfig = {
  behavior: { autoHide: true },
  /**
   * Excluding the rail is the only place this can be done. The overlay is a
   * `position: fixed` node appended to `<body>` — not a pseudo-element of the
   * scrollport — so no amount of CSS on the rail itself can suppress it.
   */
  scope: { exclude: ["[data-toc-rail]"] },
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
