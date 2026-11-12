import { theme as antdTheme, type ThemeConfig } from "antd";
import {
  mixColors,
  resolveAdapterSource,
  type AdapterResolvedTheme,
  type AdapterSource,
  readColor,
  readFontFamily,
  readFontSize,
  readRadiusNumber,
} from "@themvora/adapters";

function fontSizeToNumber(value: string): number {
  const trimmed = value.trim();
  const px = /^([\d.]+)px$/.exec(trimmed);
  if (px) return Number(px[1]);
  const rem = /^([\d.]+)rem$/.exec(trimmed);
  if (rem) return Math.round(Number(rem[1]) * 16);
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : 14;
}

/**
 * Maps Themvora semantic tokens onto an Ant Design theme config.
 *
 * ```ts
 * import { createAntdTheme } from "@themvora/antd";
 * const antdTheme = createAntdTheme(runtime);
 * ```
 */
export function createAntdTheme(source: AdapterSource): ThemeConfig {
  const theme = resolveAdapterSource(source);
  return buildAntdConfig(theme);
}

/**
 * Builds an Ant Design `ThemeConfig` from a resolved Themvora theme.
 *
 * ## What this maps, and why
 *
 * Ant Design's design tokens are *derived*: it runs an algorithm over a handful
 * of seeds (`colorPrimary`, `colorBgBase`, `colorTextBase`, …) and computes every
 * alias from them. Two consequences shape this adapter:
 *
 * - The algorithm itself is mode-specific. `defaultAlgorithm` computes a light
 *   palette; `darkAlgorithm` computes a dark one. Running the light algorithm
 *   over a dark Themvora theme is what made dark integrations look washed out —
 *   every derived surface was still the light one. The algorithm is therefore
 *   selected from the resolved theme's mode, not fixed.
 * - Semantic roles must be seeded from the *matching* Themvora token. Ant
 *   Design's `colorWarning` was being seeded from `accent` and `colorSuccess`
 *   from `muted`, so warning and success rendered in unrelated colours.
 *
 * The neutral roles are seeded from Themvora's own neutrals — `background` for
 * the page, `card` for containers, `popover` for elevated surfaces, `muted` for
 * hover/selected fills, `mutedForeground` for secondary text — so cards, inputs
 * and overlays stay visually distinct instead of collapsing onto one surface.
 *
 * @param theme The resolved theme to map from.
 * @returns An Ant Design `ThemeConfig` object.
 *
 * @see {@link AntdThemeProvider}
 */
export function buildAntdConfig(theme: AdapterResolvedTheme): ThemeConfig {
  const c = (key: string, fallback?: string) => readColor(theme, key, fallback);
  const isDark = theme.mode === "dark";

  // Surfaces. Ant Design distinguishes the page (`colorBgLayout`), the container
  // components paint themselves with (`colorBgContainer`) and floating surfaces
  // (`colorBgElevated`). Themvora names the same three roles.
  const page = c("background", isDark ? "#141414" : "#ffffff") ?? (isDark ? "#141414" : "#ffffff");
  const surface = c("card", page) ?? page;
  const elevated = c("popover", surface) ?? surface;

  const foreground =
    c("foreground", isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.88)") ??
    (isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.88)");
  const mutedForeground = c("mutedForeground", foreground) ?? foreground;

  const primary = c("primary", "#1677ff") ?? "#1677ff";
  const border = c("border", isDark ? "#424242" : "#d9d9d9") ?? (isDark ? "#424242" : "#d9d9d9");
  const inputBackground = c("input", surface) ?? surface;
  const ring = c("ring", primary) ?? primary;

  // Semantic roles, each seeded from the token that carries the same meaning.
  const success = c("success", "#52c41a") ?? "#52c41a";
  const warning = c("warning", "#faad14") ?? "#faad14";
  const destructive = c("destructive", "#ff4d4f") ?? "#ff4d4f";
  const info = c("accent", primary) ?? primary;

  // Neutral fills are Ant Design's hover/pressed backgrounds. Themvora's `muted`
  // is the neutral surface role, so the fills derive from it rather than from a
  // brand colour.
  const muted = c("muted", isDark ? "#262626" : "#f5f5f5") ?? (isDark ? "#262626" : "#f5f5f5");

  const radius = readRadiusNumber(theme, "lg", 8);

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: primary,
      colorInfo: info,
      colorSuccess: success,
      colorWarning: warning,
      colorError: destructive,
      colorLink: primary,

      colorTextBase: foreground,
      colorText: foreground,
      colorTextSecondary: mutedForeground,
      colorTextTertiary: mutedForeground,
      colorTextQuaternary: mutedForeground,

      colorBgBase: page,
      colorBgLayout: page,
      colorBgContainer: surface,
      colorBgElevated: elevated,
      colorBgSpotlight: elevated,
      colorBgMask: isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(0, 0, 0, 0.45)",

      colorBorder: border,
      colorBorderSecondary: border,
      colorSplit: border,

      // Interactive neutral fills, used by menus, tables, selectors and hovers.
      colorFill: muted,
      colorFillSecondary: muted,
      colorFillTertiary: muted,
      colorFillQuaternary: muted,
      controlItemBgHover: muted,
      controlItemBgActive: mixColors(primary, surface, 0.88),

      // Primary interaction states, derived from the theme's own primary rather
      // than from an algorithm seed that can drift away from it.
      colorPrimaryBg: mixColors(primary, surface, 0.88),
      colorPrimaryBgHover: mixColors(primary, surface, 0.8),
      colorPrimaryBorder: mixColors(primary, surface, 0.55),
      colorPrimaryHover: mixColors(primary, isDark ? "#ffffff" : "#000000", 0.15),
      colorPrimaryActive: mixColors(primary, isDark ? "#ffffff" : "#000000", 0.25),
      colorPrimaryText: primary,

      // Focus ring. Ant Design paints it as `controlOutline` around inputs and
      // selects; leaving it unset makes it a light tint of the seed rather than
      // the theme's ring token.
      controlOutline: mixColors(ring, surface, 0.55),
      controlOutlineWidth: 2,

      borderRadius: radius,
      borderRadiusLG: Math.round(radius * 1.25),
      borderRadiusSM: Math.round(radius * 0.75),
      fontFamily: readFontFamily(theme.tokens),
      fontSize: fontSizeToNumber(readFontSize(theme.tokens, "md", "0.875rem")),
    },
    components: {
      Button: {
        // The default variant paints itself from `colorBgContainer` and is
        // outlined with `colorBorder`. Naming them explicitly keeps the outline
        // on the theme's border token instead of an algorithm-derived white.
        defaultBg: surface,
        defaultColor: foreground,
        defaultBorderColor: border,
        defaultHoverBg: muted,
        defaultHoverColor: foreground,
        defaultHoverBorderColor: primary,
        defaultActiveBg: muted,
        defaultActiveColor: foreground,
        defaultActiveBorderColor: primary,
        // `primaryColor`/`dangerColor` — the keys this adapter used to set — are
        // not Ant Design component tokens; the filled variants read
        // `colorTextLightSolid`, which is why the old keys changed nothing.
        primaryShadow: "none",
        defaultShadow: "none",
        dangerShadow: "none",
      },
      Input: {
        activeBorderColor: primary,
        hoverBorderColor: mixColors(primary, border, 0.5),
        activeShadow: `0 0 0 2px ${mixColors(ring, surface, 0.72)}`,
        errorActiveShadow: `0 0 0 2px ${mixColors(destructive, surface, 0.72)}`,
        warningActiveShadow: `0 0 0 2px ${mixColors(warning, surface, 0.72)}`,
      },
      Select: {
        // The dropdown option states. `optionSelectedBg` is the only surface Ant
        // Design paints behind a chosen option; without it the option falls back
        // to the algorithm's tint, which is what read as washed out in dark mode.
        optionSelectedBg: mixColors(primary, elevated, 0.82),
        optionSelectedFontWeight: 600,
        optionActiveBg: muted,
        selectorBg: inputBackground,
        optionHeight: 32,
      },
      Table: {
        headerBg: muted,
        headerColor: mutedForeground,
        headerSplitColor: border,
        borderColor: border,
        rowHoverBg: muted,
        headerSortActiveBg: muted,
        headerSortHoverBg: muted,
        bodySortBg: surface,
        footerBg: surface,
      },
      Menu: {
        itemBg: surface,
        itemColor: foreground,
        itemHoverBg: muted,
        itemHoverColor: foreground,
        itemSelectedBg: mixColors(primary, surface, 0.88),
        itemSelectedColor: primary,
        subMenuItemBg: surface,
      },
      Card: {
        colorBorderSecondary: border,
        headerBg: "transparent",
      },
      Layout: {
        bodyBg: page,
        headerBg: surface,
        siderBg: surface,
        footerBg: surface,
        triggerBg: muted,
      },
      Modal: {
        contentBg: elevated,
        headerBg: elevated,
      },
      Dropdown: {
        controlItemBgHover: muted,
      },
      Tabs: {
        itemColor: mutedForeground,
        itemSelectedColor: primary,
        itemHoverColor: foreground,
        inkBarColor: primary,
      },
      Progress: {
        defaultColor: primary,
        remainingColor: muted,
      },
      Tag: {
        defaultBg: muted,
        defaultColor: foreground,
      },
      Tooltip: {
        colorBgSpotlight: elevated,
        colorTextLightSolid: foreground,
      },
    },
  };
}
