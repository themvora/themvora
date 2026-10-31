"use strict";
var ThemvoraWeb = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/cdn.ts
  var cdn_exports = {};
  __export(cdn_exports, {
    COMPONENT_CSS: () => COMPONENT_CSS,
    COMPONENT_STYLE_ID: () => COMPONENT_STYLE_ID,
    PRE_PAINT_SCROLLBAR_CSS: () => PRE_PAINT_SCROLLBAR_CSS,
    THEMES_CHANGE_EVENT: () => THEMES_CHANGE_EVENT,
    THEME_READY_EVENT: () => THEME_READY_EVENT,
    ThemvoraInspector: () => ThemvoraInspector,
    ThemvoraProvider: () => ThemvoraProvider,
    ThemvoraRuntimeConsumer: () => ThemvoraRuntimeConsumer,
    ThemvoraScope: () => ThemvoraScope,
    ThemvoraScrollbar: () => ThemvoraScrollbar,
    ThemvoraSelect: () => ThemvoraSelect,
    ThemvoraToggle: () => ThemvoraToggle,
    defineCustomElements: () => defineCustomElements,
    getProviderRuntime: () => getProviderRuntime,
    getThemeSchedule: () => getThemeSchedule,
    injectComponentStyles: () => injectComponentStyles,
    injectPrePaintScrollbarCSS: () => injectPrePaintScrollbarCSS,
    observeEffectiveThemeMode: () => observeEffectiveThemeMode,
    resolveGeneratedTheme: () => resolveGeneratedTheme,
    useEffectiveThemeMode: () => useEffectiveThemeMode,
    useGeneratedTheme: () => useGeneratedTheme,
    useProvidedThemes: () => useProvidedThemes,
    useThemeFamily: () => useThemeFamily,
    useThemeMode: () => useThemeMode,
    useThemeRuntime: () => useThemeRuntime,
    useThemeTokens: () => useThemeTokens,
    useThemeValue: () => useThemeValue
  });

  // ../core/dist/index.js
  var SEMANTIC_ROLE_GROUPS = [
    {
      id: "canvas",
      label: "Canvas",
      roles: ["background", "foreground", "muted", "mutedForeground"],
      description: "The page itself: its surface and the text on it."
    },
    {
      id: "surfaces",
      label: "Surfaces",
      roles: ["card", "cardForeground", "popover", "popoverForeground"],
      description: "Elevated or floating regions that sit above the canvas."
    },
    {
      id: "actions",
      label: "Actions",
      roles: [
        "primary",
        "primaryForeground",
        "secondary",
        "secondaryForeground",
        "accent",
        "accentForeground",
        "destructive",
        "destructiveForeground"
      ],
      description: "Interactive roles, each paired with its own contrast colour."
    },
    {
      id: "states",
      label: "States",
      roles: ["success", "successForeground"],
      optional: ["warning", "warningForeground", "info", "infoForeground", "error", "errorForeground"],
      description: "Outcome roles. `success` is core; `warning` / `info` / `error` are capabilities a theme may declare and an adapter may consume."
    },
    {
      id: "interaction",
      label: "Interaction",
      roles: ["border", "input", "ring"],
      description: "Structural and focus affordances."
    }
  ];
  var CORE_COLORS = SEMANTIC_ROLE_GROUPS.flatMap(
    (group) => group.roles
  );
  var OPTIONAL_SEMANTICS = SEMANTIC_ROLE_GROUPS.flatMap(
    (group) => group.optional ?? []
  );
  function getThemeFamily(theme) {
    return theme.meta?.family ?? "default";
  }
  function getThemeFamilies(themes) {
    const families = [];
    for (const theme of themes) {
      const family = getThemeFamily(theme);
      if (!families.includes(family)) families.push(family);
    }
    return families;
  }
  function normalizeThemeFamily(themes, requested, fallbackTheme) {
    if (requested && getThemeFamilies(themes).includes(requested)) {
      return requested;
    }
    const fallback = fallbackTheme ?? themes[0];
    return fallback ? getThemeFamily(fallback) : requested || "default";
  }
  function getThemeMode(theme) {
    const mode = theme.meta?.mode;
    if (mode === "light" || mode === "dark" || mode === "system") return mode;
    return /dark/i.test(theme.name) ? "dark" : "light";
  }
  function resolveSelectedTheme(themes, selection) {
    const exact = themes.find(
      (theme) => getThemeFamily(theme) === selection.family && getThemeMode(theme) === selection.mode
    );
    if (exact) {
      return exact;
    }
    const familyFallback = themes.find(
      (theme) => getThemeFamily(theme) === selection.family
    );
    if (familyFallback) {
      return familyFallback;
    }
    const modeFallback = themes.find(
      (theme) => getThemeMode(theme) === selection.mode
    );
    return modeFallback ?? themes[0];
  }
  var DOLLAR_REF = /(?:\$([\w.]+))/;
  var GLOBAL_DOLLAR_REF = /(?:\$([\w.]+))/g;
  var BRACE_REF = /(?:\{([\w.]+)\})/;
  var GLOBAL_BRACE_REF = /(?:\{([\w.]+)\})/g;
  function flattenTokens(tokens) {
    const flat = {};
    function addEntries2(obj, basePath) {
      if (!obj) return;
      for (const [key, value] of Object.entries(obj)) {
        const path = basePath ? `${basePath}.${key}` : key;
        if (typeof value === "object" && value !== null) {
          addEntries2(value, path);
        } else if (typeof value === "string") {
          flat[path] = value;
        }
      }
    }
    if (tokens.colors) addEntries2(tokens.colors, "colors");
    if (tokens.spacing) addEntries2(tokens.spacing, "spacing");
    if (tokens.radius) addEntries2(tokens.radius, "radius");
    if (tokens.shadows) addEntries2(tokens.shadows, "shadows");
    if (tokens.borderWidths) addEntries2(tokens.borderWidths, "borderWidths");
    if (tokens.zIndex) addEntries2(tokens.zIndex, "zIndex");
    if (tokens.breakpoints) addEntries2(tokens.breakpoints, "breakpoints");
    if (tokens.typography) {
      if (tokens.typography.fontFamilies) addEntries2(tokens.typography.fontFamilies, "typography.fontFamilies");
      if (tokens.typography.fontSizes) addEntries2(tokens.typography.fontSizes, "typography.fontSizes");
      if (tokens.typography.lineHeights) addEntries2(tokens.typography.lineHeights, "typography.lineHeights");
    }
    if (tokens.code) addEntries2(tokens.code, "code");
    return flat;
  }
  function resolvePathInFlat(path, flat, visited) {
    if (visited.has(path)) {
      throw new Error(`Circular token reference detected: "${path}"`);
    }
    const value = flat[path];
    if (value === void 0) {
      throw new Error(`Token "${path}" not found`);
    }
    visited.add(path);
    const result = resolveStringValue(value, flat, visited);
    visited.delete(path);
    return result;
  }
  function resolveStringValue(str, flat, visited) {
    let result = str;
    if (GLOBAL_DOLLAR_REF.test(result)) {
      GLOBAL_DOLLAR_REF.lastIndex = 0;
      result = result.replace(GLOBAL_DOLLAR_REF, (_match, path) => {
        return resolvePathInFlat(path, flat, visited);
      });
    }
    if (GLOBAL_BRACE_REF.test(result)) {
      GLOBAL_BRACE_REF.lastIndex = 0;
      result = result.replace(GLOBAL_BRACE_REF, (_match, path) => {
        return resolvePathInFlat(path, flat, visited);
      });
    }
    return result;
  }
  function hasTokenReferences(value) {
    return DOLLAR_REF.test(value) || BRACE_REF.test(value);
  }
  function resolveValueReferences(value, flat) {
    return resolveStringValue(value, flat, /* @__PURE__ */ new Set());
  }
  var EXPRESSION_PATTERN = /[+\-*/]/;
  function isExpression(value) {
    if (!EXPRESSION_PATTERN.test(value)) return false;
    if (/^(contrast|auto)\s*\(/.test(value)) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const stripped = trimmed.replace(/[a-z%]+$/i, "").trim();
    if (!stripped) return false;
    return /^[\d\s+\-*/().]+$/.test(stripped);
  }
  function tokenize(input) {
    const tokens = [];
    let i = 0;
    while (i < input.length) {
      const ch = input[i];
      if (ch === " ") {
        i++;
        continue;
      }
      if (ch === "(" || ch === ")") {
        tokens.push({ type: "paren", value: ch });
        i++;
        continue;
      }
      if ("+-*/".includes(ch)) {
        tokens.push({ type: "op", value: ch });
        i++;
        continue;
      }
      if (/\d/.test(ch) || ch === "." && i + 1 < input.length && /\d/.test(input[i + 1])) {
        let num = "";
        while (i < input.length && /[\d.eE]/.test(input[i])) {
          num += input[i];
          i++;
        }
        tokens.push({ type: "number", value: parseFloat(num) });
        continue;
      }
      throw new Error(`Unexpected character in expression: "${ch}"`);
    }
    return tokens;
  }
  function parseExpression(tokens) {
    let result = parseTerm(tokens);
    while (tokens.length > 0 && tokens[0].type === "op" && (tokens[0].value === "+" || tokens[0].value === "-")) {
      const op = tokens.shift().value;
      const right = parseTerm(tokens);
      result = op === "+" ? result + right : result - right;
    }
    return result;
  }
  function parseTerm(tokens) {
    let result = parseFactor(tokens);
    while (tokens.length > 0 && tokens[0].type === "op" && (tokens[0].value === "*" || tokens[0].value === "/")) {
      const op = tokens.shift().value;
      const right = parseFactor(tokens);
      result = op === "*" ? result * right : result / right;
    }
    return result;
  }
  function parseFactor(tokens) {
    if (tokens.length === 0) throw new Error("Unexpected end of expression");
    const token = tokens.shift();
    if (token.type === "number") return token.value;
    if (token.type === "paren" && token.value === "(") {
      const result = parseExpression(tokens);
      if (tokens.length === 0 || tokens[0].type !== "paren" || tokens[0].value !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      tokens.shift();
      return result;
    }
    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
  function extractUnit(expr) {
    const match = expr.match(/^([\d\s+\-*/().]+)([a-z%]+)$/i);
    if (match) {
      const beforeUnit = match[1].trim();
      if (/[\d)]$/.test(beforeUnit)) {
        return { numericPart: beforeUnit, unit: match[2] };
      }
    }
    return { numericPart: expr, unit: "" };
  }
  function evaluateExpression(expr) {
    try {
      const trimmed = expr.trim();
      const { numericPart, unit } = extractUnit(trimmed);
      if (!numericPart) return expr;
      const tokens = tokenize(numericPart);
      if (tokens.length === 0) return expr;
      const result = parseExpression(tokens);
      if (tokens.length > 0) {
        return expr;
      }
      if (!isFinite(result)) {
        return expr;
      }
      return Number.isInteger(result) ? String(result) + unit : result.toFixed(2) + unit;
    } catch {
      return expr;
    }
  }
  function getLuminance(hex) {
    const clean = hex.replace(/^#/, "");
    if (clean.length < 6) return 0;
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
  function isHexColor(value) {
    return /^#[\da-fA-F]{6,8}$/.test(value);
  }
  function contrast(background) {
    const color = isHexColor(background) ? background : `#${background}`;
    if (!isHexColor(color)) return "#000000";
    const luminance2 = getLuminance(color);
    return luminance2 > 0.179 ? "#000000" : "#ffffff";
  }
  function auto(tokenName, lookup) {
    const match = tokenName.match(/^(.+?)(?:Foreground|foreground)$/);
    if (match) {
      const base = match[1];
      const candidates = [
        `colors.${base}`,
        base,
        `${base}.default`,
        `colors.${base}.default`,
        `colors.${base}.DEFAULT`,
        base.toLowerCase()
      ];
      for (const candidate of candidates) {
        const value = lookup(candidate);
        if (value && isHexColor(value)) {
          return contrast(value);
        }
      }
    }
    const broaderMatch = tokenName.match(/^(.+?)Fg$/);
    if (broaderMatch) {
      const base = broaderMatch[1];
      const value = lookup(`colors.${base}`) || lookup(base);
      if (value && isHexColor(value)) {
        return contrast(value);
      }
    }
    return "#000000";
  }
  function parseContrastCall(value) {
    const match = value.match(/^contrast\s*\(\s*([^)]+)\s*\)$/);
    return match && match[1] ? match[1].trim() : null;
  }
  function isAutoCall(value) {
    return /^auto\s*\(\s*\)$/.test(value);
  }
  function resolveNestedColorValue(value, path, flat, resolvedFlat) {
    let current = value;
    if (isAutoCall(current)) {
      current = auto(path, (p) => flat[p] ?? resolvedFlat[p]);
      resolvedFlat[path] = current;
      return current;
    }
    const contrastRef = parseContrastCall(current);
    if (contrastRef) {
      const bg = resolvedFlat[contrastRef] ?? resolvedFlat[`colors.${contrastRef}`] ?? resolvedFlat[`${contrastRef}.default`] ?? resolvedFlat[`colors.${contrastRef}.default`] ?? flat[contrastRef] ?? flat[`colors.${contrastRef}`] ?? flat[`${contrastRef}.default`] ?? flat[`colors.${contrastRef}.default`] ?? contrastRef;
      current = contrast(bg);
      resolvedFlat[path] = current;
      return current;
    }
    if (hasTokenReferences(current)) {
      current = resolveValueReferences(current, { ...flat, ...resolvedFlat });
    }
    if (isExpression(current)) {
      current = evaluateExpression(current);
    }
    resolvedFlat[path] = current;
    return current;
  }
  function walkAndResolveColors(obj, basePath, flat, resolvedFlat) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const path = basePath ? `${basePath}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        result[key] = walkAndResolveColors(value, path, flat, resolvedFlat);
      } else if (typeof value === "string") {
        result[key] = resolveNestedColorValue(value, path, flat, resolvedFlat);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  function walkAndResolveFlatMap(obj, category, flat, resolvedFlat) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const path = `${category}.${key}`;
      let current = value;
      if (isAutoCall(current)) {
        current = auto(path, (p) => flat[p] ?? resolvedFlat[p]);
      } else {
        const contrastRef = parseContrastCall(current);
        if (contrastRef) {
          const bg = resolvedFlat[contrastRef] ?? flat[contrastRef] ?? contrastRef;
          current = contrast(bg);
        } else {
          if (hasTokenReferences(current)) {
            current = resolveValueReferences(current, { ...flat, ...resolvedFlat });
          }
          if (isExpression(current)) {
            current = evaluateExpression(current);
          }
        }
      }
      resolvedFlat[path] = current;
      result[key] = current;
    }
    return result;
  }
  function resolveTokens(tokens) {
    if (!tokens) return tokens;
    const flat = flattenTokens(tokens);
    const resolvedFlat = {};
    const resolved = {};
    if (tokens.colors) {
      resolved.colors = walkAndResolveColors(tokens.colors, "", flat, resolvedFlat);
    }
    if (tokens.spacing) {
      resolved.spacing = walkAndResolveFlatMap(tokens.spacing, "spacing", flat, resolvedFlat);
    }
    if (tokens.radius) {
      resolved.radius = walkAndResolveFlatMap(tokens.radius, "radius", flat, resolvedFlat);
    }
    if (tokens.shadows) {
      resolved.shadows = walkAndResolveFlatMap(tokens.shadows, "shadows", flat, resolvedFlat);
    }
    if (tokens.borderWidths) {
      resolved.borderWidths = walkAndResolveFlatMap(tokens.borderWidths, "borderWidths", flat, resolvedFlat);
    }
    if (tokens.zIndex) {
      resolved.zIndex = walkAndResolveFlatMap(tokens.zIndex, "zIndex", flat, resolvedFlat);
    }
    if (tokens.breakpoints) {
      resolved.breakpoints = walkAndResolveFlatMap(tokens.breakpoints, "breakpoints", flat, resolvedFlat);
    }
    if (tokens.typography) {
      const typography = {};
      if (tokens.typography.fontFamilies) {
        typography.fontFamilies = walkAndResolveFlatMap(
          tokens.typography.fontFamilies,
          "typography.fontFamilies",
          flat,
          resolvedFlat
        );
      }
      if (tokens.typography.fontSizes) {
        typography.fontSizes = walkAndResolveFlatMap(
          tokens.typography.fontSizes,
          "typography.fontSizes",
          flat,
          resolvedFlat
        );
      }
      if (tokens.typography.lineHeights) {
        typography.lineHeights = walkAndResolveFlatMap(
          tokens.typography.lineHeights,
          "typography.lineHeights",
          flat,
          resolvedFlat
        );
      }
      if (Object.keys(typography).length > 0) {
        resolved.typography = typography;
      }
    }
    if (tokens.code) {
      resolved.code = walkAndResolveFlatMap(
        tokens.code,
        "code",
        flat,
        resolvedFlat
      );
    }
    return Object.keys(resolved).length > 0 ? resolved : tokens;
  }
  function mergeObjects(base, override) {
    if (!base && !override) {
      return void 0;
    }
    return {
      ...base ?? {},
      ...override ?? {}
    };
  }
  function mergeThemeColors(base, override) {
    const colors = {};
    const allKeys = /* @__PURE__ */ new Set([
      ...Object.keys(base ?? {}),
      ...Object.keys(override ?? {})
    ]);
    for (const key of allKeys) {
      const baseVal = base?.[key];
      const overVal = override?.[key];
      if (overVal !== void 0) {
        if (typeof overVal === "object" && overVal !== null) {
          if (typeof baseVal === "object" && baseVal !== null) {
            const merged = mergeThemeColors(baseVal, overVal);
            if (merged !== void 0) {
              colors[key] = merged;
            }
          } else {
            colors[key] = overVal;
          }
        } else if (typeof overVal === "string") {
          colors[key] = overVal;
        }
      } else if (baseVal !== void 0) {
        colors[key] = baseVal;
      }
    }
    return Object.keys(colors).length > 0 ? colors : void 0;
  }
  function mergeTokens(base, override) {
    if (!base && !override) {
      return void 0;
    }
    const tokens = {};
    const colors = mergeThemeColors(base?.colors, override?.colors);
    if (colors) {
      tokens.colors = colors;
    }
    const spacing = mergeObjects(base?.spacing, override?.spacing);
    if (spacing) {
      tokens.spacing = spacing;
    }
    const radius = mergeObjects(base?.radius, override?.radius);
    if (radius) {
      tokens.radius = radius;
    }
    const shadows = mergeObjects(base?.shadows, override?.shadows);
    if (shadows) {
      tokens.shadows = shadows;
    }
    const borderWidths = mergeObjects(base?.borderWidths, override?.borderWidths);
    if (borderWidths) {
      tokens.borderWidths = borderWidths;
    }
    const zIndex = mergeObjects(base?.zIndex, override?.zIndex);
    if (zIndex) {
      tokens.zIndex = zIndex;
    }
    const breakpoints = mergeObjects(base?.breakpoints, override?.breakpoints);
    if (breakpoints) {
      tokens.breakpoints = breakpoints;
    }
    const typography = mergeObjects(base?.typography, override?.typography);
    if (typography) {
      tokens.typography = typography;
    }
    const code = mergeObjects(base?.code, override?.code);
    if (code) {
      tokens.code = code;
    }
    return Object.keys(tokens).length > 0 ? tokens : void 0;
  }
  function mergeThemeDefinitions(base, override) {
    const result = {
      ...base,
      ...override
    };
    const meta = mergeObjects(base.meta, override.meta);
    if (meta) {
      result.meta = meta;
    }
    const tokens = mergeTokens(base.tokens, override.tokens);
    if (tokens) {
      result.tokens = tokens;
    }
    return result;
  }
  function resolveThemeRecursive(themes, themeName, visited) {
    if (visited.has(themeName)) {
      throw new Error(
        `Circular theme inheritance detected while resolving "${String(themeName)}".`
      );
    }
    visited.add(themeName);
    const theme = themes.find((item) => item.name === themeName);
    if (!theme) {
      throw new Error(`Theme "${String(themeName)}" is not registered.`);
    }
    const parents = Array.isArray(theme.extends) ? theme.extends : theme.extends ? [theme.extends] : [];
    if (parents.length === 0) {
      visited.delete(themeName);
      return theme;
    }
    const [firstParent, ...remainingParents] = parents;
    let resolvedParents = resolveThemeRecursive(
      themes,
      firstParent,
      new Set(visited)
    );
    for (const parentName of remainingParents) {
      resolvedParents = mergeThemeDefinitions(
        resolvedParents,
        resolveThemeRecursive(themes, parentName, new Set(visited))
      );
    }
    visited.delete(themeName);
    return mergeThemeDefinitions(resolvedParents, theme);
  }
  function resolveTheme(themes, themeName, resolveTokenRefs = true) {
    const theme = resolveThemeRecursive(themes, themeName, /* @__PURE__ */ new Set());
    if (resolveTokenRefs && theme.tokens) {
      return { ...theme, tokens: resolveTokens(theme.tokens) };
    }
    return theme;
  }
  function defineTheme(theme) {
    return theme;
  }
  var ColorError = class extends Error {
    /** The offending input, preserved verbatim for the diagnostic context. */
    input;
    constructor(message, input) {
      super(message);
      this.name = "ColorError";
      this.input = input;
    }
  };
  var CHROMA_EPSILON = 1e-4;
  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }
  function normalizeHue(degrees) {
    const wrapped = degrees % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }
  function srgbToLinear(channel) {
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  }
  function linearToSrgb(channel) {
    return channel <= 31308e-7 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  }
  function rgbToLinearRgb(rgb) {
    return [srgbToLinear(rgb.r / 255), srgbToLinear(rgb.g / 255), srgbToLinear(rgb.b / 255)];
  }
  function linearRgbToRgb(linear) {
    return {
      r: linearToSrgb(linear[0]) * 255,
      g: linearToSrgb(linear[1]) * 255,
      b: linearToSrgb(linear[2]) * 255
    };
  }
  function linearRgbToOklab(linear) {
    const [r, g, b] = linear;
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const lRoot = Math.cbrt(l);
    const mRoot = Math.cbrt(m);
    const sRoot = Math.cbrt(s);
    return {
      l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
      a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
      b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
    };
  }
  function oklabToLinearRgb(lab) {
    const { l, a, b } = lab;
    const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
    const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
    const sRoot = l - 0.0894841775 * a - 1.291485548 * b;
    const l3 = lRoot * lRoot * lRoot;
    const m3 = mRoot * mRoot * mRoot;
    const s3 = sRoot * sRoot * sRoot;
    return [
      4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
      -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
      -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
    ];
  }
  function oklabToOklch(lab) {
    const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    if (c < CHROMA_EPSILON) return { l: lab.l, c, h: 0 };
    return { l: lab.l, c, h: normalizeHue(Math.atan2(lab.b, lab.a) * 180 / Math.PI) };
  }
  function oklchToOklab(lch) {
    const radians = lch.h * Math.PI / 180;
    return { l: lch.l, a: lch.c * Math.cos(radians), b: lch.c * Math.sin(radians) };
  }
  function rgbToOklch(rgb) {
    return oklabToOklch(linearRgbToOklab(rgbToLinearRgb(rgb)));
  }
  function oklchToRgb(lch) {
    return linearRgbToRgb(oklabToLinearRgb(oklchToOklab(lch)));
  }
  function rgbToHex(rgb) {
    const toHex = (channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }
  function oklchToHex(lch) {
    return rgbToHex(oklchToRgb(lch));
  }
  function hslToRgb(hsl) {
    const h = normalizeHue(hsl.h);
    const s = clamp(hsl.s, 0, 1);
    const l = clamp(hsl.l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(h / 60 % 2 - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) [r, g] = [c, x];
    else if (h < 120) [r, g] = [x, c];
    else if (h < 180) [g, b] = [c, x];
    else if (h < 240) [g, b] = [x, c];
    else if (h < 300) [r, b] = [x, c];
    else [r, b] = [c, x];
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function isInGamut(rgb, epsilon = 0.5) {
    return rgb.r >= -epsilon && rgb.r <= 255 + epsilon && rgb.g >= -epsilon && rgb.g <= 255 + epsilon && rgb.b >= -epsilon && rgb.b <= 255 + epsilon;
  }
  var HEX_PATTERN = /^#[0-9a-fA-F]+$/;
  var RGB_PATTERN = /^rgba?\(([^)]*)\)$/i;
  var HSL_PATTERN = /^hsla?\(([^)]*)\)$/i;
  function parseColor(input) {
    if (typeof input !== "string") {
      throw new ColorError(`Color must be a string, received ${typeof input}`, String(input));
    }
    const value = input.trim();
    if (value === "") throw new ColorError("Color string is empty", input);
    if (value.startsWith("#")) return parseHex(value, input);
    if (RGB_PATTERN.test(value)) return parseRgbFunction(value, input);
    if (HSL_PATTERN.test(value)) return parseHslFunction(value, input);
    throw new ColorError(`Unsupported color format: "${input}"`, input);
  }
  function parseHex(value, original) {
    if (!HEX_PATTERN.test(value)) {
      throw new ColorError(`Invalid hex color: "${original}"`, original);
    }
    const hex = value.slice(1);
    const expand = (at) => {
      const digit = hex.charAt(at);
      return Number.parseInt(`${digit}${digit}`, 16);
    };
    if (hex.length === 3 || hex.length === 4) {
      return { r: expand(0), g: expand(1), b: expand(2) };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16)
      };
    }
    throw new ColorError(`Invalid hex color length: "${original}"`, original);
  }
  function splitFunctionArgs(body) {
    return body.split(/[\s,/]+/).map((part) => part.trim()).filter((part) => part.length > 0);
  }
  function parseRgbFunction(value, original) {
    const match = value.match(RGB_PATTERN);
    if (!match) throw new ColorError(`Invalid rgb() color: "${original}"`, original);
    const [rPart, gPart, bPart] = splitFunctionArgs(match[1] ?? "");
    if (rPart === void 0 || gPart === void 0 || bPart === void 0) {
      throw new ColorError(`rgb() needs three channels: "${original}"`, original);
    }
    return {
      r: parseRgbChannel(rPart, original),
      g: parseRgbChannel(gPart, original),
      b: parseRgbChannel(bPart, original)
    };
  }
  function parseRgbChannel(part, original) {
    const percent = part.endsWith("%");
    const numeric = Number.parseFloat(percent ? part.slice(0, -1) : part);
    if (!Number.isFinite(numeric)) {
      throw new ColorError(`Invalid rgb() channel "${part}" in "${original}"`, original);
    }
    const value = percent ? numeric / 100 * 255 : numeric;
    return clamp(value, 0, 255);
  }
  function parseHslFunction(value, original) {
    const match = value.match(HSL_PATTERN);
    if (!match) throw new ColorError(`Invalid hsl() color: "${original}"`, original);
    const [hPart, sPart, lPart] = splitFunctionArgs(match[1] ?? "");
    if (hPart === void 0 || sPart === void 0 || lPart === void 0) {
      throw new ColorError(`hsl() needs hue, saturation and lightness: "${original}"`, original);
    }
    const hue = Number.parseFloat(hPart);
    if (!Number.isFinite(hue)) {
      throw new ColorError(`Invalid hsl() hue "${hPart}" in "${original}"`, original);
    }
    return hslToRgb({
      h: hue,
      s: parseUnitInterval(sPart, original),
      l: parseUnitInterval(lPart, original)
    });
  }
  function parseUnitInterval(part, original) {
    const percent = part.endsWith("%");
    const numeric = Number.parseFloat(percent ? part.slice(0, -1) : part);
    if (!Number.isFinite(numeric)) {
      throw new ColorError(`Invalid hsl() component "${part}" in "${original}"`, original);
    }
    return clamp(percent ? numeric / 100 : numeric, 0, 1);
  }
  function relativeLuminance(rgb) {
    const [r, g, b] = rgbToLinearRgb(rgb);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const lighter = la > lb ? la : lb;
    const darker = la > lb ? lb : la;
    return (lighter + 0.05) / (darker + 0.05);
  }
  var GAMUT_SEARCH_STEPS = 24;
  function withLightness(lch, l) {
    return { l: clamp(l, 0, 1), c: lch.c, h: lch.h };
  }
  function gamutMapOklch(lch) {
    const base = {
      l: clamp(lch.l, 0, 1),
      c: Math.max(0, lch.c),
      h: normalizeHue(lch.h)
    };
    if (base.c < CHROMA_EPSILON) return { l: base.l, c: 0, h: base.h };
    if (isInGamut(oklchToRgb(base))) return base;
    let low = 0;
    let high = base.c;
    for (let i = 0; i < GAMUT_SEARCH_STEPS; i += 1) {
      const mid = (low + high) / 2;
      if (isInGamut(oklchToRgb({ l: base.l, c: mid, h: base.h }))) low = mid;
      else high = mid;
    }
    return { l: base.l, c: low, h: base.h };
  }
  function deltaEOk(a, b) {
    const dl = a.l - b.l;
    const da = a.a - b.a;
    const db = a.b - b.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }
  function deltaEOklch(a, b) {
    return deltaEOk(oklchToOklab(a), oklchToOklab(b));
  }
  function hueDistance(a, b) {
    const raw = Math.abs(normalizeHue(a) - normalizeHue(b));
    return raw > 180 ? 360 - raw : raw;
  }
  function hexToOklch(hex) {
    return rgbToOklch(parseColor(hex));
  }
  function hexToOklchMapped(hex) {
    return gamutMapOklch(hexToOklch(hex));
  }
  function oklchToHexMapped(lch) {
    return oklchToHex(gamutMapOklch(lch));
  }
  var DOCS_BASE = "https://themvora-dev.vercel.app/reference/diagnostics";
  function createDiagnostic(input) {
    const diagnostic = {
      code: input.code,
      level: input.level,
      message: input.message,
      docs: `${DOCS_BASE}#${input.code.toLowerCase()}`
    };
    if (input.context !== void 0) diagnostic.context = input.context;
    if (input.hint !== void 0) diagnostic.hint = input.hint;
    if (input.cause !== void 0) diagnostic.cause = input.cause;
    return diagnostic;
  }
  function formatDiagnostic(diagnostic, options = {}) {
    const dev = options.dev ?? isDevelopment();
    let text = `[themvora] ${diagnostic.message} (${diagnostic.code})`;
    if (!dev) return text;
    const parts = [];
    const context = diagnostic.context;
    if (context?.api) parts.push(`api: ${context.api}`);
    if (context?.property) parts.push(`property: ${context.property}`);
    if (context?.path) parts.push(`path: ${context.path}`);
    if (context?.received !== void 0) parts.push(`received: ${safeString(context.received)}`);
    if (context?.expected !== void 0) parts.push(`expected: ${context.expected}`);
    if (parts.length > 0) text += `
  ${parts.join("\n  ")}`;
    if (diagnostic.hint) text += `
  hint: ${diagnostic.hint}`;
    if (diagnostic.docs) text += `
  docs: ${diagnostic.docs}`;
    return text;
  }
  function isDevelopment() {
    const env = typeof process !== "undefined" ? "development" : void 0;
    if (env === "production") return false;
    return true;
  }
  function safeString(value) {
    if (typeof value === "string") return JSON.stringify(value);
    try {
      const json = JSON.stringify(value);
      return json === void 0 ? String(value) : json;
    } catch {
      return String(value);
    }
  }
  var emitted = /* @__PURE__ */ new Set();
  function defaultSink(diagnostic) {
    return (text) => {
      if (diagnostic.level === "error") {
        console.error(text, diagnostic);
        return;
      }
      if (diagnostic.level === "info") {
        console.info(text, diagnostic);
        return;
      }
      console.warn(text, diagnostic);
    };
  }
  function emitDiagnostic(diagnostic, options = {}) {
    const dedupe = options.dedupe ?? true;
    const key = diagnosticKey(diagnostic);
    if (dedupe && emitted.has(key)) return;
    emitted.add(key);
    const text = formatDiagnostic(diagnostic, {
      ...options.dev !== void 0 ? { dev: options.dev } : {}
    });
    (options.sink ?? defaultSink(diagnostic))(text, diagnostic);
  }
  function diagnosticKey(diagnostic) {
    const c = diagnostic.context;
    return [
      diagnostic.code,
      c?.api ?? "",
      c?.property ?? "",
      c?.path ?? "",
      c?.received === void 0 ? "" : safeString(c.received)
    ].join("|");
  }
  function isThemeMode(value) {
    return value === "light" || value === "dark" || value === "system";
  }
  var ThemeError = class _ThemeError extends Error {
    /** Stable diagnostic code, or `undefined` for a plain Themvora failure. */
    code;
    /** Structured context describing the failure, when available. */
    context;
    constructor(message, options = {}) {
      super(message, options.cause !== void 0 ? { cause: options.cause } : void 0);
      this.name = "ThemeError";
      if (options.code !== void 0) this.code = options.code;
      if (options.context !== void 0) this.context = options.context;
    }
    /**
     * Build a `ThemeError` from a diagnostic.
     *
     * The diagnostic's `message` becomes the error message and its `code`,
     * `context` and `cause` are carried across, so a caller that decided a
     * diagnostic is fatal does not have to restate any of it.
     *
     * @param diagnostic - The diagnostic to convert.
     * @returns A `ThemeError` describing the same failure.
     */
    static fromDiagnostic(diagnostic) {
      return new _ThemeError(diagnostic.message, {
        code: diagnostic.code,
        ...diagnostic.context !== void 0 ? { context: diagnostic.context } : {},
        ...diagnostic.cause !== void 0 ? { cause: diagnostic.cause } : {}
      });
    }
  };
  var DEFAULT_CONTRAST_CONTRACT = {
    /** Normal text. */
    text: 4.5,
    /** Large text (≥18.66px bold or ≥24px). */
    largeText: 3,
    /** Non-text UI affordances: interactive boundaries, focus rings, indicators. */
    ui: 3
  };
  var CONTRAST_TARGETS = {
    /** Solve text pairs to at least this ratio. */
    text: 4.75,
    /** Solve UI pairs to at least this ratio. */
    ui: 3.2
  };
  var FOCUS_SURFACES = [
    "background",
    "card",
    "popover",
    "muted",
    "secondary"
  ];
  var SEMANTIC_PAIRS = [
    // -- text -------------------------------------------------------------------
    { foreground: "foreground", background: "background", requirement: "text" },
    { foreground: "cardForeground", background: "card", requirement: "text" },
    { foreground: "popoverForeground", background: "popover", requirement: "text" },
    { foreground: "primaryForeground", background: "primary", requirement: "text" },
    { foreground: "secondaryForeground", background: "secondary", requirement: "text" },
    { foreground: "mutedForeground", background: "muted", requirement: "text" },
    { foreground: "accentForeground", background: "accent", requirement: "text" },
    { foreground: "destructiveForeground", background: "destructive", requirement: "text" },
    { foreground: "successForeground", background: "success", requirement: "text" },
    // -- input: an interactive boundary, on the canvas and inside elevated surfaces
    { foreground: "input", background: "background", requirement: "ui" },
    { foreground: "input", background: "card", requirement: "ui" },
    // -- ring: a focus indicator, against every surface a control can sit on
    ...FOCUS_SURFACES.map(
      (surface) => ({ foreground: "ring", background: surface, requirement: "ui" })
    )
  ];
  function targetFor(requirement) {
    return requirement === "ui" ? CONTRAST_TARGETS.ui : CONTRAST_TARGETS.text;
  }
  function floorFor(requirement) {
    return requirement === "ui" ? DEFAULT_CONTRAST_CONTRACT.ui : DEFAULT_CONTRAST_CONTRACT.text;
  }
  var GROUP_OF = {
    background: "canvas",
    foreground: "canvas",
    muted: "canvas",
    mutedForeground: "canvas",
    card: "surfaces",
    cardForeground: "surfaces",
    popover: "surfaces",
    popoverForeground: "surfaces",
    primary: "actions",
    primaryForeground: "actions",
    secondary: "actions",
    secondaryForeground: "actions",
    accent: "actions",
    accentForeground: "actions",
    destructive: "actions",
    destructiveForeground: "actions",
    success: "states",
    successForeground: "states",
    border: "interaction",
    input: "interaction",
    ring: "interaction"
  };
  var SURFACE_ROLES = new Set(
    SEMANTIC_PAIRS.map((pair) => pair.background)
  );
  function buildRegistry() {
    const registry = {};
    for (const role of CORE_COLORS) {
      registry[role] = {
        role,
        group: GROUP_OF[role],
        isSurface: SURFACE_ROLES.has(role),
        readsOn: []
      };
    }
    for (const pair of SEMANTIC_PAIRS) {
      const spec = registry[pair.foreground];
      registry[pair.foreground] = {
        ...spec,
        readsOn: [...spec.readsOn, pair.background],
        requirement: pair.requirement
      };
    }
    return registry;
  }
  var ROLE_SPECS = buildRegistry();
  var ROLE_REGISTRY = CORE_COLORS.map((role) => ROLE_SPECS[role]);
  ROLE_REGISTRY.filter(
    (spec) => spec.readsOn.length > 0
  ).map((spec) => spec.role);
  ROLE_REGISTRY.filter(
    (spec) => spec.isSurface
  ).map((spec) => spec.role);
  var CHROMATIC_THRESHOLD = 0.02;
  function temperatureOf(hue, chroma) {
    if (chroma < CHROMATIC_THRESHOLD) return "neutral";
    const h = normalizeHue(hue);
    if (h >= 330 || h < 90) return "warm";
    if (h >= 180) return "cool";
    return "neutral";
  }
  function deriveIdentity(seed) {
    const base = hexToOklchMapped(seed);
    return {
      seed,
      base,
      hue: base.h,
      chroma: base.c,
      lightness: base.l,
      temperature: temperatureOf(base.h, base.c),
      isChromatic: base.c >= CHROMATIC_THRESHOLD
    };
  }
  var GENERATION_STYLES = {
    balanced: {
      surfaceChroma: 6e-3,
      primaryChroma: 1,
      secondaryRelationship: "neutral",
      accentRelationship: "analogous",
      neutralTemperature: 1,
      borderStrength: 1,
      darkSurfaceDepth: 0.16,
      lightSurfaceHeight: 0.96,
      primaryLightnessLight: [0.45, 0.62],
      primaryLightnessDark: [0.68, 0.8],
      accentOffset: 32
    },
    soft: {
      surfaceChroma: 0.01,
      primaryChroma: 0.85,
      secondaryRelationship: "tinted",
      accentRelationship: "analogous",
      neutralTemperature: 1.2,
      borderStrength: 0.8,
      darkSurfaceDepth: 0.2,
      lightSurfaceHeight: 0.955,
      primaryLightnessLight: [0.52, 0.68],
      primaryLightnessDark: [0.72, 0.84],
      accentOffset: 28
    },
    vibrant: {
      surfaceChroma: 8e-3,
      primaryChroma: 1.18,
      secondaryRelationship: "tinted",
      accentRelationship: "split-complementary",
      neutralTemperature: 0.8,
      borderStrength: 1.1,
      darkSurfaceDepth: 0.15,
      lightSurfaceHeight: 0.965,
      primaryLightnessLight: [0.5, 0.64],
      primaryLightnessDark: [0.66, 0.78],
      accentOffset: 150
    },
    editorial: {
      surfaceChroma: 4e-3,
      primaryChroma: 0.95,
      secondaryRelationship: "neutral",
      accentRelationship: "complementary",
      neutralTemperature: 0.6,
      borderStrength: 1.25,
      darkSurfaceDepth: 0.13,
      lightSurfaceHeight: 0.945,
      primaryLightnessLight: [0.36, 0.52],
      primaryLightnessDark: [0.62, 0.76],
      accentOffset: 180
    },
    minimal: {
      surfaceChroma: 0,
      primaryChroma: 0.6,
      secondaryRelationship: "neutral",
      accentRelationship: "analogous",
      neutralTemperature: 0,
      borderStrength: 0.6,
      darkSurfaceDepth: 0.17,
      lightSurfaceHeight: 0.97,
      primaryLightnessLight: [0.42, 0.58],
      primaryLightnessDark: [0.7, 0.82],
      accentOffset: 24
    },
    brand: {
      surfaceChroma: 4e-3,
      primaryChroma: 1,
      secondaryRelationship: "neutral",
      accentRelationship: "analogous",
      neutralTemperature: 0.5,
      borderStrength: 0.9,
      darkSurfaceDepth: 0.14,
      lightSurfaceHeight: 0.955,
      // The brand band is deliberately the widest of the six. "Brand" means the
      // seed *is* the anchor: a near-black brand must stay near-black, and a white
      // brand must stay near-white. Contrast repair still applies — it moves the
      // ink first and the surface only as far as it must.
      primaryLightnessLight: [0.18, 0.7],
      primaryLightnessDark: [0.72, 0.98],
      accentOffset: 30
    }
  };
  function resolveStyle(style) {
    return GENERATION_STYLES[style ?? "balanced"];
  }
  function clampToBand(lightness, band) {
    return clamp(lightness, band[0], band[1]);
  }
  function neutralHue(identity) {
    return identity.isChromatic ? normalizeHue(identity.hue) : 0;
  }
  function neutralChroma(ctx, multiplier = 1) {
    if (!ctx.identity.isChromatic) return 0;
    return ctx.style.surfaceChroma * ctx.style.neutralTemperature * multiplier;
  }
  function neutral(ctx, lightness, multiplier = 1) {
    return {
      l: lightness,
      c: neutralChroma(ctx, multiplier),
      h: neutralHue(ctx.identity)
    };
  }
  var LIGHT_CARD_STEP = 0.028;
  var LIGHT_POPOVER_STEP = 0.014;
  var LIGHT_MUTED_STEP = 0.03;
  var LIGHT_SECONDARY_STEP = 0.042;
  var DARK_CARD_STEP = 0.06;
  var DARK_POPOVER_STEP = 0.078;
  var DARK_MUTED_STEP = 0.1;
  var DARK_SECONDARY_STEP = 0.115;
  function generateSurfaces(ctx) {
    const tintedSecondary = ctx.style.secondaryRelationship === "tinted" ? 2.5 : 1.6;
    if (ctx.mode === "light") {
      const base2 = ctx.style.lightSurfaceHeight;
      return {
        background: neutral(ctx, base2),
        card: neutral(ctx, clamp(base2 + LIGHT_CARD_STEP, 0, 1)),
        popover: neutral(ctx, clamp(base2 + LIGHT_POPOVER_STEP, 0, 1)),
        muted: neutral(ctx, clamp(base2 - LIGHT_MUTED_STEP, 0, 1)),
        secondary: neutral(ctx, clamp(base2 - LIGHT_SECONDARY_STEP, 0, 1), tintedSecondary)
      };
    }
    const base = ctx.style.darkSurfaceDepth;
    return {
      background: neutral(ctx, base),
      card: neutral(ctx, base + DARK_CARD_STEP),
      popover: neutral(ctx, base + DARK_POPOVER_STEP),
      muted: neutral(ctx, base + DARK_MUTED_STEP),
      secondary: neutral(ctx, base + DARK_SECONDARY_STEP, tintedSecondary)
    };
  }
  var LIGHT_FOREGROUND = 0.22;
  var LIGHT_SECONDARY_FOREGROUND = 0.26;
  var LIGHT_MUTED_FOREGROUND = 0.52;
  var DARK_FOREGROUND = 0.95;
  var DARK_SECONDARY_FOREGROUND = 0.93;
  var DARK_MUTED_FOREGROUND = 0.72;
  function generateContent(ctx) {
    if (ctx.mode === "light") {
      return {
        foreground: neutral(ctx, LIGHT_FOREGROUND, 1.5),
        cardForeground: neutral(ctx, LIGHT_FOREGROUND, 1.5),
        popoverForeground: neutral(ctx, LIGHT_FOREGROUND, 1.5),
        secondaryForeground: neutral(ctx, LIGHT_SECONDARY_FOREGROUND, 1.2),
        mutedForeground: neutral(ctx, LIGHT_MUTED_FOREGROUND, 1)
      };
    }
    return {
      foreground: neutral(ctx, DARK_FOREGROUND, 1),
      cardForeground: neutral(ctx, DARK_FOREGROUND, 1),
      popoverForeground: neutral(ctx, DARK_FOREGROUND, 1),
      secondaryForeground: neutral(ctx, DARK_SECONDARY_FOREGROUND, 1),
      mutedForeground: neutral(ctx, DARK_MUTED_FOREGROUND, 1)
    };
  }
  function lightInk(ctx) {
    return { l: 0.99, c: neutralChroma(ctx, 1), h: neutralHue(ctx.identity) };
  }
  function darkInk(ctx) {
    return { l: 0.18, c: neutralChroma(ctx, 1.5), h: neutralHue(ctx.identity) };
  }
  var FOREGROUND_PREFERENCE = {
    primaryForeground: "light",
    destructiveForeground: "light",
    successForeground: "light",
    accentForeground: "light"
  };
  function inkRatio(ink, background) {
    return contrastRatio(oklchToRgb(ink), oklchToRgb(background));
  }
  function chooseForeground(role, background, ctx) {
    const light = lightInk(ctx);
    const dark = darkInk(ctx);
    const target = targetFor("text");
    const preference = FOREGROUND_PREFERENCE[role];
    if (preference) {
      const preferred = preference === "light" ? light : dark;
      const other = preference === "light" ? dark : light;
      if (inkRatio(preferred, background) >= target) return preferred;
      if (inkRatio(other, background) >= target) return other;
      return inkRatio(preferred, background) >= inkRatio(other, background) ? preferred : other;
    }
    return inkRatio(light, background) >= inkRatio(dark, background) ? light : dark;
  }
  var ACCENT_LIGHTNESS_LIGHT = 0.62;
  var ACCENT_LIGHTNESS_DARK = 0.68;
  var ACCENT_CHROMA_FLOOR = 0.06;
  var ACCENT_CHROMA_RATIO = 0.85;
  var MIN_ACCENT_HUE_DISTANCE = 18;
  var ACCENT_FALLBACK_OFFSETS = [32, 150, 180];
  function resolveAccentHue(primaryHue, styleOffset) {
    const preferred = normalizeHue(primaryHue + styleOffset);
    if (hueDistance(preferred, primaryHue) >= MIN_ACCENT_HUE_DISTANCE) return preferred;
    for (const offset of ACCENT_FALLBACK_OFFSETS) {
      const candidate = normalizeHue(primaryHue + offset);
      if (hueDistance(candidate, primaryHue) >= MIN_ACCENT_HUE_DISTANCE) return candidate;
    }
    return preferred;
  }
  function generateActions(ctx) {
    const { identity, style, mode } = ctx;
    const isLight = mode === "light";
    const band = isLight ? style.primaryLightnessLight : style.primaryLightnessDark;
    const primary = gamutMapOklch({
      l: clampToBand(identity.lightness, band),
      c: Math.max(
        identity.chroma * style.primaryChroma * (isLight ? 1 : 0.92),
        identity.isChromatic ? 0.05 : 0
      ),
      h: identity.hue
    });
    const accent = gamutMapOklch({
      l: isLight ? ACCENT_LIGHTNESS_LIGHT : ACCENT_LIGHTNESS_DARK,
      c: Math.max(primary.c * ACCENT_CHROMA_RATIO, ACCENT_CHROMA_FLOOR),
      h: resolveAccentHue(primary.h, style.accentOffset)
    });
    return {
      primary,
      primaryForeground: chooseForeground("primaryForeground", primary, ctx),
      accent,
      accentForeground: chooseForeground("accentForeground", accent, ctx)
    };
  }
  var STATUS_HUES = {
    /** Red family. */
    destructive: 27,
    /** Green family. */
    success: 148
  };
  var LIGHT_DESTRUCTIVE = { l: 0.5, c: 0.2 };
  var LIGHT_SUCCESS = { l: 0.5, c: 0.15 };
  var DARK_DESTRUCTIVE = { l: 0.55, c: 0.21 };
  var DARK_SUCCESS = { l: 0.55, c: 0.16 };
  function generateStatus(ctx) {
    const isLight = ctx.mode === "light";
    const destructiveSpec = isLight ? LIGHT_DESTRUCTIVE : DARK_DESTRUCTIVE;
    const successSpec = isLight ? LIGHT_SUCCESS : DARK_SUCCESS;
    const destructive = gamutMapOklch({
      l: destructiveSpec.l,
      c: destructiveSpec.c,
      h: STATUS_HUES.destructive
    });
    const success = gamutMapOklch({
      l: successSpec.l,
      c: successSpec.c,
      h: STATUS_HUES.success
    });
    return {
      destructive,
      destructiveForeground: chooseForeground("destructiveForeground", destructive, ctx),
      success,
      successForeground: chooseForeground("successForeground", success, ctx)
    };
  }
  var LIGHT_BORDER_STEP = 0.075;
  var DARK_BORDER_STEP = 0.16;
  var BORDER_TINT = 1.2;
  function generateInteraction(ctx, primary) {
    const isLight = ctx.mode === "light";
    const base = isLight ? ctx.style.lightSurfaceHeight : ctx.style.darkSurfaceDepth;
    const step = (isLight ? LIGHT_BORDER_STEP : DARK_BORDER_STEP) * ctx.style.borderStrength;
    const borderLightness = isLight ? base - step : base + step;
    return {
      border: neutral(ctx, borderLightness, BORDER_TINT),
      input: neutral(ctx, borderLightness, BORDER_TINT),
      ring: gamutMapOklch({ l: primary.l, c: primary.c, h: primary.h })
    };
  }
  var SEARCH_STEPS = 28;
  var MAX_PASSES = 2;
  var ANCHOR_FLOOR_MARGIN = 0.03;
  function ratio(a, b) {
    return contrastRatio(oklchToRgb(a), oklchToRgb(b));
  }
  function passes(a, b, target) {
    return ratio(a, b) >= target;
  }
  var BRAND_SURFACES = /* @__PURE__ */ new Set([
    "primary",
    "accent",
    "destructive",
    "success"
  ]);
  function pairKind(pair) {
    if (pair.requirement === "ui") return "ui";
    if (BRAND_SURFACES.has(pair.background)) return "brand";
    return "ink";
  }
  function solveAway(color, reference, target) {
    if (passes(color, reference, target)) return color;
    const goDark = reference.l > 0.5;
    const bound = goDark ? 0 : 1;
    const anchor = goDark ? Math.min(color.l, reference.l) : Math.max(color.l, reference.l);
    if (passes(withLightness(color, anchor), reference, target)) {
      return withLightness(color, anchor);
    }
    if (!passes(withLightness(color, bound), reference, target)) {
      return withLightness(color, bound);
    }
    let fail = anchor;
    let pass = bound;
    for (let i = 0; i < SEARCH_STEPS; i += 1) {
      const mid = (fail + pass) / 2;
      if (passes(withLightness(color, mid), reference, target)) pass = mid;
      else fail = mid;
    }
    return withLightness(color, pass);
  }
  var PURE_WHITE = { l: 1, c: 0, h: 0 };
  var NEAR_BLACK = { l: 0.18, c: 0, h: 0 };
  function solveBrandPair(surface, ctx, target, anchored = false) {
    const light = anchored ? PURE_WHITE : lightInk(ctx);
    const dark = anchored ? NEAR_BLACK : darkInk(ctx);
    if (passes(light, surface, target)) return { surface, foreground: light };
    if (passes(dark, surface, target)) return { surface, foreground: dark };
    const movedForLight = solveAway(surface, light, target);
    const movedForDark = solveAway(surface, dark, target);
    const costLight = Math.abs(movedForLight.l - surface.l);
    const costDark = Math.abs(movedForDark.l - surface.l);
    return costLight <= costDark ? { surface: movedForLight, foreground: light } : { surface: movedForDark, foreground: dark };
  }
  function enforceHierarchy(palette, ctx, adjustments) {
    const isLight = ctx.mode === "light";
    const targets = [
      { weaker: "secondaryForeground", stronger: "foreground", surface: "secondary" },
      { weaker: "mutedForeground", stronger: "foreground", surface: "muted" }
    ];
    for (const { weaker, stronger, surface } of targets) {
      const weak = palette[weaker];
      const strong = palette[stronger];
      const violated = isLight ? weak.l < strong.l : weak.l > strong.l;
      if (!violated) continue;
      const corrected = withLightness(weak, isLight ? strong.l + 0.04 : strong.l - 0.04);
      palette[weaker] = corrected;
      adjustments.push({
        role: weaker,
        from: weak,
        to: corrected,
        reason: "hierarchy",
        before: ratio(weak, palette[surface]),
        after: ratio(corrected, palette[surface]),
        target: targetFor("text")
      });
    }
  }
  function solvePalette(palette, ctx, options = {}) {
    const anchored = options.anchoredRoles;
    const targetOf = (pair) => anchored !== void 0 && (anchored.has(pair.foreground) || anchored.has(pair.background)) ? floorFor(pair.requirement) + ANCHOR_FLOOR_MARGIN : targetFor(pair.requirement);
    const adjustments = [];
    let current = { ...palette };
    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      for (const pair of SEMANTIC_PAIRS) {
        const target = targetOf(pair);
        const foreground = current[pair.foreground];
        const background = current[pair.background];
        const before = ratio(foreground, background);
        if (before >= target) continue;
        const next = { ...current };
        if (pairKind(pair) === "brand") {
          const solved = solveBrandPair(
            background,
            ctx,
            target,
            anchored?.has(pair.background) ?? false
          );
          if (solved.surface !== background) {
            next[pair.background] = solved.surface;
            adjustments.push({
              role: pair.background,
              from: background,
              to: solved.surface,
              reason: "surface-lightness",
              before,
              after: ratio(solved.foreground, solved.surface),
              target
            });
          }
          if (solved.foreground !== foreground) {
            adjustments.push({
              role: pair.foreground,
              from: foreground,
              to: solved.foreground,
              reason: "foreground-lightness",
              before,
              after: ratio(solved.foreground, solved.surface),
              target
            });
          }
          next[pair.foreground] = solved.foreground;
        } else {
          const moved = solveAway(foreground, background, target);
          next[pair.foreground] = moved;
          adjustments.push({
            role: pair.foreground,
            from: foreground,
            to: moved,
            reason: "foreground-lightness",
            before,
            after: ratio(moved, background),
            target
          });
        }
        current = next;
      }
    }
    enforceHierarchy(current, ctx, adjustments);
    const unsatisfied = [];
    for (const pair of SEMANTIC_PAIRS) {
      const target = targetOf(pair);
      const achieved = ratio(current[pair.foreground], current[pair.background]);
      if (achieved < target) unsatisfied.push({ pair, ratio: achieved, target });
    }
    return { palette: current, adjustments, unsatisfied };
  }
  var DEFAULT_RELATIONSHIP_THRESHOLDS = {
    backgroundCard: 0.01,
    cardPopover: 5e-3,
    borderVisibility: 0.06,
    borderDominance: 0.3,
    inputRingSeparation: 0.1,
    primarySeparation: 0.06,
    mutedQuieter: 0.08,
    statusSeparation: 0.12,
    minAccentHueDistance: 18,
    minAccentChroma: 0.04
  };
  var BORDER_SURFACES = ["background", "card", "popover"];
  var COMPARISON_EPSILON = 1e-6;
  var BORDER_MARGIN = 0.01;
  function lightnessDelta(a, b) {
    return Math.abs(a.l - b.l);
  }
  function checkRelationships(palette, ctx, options = {}) {
    const thresholds = options.thresholds ?? DEFAULT_RELATIONSHIP_THRESHOLDS;
    const issues = [];
    const isLight = ctx.mode === "light";
    const push = (check, roles, value, threshold, message) => issues.push({ check, roles, value, threshold, message });
    if (!options.flatSurfaces) {
      const bgCard = lightnessDelta(palette.background, palette.card);
      if (bgCard < thresholds.backgroundCard) {
        push(
          "surface-separation",
          ["background", "card"],
          bgCard,
          thresholds.backgroundCard,
          "card is not distinguishable from background"
        );
      }
      const cardPopover = lightnessDelta(palette.card, palette.popover);
      if (cardPopover < thresholds.cardPopover) {
        push(
          "surface-separation",
          ["card", "popover"],
          cardPopover,
          thresholds.cardPopover,
          "popover is not distinguishable from card"
        );
      }
    }
    for (const surface of BORDER_SURFACES) {
      const delta = lightnessDelta(palette.border, palette[surface]);
      if (delta < thresholds.borderVisibility - COMPARISON_EPSILON) {
        push(
          "border-visibility",
          ["border", surface],
          delta,
          thresholds.borderVisibility,
          `border is not visible against ${surface}`
        );
      }
    }
    const borderDominance = lightnessDelta(palette.border, palette.background);
    if (borderDominance > thresholds.borderDominance + COMPARISON_EPSILON) {
      push(
        "border-dominance",
        ["border", "background"],
        borderDominance,
        thresholds.borderDominance,
        "border dominates the surface it separates"
      );
    }
    const inputRing = deltaEOklch(palette.input, palette.ring);
    if (inputRing < thresholds.inputRingSeparation - COMPARISON_EPSILON) {
      push(
        "input-ring-separation",
        ["input", "ring"],
        inputRing,
        thresholds.inputRingSeparation,
        "input and ring are too similar \u2014 the focus state will not read"
      );
    }
    for (const role of ["background", "secondary"]) {
      const distance = deltaEOklch(palette.primary, palette[role]);
      if (distance < thresholds.primarySeparation) {
        push(
          "primary-separation",
          ["primary", role],
          distance,
          thresholds.primarySeparation,
          `primary is not distinguishable from ${role}`
        );
      }
    }
    const accentHue = hueDistance(palette.primary.h, palette.accent.h);
    const accentChroma = Math.abs(palette.primary.c - palette.accent.c);
    if (accentHue < thresholds.minAccentHueDistance && accentChroma < thresholds.minAccentChroma) {
      push(
        "accent-collision",
        ["primary", "accent"],
        accentChroma,
        thresholds.minAccentChroma,
        "accent is not distinct from primary in hue or chroma"
      );
    }
    const mutedDelta = lightnessDelta(palette.foreground, palette.mutedForeground);
    const ordered = isLight ? palette.mutedForeground.l > palette.foreground.l : palette.mutedForeground.l < palette.foreground.l;
    if (!ordered || mutedDelta < thresholds.mutedQuieter) {
      push(
        "muted-hierarchy",
        ["foreground", "mutedForeground"],
        mutedDelta,
        thresholds.mutedQuieter,
        "mutedForeground is not clearly quieter than foreground"
      );
    }
    const statusDistance = deltaEOklch(palette.destructive, palette.success);
    if (statusDistance < thresholds.statusSeparation) {
      push(
        "status-separation",
        ["destructive", "success"],
        statusDistance,
        thresholds.statusSeparation,
        "destructive and success are not far enough apart"
      );
    }
    return issues;
  }
  function enforceRelationships(palette, ctx, thresholds = DEFAULT_RELATIONSHIP_THRESHOLDS) {
    const adjustments = [];
    const isLight = ctx.mode === "light";
    const outward = isLight ? 1 : -1;
    const separate = (role, reference, minimum, check) => {
      const current = palette[role];
      if (lightnessDelta(current, reference) >= minimum) return;
      const moved = withLightness(current, reference.l + outward * minimum);
      palette[role] = moved;
      adjustments.push({ role, from: current, to: moved, check });
    };
    separate("card", palette.background, thresholds.backgroundCard, "surface-separation");
    separate("popover", palette.card, thresholds.cardPopover, "surface-separation");
    {
      const current = palette.border;
      const surfaceLightnesses = BORDER_SURFACES.map((role) => palette[role].l);
      const anchor = isLight ? Math.min(...surfaceLightnesses) : Math.max(...surfaceLightnesses);
      const direction = isLight ? -1 : 1;
      const nearest = anchor + direction * (thresholds.borderVisibility + BORDER_MARGIN);
      const farthest = palette.background.l + direction * (thresholds.borderDominance - BORDER_MARGIN);
      const low = Math.min(nearest, farthest);
      const high = Math.max(nearest, farthest);
      if (current.l < low || current.l > high) {
        const target = low > high ? nearest : current.l < low ? low : high;
        const moved = withLightness(current, target);
        palette.border = moved;
        palette.input = withLightness(palette.input, moved.l);
        adjustments.push({ role: "border", from: current, to: moved, check: "border-visibility" });
      }
    }
    {
      const current = palette.ring;
      if (deltaEOklch(palette.input, current) < thresholds.inputRingSeparation) {
        const moved = withLightness(current, palette.input.l + (isLight ? -0.12 : 0.12));
        palette.ring = moved;
        adjustments.push({ role: "ring", from: current, to: moved, check: "input-ring-separation" });
      }
    }
    return adjustments;
  }
  var GENERATION_ALGORITHM = "semantic-v2";
  function applyAnchors(palette, anchors) {
    if (!anchors) return;
    for (const [role, value] of Object.entries(anchors)) {
      if (value === void 0) continue;
      palette[role] = value;
    }
  }
  function anchorSurvived(anchor, resolved) {
    return oklchToHexMapped(anchor) === oklchToHexMapped(resolved);
  }
  function buildPalette(ctx) {
    const actions = generateActions(ctx);
    return {
      ...generateSurfaces(ctx),
      ...generateContent(ctx),
      ...actions,
      ...generateStatus(ctx),
      ...generateInteraction(ctx, actions.primary)
    };
  }
  var MAX_RELATIONSHIP_ROUNDS = 2;
  function generateRolePalette(ctx) {
    const candidates = buildPalette(ctx);
    applyAnchors(candidates, ctx.anchors);
    const relationshipAdjustments = enforceRelationships(candidates, ctx);
    const anchoredRoles = new Set(Object.keys(ctx.anchors ?? {}));
    const solveOptions = anchoredRoles.size > 0 ? { anchoredRoles } : {};
    let solved = solvePalette(candidates, ctx, solveOptions);
    let adjustments = solved.adjustments;
    let relationshipIssues = checkRelationships(solved.palette, ctx);
    for (let round = 0; round < MAX_RELATIONSHIP_ROUNDS && relationshipIssues.length > 0; round += 1) {
      relationshipAdjustments.push(...enforceRelationships(solved.palette, ctx));
      solved = solvePalette(solved.palette, ctx, solveOptions);
      adjustments = [...adjustments, ...solved.adjustments];
      relationshipIssues = checkRelationships(solved.palette, ctx);
    }
    const anchorAdjustments = [];
    if (ctx.anchors) {
      for (const [role, anchor] of Object.entries(ctx.anchors)) {
        if (anchor === void 0) continue;
        const resolved = solved.palette[role];
        if (resolved !== void 0 && !anchorSurvived(anchor, resolved)) {
          anchorAdjustments.push({ role, anchor, resolved });
        }
      }
    }
    return {
      palette: solved.palette,
      adjustments,
      relationshipAdjustments,
      relationshipIssues,
      unsatisfied: solved.unsatisfied,
      anchorAdjustments
    };
  }
  var GENERATED_THEME_KIND = "generated";
  function isGeneratedTheme(theme) {
    return theme.meta?.generation?.kind === GENERATED_THEME_KIND;
  }
  function findGeneratedTheme(themes, active) {
    const candidates = themes.filter(isGeneratedTheme);
    if (candidates.length === 0) {
      return { status: "missing", theme: null, candidates };
    }
    if (candidates.length === 1) {
      return { status: "found", theme: candidates[0], candidates };
    }
    const activeMatch = active ? candidates.find((theme) => theme.name === active.name) : void 0;
    if (activeMatch) {
      return { status: "found", theme: activeMatch, candidates };
    }
    return { status: "ambiguous", theme: null, candidates };
  }
  function resolveGeneratedTheme(themes, active) {
    const { status, theme, candidates } = findGeneratedTheme(themes, active);
    if (status === "found") {
      return theme;
    }
    if (status === "missing") {
      throw ThemeError.fromDiagnostic(
        createDiagnostic({
          code: "TV_GENERATION_THEME_NOT_FOUND",
          level: "error",
          message: "No generated theme is registered with this provider.",
          context: {
            api: "useGeneratedTheme",
            expected: "a theme created by generateTheme() and passed to the provider's `themes`"
          },
          hint: 'const { light, dark } = generateTheme({ seed: "#635BFF" }); then pass them to the provider\'s `themes`.'
        })
      );
    }
    const names = candidates.map((candidate) => candidate.name).join(", ");
    const activeName = active?.name;
    throw ThemeError.fromDiagnostic(
      createDiagnostic({
        code: "TV_GENERATION_THEME_AMBIGUOUS",
        level: "error",
        message: `${candidates.length} generated themes are registered (${names}) and the active theme does not select one of them.`,
        context: {
          api: "useGeneratedTheme",
          received: activeName,
          expected: `one of: ${names}`,
          details: { candidates: names }
        },
        hint: "Register a single generated theme, or activate one of the generated themes so the active selection identifies which to return."
      })
    );
  }
  function mergePresetTokens(base, override) {
    return {
      ...base,
      ...override,
      colors: {
        ...base.colors,
        ...override?.colors
      },
      spacing: {
        ...base.spacing,
        ...override?.spacing
      },
      radius: {
        ...base.radius,
        ...override?.radius
      },
      shadows: {
        ...base.shadows,
        ...override?.shadows
      },
      borderWidths: {
        ...base.borderWidths,
        ...override?.borderWidths
      },
      zIndex: {
        ...base.zIndex,
        ...override?.zIndex
      },
      breakpoints: {
        ...base.breakpoints,
        ...override?.breakpoints
      },
      typography: {
        ...base.typography,
        ...override?.typography
      }
    };
  }
  function anchorsFor(source, mode) {
    return source.colors.filter(
      (color) => color.classification === "ANCHOR" && color.themeRole !== void 0 && (color.mode === void 0 || color.mode === mode)
    ).map((color) => ({
      role: color.themeRole,
      color: color.color,
      label: color.label
    }));
  }
  var DEFAULT_RADIUS = "8px";
  function capitalize2(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function buildPresetThemeReport(recipe, mode) {
    const variant = mode === "light" ? recipe.light : recipe.dark;
    const seed = variant?.seed ?? recipe.seed;
    const identity = deriveIdentity(seed);
    const style = resolveStyle(recipe.style);
    const anchors = recipe.brand ? anchorsFor(recipe.brand, mode) : [];
    const pinned = {};
    for (const anchor of anchors) {
      try {
        pinned[anchor.role] = hexToOklchMapped(anchor.color);
      } catch {
      }
    }
    const ctx = {
      mode,
      identity,
      style,
      ...Object.keys(pinned).length > 0 ? { anchors: pinned } : {}
    };
    const { palette, anchorAdjustments } = generateRolePalette(ctx);
    const colors = {};
    for (const role of CORE_COLORS) {
      colors[role] = oklchToHexMapped(palette[role]);
    }
    const baseTokens = {
      colors,
      radius: { lg: recipe.radius ?? DEFAULT_RADIUS }
    };
    const tokens = mergePresetTokens(baseTokens, variant?.overrides);
    const anchoredRoles = anchors.map((anchor) => anchor.role);
    const generation = {
      algorithm: GENERATION_ALGORITHM,
      seed,
      contrast: { ...DEFAULT_CONTRAST_CONTRACT },
      ...recipe.style !== void 0 ? { style: recipe.style } : {},
      ...anchoredRoles.length > 0 ? { anchored: anchoredRoles } : {}
    };
    const theme = defineTheme({
      name: `${recipe.family}-${mode}`,
      meta: {
        family: recipe.family,
        mode,
        label: `${recipe.name} ${capitalize2(mode)}`,
        order: mode === "light" ? 10 : 20,
        ...recipe.metadata?.description !== void 0 ? { description: recipe.metadata.description } : {},
        ...recipe.metadata?.tags !== void 0 ? { tags: [...recipe.metadata.tags] } : {},
        generation
      },
      tokens
    });
    const labelOf = (role) => anchors.find((anchor) => anchor.role === role)?.label ?? role;
    return {
      theme,
      anchors,
      normalized: anchorAdjustments.map((adjustment) => ({
        role: adjustment.role,
        anchor: oklchToHexMapped(adjustment.anchor),
        resolved: oklchToHexMapped(adjustment.resolved),
        label: labelOf(adjustment.role)
      }))
    };
  }
  function buildPresetTheme(recipe, mode) {
    return buildPresetThemeReport(recipe, mode).theme;
  }
  var DEFAULT_PRESET_RECIPES = [
    {
      id: "oat",
      name: "Oat",
      family: "oat",
      kind: "default",
      seed: "#b45309",
      style: "soft",
      radius: "12px",
      metadata: {
        description: "Warm \xB7 Soft \xB7 Neutral",
        tags: ["warm", "soft", "neutral"]
      }
    },
    {
      id: "berry",
      name: "Berry",
      family: "berry",
      kind: "default",
      seed: "#db2777",
      style: "vibrant",
      radius: "16px",
      metadata: {
        description: "Warm \xB7 Vibrant",
        tags: ["warm", "vibrant"]
      }
    },
    {
      id: "mint",
      name: "Mint",
      family: "mint",
      kind: "default",
      seed: "#059669",
      style: "soft",
      radius: "18px",
      metadata: {
        description: "Cool \xB7 Soft \xB7 Restrained",
        tags: ["cool", "soft", "restrained"]
      }
    },
    {
      id: "citrus",
      name: "Citrus",
      family: "citrus",
      kind: "default",
      seed: "#d97706",
      style: "vibrant",
      radius: "18px",
      metadata: {
        description: "Warm \xB7 Vibrant \xB7 Bright",
        tags: ["warm", "vibrant", "bright"]
      }
    },
    {
      id: "cocoa",
      name: "Cocoa",
      family: "cocoa",
      kind: "default",
      seed: "#92400e",
      style: "editorial",
      radius: "14px",
      metadata: {
        description: "Warm \xB7 Deep \xB7 Editorial",
        tags: ["warm", "deep", "editorial"]
      }
    },
    {
      id: "plum",
      name: "Plum",
      family: "plum",
      kind: "default",
      seed: "#7c3aed",
      style: "editorial",
      radius: "18px",
      metadata: {
        description: "Violet \xB7 Editorial",
        tags: ["violet", "editorial"]
      }
    },
    {
      id: "iris",
      name: "Iris",
      family: "iris",
      kind: "default",
      seed: "#6366f1",
      style: "balanced",
      radius: "16px",
      metadata: {
        description: "Cool \xB7 Balanced",
        tags: ["cool", "balanced"]
      }
    },
    {
      id: "sky",
      name: "Sky",
      family: "sky",
      kind: "default",
      seed: "#0ea5e9",
      style: "soft",
      radius: "18px",
      metadata: {
        description: "Cool \xB7 Soft \xB7 Airy",
        tags: ["cool", "soft", "airy"]
      }
    },
    {
      id: "graphite",
      name: "Graphite",
      family: "graphite",
      kind: "default",
      seed: "#52525b",
      style: "minimal",
      radius: "14px",
      metadata: {
        description: "Neutral \xB7 Minimal",
        tags: ["neutral", "minimal"]
      }
    }
  ];
  var BRAND_PRESET_RECIPES = [
    {
      id: "apple",
      name: "Apple",
      family: "apple",
      kind: "brand",
      seed: "#007aff",
      style: "brand",
      radius: "14px",
      metadata: {
        description: "Brand-inspired \xB7 Blue accent \xB7 Restrained",
        tags: ["brand", "blue", "restrained", "adaptive"],
        provenance: "approximate",
        brandColor: "#007aff"
      },
      brand: {
        name: "Apple",
        kind: "official-guidelines",
        sourceUrl: "https://developer.apple.com/design/human-interface-guidelines/color",
        hasDesignSystem: true,
        hasLightDark: true,
        colors: [
          {
            label: "System Blue",
            color: "#007aff",
            classification: "ANCHOR",
            themeRole: "primary",
            source: "Human Interface Guidelines \u2014 system colors (iOS system blue)",
            official: true
          },
          {
            label: "System Gray (grouped background)",
            color: "#f2f2f7",
            classification: "IMPLEMENTATION",
            source: "HIG system colors \u2014 grouped background, light appearance",
            official: true
          },
          {
            label: "Label (primary text)",
            color: "#000000",
            classification: "DERIVED",
            source: "HIG semantic label color \u2014 adapts per appearance; Themvora derives its own foreground",
            official: true
          }
        ],
        notes: [
          "Apple's guidance is to use an accent colour deliberately rather than covering the interface with it, and to provide adaptive semantic colours for both appearances.",
          'The preset therefore reads as neutral and clean with a blue accent, not as "everything is Apple blue".',
          "System Blue cannot carry white or near-black text at 4.5:1, so the solver normalizes the anchor. That normalization is reported on the brand page rather than hidden."
        ]
      }
    },
    {
      id: "github",
      name: "GitHub",
      family: "github",
      kind: "brand",
      seed: "#0969da",
      style: "brand",
      radius: "6px",
      metadata: {
        description: "Brand-inspired \xB7 Primer blue \xB7 Systematic",
        tags: ["brand", "blue", "systematic", "compact"],
        provenance: "approximate",
        brandColor: "#0969da"
      },
      brand: {
        name: "GitHub",
        kind: "official-design-system",
        sourceUrl: "https://primer.style/product/getting-started/foundations/color-usage/",
        hasDesignSystem: true,
        hasLightDark: true,
        colors: [
          {
            label: "Primer Blue (accent)",
            color: "#0969da",
            classification: "ANCHOR",
            themeRole: "primary",
            source: "Primer \u2014 accent role: links, primary actions, focus ring base",
            official: true
          },
          {
            label: "Canvas default (light)",
            color: "#ffffff",
            classification: "IMPLEMENTATION",
            source: "Primer functional token `bgColor-default`, light mode",
            official: true
          },
          {
            label: "Canvas default (dark)",
            color: "#0d1117",
            classification: "IMPLEMENTATION",
            source: "Primer functional token `bgColor-default`, dark mode",
            official: true
          },
          {
            label: "Border default",
            color: "#d0d7de",
            classification: "IMPLEMENTATION",
            source: "Primer functional token `borderColor-default`, light mode",
            official: true
          }
        ],
        notes: [
          "Primer is the strongest available source: it is already a token system (base \u2192 functional \u2192 component) with inverted light/dark neutral scales, which maps onto Themvora's architecture almost directly.",
          "Its surface levels, borders and hover states are implementation-specific, so Themvora derives its own rather than freezing Primer's."
        ]
      }
    },
    {
      id: "vercel",
      name: "Vercel",
      family: "vercel",
      kind: "brand",
      seed: "#000000",
      style: "minimal",
      radius: "12px",
      metadata: {
        description: "Brand-inspired \xB7 Monochrome \xB7 Geist neutral",
        tags: ["brand", "monochrome", "neutral", "sharp"],
        provenance: "approximate",
        brandColor: "#000000"
      },
      brand: {
        name: "Vercel",
        kind: "official-design-system",
        sourceUrl: "https://vercel.com/geist/colors",
        hasDesignSystem: true,
        hasLightDark: true,
        colors: [
          {
            label: "Brand black",
            color: "#000000",
            classification: "ANCHOR",
            themeRole: "primary",
            mode: "light",
            source: "Vercel brand \u2014 black is the identity in the light appearance",
            official: true
          },
          {
            label: "Brand white",
            color: "#ffffff",
            classification: "ANCHOR",
            themeRole: "primary",
            mode: "dark",
            source: "Vercel brand \u2014 white is the identity in the dark appearance",
            official: true
          },
          {
            label: "Background 1 (light)",
            color: "#ffffff",
            classification: "IMPLEMENTATION",
            source: "Geist `--ds-background-100`, light theme",
            official: true
          },
          {
            label: "Background 2 (light)",
            color: "#fafafa",
            classification: "IMPLEMENTATION",
            source: "Geist `--ds-background-200`, light theme",
            official: true
          },
          {
            label: "Gray 400 \u2014 default border",
            color: "#ebebeb",
            classification: "IMPLEMENTATION",
            source: "Geist gray scale, step 400, light theme (HSL 0 0% 92%)",
            official: true
          },
          {
            label: "Gray 1000 \u2014 primary text",
            color: "#171717",
            classification: "IMPLEMENTATION",
            source: "Geist gray scale, step 1000, light theme (HSL 0 0% 9%)",
            official: true
          }
        ],
        notes: [
          "Geist publishes ten scales of ten steps, each step with a documented usage: default/hover/active background, default/hover/active border, high-contrast background, secondary and primary text.",
          "Its gray scale is pure neutral \u2014 zero saturation at every step \u2014 which is the actual character of the Vercel look. The preset uses the `minimal` style to reproduce that zero-chroma neutral scale.",
          "The scale steps are implementation-specific: they are Vercel's chosen lightness ladder, and Themvora derives its own rather than freezing ten values."
        ]
      }
    },
    {
      id: "slack",
      name: "Slack",
      family: "slack",
      kind: "brand",
      seed: "#4a154b",
      style: "brand",
      radius: "12px",
      metadata: {
        description: "Brand-inspired \xB7 Aubergine \xB7 Bold",
        tags: ["brand", "aubergine", "bold"],
        provenance: "approximate",
        brandColor: "#4a154b"
      },
      brand: {
        name: "Slack",
        kind: "official-guidelines",
        sourceUrl: "https://slack.com/brand-guidelines",
        hasDesignSystem: false,
        hasLightDark: false,
        colors: [
          {
            label: "Aubergine",
            color: "#4a154b",
            classification: "ANCHOR",
            themeRole: "primary",
            source: "Slack brand guidelines \u2014 primary brand colour",
            official: true
          },
          {
            label: "Slack Blue",
            color: "#36c5f0",
            classification: "ANCHOR",
            source: "Slack brand guidelines \u2014 brand palette",
            official: true
          },
          {
            label: "Slack Green",
            color: "#2eb67d",
            classification: "ANCHOR",
            source: "Slack brand guidelines \u2014 brand palette",
            official: true
          },
          {
            label: "Slack Yellow",
            color: "#ecb22e",
            classification: "ANCHOR",
            source: "Slack brand guidelines \u2014 brand palette",
            official: true
          },
          {
            label: "Slack Red",
            color: "#e01e5a",
            classification: "ANCHOR",
            source: "Slack brand guidelines \u2014 brand palette",
            official: true
          }
        ],
        notes: [
          "Slack publishes brand colours but not a public design-token system, so only the palette is used as reference.",
          "Slack's brand terms prohibit copying or imitating the distinctive look and feel of Slack products and sites, including their colour combinations and stylization. The preset is therefore brand-inspired: aubergine anchors the identity, and the surface system, borders and status colours are Themvora's own.",
          "The four accent brand colours are recorded as reference but map to no Themvora role \u2014 the status roles are seed-independent by design."
        ]
      }
    },
    {
      id: "discord",
      name: "Discord",
      family: "discord",
      kind: "brand",
      seed: "#5865f2",
      style: "brand",
      radius: "16px",
      metadata: {
        description: "Brand-inspired \xB7 Blurple \xB7 Playful",
        tags: ["brand", "blurple", "playful"],
        provenance: "approximate",
        brandColor: "#5865f2"
      },
      brand: {
        name: "Discord",
        kind: "official-guidelines",
        sourceUrl: "https://discord.com/branding",
        hasDesignSystem: false,
        hasLightDark: false,
        colors: [
          {
            label: "Blurple",
            color: "#5865f2",
            classification: "ANCHOR",
            themeRole: "primary",
            source: "Discord brand guidelines \u2014 Blurple, the primary brand colour",
            official: true
          },
          {
            label: "Light Blurple",
            color: "#e0e3ff",
            classification: "ANCHOR",
            source: "Discord brand guidelines \u2014 Light Blurple",
            official: true
          },
          {
            label: "Discord Black",
            color: "#000000",
            classification: "ANCHOR",
            source: "Discord brand guidelines \u2014 brand neutral",
            official: true
          },
          {
            label: "Discord White",
            color: "#ffffff",
            classification: "ANCHOR",
            source: "Discord brand guidelines \u2014 brand neutral",
            official: true
          }
        ],
        notes: [
          "Blurple is pinned exactly rather than approximated: semantic-v2 would otherwise invent a similar purple, and the point of a brand preset is that it is the brand's own colour.",
          "Discord publishes a brand palette but no public token system, so the semantic roles around the anchor are Themvora's.",
          "Light Blurple and the brand neutrals are recorded as identity reference; Themvora has no role for a brand tint, and the neutral scale is generated."
        ]
      }
    }
  ];
  function getBrandPresets() {
    const modes = ["light", "dark"];
    return BRAND_PRESET_RECIPES.flatMap(
      (recipe) => modes.map((mode) => buildPresetTheme(recipe, mode))
    );
  }
  var NEUTRAL_SEED = "#0f172a";
  var NEUTRAL_STYLE = "brand";
  function neutralColors(mode) {
    const identity = deriveIdentity(NEUTRAL_SEED);
    const style = resolveStyle(NEUTRAL_STYLE);
    const { palette } = generateRolePalette({ mode, identity, style });
    const colors = {};
    for (const role of CORE_COLORS) colors[role] = oklchToHexMapped(palette[role]);
    return colors;
  }
  var RADIUS = {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    full: "9999px"
  };
  var SPACING = {
    "0": "0px",
    px: "1px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "3.5": "14px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "28px",
    "8": "32px",
    "9": "36px",
    "10": "40px",
    "11": "44px",
    "12": "48px",
    "14": "56px",
    "16": "64px",
    "20": "80px",
    "24": "96px"
  };
  var SHADOWS = {
    xs: "0 1px 2px rgba(0,0,0,0.05)",
    sm: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
    md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
    lg: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
    xl: "0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)",
    "2xl": "0 25px 50px rgba(0,0,0,0.25)"
  };
  var BORDER_WIDTHS = {
    "0": "0px",
    "1": "1px",
    "2": "2px",
    "4": "4px",
    "8": "8px"
  };
  var Z_INDEX = {
    auto: "auto",
    "0": "0",
    "10": "10",
    "20": "20",
    "30": "30",
    "40": "40",
    "50": "50"
  };
  var BREAKPOINTS = {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px"
  };
  var TYPOGRAPHY = {
    fontFamilies: {
      sans: "ui-sans-serif, system-ui, sans-serif",
      serif: "ui-serif, Georgia, serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, monospace"
    },
    fontSizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    lineHeights: {
      none: "1",
      tight: "1.25",
      snug: "1.375",
      normal: "1.5",
      relaxed: "1.625",
      loose: "2"
    }
  };
  var LIGHT_CODE = {
    background: "#f1f5f9",
    foreground: "#0f172a",
    comment: "#64748b",
    keyword: "#dc2626",
    string: "#0891b2",
    number: "#c2410c",
    function: "#7c3aed",
    variable: "#0f172a",
    type: "#0369a1",
    property: "#0369a1",
    operator: "#dc2626",
    punctuation: "#475569",
    tag: "#dc2626",
    attribute: "#0369a1",
    lineNumber: "#94a3b8",
    selection: "rgba(15, 23, 42, 0.12)",
    highlight: "rgba(15, 23, 42, 0.06)",
    gutter: "#f1f5f9",
    border: "#e2e8f0"
  };
  var DARK_CODE = {
    background: "#1e293b",
    foreground: "#e2e8f0",
    comment: "#64748b",
    keyword: "#f87171",
    string: "#67e8f9",
    number: "#fbbf24",
    function: "#c4b5fd",
    variable: "#e2e8f0",
    type: "#7dd3fc",
    property: "#7dd3fc",
    operator: "#f87171",
    punctuation: "#94a3b8",
    tag: "#f87171",
    attribute: "#7dd3fc",
    lineNumber: "#475569",
    selection: "rgba(248, 250, 252, 0.16)",
    highlight: "rgba(248, 250, 252, 0.08)",
    gutter: "#1e293b",
    border: "#334155"
  };
  function neutralTokens(mode) {
    return {
      colors: neutralColors(mode),
      radius: RADIUS,
      spacing: SPACING,
      shadows: SHADOWS,
      borderWidths: BORDER_WIDTHS,
      zIndex: Z_INDEX,
      breakpoints: BREAKPOINTS,
      typography: TYPOGRAPHY,
      code: mode === "light" ? LIGHT_CODE : DARK_CODE
    };
  }
  function generationMeta() {
    return {
      algorithm: GENERATION_ALGORITHM,
      seed: NEUTRAL_SEED,
      style: NEUTRAL_STYLE,
      contrast: { ...DEFAULT_CONTRAST_CONTRACT }
    };
  }
  function getNeutralThemes() {
    return [
      defineTheme({
        name: "light",
        meta: {
          mode: "light",
          label: "Light",
          order: 10,
          generation: generationMeta()
        },
        tokens: neutralTokens("light")
      }),
      defineTheme({
        name: "dark",
        meta: {
          mode: "dark",
          label: "Dark",
          order: 20,
          generation: generationMeta()
        },
        tokens: neutralTokens("dark")
      })
    ];
  }
  function applyVariantOverride(theme, variant) {
    if (!variant?.tokens) return theme;
    return {
      ...theme,
      tokens: mergePresetTokens(theme.tokens ?? {}, variant.tokens)
    };
  }
  function getPresetThemes(overrides) {
    return DEFAULT_PRESET_RECIPES.flatMap((recipe) => {
      const familyOverrides = overrides?.[recipe.family];
      const modes = ["light", "dark"];
      return modes.map(
        (mode) => applyVariantOverride(
          buildPresetTheme(recipe, mode),
          mode === "light" ? familyOverrides?.light : familyOverrides?.dark
        )
      );
    });
  }
  function getHighContrastTheme(mode) {
    const isLight = mode === "light";
    return defineTheme({
      name: `high-contrast-${mode}`,
      meta: {
        mode,
        label: isLight ? "High Contrast Light" : "High Contrast Dark",
        tags: ["accessibility", "high-contrast"],
        order: isLight ? 30 : 40
      },
      tokens: {
        colors: {
          background: isLight ? "#ffffff" : "#000000",
          foreground: isLight ? "#000000" : "#ffffff",
          card: isLight ? "#ffffff" : "#000000",
          cardForeground: isLight ? "#000000" : "#ffffff",
          popover: isLight ? "#ffffff" : "#000000",
          popoverForeground: isLight ? "#000000" : "#ffffff",
          primary: isLight ? "#0000ee" : "#4488ff",
          primaryForeground: isLight ? "#ffffff" : "#000000",
          secondary: isLight ? "#e0e0e0" : "#333333",
          secondaryForeground: isLight ? "#000000" : "#ffffff",
          muted: isLight ? "#e0e0e0" : "#333333",
          mutedForeground: isLight ? "#111111" : "#eeeeee",
          accent: isLight ? "#0000ee" : "#4488ff",
          accentForeground: isLight ? "#ffffff" : "#000000",
          destructive: isLight ? "#cc0000" : "#dc2626",
          destructiveForeground: "#ffffff",
          success: isLight ? "#008000" : "#16a34a",
          successForeground: "#ffffff",
          border: "#000000",
          input: "#000000",
          ring: isLight ? "#0000ee" : "#4488ff"
        },
        radius: {
          lg: "4px"
        }
      }
    });
  }
  function getLargeTextTheme(mode) {
    const isLight = mode === "light";
    return defineTheme({
      name: `large-text-${mode}`,
      meta: {
        mode,
        label: isLight ? "Large Text Light" : "Large Text Dark",
        tags: ["accessibility", "large-text"],
        order: isLight ? 35 : 45
      },
      tokens: {
        colors: {
          background: isLight ? "#fafafa" : "#0a0a0a",
          foreground: isLight ? "#000000" : "#f0f0f0",
          card: isLight ? "#ffffff" : "#111111",
          cardForeground: isLight ? "#000000" : "#f0f0f0",
          popover: isLight ? "#ffffff" : "#111111",
          popoverForeground: isLight ? "#000000" : "#f0f0f0",
          primary: isLight ? "#0055cc" : "#4488ff",
          primaryForeground: "#ffffff",
          secondary: isLight ? "#e8e8e8" : "#2a2a2a",
          secondaryForeground: isLight ? "#000000" : "#f0f0f0",
          muted: isLight ? "#e8e8e8" : "#2a2a2a",
          mutedForeground: isLight ? "#333333" : "#cccccc",
          accent: isLight ? "#0055cc" : "#4488ff",
          accentForeground: "#ffffff",
          destructive: isLight ? "#cc0000" : "#dc2626",
          destructiveForeground: "#ffffff",
          success: isLight ? "#008000" : "#16a34a",
          successForeground: "#ffffff",
          border: isLight ? "#cccccc" : "#444444",
          input: isLight ? "#cccccc" : "#444444",
          ring: isLight ? "#0055cc" : "#4488ff"
        },
        radius: {
          lg: "8px"
        },
        typography: {
          fontSizes: {
            xs: "1rem",
            sm: "1.125rem",
            base: "1.25rem",
            lg: "1.5rem",
            xl: "1.875rem",
            "2xl": "2.25rem",
            "3xl": "3rem",
            "4xl": "3.75rem",
            "5xl": "4.5rem",
            "6xl": "6rem"
          },
          lineHeights: {
            tight: "1.4",
            normal: "1.8",
            relaxed: "2.0"
          },
          fontFamilies: {
            sans: "system-ui, sans-serif",
            mono: "monospace"
          }
        }
      }
    });
  }
  function getAccessibilityProfiles() {
    return [
      getHighContrastTheme("light"),
      getHighContrastTheme("dark"),
      getLargeTextTheme("light"),
      getLargeTextTheme("dark")
    ];
  }
  var READABLE_PAIRS = [
    ["foreground", "background"],
    ["cardForeground", "card"],
    ["popoverForeground", "popover"],
    ["primaryForeground", "primary"],
    ["secondaryForeground", "secondary"],
    ["accentForeground", "accent"],
    ["mutedForeground", "muted"],
    ["destructiveForeground", "destructive"],
    ["successForeground", "success"],
    ["warningForeground", "warning"]
  ];
  function relativeLuminance2(hex) {
    const h = hex.replace("#", "");
    const linear = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const [r = 0, g = 0, b = 0] = [0, 2, 4].map((k) => linear(parseInt(h.slice(k, k + 2), 16)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrastRatio2(a, b) {
    const [hi = 1, lo = 0] = [relativeLuminance2(a), relativeLuminance2(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  var INK_CANDIDATES = ["#ffffff", "#0f172a", "#020617", "#000000"];
  function adjustBackgroundForContrast(bg, fg, target) {
    if (contrastRatio2(fg, bg) >= target) return bg;
    const fgLum = relativeLuminance2(fg);
    const bgLum = relativeLuminance2(bg);
    const shouldDarken = bgLum > fgLum;
    const h = bg.replace("#", "");
    let r = parseInt(h.slice(0, 2), 16);
    let g = parseInt(h.slice(2, 4), 16);
    let b = parseInt(h.slice(4, 6), 16);
    for (let i = 0; i < 50; i++) {
      if (shouldDarken) {
        r = Math.max(0, r - 5);
        g = Math.max(0, g - 5);
        b = Math.max(0, b - 5);
      } else {
        r = Math.min(255, r + 5);
        g = Math.min(255, g + 5);
        b = Math.min(255, b + 5);
      }
      const candidate = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      if (contrastRatio2(fg, candidate) >= target) return candidate;
    }
    return bg;
  }
  function ensureReadableContrast(theme) {
    const colors = theme.tokens?.colors;
    if (!colors) return theme;
    for (const [fgKey, bgKey] of READABLE_PAIRS) {
      const fg = colors[fgKey];
      const bg = colors[bgKey];
      if (typeof fg !== "string" || typeof bg !== "string") continue;
      if (contrastRatio2(fg, bg) >= 4.5) continue;
      let best = fg;
      let bestRatio = contrastRatio2(fg, bg);
      for (const candidate of INK_CANDIDATES) {
        const r = contrastRatio2(candidate, bg);
        if (r > bestRatio) {
          best = candidate;
          bestRatio = r;
        }
      }
      colors[fgKey] = best;
      if (bestRatio < 4.5) {
        colors[bgKey] = adjustBackgroundForContrast(bg, best, 4.5);
      }
    }
    return theme;
  }
  function getBuiltInThemes() {
    const all = [
      ...getNeutralThemes(),
      ...getPresetThemes(),
      ...getBrandPresets(),
      ...getAccessibilityProfiles()
    ];
    for (const theme of all) {
      ensureReadableContrast(theme);
    }
    return all;
  }
  function createSystemThemeBinding(store, options) {
    const view = options.view ?? (typeof window !== "undefined" ? window : void 0);
    if (!view || typeof view.matchMedia !== "function") {
      return null;
    }
    const media = view.matchMedia(
      options.mediaQuery ?? "(prefers-color-scheme: dark)"
    );
    const apply = (matches) => {
      store.set(matches ? options.darkTheme : options.lightTheme);
    };
    const listener = (event) => {
      apply(event.matches);
    };
    if (options.applyOnCreate ?? true) {
      apply(media.matches);
    }
    const legacyMedia = media;
    if ("addEventListener" in media) {
      media.addEventListener("change", listener);
    } else {
      legacyMedia.addListener?.(listener);
    }
    return {
      destroy() {
        if ("removeEventListener" in media) {
          media.removeEventListener("change", listener);
        } else {
          legacyMedia.removeListener?.(listener);
        }
      }
    };
  }
  function createAdapterRegistry(runtime) {
    const items = /* @__PURE__ */ new Map();
    function release(adapter) {
      const entry = items.get(adapter.id);
      if (!entry || entry.adapter !== adapter) return;
      entry.count -= 1;
      if (entry.count > 0) return;
      items.delete(adapter.id);
      adapter.uninstall();
    }
    function removeAll() {
      for (const entry of items.values()) {
        entry.adapter.uninstall();
      }
      items.clear();
    }
    return {
      use(adapter) {
        let entry = items.get(adapter.id);
        if (entry && entry.adapter !== adapter) {
          entry.adapter.uninstall();
          entry.adapter = adapter;
          entry.count = 0;
          items.set(adapter.id, entry);
        }
        if (!entry) {
          entry = { adapter, count: 0 };
          items.set(adapter.id, entry);
        }
        if (entry.count === 0) {
          adapter.install(runtime);
        }
        entry.count += 1;
        return {
          id: adapter.id,
          dispose: () => release(adapter)
        };
      },
      unuse(id) {
        const entry = items.get(id);
        if (!entry) return false;
        release(entry.adapter);
        return true;
      },
      list() {
        return [...items.values()].map((entry) => entry.adapter);
      },
      destroy() {
        removeAll();
      }
    };
  }
  function createDOMWriteBatch() {
    const attributes = /* @__PURE__ */ new Map();
    const classToggles = /* @__PURE__ */ new Map();
    const styles = /* @__PURE__ */ new Map();
    let dirty = false;
    return {
      setAttribute(name, value) {
        attributes.set(name, value);
        dirty = true;
      },
      toggleClass(name, force) {
        classToggles.set(name, force);
        dirty = true;
      },
      setStyle(property, value) {
        styles.set(property, value);
        dirty = true;
      },
      flush(target) {
        if (!dirty) return;
        for (const [name, value] of attributes) {
          if (value === null) {
            target.removeAttribute(name);
          } else {
            target.setAttribute(name, value);
          }
        }
        attributes.clear();
        for (const [name, force] of classToggles) {
          target.classList.toggle(name, force);
        }
        classToggles.clear();
        for (const [prop, value] of styles) {
          if (value === null) {
            target.style.removeProperty(prop);
          } else {
            target.style.setProperty(prop, value);
          }
        }
        styles.clear();
        dirty = false;
      }
    };
  }
  function applyDOMEffects(options) {
    if (options.selectionOnly) {
      if (!options.selection) return;
      const selectionBatch = createDOMWriteBatch();
      const selection = options.selection.getSelection();
      selectionBatch.setAttribute("data-theme-selection-mode", selection.mode);
      selectionBatch.setAttribute(
        "data-theme-selection-family",
        selection.family ?? null
      );
      selectionBatch.flush(options.target);
      return;
    }
    const disableTransitions = options.transition?.enabled === false || options.suppressTransition === true;
    let cssNode = null;
    if (disableTransitions && typeof document !== "undefined" && document.head) {
      cssNode = document.createElement("style");
      cssNode.appendChild(
        document.createTextNode(
          `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
        )
      );
      document.head.appendChild(cssNode);
    }
    const batch = createDOMWriteBatch();
    const theme = options.theme;
    batch.setAttribute(options.attributeName, String(theme.name));
    if (theme.meta?.family) {
      batch.setAttribute("data-theme-family", theme.meta.family);
    } else {
      batch.setAttribute("data-theme-family", null);
    }
    if (theme.meta?.mode) {
      batch.setAttribute("data-theme-mode", theme.meta.mode);
    } else {
      batch.setAttribute("data-theme-mode", null);
    }
    if (options.selection) {
      const selection = options.selection.getSelection();
      batch.setAttribute("data-theme-selection-mode", selection.mode);
      batch.setAttribute(
        "data-theme-selection-family",
        selection.family ?? null
      );
    }
    batch.toggleClass("dark", getThemeMode(theme) === "dark");
    const mode = getThemeMode(theme);
    if (mode === "light" || mode === "dark") {
      batch.setStyle("color-scheme", mode);
    } else {
      batch.setStyle("color-scheme", null);
    }
    batch.flush(options.target);
    if (cssNode && typeof document !== "undefined" && document.head) {
      if (document.body) {
        void document.body.offsetHeight;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cssNode && document.head.contains(cssNode)) {
            document.head.removeChild(cssNode);
          }
        });
      });
    }
  }
  function createDOMBinding(store, options = {}) {
    const target = options.target ?? (typeof document !== "undefined" ? document.documentElement : null);
    if (!target) {
      return null;
    }
    const attributeName = options.attributeName ?? "data-theme";
    const subscribe = options.subscribe ?? true;
    const selection = options.selection ?? null;
    let transitionOption = options.transition;
    const applyTheme = (theme, emitOptions) => {
      applyDOMEffects({
        target,
        attributeName,
        theme,
        selection,
        ...transitionOption !== void 0 ? {
          transition: {
            ...transitionOption,
            // Transitions are enabled by default; only a transition
            // explicitly set to `false`, or an explicit suppression, turns
            // them off.
            enabled: (transitionOption.enabled ?? true) && !emitOptions?.suppressTransition
          }
        } : {}
      });
    };
    const applySelectionAttributes = () => applyDOMEffects({
      target,
      attributeName,
      theme: store.get(),
      selection,
      selectionOnly: true
    });
    const unsubscribeSelection = selection?.subscribe(applySelectionAttributes) ?? null;
    if (subscribe) {
      applyTheme(store.get(), { suppressTransition: true });
      const unsubscribe = store.subscribe(applyTheme);
      return {
        apply: applyTheme,
        setTransition(next) {
          transitionOption = next;
        },
        destroy() {
          unsubscribe();
          unsubscribeSelection?.();
        }
      };
    }
    return {
      apply: applyTheme,
      setTransition(next) {
        transitionOption = next;
      },
      destroy() {
        unsubscribeSelection?.();
      }
    };
  }
  var TOKEN_GROUPS = [
    "colors",
    "spacing",
    "radius",
    "shadows",
    "borderWidths",
    "zIndex",
    "breakpoints",
    "typography",
    "code"
  ];
  function addEntries(target, prefix, entries) {
    if (!entries) {
      return;
    }
    for (const [key, value] of Object.entries(entries)) {
      if (value === void 0 || value === null) continue;
      if (typeof value === "object") {
        addEntries(target, `${prefix}${key}-`, value);
      } else {
        target[`--${prefix}${key}`] = String(value);
      }
    }
  }
  function themeToCSSVariables(theme, options = {}) {
    const prefix = options.prefix ?? "theme-";
    const shouldInclude = (group) => !options.groups || options.groups.includes(group);
    const tokens = theme.tokens ? resolveTokens(theme.tokens) : void 0;
    const variables = {};
    if (shouldInclude("colors")) addEntries(variables, `${prefix}color-`, tokens?.colors);
    if (shouldInclude("spacing")) addEntries(variables, `${prefix}spacing-`, tokens?.spacing);
    if (shouldInclude("radius")) addEntries(variables, `${prefix}radius-`, tokens?.radius);
    if (shouldInclude("shadows")) addEntries(variables, `${prefix}shadow-`, tokens?.shadows);
    if (shouldInclude("borderWidths")) addEntries(variables, `${prefix}border-width-`, tokens?.borderWidths);
    if (shouldInclude("zIndex")) addEntries(variables, `${prefix}z-index-`, tokens?.zIndex);
    if (shouldInclude("breakpoints")) addEntries(variables, `${prefix}breakpoint-`, tokens?.breakpoints);
    if (shouldInclude("typography")) {
      const typography = tokens?.typography;
      addEntries(
        variables,
        `${prefix}typography-font-family-`,
        typography?.fontFamilies
      );
      addEntries(
        variables,
        `${prefix}typography-font-size-`,
        typography?.fontSizes
      );
      addEntries(
        variables,
        `${prefix}typography-line-height-`,
        typography?.lineHeights
      );
    }
    if (shouldInclude("code")) {
      addEntries(
        variables,
        `${prefix}code-`,
        tokens?.code
      );
    }
    return variables;
  }
  var TRANSITION_PRESETS = {
    smooth: [
      "color",
      "background",
      "background-color",
      "border-color",
      "outline-color",
      "fill",
      "stroke",
      "border-radius",
      "box-shadow",
      "text-shadow",
      "opacity"
    ],
    subtle: [
      "color",
      "background-color",
      "border-color",
      "outline-color",
      "fill",
      "stroke",
      "background",
      "box-shadow",
      "opacity"
    ],
    instant: ["opacity"]
  };
  var DEFAULT_THEME_TRANSITION = {
    enabled: true,
    duration: 300,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    // Prefer the View Transition API when the browser supports it: it captures a
    // snapshot of the old page and crossfades it, so a light→dark switch never
    // passes through bright intermediate colors (the CSS-custom-property
    // interpolation on `:root` is sRGB, so the background washes through gray).
    // Callers can opt out with `useViewTransition: false`; when the API is
    // unavailable (or the user prefers reduced motion) the code falls back to
    // the `@property`-based interpolation automatically.
    useViewTransition: true,
    properties: TRANSITION_PRESETS.smooth
  };
  var propertyRegistrationNodes = /* @__PURE__ */ new WeakMap();
  var registeredVariables = /* @__PURE__ */ new WeakMap();
  var transitionInitialized = /* @__PURE__ */ new WeakSet();
  function isColorValue(value) {
    return value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl") || value.startsWith("rgba") || value.startsWith("hsla") || value.startsWith("oklch") || value.startsWith("lab") || /^(aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|currentcolor|inherit|transparent)/i.test(
      value
    ) || value.includes("var(--");
  }
  function rebuildPropertyStylesheet(target) {
    const node = propertyRegistrationNodes.get(target);
    if (!node) return;
    const map = registeredVariables.get(target);
    if (!map || map.size === 0) {
      node.textContent = "";
      return;
    }
    const rules = [...map.entries()].map(([name, val]) => {
      const syntax = isColorValue(val) ? "<color>" : "<length>";
      return `@property ${name} { syntax: "${syntax}"; inherits: true; initial-value: ${val}; }`;
    }).join("\n");
    node.textContent = rules + "\n";
  }
  function registerCSSProperty(target, variableName, value) {
    const map = registeredVariables.get(target);
    const existing = map?.get(variableName);
    if (existing === value) {
      return;
    }
    if (!map) {
      registeredVariables.set(target, /* @__PURE__ */ new Map());
    }
    registeredVariables.get(target).set(variableName, value);
    if (typeof document === "undefined" || !document.head) {
      return;
    }
    let node = propertyRegistrationNodes.get(target);
    if (!node) {
      node = document.createElement("style");
      node.setAttribute("data-themvora-property-registration", "");
      document.head.appendChild(node);
      propertyRegistrationNodes.set(target, node);
    }
    rebuildPropertyStylesheet(target);
  }
  function registerThemeProperties(target, variables, prefix) {
    if (transitionInitialized.has(target)) return;
    const colorPrefix = `--${prefix}color-`;
    for (const [variable, value] of Object.entries(variables)) {
      if (variable.startsWith(colorPrefix) && value !== void 0) {
        registerCSSProperty(target, variable, value);
      }
    }
    transitionInitialized.add(target);
  }
  function getRegisteredVariableList(target) {
    const map = registeredVariables.get(target);
    return map ? [...map.keys()] : [];
  }
  var EMPTY_THEME_DIFF = {
    colors: false,
    radius: false,
    spacing: false,
    typography: false,
    shadows: false,
    borders: false,
    layout: false,
    transforms: false
  };
  var GROUP_VAR_PREFIXES = {
    colors: ["--theme-color-"],
    radius: ["--theme-radius-"],
    spacing: ["--theme-spacing-"],
    typography: ["--theme-typography-"],
    shadows: ["--theme-shadow-"],
    borders: ["--theme-border-width-"],
    layout: ["--theme-z-index-", "--theme-breakpoint-"],
    transforms: []
  };
  function buildVarPrefixes(prefix) {
    if (prefix === void 0 || prefix === "" || prefix === "theme-") {
      return GROUP_VAR_PREFIXES;
    }
    const dash = prefix.endsWith("-") ? prefix : `${prefix}-`;
    const base = `--${dash}`;
    return {
      colors: [`${base}color-`],
      radius: [`${base}radius-`],
      spacing: [`${base}spacing-`],
      typography: [`${base}typography-`],
      shadows: [`${base}shadow-`],
      borders: [`${base}border-width-`],
      layout: [`${base}z-index-`, `${base}breakpoint-`],
      transforms: []
    };
  }
  function groupChanged(prev, next, prefixes) {
    if (prefixes.length === 0) return false;
    const keys = /* @__PURE__ */ new Set();
    for (const prefix of prefixes) {
      for (const key of prev.keys()) {
        if (key.startsWith(prefix)) keys.add(key);
      }
      for (const key of Object.keys(next)) {
        if (key.startsWith(prefix)) keys.add(key);
      }
    }
    for (const key of keys) {
      if (prev.get(key) !== next[key]) return true;
    }
    return false;
  }
  function createThemeDiff(prev, next, prefix) {
    if (!prev || prev.size === 0) {
      return { ...EMPTY_THEME_DIFF };
    }
    const prefixes = buildVarPrefixes(prefix);
    const diff = { ...EMPTY_THEME_DIFF };
    for (const group of Object.keys(GROUP_VAR_PREFIXES)) {
      if (groupChanged(prev, next, prefixes[group])) {
        diff[group] = true;
      }
    }
    return diff;
  }
  var GROUP_PROPERTIES = {
    colors: [],
    radius: ["border-radius"],
    spacing: [
      "padding",
      "margin",
      "gap",
      "row-gap",
      "column-gap",
      "scroll-padding",
      "scroll-margin"
    ],
    typography: [
      "font-size",
      "line-height",
      "letter-spacing",
      "word-spacing",
      "text-indent",
      "font-weight",
      "text-shadow"
    ],
    shadows: ["box-shadow", "filter", "backdrop-filter"],
    borders: [
      "border-width",
      "outline-width",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width"
    ],
    transforms: ["transform"],
    opacity: ["opacity"]
  };
  var COLORISH = /* @__PURE__ */ new Set([
    "color",
    "background",
    "background-color",
    "border-color",
    "outline-color",
    "fill",
    "stroke",
    "text-decoration-color"
  ]);
  function resolvePresetFilter(preset) {
    if (preset == null) return null;
    if (Array.isArray(preset)) return preset;
    return TRANSITION_PRESETS[preset] ?? null;
  }
  function reduceMotion() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function createTransitionPlan(diff, options, env) {
    const transition = {
      ...DEFAULT_THEME_TRANSITION,
      ...options
    };
    if (!transition.enabled) return null;
    if (env?.reducedMotion ?? reduceMotion()) return null;
    const filter = resolvePresetFilter(transition.preset);
    if (filter && filter.length === 1 && filter[0] === "opacity") {
      return null;
    }
    const elementProperties = [];
    const consider = (group, props) => {
      if (!diff[group]) return;
      for (const prop of props) {
        if (filter == null || filter.includes(prop)) {
          elementProperties.push(prop);
        }
      }
    };
    consider("radius", GROUP_PROPERTIES.radius);
    consider("spacing", GROUP_PROPERTIES.spacing);
    consider("typography", GROUP_PROPERTIES.typography);
    consider("shadows", GROUP_PROPERTIES.shadows);
    consider("borders", GROUP_PROPERTIES.borders);
    consider("transforms", GROUP_PROPERTIES.transforms);
    const animatesColors = diff.colors && (filter == null || filter.some((p) => COLORISH.has(p)));
    if (!animatesColors && elementProperties.length === 0) {
      return null;
    }
    return {
      animatesColors,
      elementProperties,
      duration: transition.duration,
      easing: transition.easing
    };
  }
  var SHORTHAND_CHECKS = {
    padding: () => everyOneOf(
      ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
      "0px"
    ),
    margin: () => everyOneOf(["marginTop", "marginRight", "marginBottom", "marginLeft"], "0px"),
    "border-radius": () => oneOf(["borderRadius"], "0px"),
    gap: () => oneOf(["gap"], "normal"),
    "row-gap": () => oneOf(["rowGap"], "normal"),
    "column-gap": () => oneOf(["columnGap"], "normal"),
    "scroll-padding": () => everyOneOf(
      [
        "scrollPaddingTop",
        "scrollPaddingRight",
        "scrollPaddingBottom",
        "scrollPaddingLeft"
      ],
      "auto"
    ),
    "scroll-margin": () => everyOneOf(
      [
        "scrollMarginTop",
        "scrollMarginRight",
        "scrollMarginBottom",
        "scrollMarginLeft"
      ],
      "0px"
    ),
    "font-size": () => oneOf(["fontSize"], "16px"),
    "line-height": () => oneOf(["lineHeight"], "normal"),
    "letter-spacing": () => oneOf(["letterSpacing"], "normal"),
    "word-spacing": () => oneOf(["wordSpacing"], "normal"),
    "text-indent": () => oneOf(["textIndent"], "0px"),
    "font-weight": () => oneOf(["fontWeight"], "400"),
    "text-shadow": () => oneOf(["textShadow"], "none"),
    "box-shadow": () => oneOf(["boxShadow"], "none"),
    filter: () => oneOf(["filter"], "none"),
    "backdrop-filter": () => oneOf(["backdropFilter"], "none"),
    "border-width": () => everyOneOf(
      [
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth"
      ],
      "0px"
    ),
    "outline-width": () => oneOf(["outlineWidth"], "0px")
  };
  function oneOf(keys, initial) {
    const key = keys[0];
    return {
      has(cs) {
        const value = cs[key];
        return value !== initial && value !== "";
      }
    };
  }
  function everyOneOf(keys, initial) {
    return {
      has(cs) {
        const record = cs;
        return keys.some((k) => record[k] !== initial && record[k] !== "");
      }
    };
  }
  function needsAnimation(cs, properties) {
    for (const prop of properties) {
      const maker = SHORTHAND_CHECKS[prop];
      if (!maker) return true;
      if (maker().has(cs)) return true;
    }
    return false;
  }
  function isVisible(cs) {
    if (cs.display === "none") return false;
    if (cs.visibility === "hidden" || cs.visibility === "collapse") return false;
    const opacity = parseFloat(cs.opacity);
    if (!Number.isNaN(opacity) && opacity === 0) return false;
    if (cs.contentVisibility === "hidden") return false;
    return true;
  }
  function scanForTransition(root, properties) {
    const result = [];
    if (properties.length === 0) return result;
    if (typeof document === "undefined" || typeof NodeFilter === "undefined") {
      return result;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      const el = node;
      if (el.nodeType === 1 && el !== root && !el.hasAttribute("data-themvora-host")) {
        const cs = getComputedStyle(el);
        if (isVisible(cs) && needsAnimation(cs, properties)) {
          result.push(el);
        }
      }
      node = walker.nextNode();
    }
    return result;
  }
  var activeRuns = /* @__PURE__ */ new WeakMap();
  var ROOT_TRANSITION_NODES = /* @__PURE__ */ new WeakMap();
  var SUPPRESSION_NODES = /* @__PURE__ */ new WeakMap();
  var SUPPRESSION_DEPTH = /* @__PURE__ */ new WeakMap();
  function ensureRootTransitionStyle(target, list) {
    if (typeof document === "undefined" || !document.head) return;
    let node = ROOT_TRANSITION_NODES.get(target);
    if (!node || !node.isConnected) {
      node = document.createElement("style");
      node.setAttribute("data-themvora-transition", "");
      document.head.appendChild(node);
      ROOT_TRANSITION_NODES.set(target, node);
    }
    const css = `:root { transition: ${list}; }`;
    if (node.textContent !== css) {
      node.textContent = css;
    }
  }
  function ensureSuppressionStyle(target) {
    if (typeof document === "undefined" || !document.head) return;
    let node = SUPPRESSION_NODES.get(target);
    if (!node || !node.isConnected) {
      node = document.createElement("style");
      node.setAttribute("data-themvora-animating-style", "");
      node.textContent = "[data-themvora-animating] :not([data-themvora-animating]) { transition: none !important; }";
      document.head.appendChild(node);
      SUPPRESSION_NODES.set(target, node);
    }
  }
  function setAnimatingAttribute(target, on) {
    if (on) {
      target.setAttribute("data-themvora-animating", "");
    } else {
      target.removeAttribute("data-themvora-animating");
    }
  }
  function beginDescendantTransitionSuppression(target) {
    ensureSuppressionStyle(target);
    SUPPRESSION_DEPTH.set(target, (SUPPRESSION_DEPTH.get(target) ?? 0) + 1);
    setAnimatingAttribute(target, true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const depth = Math.max(0, (SUPPRESSION_DEPTH.get(target) ?? 1) - 1);
      if (depth === 0) {
        SUPPRESSION_DEPTH.delete(target);
        if (!activeRuns.has(target)) setAnimatingAttribute(target, false);
        return;
      }
      SUPPRESSION_DEPTH.set(target, depth);
    };
  }
  function reducedMotion() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function cleanup(run) {
    for (const [el, prev] of run.previous) {
      if (prev.property !== "") {
        el.style.setProperty("transition-property", prev.property);
      } else {
        el.style.removeProperty("transition-property");
      }
      if (prev.duration !== "") {
        el.style.setProperty("transition-duration", prev.duration);
      } else {
        el.style.removeProperty("transition-duration");
      }
      if (prev.easing !== "") {
        el.style.setProperty("transition-timing-function", prev.easing);
      } else {
        el.style.removeProperty("transition-timing-function");
      }
    }
    run.previous.clear();
    run.elements.clear();
    run.target.style.removeProperty("transition");
    setAnimatingAttribute(run.target, false);
  }
  function cancelActive(target) {
    const run = activeRuns.get(target);
    if (!run) return;
    if (run.raf !== 0) cancelAnimationFrame(run.raf);
    if (run.timer) clearTimeout(run.timer);
    cleanup(run);
    activeRuns.delete(target);
  }
  function runThemeAnimation(input) {
    const { target, plan } = input;
    cancelActive(target);
    if (reducedMotion()) {
      input.swap();
      return;
    }
    const elements = /* @__PURE__ */ new Set();
    const previous = /* @__PURE__ */ new Map();
    ensureSuppressionStyle(target);
    setAnimatingAttribute(target, true);
    if (plan.animatesColors) {
      const vars = getRegisteredVariableList(target);
      if (vars.length > 0) {
        const list = vars.map((v) => `${v} ${plan.duration}ms ${plan.easing}`).join(", ");
        target.style.setProperty("transition", list);
        if (typeof document !== "undefined" && target === document.documentElement) {
          ensureRootTransitionStyle(target, list);
        }
        elements.add(target);
      }
    }
    if (plan.elementProperties.length > 0) {
      const props = plan.elementProperties.join(", ");
      for (const el of scanForTransition(target, plan.elementProperties)) {
        previous.set(el, {
          property: el.style.getPropertyValue("transition-property"),
          duration: el.style.getPropertyValue("transition-duration"),
          easing: el.style.getPropertyValue("transition-timing-function")
        });
        el.style.setProperty("transition-property", props, "important");
        el.style.setProperty("transition-duration", `${plan.duration}ms`, "important");
        el.style.setProperty("transition-timing-function", plan.easing, "important");
        elements.add(el);
      }
    }
    void target.offsetHeight;
    const run = {
      target,
      elements,
      previous,
      raf: 0,
      timer: null
    };
    activeRuns.set(target, run);
    run.raf = requestAnimationFrame(() => {
      run.raf = 0;
      input.swap();
      run.timer = setTimeout(() => {
        run.timer = null;
        cleanup(run);
        if (activeRuns.get(target) === run) activeRuns.delete(target);
      }, plan.duration + (input.buffer ?? 100));
    });
  }
  function cancelThemeAnimation(target) {
    cancelActive(target);
  }
  function disposeThemeTransitionStyles(target) {
    cancelActive(target);
    SUPPRESSION_DEPTH.delete(target);
    const root = ROOT_TRANSITION_NODES.get(target);
    if (root) {
      root.remove();
      ROOT_TRANSITION_NODES.delete(target);
    }
    const suppression = SUPPRESSION_NODES.get(target);
    if (suppression) {
      suppression.remove();
      SUPPRESSION_NODES.delete(target);
    }
    setAnimatingAttribute(target, false);
  }
  function prefersReducedMotion() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function createCSSVariablesBinding(store, options = {}) {
    const target = options.target ?? (typeof document !== "undefined" ? document.documentElement : null);
    if (!target && !options.styleSheet) {
      return null;
    }
    const element = target;
    const prefix = options.prefix ?? "theme-";
    const useStyleSheet = options.styleSheet ?? false;
    const layerName = options.layerName ?? "themvora";
    let transitionOption = options.transition;
    let appliedVariables = /* @__PURE__ */ new Map();
    function applyTheme(theme, emitOptions) {
      const variables = themeToCSSVariables(theme, { prefix });
      const suppressTransition = emitOptions?.suppressTransition ?? false;
      let cssNode = null;
      if (suppressTransition && typeof document !== "undefined" && document.head && !useStyleSheet) {
        cssNode = document.createElement("style");
        cssNode.appendChild(
          document.createTextNode(
            `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
          )
        );
        document.head.appendChild(cssNode);
      }
      if (useStyleSheet && typeof document !== "undefined") {
        applyStyleSheet(theme, variables, prefix, layerName);
        if (cssNode && document.head.contains(cssNode)) {
          document.head.removeChild(cssNode);
        }
        return;
      }
      const applyNow = () => {
        options.onBeforeSwap?.(theme, emitOptions);
        applyInlineVariables(element, variables);
      };
      const transition = { ...DEFAULT_THEME_TRANSITION, ...transitionOption };
      const supportsViewTransition = typeof document !== "undefined" && "startViewTransition" in document && typeof document.startViewTransition === "function";
      const useViewTransition = transition.enabled && !prefersReducedMotion() && transition.useViewTransition && supportsViewTransition;
      if (suppressTransition) {
        applyNow();
      } else if (useViewTransition) {
        const releaseSuppression = beginDescendantTransitionSuppression(element);
        const viewTransition = document.startViewTransition(() => {
          applyNow();
          return Promise.resolve();
        });
        viewTransition?.ready?.catch?.(() => {
        });
        viewTransition?.finished?.catch?.(() => {
        });
        if (viewTransition?.finished?.then) {
          viewTransition.finished.then(releaseSuppression, releaseSuppression);
        } else {
          releaseSuppression();
        }
      } else {
        const plan = createTransitionPlan(
          createThemeDiff(appliedVariables, variables),
          transitionOption,
          { reducedMotion: prefersReducedMotion() }
        );
        if (plan) {
          runThemeAnimation({
            target: element,
            plan,
            swap: applyNow
          });
        } else {
          applyNow();
        }
      }
      if (cssNode && typeof document !== "undefined" && document.head) {
        if (document.body) {
          void document.body.offsetHeight;
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (cssNode && document.head.contains(cssNode)) {
              document.head.removeChild(cssNode);
            }
          });
        });
      }
    }
    function applyInlineVariables(element2, variables) {
      const batch = createDOMWriteBatch();
      for (const [variable, value] of Object.entries(variables)) {
        const previous = appliedVariables.get(variable);
        if (previous === value) continue;
        batch.setStyle(variable, value);
      }
      for (const variable of appliedVariables.keys()) {
        if (!(variable in variables)) {
          batch.setStyle(variable, null);
        }
      }
      batch.flush(element2);
      appliedVariables = new Map(Object.entries(variables));
    }
    function applyStyleSheet(theme, variables, cssPrefix, layer) {
      const id = `tv-vars-${layer}`;
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("style");
        el.id = id;
        document.head.appendChild(el);
      }
      const cssVars = Object.entries(variables).filter(([key]) => {
        const prev = appliedVariables.get(key);
        return prev === void 0 || prev !== variables[key];
      }).map(([key, value]) => `  ${key}: ${value};`).join("\n");
      const removedVars = [...appliedVariables.keys()].filter((key) => !(key in variables)).map((key) => `  ${key}: initial;`).join("\n");
      const block = [cssVars, removedVars].filter(Boolean).join("\n");
      if (block) {
        el.textContent = `@layer ${layer} {
  :root {
${block}
  }
}`;
      }
      appliedVariables = new Map(Object.entries(variables));
    }
    if (element) {
      const initialVariables = themeToCSSVariables(store.get(), { prefix });
      registerThemeProperties(element, initialVariables, prefix);
    }
    if (element) {
      for (let i = 0; i < element.style.length; i++) {
        const property = element.style.item(i);
        if (property.startsWith(`--${prefix}`)) {
          appliedVariables.set(property, element.style.getPropertyValue(property));
        }
      }
    }
    applyTheme(store.get(), { suppressTransition: true });
    const unsubscribe = store.subscribe(applyTheme);
    return {
      /**
       * Replace the transition options used by subsequent theme changes, without
       * rebuilding the binding or touching the current theme.
       *
       * Turning transitions off also releases the persistent `:root` transition
       * stylesheet the animation coordinator installed: left in place it would
       * keep interpolating every later variable swap even though the planner now
       * returns `null` (see {@link disposeThemeTransitionStyles}).
       */
      setTransition(next) {
        transitionOption = next;
        if (next?.enabled === false && element) {
          disposeThemeTransitionStyles(element);
        }
      },
      destroy() {
        unsubscribe();
        if (element) disposeThemeTransitionStyles(element);
        appliedVariables.clear();
      }
    };
  }
  function describeMode(value) {
    return typeof value === "string" ? `"${value}"` : String(value);
  }
  function emitInvalidModeDiagnostic(received) {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_MODE_INVALID",
        level: "warning",
        message: `setMode() received an unknown mode ${describeMode(received)}; the mode was left unchanged.`,
        context: {
          api: "setMode",
          property: "mode",
          received,
          expected: "light | dark | system"
        },
        hint: 'Pass one of "light", "dark" or "system". A mode read from storage, a cookie or an element attribute should be validated before it is passed in.'
      })
    );
  }
  function emitSyncFailedDiagnostic(api, adapter, cause) {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_SYNC_FAILED",
        level: "warning",
        message: adapter === "persistence" ? `The ${adapter} adapter threw while ${api}() was applying a selection; the theme was applied but the selection was not persisted.` : `The ${adapter} adapter threw while ${api}() was applying a selection; the theme was applied locally but other tabs were not notified.`,
        context: { api, property: adapter },
        hint: adapter === "persistence" ? "Storage may be blocked (private mode, a sandboxed iframe, a full quota). Pass a persistence adapter that tolerates that, or expect the selection to reset on reload." : "A BroadcastChannel throws after close() or when the value cannot be cloned. Recreate the adapter after destroying it.",
        cause
      })
    );
  }
  function runSyncAdapter(api, adapter, run) {
    try {
      run();
    } catch (cause) {
      emitSyncFailedDiagnostic(api, adapter, cause);
    }
  }
  function isThemeSelectionState(value) {
    return typeof value === "object" && value !== null && "mode" in value && "family" in value && value.mode !== void 0 && value.family !== void 0;
  }
  function createThemeSelectionBroadcast(options = {}) {
    const channel = options.channel ?? (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(options.channelName ?? "theme-selection") : null);
    if (!channel) return null;
    return {
      post(value) {
        channel.postMessage(value);
      },
      subscribe(listener) {
        const handler = (event) => {
          if (isThemeSelectionState(event.data)) {
            listener(event.data);
          }
        };
        channel.addEventListener("message", handler);
        return () => {
          channel.removeEventListener("message", handler);
        };
      },
      destroy() {
        channel.close();
      }
    };
  }
  function prefersReducedMotion2() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function systemPrefersDark() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function resolveScopedTheme(themes, selection, prefersDark = false) {
    let name;
    let family;
    let mode;
    if (typeof selection === "string") {
      name = selection;
    } else if ("name" in selection) {
      name = selection.name;
    } else {
      family = selection.family;
      mode = selection.mode;
    }
    if (name !== void 0) {
      const exact = themes.find((t) => t.name === name);
      if (exact) {
        return resolveTheme(themes, String(exact.name));
      }
      family = family ?? name;
    }
    const effectiveMode = mode === "system" ? prefersDark ? "dark" : "light" : mode ?? "light";
    const familyMatch = family !== void 0 ? themes.filter((t) => getThemeFamily(t) === family) : [];
    if (familyMatch.length > 0) {
      const byMode = familyMatch.find((t) => getThemeMode(t) === effectiveMode);
      const selected = byMode ?? familyMatch.find((t) => getThemeMode(t) === "light") ?? familyMatch[0];
      if (selected) {
        return resolveTheme(themes, String(selected.name));
      }
    }
    const first = themes[0];
    if (!first) {
      throw new Error("At least one theme must be provided to a ThemeScope.");
    }
    return resolveTheme(themes, String(first.name));
  }
  function resolveScopeTransition(parent, local) {
    if (local === void 0 || local === true) {
      return parent;
    }
    if (local === false) {
      return { enabled: false };
    }
    return { ...parent, ...local };
  }
  function createScopedThemeBinding(themes, target, selection, options = {}) {
    const prefix = options.prefix ?? "theme-";
    let localThemes = options.localThemes;
    let baseThemes = [
      ...localThemes ?? [],
      ...themes
    ];
    let transition = options.transition;
    let prefersDark = options.prefersDark ?? systemPrefersDark();
    let currentSelection = selection;
    let appliedVariables = /* @__PURE__ */ new Map();
    let currentTheme;
    const previousStyle = target.getAttribute("style");
    function updateStateAttributes(theme) {
      const isDark = getThemeMode(theme) === "dark";
      target.classList.toggle("dark", isDark);
      target.setAttribute("data-theme", String(theme.name));
      target.setAttribute("data-mode", isDark ? "dark" : "light");
    }
    function writeVariables(variables) {
      const next = /* @__PURE__ */ new Map();
      for (const [variable, value] of Object.entries(variables)) {
        target.style.setProperty(variable, value);
        next.set(variable, value);
        if (variable.startsWith(`--${prefix}color-`)) {
          const colorKey = variable.replace(`--${prefix}color-`, "");
          const kebabKey = colorKey.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          const twVar = `--color-${kebabKey}`;
          target.style.setProperty(twVar, value);
          next.set(twVar, value);
        } else if (variable.startsWith(`--${prefix}radius-`)) {
          const radiusKey = variable.replace(`--${prefix}radius-`, "");
          const twVar = `--radius-${radiusKey}`;
          target.style.setProperty(twVar, value);
          next.set(twVar, value);
        }
      }
      for (const variable of appliedVariables.keys()) {
        if (!next.has(variable)) {
          target.style.removeProperty(variable);
        }
      }
      appliedVariables = next;
    }
    function apply(selectionValue, animate) {
      baseThemes = [...localThemes ?? [], ...themes];
      const theme = resolveScopedTheme(
        baseThemes,
        selectionValue,
        prefersDark
      );
      currentTheme = theme;
      currentSelection = selectionValue;
      const variables = themeToCSSVariables(theme, { prefix });
      if (animate && transition && appliedVariables.size > 0 && typeof document !== "undefined" && !prefersReducedMotion2()) {
        const plan = createTransitionPlan(
          createThemeDiff(appliedVariables, variables, prefix),
          transition,
          { reducedMotion: prefersReducedMotion2() }
        );
        if (plan) {
          runThemeAnimation({
            target,
            plan,
            swap: () => {
              writeVariables(variables);
              updateStateAttributes(theme);
            }
          });
        } else {
          writeVariables(variables);
          updateStateAttributes(theme);
        }
      } else {
        registerThemeProperties(target, variables, prefix);
        writeVariables(variables);
        updateStateAttributes(theme);
      }
    }
    apply(selection, false);
    return {
      /** Apply a new scoped selection (theme name / family / family+mode),
       *  animating the diff through the configured transition. */
      update(nextSelection) {
        apply(nextSelection, true);
      },
      /** The currently applied, extends-resolved theme definition. */
      getTheme() {
        return currentTheme;
      },
      /** Update the transition config (e.g. in response to a prop change)
       *  without recreating the binding. */
      setTransition(nextTransition) {
        transition = nextTransition;
      },
      /** Update the local theme definitions (e.g. a late-loaded pack). */
      setLocalThemes(nextLocalThemes) {
        localThemes = nextLocalThemes;
        apply(currentSelection, false);
      },
      /**
       * Re-resolve the current selection against the live catalog.
       *
       * Call this when the owning runtime's catalog changed (subscribe to
       * `runtime.registry.subscribe`): the scope's theme may have been removed,
       * or its definition replaced. Without it the element keeps the variables
       * of a theme the runtime no longer knows about.
       */
      refresh() {
        apply(currentSelection, false);
      },
      destroy() {
        cancelThemeAnimation(target);
        if (previousStyle != null) {
          target.setAttribute("style", previousStyle);
        } else {
          target.removeAttribute("style");
        }
        appliedVariables.clear();
        target.removeAttribute("data-theme");
        target.removeAttribute("data-mode");
        target.classList.remove("dark");
      }
    };
  }
  var DEFAULT_TIMEZONE_LOCATION = [40.7128, -74.006];
  var TIMEZONE_LOCATIONS = {
    // Africa
    "Africa/Abidjan": [5.36, -4.02],
    "Africa/Accra": [5.56, -0.22],
    "Africa/Addis_Ababa": [9.03, 38.75],
    "Africa/Algiers": [36.75, 3.06],
    "Africa/Asmara": [15.33, 38.93],
    "Africa/Bamako": [12.65, -8],
    "Africa/Bangui": [4.37, 18.58],
    "Africa/Banjul": [13.46, -16.65],
    "Africa/Bissau": [11.86, -15.6],
    "Africa/Blantyre": [-15.79, 35.01],
    "Africa/Brazzaville": [-4.27, 15.28],
    "Africa/Bujumbura": [-3.38, 29.36],
    "Africa/Cairo": [30.05, 31.25],
    "Africa/Casablanca": [33.57, -7.58],
    "Africa/Ceuta": [35.88, -5.32],
    "Africa/Conakry": [9.54, -13.68],
    "Africa/Dakar": [14.69, -17.45],
    "Africa/Dar_es_Salaam": [-6.8, 39.28],
    "Africa/Djibouti": [11.59, 43.15],
    "Africa/Douala": [4.05, 9.7],
    "Africa/El_Aaiun": [27.15, -13.2],
    "Africa/Freetown": [8.48, -13.24],
    "Africa/Gaborone": [-24.65, 25.91],
    "Africa/Harare": [-17.83, 31.05],
    "Africa/Johannesburg": [-26.2, 28.05],
    "Africa/Juba": [4.85, 31.58],
    "Africa/Kampala": [0.32, 32.58],
    "Africa/Khartoum": [15.6, 32.53],
    "Africa/Kigali": [-1.95, 30.06],
    "Africa/Kinshasa": [-4.32, 15.31],
    "Africa/Lagos": [6.45, 3.39],
    "Africa/Libreville": [0.39, 9.45],
    "Africa/Lome": [6.14, 1.21],
    "Africa/Luanda": [-8.84, 13.23],
    "Africa/Lubumbashi": [-11.66, 27.48],
    "Africa/Lusaka": [-15.42, 28.28],
    "Africa/Malabo": [3.75, 8.78],
    "Africa/Maputo": [-25.97, 32.57],
    "Africa/Maseru": [-29.32, 27.48],
    "Africa/Mbabane": [-26.32, 31.13],
    "Africa/Mogadishu": [2.07, 45.34],
    "Africa/Monrovia": [6.31, -10.8],
    "Africa/Nairobi": [-1.28, 36.82],
    "Africa/Ndjamena": [12.11, 15.04],
    "Africa/Niamey": [13.51, 2.11],
    "Africa/Nouakchott": [18.09, -15.98],
    "Africa/Ouagadougou": [12.37, -1.53],
    "Africa/Porto-Novo": [6.5, 2.6],
    "Africa/Sao_Tome": [0.34, 6.73],
    "Africa/Tripoli": [32.9, 13.19],
    "Africa/Tunis": [36.8, 10.18],
    "Africa/Windhoek": [-22.57, 17.08],
    // America
    "America/Adak": [51.88, -176.65],
    "America/Anchorage": [61.22, -149.9],
    "America/Anguilla": [18.22, -63.05],
    "America/Antigua": [17.12, -61.85],
    "America/Araguaina": [-7.19, -48.21],
    "America/Argentina/Buenos_Aires": [-34.6, -58.38],
    "America/Argentina/Catamarca": [-28.47, -65.79],
    "America/Argentina/Cordoba": [-31.4, -64.18],
    "America/Argentina/Jujuy": [-24.19, -65.3],
    "America/Argentina/La_Rioja": [-29.41, -66.86],
    "America/Argentina/Mendoza": [-32.89, -68.84],
    "America/Argentina/Rio_Gallegos": [-51.62, -69.22],
    "America/Argentina/Salta": [-24.79, -65.41],
    "America/Argentina/San_Juan": [-31.54, -68.53],
    "America/Argentina/San_Luis": [-33.3, -66.34],
    "America/Argentina/Tucuman": [-26.82, -65.22],
    "America/Argentina/Ushuaia": [-54.8, -68.31],
    "America/Aruba": [12.52, -70.03],
    "America/Asuncion": [-25.27, -57.63],
    "America/Atikokan": [48.75, -91.62],
    "America/Bahia": [-12.98, -38.52],
    "America/Bahia_Banderas": [20.8, -105.25],
    "America/Barbados": [13.1, -59.62],
    "America/Belem": [-1.46, -48.5],
    "America/Belize": [17.5, -88.2],
    "America/Blanc-Sablon": [51.43, -57.13],
    "America/Boa_Vista": [2.82, -60.67],
    "America/Bogota": [4.6, -74.08],
    "America/Boise": [43.6, -116.2],
    "America/Cambridge_Bay": [69.11, -105.06],
    "America/Campo_Grande": [-20.45, -54.62],
    "America/Cancun": [21.08, -86.77],
    "America/Caracas": [10.5, -66.93],
    "America/Cayenne": [4.94, -52.33],
    "America/Cayman": [19.3, -81.38],
    "America/Chicago": [41.85, -87.65],
    "America/Chihuahua": [28.63, -106.07],
    "America/Ciudad_Juarez": [31.66, -106.43],
    "America/Costa_Rica": [9.93, -84.08],
    "America/Creston": [49.1, -116.51],
    "America/Cuiaba": [-15.6, -56.1],
    "America/Curacao": [12.12, -68.93],
    "America/Danmarkshavn": [76.77, -18.67],
    "America/Dawson": [64.06, -139.43],
    "America/Dawson_Creek": [59.77, -120.24],
    "America/Denver": [39.74, -104.98],
    "America/Detroit": [42.33, -83.05],
    "America/Dominica": [15.3, -61.39],
    "America/Edmonton": [53.55, -113.49],
    "America/Eirunepe": [-6.66, -69.87],
    "America/El_Salvador": [13.69, -89.19],
    "America/Fort_Nelson": [58.81, -122.7],
    "America/Fortaleza": [-3.72, -38.54],
    "America/Glace_Bay": [46.2, -59.97],
    "America/Goose_Bay": [53.3, -60.42],
    "America/Grand_Turk": [21.47, -71.14],
    "America/Grenada": [12.05, -61.75],
    "America/Guadeloupe": [16.27, -61.53],
    "America/Guatemala": [14.63, -90.52],
    "America/Guayaquil": [-2.17, -79.92],
    "America/Guyana": [6.8, -58.16],
    "America/Halifax": [44.65, -63.58],
    "America/Havana": [23.13, -82.37],
    "America/Hermosillo": [29.07, -110.96],
    "America/Indiana/Indianapolis": [39.77, -86.16],
    "America/Indiana/Knox": [41.3, -86.62],
    "America/Indiana/Marengo": [38.38, -86.34],
    "America/Indiana/Petersburg": [38.49, -87.28],
    "America/Indiana/Tell_City": [37.95, -86.76],
    "America/Indiana/Vevay": [38.75, -85.07],
    "America/Indiana/Vincennes": [38.68, -87.53],
    "America/Indiana/Winamac": [41.05, -86.6],
    "America/Inuvik": [68.36, -133.71],
    "America/Iqaluit": [63.75, -68.52],
    "America/Jamaica": [17.97, -76.79],
    "America/Juneau": [58.3, -134.42],
    "America/Kentucky/Louisville": [38.25, -85.77],
    "America/Kentucky/Monticello": [36.83, -84.85],
    "America/La_Paz": [-16.5, -68.15],
    "America/Lima": [-12.05, -77.05],
    "America/Los_Angeles": [34.05, -118.24],
    "America/Lower_Princes": [18.05, -63.05],
    "America/Maceio": [-9.67, -35.74],
    "America/Managua": [12.15, -86.27],
    "America/Manaus": [-3.13, -60.02],
    "America/Marigot": [18.07, -63.08],
    "America/Martinique": [14.6, -61.07],
    "America/Matamoros": [25.87, -97.5],
    "America/Mazatlan": [23.23, -106.42],
    "America/Menominee": [45.1, -87.62],
    "America/Merida": [20.97, -89.62],
    "America/Metlakatla": [55.13, -131.57],
    "America/Mexico_City": [19.43, -99.13],
    "America/Miquelon": [47.05, -56.38],
    "America/Moncton": [46.1, -64.78],
    "America/Monterrey": [25.67, -100.32],
    "America/Montevideo": [-34.9, -56.22],
    "America/Montserrat": [16.7, -62.22],
    "America/Nassau": [25.05, -77.47],
    "America/New_York": [40.71, -74.01],
    "America/Nipigon": [49.02, -88.27],
    "America/Nome": [64.5, -165.4],
    "America/Noronha": [-3.85, -32.42],
    "America/North_Dakota/Beulah": [47.26, -101.78],
    "America/North_Dakota/Center": [47.12, -101.3],
    "America/North_Dakota/New_Salem": [46.84, -100.49],
    "America/Nuuk": [64.18, -51.72],
    "America/Ojinaga": [29.57, -104.52],
    "America/Panama": [8.97, -79.52],
    "America/Pangnirtung": [66.15, -65.7],
    "America/Paramaribo": [5.87, -55.17],
    "America/Phoenix": [33.45, -112.07],
    "America/Port-au-Prince": [18.54, -72.34],
    "America/Port_of_Spain": [10.65, -61.52],
    "America/Porto_Velho": [-8.76, -63.9],
    "America/Puerto_Rico": [18.47, -66.11],
    "America/Punta_Arenas": [-53.15, -70.92],
    "America/Rainy_River": [48.72, -94.57],
    "America/Rankin_Inlet": [62.82, -92.08],
    "America/Recife": [-8.05, -34.9],
    "America/Regina": [50.45, -104.62],
    "America/Resolute": [74.7, -94.98],
    "America/Rio_Branco": [-9.97, -67.8],
    "America/Santarem": [-2.44, -54.7],
    "America/Santiago": [-33.45, -70.66],
    "America/Santo_Domingo": [18.47, -69.89],
    "America/Sao_Paulo": [-23.55, -46.63],
    "America/Scoresbysund": [70.48, -21.97],
    "America/Sitka": [57.17, -135.3],
    "America/St_Barthelemy": [17.9, -62.85],
    "America/St_Johns": [47.57, -52.71],
    "America/St_Kitts": [17.3, -62.72],
    "America/St_Lucia": [14, -60.99],
    "America/St_Thomas": [18.34, -64.93],
    "America/St_Vincent": [13.16, -61.23],
    "America/Swift_Current": [50.28, -107.8],
    "America/Tegucigalpa": [14.1, -87.2],
    "America/Thule": [76.57, -68.78],
    "America/Thunder_Bay": [48.38, -89.25],
    "America/Tijuana": [32.5, -117.02],
    "America/Toronto": [43.65, -79.38],
    "America/Tortola": [18.43, -64.62],
    "America/Vancouver": [49.25, -123.12],
    "America/Whitehorse": [60.72, -135.06],
    "America/Winnipeg": [49.88, -97.15],
    "America/Yakutat": [59.55, -139.73],
    "America/Yellowknife": [62.45, -114.37],
    // Antarctica
    "Antarctica/Casey": [-66.28, 110.52],
    "Antarctica/Davis": [-68.58, 77.97],
    "Antarctica/DumontDUrville": [-66.66, 140],
    "Antarctica/Macquarie": [-54.5, 158.95],
    "Antarctica/Mawson": [-67.6, 62.87],
    "Antarctica/McMurdo": [-77.84, 166.67],
    "Antarctica/Palmer": [-64.77, -64.05],
    "Antarctica/Rothera": [-67.57, -68.13],
    "Antarctica/Syowa": [-69, 39.58],
    "Antarctica/Troll": [-72, 2.53],
    "Antarctica/Vostok": [-78.46, 106.87],
    // Arctic
    "Arctic/Longyearbyen": [78.22, 15.63],
    // Asia
    "Asia/Aden": [12.78, 45.04],
    "Asia/Almaty": [43.25, 76.95],
    "Asia/Amman": [31.95, 35.93],
    "Asia/Anadyr": [64.75, 177.48],
    "Asia/Aqtau": [44.52, 50.26],
    "Asia/Aqtobe": [50.28, 57.17],
    "Asia/Ashgabat": [37.95, 58.38],
    "Asia/Atyrau": [47.12, 51.88],
    "Asia/Baghdad": [33.34, 44.39],
    "Asia/Bahrain": [26.27, 50.55],
    "Asia/Baku": [40.38, 49.89],
    "Asia/Bangkok": [13.75, 100.52],
    "Asia/Barnaul": [53.36, 83.76],
    "Asia/Beirut": [33.89, 35.5],
    "Asia/Bishkek": [42.87, 74.59],
    "Asia/Brunei": [4.94, 114.93],
    "Asia/Chita": [52.05, 113.47],
    "Asia/Choibalsan": [48.08, 114.5],
    "Asia/Colombo": [6.93, 79.85],
    "Asia/Damascus": [33.51, 36.29],
    "Asia/Dhaka": [23.71, 90.41],
    "Asia/Dili": [-8.55, 125.57],
    "Asia/Dubai": [25.06, 55.17],
    "Asia/Dushanbe": [38.54, 68.77],
    "Asia/Famagusta": [35.12, 33.94],
    "Asia/Gaza": [31.5, 34.47],
    "Asia/Hebron": [31.53, 35.1],
    "Asia/Ho_Chi_Minh": [10.78, 106.7],
    "Asia/Hong_Kong": [22.3, 114.17],
    "Asia/Hovd": [48, 91.63],
    "Asia/Irkutsk": [52.27, 104.35],
    "Asia/Jakarta": [-6.17, 106.83],
    "Asia/Jayapura": [-2.53, 140.72],
    "Asia/Jerusalem": [31.78, 35.22],
    "Asia/Kabul": [34.53, 69.17],
    "Asia/Kamchatka": [53.02, 158.65],
    "Asia/Karachi": [24.87, 67.01],
    "Asia/Kathmandu": [27.72, 85.32],
    "Asia/Khandyga": [62.66, 135.21],
    "Asia/Kolkata": [22.57, 88.37],
    "Asia/Krasnoyarsk": [56.01, 92.83],
    "Asia/Kuala_Lumpur": [3.16, 101.7],
    "Asia/Kuching": [1.53, 110.34],
    "Asia/Kuwait": [29.3, 47.93],
    "Asia/Macau": [22.2, 113.55],
    "Asia/Magadan": [59.57, 150.8],
    "Asia/Makassar": [-5.19, 119.42],
    "Asia/Manila": [14.6, 120.98],
    "Asia/Muscat": [23.61, 58.59],
    "Asia/Nicosia": [35.17, 33.37],
    "Asia/Novokuznetsk": [53.75, 87.11],
    "Asia/Novosibirsk": [55.04, 82.9],
    "Asia/Omsk": [55, 73.4],
    "Asia/Oral": [51.23, 51.37],
    "Asia/Phnom_Penh": [11.55, 104.92],
    "Asia/Pontianak": [-0.03, 109.32],
    "Asia/Pyongyang": [39.03, 125.76],
    "Asia/Qatar": [25.29, 51.53],
    "Asia/Qostanay": [53.21, 63.62],
    "Asia/Qyzylorda": [44.85, 65.52],
    "Asia/Riyadh": [24.69, 46.72],
    "Asia/Sakhalin": [46.96, 142.73],
    "Asia/Samarkand": [39.65, 66.97],
    "Asia/Seoul": [37.57, 126.98],
    "Asia/Shanghai": [31.23, 121.47],
    "Asia/Singapore": [1.35, 103.82],
    "Asia/Srednekolymsk": [67.47, 153.71],
    "Asia/Taipei": [25.05, 121.5],
    "Asia/Tashkent": [41.32, 69.3],
    "Asia/Tbilisi": [41.69, 44.83],
    "Asia/Tehran": [35.68, 51.42],
    "Asia/Thimphu": [27.47, 89.63],
    "Asia/Tokyo": [35.68, 139.77],
    "Asia/Tomsk": [56.5, 84.97],
    "Asia/Ulaanbaatar": [47.91, 106.88],
    "Asia/Urumqi": [43.82, 87.6],
    "Asia/Ust-Nera": [64.56, 143.24],
    "Asia/Vientiane": [17.97, 102.6],
    "Asia/Vladivostok": [43.16, 131.89],
    "Asia/Yakutsk": [62.03, 129.68],
    "Asia/Yangon": [16.78, 96.17],
    "Asia/Yekaterinburg": [56.84, 60.65],
    "Asia/Yerevan": [40.18, 44.51],
    // Atlantic
    "Atlantic/Azores": [37.74, -25.67],
    "Atlantic/Bermuda": [32.29, -64.78],
    "Atlantic/Canary": [28.29, -16.63],
    "Atlantic/Cape_Verde": [14.91, -23.51],
    "Atlantic/Faroe": [62.01, -6.77],
    "Atlantic/Madeira": [32.63, -16.9],
    "Atlantic/Reykjavik": [64.15, -21.94],
    "Atlantic/South_Georgia": [-54.28, -36.51],
    "Atlantic/St_Helena": [-15.93, -5.72],
    "Atlantic/Stanley": [-51.7, -57.85],
    // Australia
    "Australia/Adelaide": [-34.93, 138.6],
    "Australia/Brisbane": [-27.47, 153.03],
    "Australia/Broken_Hill": [-31.95, 141.47],
    "Australia/Darwin": [-12.46, 130.84],
    "Australia/Eucla": [-31.68, 128.88],
    "Australia/Hobart": [-42.88, 147.33],
    "Australia/Lindeman": [-20.31, 149.04],
    "Australia/Lord_Howe": [-31.55, 159.08],
    "Australia/Melbourne": [-37.82, 144.97],
    "Australia/Perth": [-31.95, 115.86],
    "Australia/Sydney": [-33.87, 151.21],
    // Europe
    "Europe/Amsterdam": [52.37, 4.9],
    "Europe/Andorra": [42.51, 1.52],
    "Europe/Astrakhan": [46.35, 48.05],
    "Europe/Athens": [37.97, 23.72],
    "Europe/Belgrade": [44.85, 20.45],
    "Europe/Berlin": [52.5, 13.37],
    "Europe/Bratislava": [48.15, 17.11],
    "Europe/Brussels": [50.83, 4.33],
    "Europe/Bucharest": [44.44, 26.1],
    "Europe/Budapest": [47.5, 19.04],
    "Europe/Busingen": [47.7, 8.69],
    "Europe/Chisinau": [47, 28.86],
    "Europe/Copenhagen": [55.67, 12.58],
    "Europe/Dublin": [53.33, -6.26],
    "Europe/Gibraltar": [36.14, -5.35],
    "Europe/Helsinki": [60.17, 24.94],
    "Europe/Istanbul": [41.02, 28.97],
    "Europe/Kaliningrad": [54.71, 20.5],
    "Europe/Kyiv": [50.45, 30.52],
    "Europe/Kirov": [58.6, 49.66],
    "Europe/Lisbon": [38.72, -9.13],
    "Europe/Ljubljana": [46.05, 14.51],
    "Europe/London": [51.51, -0.13],
    "Europe/Luxembourg": [49.61, 6.13],
    "Europe/Madrid": [40.42, -3.7],
    "Europe/Malta": [35.9, 14.44],
    "Europe/Mariehamn": [60.1, 19.94],
    "Europe/Minsk": [53.9, 27.57],
    "Europe/Monaco": [43.74, 7.42],
    "Europe/Moscow": [55.76, 37.62],
    "Europe/Oslo": [59.92, 10.75],
    "Europe/Paris": [48.85, 2.35],
    "Europe/Podgorica": [42.44, 19.26],
    "Europe/Prague": [50.09, 14.42],
    "Europe/Riga": [56.95, 24.1],
    "Europe/Rome": [41.89, 12.48],
    "Europe/Samara": [53.2, 50.15],
    "Europe/Saratov": [51.57, 46.03],
    "Europe/Simferopol": [44.95, 34.1],
    "Europe/Sofia": [42.7, 23.32],
    "Europe/Stockholm": [59.33, 18.06],
    "Europe/Tallinn": [59.44, 24.75],
    "Europe/Tirane": [41.33, 19.82],
    "Europe/Ulyanovsk": [54.33, 48.4],
    "Europe/Uzhgorod": [48.62, 22.3],
    "Europe/Vaduz": [47.14, 9.52],
    "Europe/Vatican": [41.9, 12.45],
    "Europe/Vienna": [48.21, 16.37],
    "Europe/Vilnius": [54.69, 25.28],
    "Europe/Volgograd": [48.71, 44.5],
    "Europe/Warsaw": [52.23, 21.01],
    "Europe/Zagreb": [45.81, 15.98],
    "Europe/Zurich": [47.38, 8.54],
    // Indian
    "Indian/Antananarivo": [-18.92, 47.52],
    "Indian/Chagos": [-7.35, 72.42],
    "Indian/Christmas": [-10.45, 105.69],
    "Indian/Cocos": [-12.17, 96.82],
    "Indian/Comoro": [-11.7, 43.26],
    "Indian/Kerguelen": [-49.28, 69.35],
    "Indian/Mahe": [-4.68, 55.49],
    "Indian/Maldives": [4.17, 73.51],
    "Indian/Mauritius": [-20.15, 57.49],
    "Indian/Mayotte": [-12.78, 45.23],
    "Indian/Reunion": [-20.9, 55.48],
    // Pacific
    "Pacific/Apia": [-13.83, -171.75],
    "Pacific/Auckland": [-36.85, 174.76],
    "Pacific/Bougainville": [-6.21, 155.57],
    "Pacific/Chatham": [-43.95, -176.56],
    "Pacific/Chuuk": [7.42, 151.84],
    "Pacific/Easter": [-27.15, -109.44],
    "Pacific/Efate": [-17.66, 168.43],
    "Pacific/Enderbury": [-3.13, -171.08],
    "Pacific/Fakaofo": [-9.38, -171.24],
    "Pacific/Fiji": [-18.14, 178.44],
    "Pacific/Funafuti": [-8.52, 179.2],
    "Pacific/Galapagos": [-0.9, -89.6],
    "Pacific/Gambier": [-23.12, -134.96],
    "Pacific/Guadalcanal": [-9.42, 160.01],
    "Pacific/Guam": [13.47, 144.75],
    "Pacific/Honolulu": [21.32, -157.87],
    "Pacific/Kanton": [-2.77, -171.72],
    "Pacific/Kiritimati": [1.87, -157.43],
    "Pacific/Kosrae": [5.31, 162.98],
    "Pacific/Kwajalein": [8.72, 167.73],
    "Pacific/Majuro": [7.11, 171.14],
    "Pacific/Marquesas": [-9, -139.5],
    "Pacific/Midway": [28.21, -177.37],
    "Pacific/Nauru": [-0.52, 166.93],
    "Pacific/Niue": [-19.06, -169.92],
    "Pacific/Norfolk": [-29.05, 167.97],
    "Pacific/Noumea": [-22.27, 166.46],
    "Pacific/Pago_Pago": [-14.28, -170.7],
    "Pacific/Palau": [7.35, 134.48],
    "Pacific/Pitcairn": [-25.07, -130.1],
    "Pacific/Pohnpei": [6.96, 158.21],
    "Pacific/Port_Moresby": [-9.44, 147.18],
    "Pacific/Rarotonga": [-21.2, -159.78],
    "Pacific/Saipan": [15.19, 145.74],
    "Pacific/Tahiti": [-17.53, -149.57],
    "Pacific/Tarawa": [1.42, 173],
    "Pacific/Tongatapu": [-21.17, -175.21],
    "Pacific/Wake": [19.28, 166.62],
    "Pacific/Wallis": [-13.28, -176.17],
    // Etc / aliases
    "Etc/GMT": [0, 0],
    "Etc/UTC": [0, 0],
    "Etc/Universal": [0, 0],
    "Etc/Zulu": [0, 0],
    "GMT": [0, 0],
    "UTC": [0, 0],
    "Universal": [0, 0],
    "Zulu": [0, 0]
  };
  var ETG_GMT_OFFSET = /^Etc\/GMT([+-])(\d{1,2})$/;
  var TIMEZONE_ALIASES = {
    "Africa/Asmera": "Africa/Asmara",
    "Africa/Timbuktu": "Africa/Bamako",
    "America/Argentina/ComodRivadavia": "America/Argentina/Catamarca",
    "America/Atka": "America/Adak",
    "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
    "America/Catamarca": "America/Argentina/Catamarca",
    "America/Coral_Harbour": "America/Atikokan",
    "America/Cordoba": "America/Argentina/Cordoba",
    "America/Ensenada": "America/Tijuana",
    "America/Fort_Wayne": "America/Indiana/Indianapolis",
    "America/Godthab": "America/Nuuk",
    "America/Indianapolis": "America/Indiana/Indianapolis",
    "America/Jujuy": "America/Argentina/Jujuy",
    "America/Knox_IN": "America/Indiana/Knox",
    "America/Louisville": "America/Kentucky/Louisville",
    "America/Mendoza": "America/Argentina/Mendoza",
    "America/Montreal": "America/Toronto",
    "America/Nipigon": "America/Toronto",
    "America/Pangnirtung": "America/Iqaluit",
    "America/Porto_Acre": "America/Rio_Branco",
    "America/Rainy_River": "America/Winnipeg",
    "America/Rosario": "America/Argentina/Cordoba",
    "America/Santa_Isabel": "America/Tijuana",
    "America/Shiprock": "America/Denver",
    "America/Thunder_Bay": "America/Toronto",
    "America/Virgin": "America/Port_of_Spain",
    "America/Yellowknife": "America/Edmonton",
    "Antarctica/South_Pole": "Pacific/Auckland",
    "Asia/Ashkhabad": "Asia/Ashgabat",
    "Asia/Calcutta": "Asia/Kolkata",
    "Asia/Chongqing": "Asia/Shanghai",
    "Asia/Chungking": "Asia/Shanghai",
    "Asia/Dacca": "Asia/Dhaka",
    "Asia/Harbin": "Asia/Shanghai",
    "Asia/Istanbul": "Europe/Istanbul",
    "Asia/Katmandu": "Asia/Kathmandu",
    "Asia/Macao": "Asia/Macau",
    "Asia/Rangoon": "Asia/Yangon",
    "Asia/Saigon": "Asia/Ho_Chi_Minh",
    "Asia/Tel_Aviv": "Asia/Jerusalem",
    "Asia/Ujung_Pandang": "Asia/Makassar",
    "Asia/Ulan_Bator": "Asia/Ulaanbaatar",
    "Atlantic/Faeroe": "Atlantic/Faroe",
    "Atlantic/Jan_Mayen": "Arctic/Longyearbyen",
    "Australia/ACT": "Australia/Sydney",
    "Australia/Canberra": "Australia/Sydney",
    "Australia/Currie": "Australia/Hobart",
    "Australia/LHI": "Australia/Lord_Howe",
    "Australia/NSW": "Australia/Sydney",
    "Australia/North": "Australia/Darwin",
    "Australia/Queensland": "Australia/Brisbane",
    "Australia/South": "Australia/Adelaide",
    "Australia/Tasmania": "Australia/Hobart",
    "Australia/Victoria": "Australia/Melbourne",
    "Australia/West": "Australia/Perth",
    "Australia/Yancowinna": "Australia/Broken_Hill",
    "Brazil/Acre": "America/Rio_Branco",
    "Brazil/DeNoronha": "America/Noronha",
    "Brazil/East": "America/Sao_Paulo",
    "Brazil/West": "America/Manaus",
    "Canada/Atlantic": "America/Halifax",
    "Canada/Central": "America/Winnipeg",
    "Canada/Eastern": "America/Toronto",
    "Canada/Mountain": "America/Edmonton",
    "Canada/Newfoundland": "America/St_Johns",
    "Canada/Pacific": "America/Vancouver",
    "Canada/Saskatchewan": "America/Regina",
    "Canada/Yukon": "America/Whitehorse",
    "Chile/Continental": "America/Santiago",
    "Chile/EasterIsland": "Pacific/Easter",
    "Cuba": "America/Havana",
    "Egypt": "Africa/Cairo",
    "Eire": "Europe/Dublin",
    "Europe/Belfast": "Europe/London",
    "Europe/Kiev": "Europe/Kyiv",
    "Europe/Tiraspol": "Europe/Chisinau",
    "GB": "Europe/London",
    "GB-Eire": "Europe/London",
    "Hongkong": "Asia/Hong_Kong",
    "Iceland": "Atlantic/Reykjavik",
    "Iran": "Asia/Tehran",
    "Israel": "Asia/Jerusalem",
    "Jamaica": "America/Jamaica",
    "Japan": "Asia/Tokyo",
    "Kwajalein": "Pacific/Kwajalein",
    "Libya": "Africa/Tripoli",
    "Mexico/BajaNorte": "America/Tijuana",
    "Mexico/BajaSur": "America/Mazatlan",
    "Mexico/General": "America/Mexico_City",
    "NZ": "Pacific/Auckland",
    "NZ-CHAT": "Pacific/Chatham",
    "Navajo": "America/Denver",
    "PRC": "Asia/Shanghai",
    "Pacific/Johnston": "Pacific/Honolulu",
    "Pacific/Ponape": "Pacific/Pohnpei",
    "Pacific/Samoa": "Pacific/Pago_Pago",
    "Pacific/Truk": "Pacific/Chuuk",
    "Pacific/Yap": "Pacific/Chuuk",
    "Poland": "Europe/Warsaw",
    "Portugal": "Europe/Lisbon",
    "ROC": "Asia/Taipei",
    "ROK": "Asia/Seoul",
    "Singapore": "Asia/Singapore",
    "Turkey": "Europe/Istanbul",
    "US/Alaska": "America/Anchorage",
    "US/Aleutian": "America/Adak",
    "US/Arizona": "America/Phoenix",
    "US/Central": "America/Chicago",
    "US/East-Indiana": "America/Indiana/Indianapolis",
    "US/Eastern": "America/New_York",
    "US/Hawaii": "Pacific/Honolulu",
    "US/Indiana-Starke": "America/Indiana/Knox",
    "US/Michigan": "America/Detroit",
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
    "US/Samoa": "Pacific/Pago_Pago",
    "W-SU": "Europe/Moscow"
  };
  function getLocationForTimeZone(timeZone) {
    if (!timeZone) return null;
    const direct = TIMEZONE_LOCATIONS[timeZone];
    if (direct) return direct;
    const aliased = TIMEZONE_ALIASES[timeZone];
    if (aliased) {
      const resolved = TIMEZONE_LOCATIONS[aliased];
      if (resolved) return resolved;
    }
    const etcMatch = ETG_GMT_OFFSET.exec(timeZone);
    if (etcMatch) {
      const sign = etcMatch[1] === "+" ? -1 : 1;
      const hours = Number(etcMatch[2]);
      return [0, sign * hours * 15];
    }
    return null;
  }
  function getBrowserTimeZone() {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return zone && zone.length > 0 ? zone : null;
    } catch {
      return null;
    }
  }
  function resolveSolarLocation(input = {}) {
    const hasLatitude = input.latitude !== void 0;
    const hasLongitude = input.longitude !== void 0;
    if (hasLatitude || hasLongitude) {
      const fromZone = input.timeZone ? getLocationForTimeZone(input.timeZone) : null;
      const latitude = input.latitude !== void 0 ? input.latitude : fromZone ? fromZone[0] : DEFAULT_TIMEZONE_LOCATION[0];
      const longitude = input.longitude !== void 0 ? input.longitude : fromZone ? fromZone[1] : DEFAULT_TIMEZONE_LOCATION[1];
      return {
        latitude,
        longitude,
        timeZone: input.timeZone ?? null,
        autoDetected: false
      };
    }
    if (input.timeZone) {
      const fromZone = getLocationForTimeZone(input.timeZone);
      if (fromZone) {
        return {
          latitude: fromZone[0],
          longitude: fromZone[1],
          timeZone: input.timeZone,
          autoDetected: true
        };
      }
    }
    const shouldDetect = input.autoDetectLocation !== false;
    if (shouldDetect && typeof window !== "undefined") {
      const detectedZone = getBrowserTimeZone();
      if (detectedZone) {
        const fromZone = getLocationForTimeZone(detectedZone);
        if (fromZone) {
          return {
            latitude: fromZone[0],
            longitude: fromZone[1],
            timeZone: detectedZone,
            autoDetected: true
          };
        }
      }
    }
    return {
      latitude: DEFAULT_TIMEZONE_LOCATION[0],
      longitude: DEFAULT_TIMEZONE_LOCATION[1],
      timeZone: input.timeZone ?? null,
      autoDetected: false
    };
  }
  function toRadians(deg) {
    return deg * Math.PI / 180;
  }
  function toDegrees(rad) {
    return rad * 180 / Math.PI;
  }
  function computeEqTime(dayOfYear2) {
    const b = 360 / 365 * (dayOfYear2 - 81);
    return 9.87 * Math.sin(toRadians(2 * b)) - 7.53 * Math.cos(toRadians(b)) - 1.5 * Math.sin(toRadians(b));
  }
  function computeSolarDec(dayOfYear2) {
    return 23.439 * Math.sin(toRadians(360 / 365 * (dayOfYear2 - 81)));
  }
  function dayOfYear(year, month, day) {
    const startOfYear = Date.UTC(year, 0, 1);
    const current = Date.UTC(year, month, day);
    return Math.floor((current - startOfYear) / 864e5) + 1;
  }
  function calculateSunTimes(date, ...args) {
    const first = args[0];
    if (args.length === 0 || args.length === 1 && (first === void 0 || typeof first === "object")) {
      const opts = first ?? {};
      const resolved2 = resolveSolarLocation(opts);
      return calculateSunTimesAt(date, resolved2.latitude, resolved2.longitude);
    }
    const latitude = args[0];
    const longitude = args[1];
    const options = args[2];
    const resolved = resolveSolarLocation({
      ...latitude !== void 0 ? { latitude } : {},
      ...longitude !== void 0 ? { longitude } : {},
      ...options?.timeZone !== void 0 ? { timeZone: options.timeZone } : {},
      ...options?.autoDetectLocation !== void 0 ? { autoDetectLocation: options.autoDetectLocation } : {}
    });
    return calculateSunTimesAt(date, resolved.latitude, resolved.longitude);
  }
  function calculateSunTimesAt(date, latitude, longitude) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const ordinal = dayOfYear(year, month, day);
    const eqTime = computeEqTime(ordinal);
    const solarDec = computeSolarDec(ordinal);
    const zenith = 90.833;
    const cosH = (Math.cos(toRadians(zenith)) - Math.sin(toRadians(latitude)) * Math.sin(toRadians(solarDec))) / (Math.cos(toRadians(latitude)) * Math.cos(toRadians(solarDec)));
    function fromUtcMinutes(minutes) {
      return new Date(Date.UTC(year, month, day) + minutes * 6e4);
    }
    const startOfLocalDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfLocalDay = new Date(year, month, day + 1, 0, 0, 0, 0);
    if (cosH > 1) {
      return {
        sunrise: endOfLocalDay,
        sunset: startOfLocalDay,
        polar: "night"
      };
    }
    if (cosH < -1) {
      return {
        sunrise: startOfLocalDay,
        sunset: endOfLocalDay,
        polar: "day"
      };
    }
    const hourAngle = toDegrees(Math.acos(cosH));
    const solarNoonUtc = 720 - 4 * longitude - eqTime;
    return {
      sunrise: fromUtcMinutes(solarNoonUtc - 4 * hourAngle),
      sunset: fromUtcMinutes(solarNoonUtc + 4 * hourAngle)
    };
  }
  function createScheduledThemeBinding(store, options) {
    const checkInterval = options.checkInterval ?? 6e4;
    const skipApplyMs = options.skipApplyMs ?? 0;
    const getTimes = options.getTimes ?? calculateSunTimes;
    let location = resolveSolarLocation({
      ...options.latitude !== void 0 ? { latitude: options.latitude } : {},
      ...options.longitude !== void 0 ? { longitude: options.longitude } : {},
      ...options.timeZone !== void 0 ? { timeZone: options.timeZone } : {},
      ...options.autoDetectLocation !== void 0 ? { autoDetectLocation: options.autoDetectLocation } : {}
    });
    let timer = null;
    let lastSyncTime = 0;
    let enabled = options.enabled ?? true;
    function isDaytime(now) {
      const times = getTimes(now, location.latitude, location.longitude);
      if (times.polar === "day") return true;
      if (times.polar === "night") return false;
      return now >= times.sunrise && now < times.sunset;
    }
    function startTimer() {
      if (timer !== null) return;
      timer = setInterval(apply, checkInterval);
    }
    function stopTimer() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function apply() {
      if (!enabled) return;
      if (skipApplyMs > 0 && Date.now() - lastSyncTime < skipApplyMs) {
        return;
      }
      const target = isDaytime(/* @__PURE__ */ new Date()) ? options.lightTheme : options.darkTheme;
      const current = store.get();
      if (current === target || current?.name && current?.name === target?.name) {
        return;
      }
      const onBeforeApply = options.onBeforeApply;
      if (onBeforeApply && !onBeforeApply(target)) {
        return;
      }
      store.set(target);
    }
    if (enabled) {
      apply();
      startTimer();
    }
    return {
      destroy() {
        stopTimer();
      },
      setLastSyncTime(time) {
        lastSyncTime = time;
      },
      setEnabled(next) {
        if (next === enabled) return;
        enabled = next;
        if (enabled) {
          apply();
          startTimer();
        } else {
          stopTimer();
        }
      },
      getEnabled() {
        return enabled;
      },
      getLocation() {
        return { ...location };
      }
    };
  }
  var EMPTY_THEME_SCHEDULE_STATE = {
    enabled: false,
    active: false,
    status: "disabled",
    sunrise: null,
    sunset: null,
    nextTransition: null,
    nextActivation: null,
    nextDeactivation: null,
    lightTheme: null,
    darkTheme: null,
    latitude: null,
    longitude: null,
    timeZone: null,
    autoDetected: false
  };
  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  var DEFAULT_SCHEDULED_LIGHT_THEME = "light";
  var DEFAULT_SCHEDULED_DARK_THEME = "dark";
  function resolveScheduledThemePair(themes, options, current) {
    const findByName = (name) => {
      if (name === void 0) return null;
      return themes.find((t) => t.name === name) ?? null;
    };
    const findFamilyTheme = (family, mode) => {
      if (!family) return null;
      return themes.find(
        (t) => getThemeFamily(t) === family && getThemeMode(t) === mode
      ) ?? null;
    };
    const configuredLight = options.lightTheme;
    const configuredDark = options.darkTheme;
    const currentFamily = current?.meta?.family;
    if (configuredLight !== void 0 && configuredDark !== void 0) {
      return {
        light: findByName(configuredLight),
        dark: findByName(configuredDark)
      };
    }
    if (configuredLight !== void 0) {
      return {
        light: findByName(configuredLight),
        dark: findFamilyTheme(currentFamily, "dark") ?? findByName(DEFAULT_SCHEDULED_DARK_THEME)
      };
    }
    if (configuredDark !== void 0) {
      return {
        light: findFamilyTheme(currentFamily, "light") ?? findByName(DEFAULT_SCHEDULED_LIGHT_THEME),
        dark: findByName(configuredDark)
      };
    }
    const familyLight = findFamilyTheme(currentFamily, "light");
    const familyDark = findFamilyTheme(currentFamily, "dark");
    if (familyLight && familyDark) {
      return { light: familyLight, dark: familyDark };
    }
    return {
      light: findByName(DEFAULT_SCHEDULED_LIGHT_THEME),
      dark: findByName(DEFAULT_SCHEDULED_DARK_THEME)
    };
  }
  function createThemeSchedule(store, themes, options) {
    const pairInput = {
      lightTheme: options.lightTheme,
      darkTheme: options.darkTheme
    };
    let { light: lightTheme, dark: darkTheme } = resolveScheduledThemePair(
      themes,
      pairInput,
      store.get()
    );
    let latitude = options.latitude;
    let longitude = options.longitude;
    let timeZone = options.timeZone;
    let autoDetectLocation = options.autoDetectLocation;
    let checkInterval = options.checkInterval;
    let skipApplyMs = options.skipApplyMs;
    const getTimes = options.getTimes ?? calculateSunTimes;
    const onBeforeApply = options.onBeforeApply;
    let enabled = options.enabled ?? true;
    let binding = null;
    let lastState = EMPTY_THEME_SCHEDULE_STATE;
    const listeners = /* @__PURE__ */ new Set();
    function resolveLocation() {
      return resolveSolarLocation({
        ...latitude !== void 0 ? { latitude } : {},
        ...longitude !== void 0 ? { longitude } : {},
        ...timeZone !== void 0 ? { timeZone } : {},
        ...autoDetectLocation !== void 0 ? { autoDetectLocation } : {}
      });
    }
    function getTimesFor(date) {
      const resolved = resolveLocation();
      return getTimes(date, resolved.latitude, resolved.longitude);
    }
    function computeState(now = /* @__PURE__ */ new Date()) {
      if (!lightTheme || !darkTheme) {
        return { ...EMPTY_THEME_SCHEDULE_STATE, enabled };
      }
      const resolved = resolveLocation();
      const { sunrise, sunset } = getTimesFor(now);
      const isDaytime = now >= sunrise && now < sunset;
      let nextTransition;
      let nextActivation;
      let nextDeactivation;
      if (isDaytime) {
        nextActivation = getTimesFor(addDays(sunrise, 1)).sunrise;
        nextDeactivation = sunset;
        nextTransition = {
          at: sunset,
          theme: darkTheme.name,
          type: "deactivation"
        };
      } else if (now < sunrise) {
        nextActivation = sunrise;
        nextDeactivation = sunset;
        nextTransition = {
          at: sunrise,
          theme: lightTheme.name,
          type: "activation"
        };
      } else {
        const tomorrow = getTimesFor(addDays(sunset, 1));
        nextActivation = tomorrow.sunrise;
        nextDeactivation = tomorrow.sunset;
        nextTransition = {
          at: tomorrow.sunrise,
          theme: lightTheme.name,
          type: "activation"
        };
      }
      const currentName = store.get().name;
      const active = enabled && (currentName === lightTheme.name || currentName === darkTheme.name);
      return {
        enabled,
        active,
        status: enabled ? "active" : "disabled",
        sunrise,
        sunset,
        nextTransition,
        nextActivation,
        nextDeactivation,
        lightTheme: lightTheme.name,
        darkTheme: darkTheme.name,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        timeZone: resolved.timeZone,
        autoDetected: resolved.autoDetected
      };
    }
    function emit() {
      const next = computeState();
      lastState = next;
      for (const listener of listeners) {
        listener(next);
      }
    }
    function ensureBinding() {
      if (!enabled || typeof window === "undefined") return;
      if (!lightTheme || !darkTheme) return;
      binding?.destroy();
      const resolved = resolveLocation();
      binding = createScheduledThemeBinding(store, {
        lightTheme,
        darkTheme,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        ...checkInterval !== void 0 ? { checkInterval } : {},
        ...skipApplyMs !== void 0 ? { skipApplyMs } : {},
        getTimes,
        ...onBeforeApply ? { onBeforeApply } : {}
      });
    }
    function enable() {
      if (enabled) return;
      enabled = true;
      ensureBinding();
      emit();
    }
    function disable() {
      if (!enabled) return;
      enabled = false;
      binding?.destroy();
      binding = null;
      emit();
    }
    function set(opts) {
      const hasLight = Object.prototype.hasOwnProperty.call(opts, "lightTheme");
      const hasDark = Object.prototype.hasOwnProperty.call(opts, "darkTheme");
      if (hasLight || hasDark) {
        if (hasLight) pairInput.lightTheme = opts.lightTheme;
        if (hasDark) pairInput.darkTheme = opts.darkTheme;
        const nextPair = resolveScheduledThemePair(themes, pairInput, store.get());
        lightTheme = nextPair.light;
        darkTheme = nextPair.dark;
      }
      if (opts.latitude !== void 0 || opts.longitude !== void 0) {
        if (opts.latitude !== void 0) latitude = opts.latitude;
        if (opts.longitude !== void 0) longitude = opts.longitude;
        timeZone = void 0;
      } else if (opts.timeZone !== void 0) {
        timeZone = opts.timeZone;
        latitude = void 0;
        longitude = void 0;
      } else if (opts.autoDetectLocation === true) {
        latitude = void 0;
        longitude = void 0;
        timeZone = void 0;
      }
      if (opts.autoDetectLocation !== void 0 && opts.autoDetectLocation !== true) {
        autoDetectLocation = false;
      }
      if (opts.checkInterval !== void 0) checkInterval = opts.checkInterval;
      if (opts.skipApplyMs !== void 0) skipApplyMs = opts.skipApplyMs;
      if (opts.enabled !== void 0) {
        enabled = opts.enabled;
        if (enabled) {
          ensureBinding();
        } else {
          binding?.destroy();
          binding = null;
        }
      } else if (enabled) {
        ensureBinding();
      }
      emit();
    }
    const unsubscribeStore = store.subscribe(() => {
      const next = resolveScheduledThemePair(themes, pairInput, store.get());
      if (next.light !== lightTheme || next.dark !== darkTheme) {
        lightTheme = next.light;
        darkTheme = next.dark;
        if (enabled) ensureBinding();
      }
      emit();
    });
    if (enabled) {
      ensureBinding();
    }
    lastState = computeState();
    const schedule = {
      enable,
      disable,
      set,
      setLastSyncTime(time) {
        binding?.setLastSyncTime(time);
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(lastState);
        return () => {
          listeners.delete(listener);
        };
      },
      get enabled() {
        return lastState.enabled;
      },
      get active() {
        return lastState.active;
      },
      get status() {
        return lastState.status;
      },
      get sunrise() {
        return lastState.sunrise;
      },
      get sunset() {
        return lastState.sunset;
      },
      get nextTransition() {
        return lastState.nextTransition;
      },
      get nextActivation() {
        return lastState.nextActivation;
      },
      get nextDeactivation() {
        return lastState.nextDeactivation;
      },
      get lightTheme() {
        return lastState.lightTheme;
      },
      get darkTheme() {
        return lastState.darkTheme;
      },
      get latitude() {
        return lastState.latitude;
      },
      get longitude() {
        return lastState.longitude;
      },
      get timeZone() {
        return lastState.timeZone;
      },
      get autoDetected() {
        return lastState.autoDetected;
      },
      get state() {
        return lastState;
      },
      destroy() {
        binding?.destroy();
        binding = null;
        unsubscribeStore();
        listeners.clear();
      }
    };
    ensureBinding();
    return schedule;
  }
  function createThemeStore(options) {
    let current = options.initialTheme;
    let batchDepth = 0;
    let pendingBatchTheme = null;
    const listeners = /* @__PURE__ */ new Set();
    function emit(theme, emitOptions) {
      for (const listener of listeners) {
        listener(theme, emitOptions);
      }
    }
    return {
      get() {
        return pendingBatchTheme ?? current;
      },
      set(theme, options2) {
        if (!options2?.force && theme.name === current.name && batchDepth === 0) {
          return;
        }
        current = theme;
        if (batchDepth > 0) {
          pendingBatchTheme = theme;
          return;
        }
        emit(theme, options2);
      },
      batch(callback) {
        batchDepth++;
        try {
          callback();
        } finally {
          batchDepth--;
          if (batchDepth === 0 && pendingBatchTheme) {
            const theme = pendingBatchTheme;
            pendingBatchTheme = null;
            emit(theme);
          }
        }
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      destroy() {
        listeners.clear();
        pendingBatchTheme = null;
      }
    };
  }
  function resolveThemeReference(themes, reference, options = {}) {
    if (typeof reference !== "string") return null;
    const wanted = reference.trim();
    if (wanted.length === 0) return null;
    const exact = themes.find((theme) => theme.name === wanted);
    if (exact) {
      return {
        kind: "variant",
        family: getThemeFamily(exact),
        theme: exact,
        mode: getThemeMode(exact)
      };
    }
    if (!getThemeFamilies(themes).includes(wanted)) return null;
    const requestedMode = options.mode;
    const effectiveMode = requestedMode === "system" ? options.prefersDark ? "dark" : "light" : requestedMode ?? "light";
    return {
      kind: "family",
      family: wanted,
      theme: resolveSelectedTheme(themes, { family: wanted, mode: effectiveMode })
    };
  }
  function resolveSelection(options) {
    const themes = options.themes;
    const defaultRef = resolveThemeReference(themes, options.defaultTheme, {
      ...options.initialMode !== void 0 ? { mode: options.initialMode } : {}
    });
    const familyRef = resolveThemeReference(themes, options.initialFamily, {
      ...options.initialMode !== void 0 ? { mode: options.initialMode } : {}
    });
    const fallback = defaultRef?.theme ?? themes[0];
    if (!fallback) {
      throw new Error("At least one theme must be provided.");
    }
    if (options.persistedSelection) {
      return {
        family: normalizeThemeFamily(
          themes,
          options.persistedSelection.family,
          fallback
        ),
        mode: options.persistedSelection.mode
      };
    }
    const family = normalizeThemeFamily(
      themes,
      familyRef?.family ?? options.initialFamily,
      fallback
    );
    const mode = options.initialMode ?? familyRef?.mode ?? defaultRef?.mode ?? getThemeMode(fallback);
    return { family, mode };
  }
  function resolveInitialTheme(options) {
    const selection = resolveSelection({
      themes: options.themes,
      ...options.defaultTheme !== void 0 ? { defaultTheme: options.defaultTheme } : {},
      ...options.family !== void 0 ? { initialFamily: options.family } : {},
      ...options.mode !== void 0 ? { initialMode: options.mode } : {}
    });
    const effectiveMode = selection.mode === "system" ? options.prefersDark ? "dark" : "light" : selection.mode;
    const theme = resolveSelectedTheme(options.themes, {
      ...selection,
      mode: effectiveMode
    });
    return {
      theme,
      selection
    };
  }
  function resolveSelectionTheme(options) {
    const resolution = resolveInitialTheme({
      themes: options.themes,
      family: options.selection.family,
      mode: options.selection.mode,
      ...options.prefersDark !== void 0 ? { prefersDark: options.prefersDark } : {}
    });
    return {
      selection: resolution.selection,
      theme: resolution.theme
    };
  }
  function describeOverride(override) {
    if (typeof override === "string") return `"${override}"`;
    if (override && typeof override === "object") {
      const value = override;
      const parts = [];
      if (value.family !== void 0) parts.push(`family: ${JSON.stringify(value.family)}`);
      if (value.mode !== void 0) parts.push(`mode: ${JSON.stringify(value.mode)}`);
      return parts.length > 0 ? `{ ${parts.join(", ")} }` : "{}";
    }
    return String(override);
  }
  function emitUnresolvedOverrideDiagnostic(override, reason, available) {
    const shown = available.slice(0, 8).join(", ");
    emitDiagnostic(
      createDiagnostic({
        code: "TV_THEME_OVERRIDE_UNRESOLVED",
        level: "warning",
        message: `themeOverride ${describeOverride(override)} could not be resolved: ${reason}. The override was ignored and the previous selection kept.`,
        context: {
          api: "themeOverride",
          property: "themeOverride",
          received: override,
          expected: "a provided theme name, a provided family name, or { family, mode }",
          details: { available }
        },
        hint: available.length > 0 ? `Use one of the themes the provider was given (${shown}${available.length > 8 ? ", \u2026" : ""}) or a family from that list.` : "Pass a non-empty `themes` collection to the provider before setting `themeOverride`."
      })
    );
  }
  function resolveThemeOverride(themes, override, base) {
    if (override === void 0 || override === null) return null;
    if (typeof override === "string") {
      const resolved = resolveThemeReference(themes, override, { mode: base.mode });
      if (!resolved) return null;
      return {
        family: resolved.family,
        mode: resolved.kind === "variant" ? resolved.mode ?? base.mode : base.mode
      };
    }
    if (typeof override !== "object") return null;
    const requestedFamily = override.family;
    const requestedMode = override.mode;
    if (requestedFamily === void 0 && requestedMode === void 0) return null;
    const family = requestedFamily ?? base.family;
    if (!getThemeFamilies(themes).includes(family)) return null;
    if (requestedMode !== void 0 && !isThemeMode(requestedMode)) return null;
    return { family, mode: requestedMode ?? base.mode };
  }
  function themeOverrideKey(override, themes) {
    if (override === void 0 || override === null) return null;
    if (typeof override === "string") {
      if (override.length === 0) return null;
      const resolved = themes ? resolveThemeReference(themes, override) : null;
      if (resolved?.kind === "variant") {
        return `selection:${resolved.family}:${resolved.mode}`;
      }
      if (resolved?.kind === "family") {
        return `request:${resolved.family}:`;
      }
      return `name:${override}`;
    }
    if (typeof override !== "object") return null;
    const { family, mode } = override;
    if (family === void 0 && mode === void 0) return null;
    if (family !== void 0 && mode !== void 0) {
      return `selection:${family}:${mode}`;
    }
    return `request:${family ?? ""}:${mode ?? ""}`;
  }
  function resolveThemeOverrideReporting(themes, override, base) {
    const resolved = resolveThemeOverride(themes, override, base);
    if (resolved || override === void 0 || override === null) return resolved;
    const isName = typeof override === "string";
    const requestedFamily = isName ? null : override.family;
    const available = isName ? themes.map((theme) => String(theme.name)) : getThemeFamilies(themes);
    let reason = "no usable value was supplied";
    if (isName) {
      reason = `no provided theme or family is named "${override}"`;
    } else if (requestedFamily !== void 0) {
      reason = `no theme family named "${requestedFamily}" is registered`;
    } else if (override.mode !== void 0 && !isThemeMode(override.mode)) {
      reason = `"${String(override.mode)}" is not a valid mode`;
    }
    emitUnresolvedOverrideDiagnostic(override, reason, available);
    return null;
  }
  function readBootstrapState(themes, target) {
    const el = target ?? (typeof document !== "undefined" ? document.documentElement : null);
    if (!el || typeof el.getAttribute !== "function") return null;
    const themeName = el.getAttribute("data-theme");
    if (!themeName) return null;
    let theme;
    try {
      theme = resolveTheme(themes, themeName);
    } catch {
      return null;
    }
    if (!theme) return null;
    const selectionMode = el.getAttribute("data-theme-selection-mode");
    const selectionFamily = el.getAttribute("data-theme-selection-family");
    const meta = theme.meta ?? {};
    return {
      theme,
      selection: {
        mode: selectionMode === "light" || selectionMode === "dark" || selectionMode === "system" ? selectionMode : meta.mode ?? "system",
        family: selectionFamily ?? meta.family ?? getThemeFamily(theme)
      },
      resolvedMode: meta.mode === "dark" ? "dark" : "light",
      ready: el.getAttribute("data-theme-ready") === "true"
    };
  }
  function readTransportedConfig() {
    const scope = globalThis;
    const transported = scope.__THEMVORA_CONFIG__;
    return transported && typeof transported === "object" ? transported : null;
  }
  function resolveRuntimeOptions(options = {}) {
    const transported = readTransportedConfig();
    const defined = {};
    for (const [key, value] of Object.entries(options)) {
      if (value !== void 0) defined[key] = value;
    }
    const explicit = defined.themes;
    const resolvedThemes = explicit !== void 0 ? explicit : transported?.themes?.length ? transported.themes : getBuiltInThemes();
    return {
      ...transported ?? {},
      ...defined,
      themes: resolvedThemes
    };
  }
  function isUsableTheme(theme) {
    return !!theme && typeof theme === "object" && typeof theme.name === "string" && theme.name.length > 0;
  }
  function getFallbackThemes() {
    return getNeutralThemes();
  }
  function normalizeThemeCatalog(themes) {
    const seen = /* @__PURE__ */ new Set();
    const usable = [];
    for (const theme of themes ?? []) {
      if (!isUsableTheme(theme)) continue;
      if (seen.has(theme.name)) continue;
      seen.add(theme.name);
      usable.push(theme);
    }
    return usable.length > 0 ? usable : getFallbackThemes();
  }
  function isSelectionResolvable(themes, selection) {
    const family = normalizeThemeFamily(themes, selection.family);
    if (family !== selection.family) return false;
    return themes.some((theme) => (theme.meta?.family ?? "default") === family);
  }
  function resolveEffectiveConfiguration(options) {
    const themes = options.themes;
    if (options.preservePrevious && options.previousSelection && isSelectionResolvable(themes, options.previousSelection)) {
      const selection2 = options.previousSelection;
      const theme2 = resolveSelectedTheme(themes, {
        family: normalizeThemeFamily(themes, selection2.family),
        mode: selection2.mode === "system" ? options.prefersDark ? "dark" : "light" : selection2.mode
      });
      return { selection: selection2, theme: theme2 };
    }
    const defaultRef = resolveThemeReference(themes, options.defaultTheme, {
      ...options.initialMode !== void 0 ? { mode: options.initialMode } : {}
    });
    const familyRef = resolveThemeReference(themes, options.initialFamily, {
      ...options.initialMode !== void 0 ? { mode: options.initialMode } : {}
    });
    const fallbackTheme = defaultRef?.theme ?? themes[0];
    const requestedFamily = options.initialFamily && options.initialFamily.length > 0 ? options.initialFamily : void 0;
    const family = normalizeThemeFamily(
      themes,
      familyRef?.family ?? requestedFamily,
      fallbackTheme
    );
    if (requestedFamily !== void 0 && familyRef === null && family !== requestedFamily) {
      emitUnknownFamilyDiagnostic(requestedFamily, family, themes);
    }
    const mode = options.initialMode ?? familyRef?.mode ?? defaultRef?.mode ?? getThemeMode(fallbackTheme);
    const selection = { family, mode };
    const theme = resolveSelectedTheme(themes, {
      family,
      mode: mode === "system" ? options.prefersDark ? "dark" : "light" : mode
    });
    return { selection, theme };
  }
  function emitUnknownFamilyDiagnostic(requested, resolved, themes) {
    const available = getThemeFamilies(themes);
    emitDiagnostic(
      createDiagnostic({
        code: "TV_THEME_FAMILY_UNKNOWN",
        level: "error",
        message: `Requested theme family "${requested}" is not registered; resolved to "${resolved}" instead.`,
        context: {
          api: "ThemeProvider",
          property: "initialFamily",
          received: requested,
          expected: available.join(" | "),
          details: { availableFamilies: available }
        },
        hint: "Check the family name against the themes you registered, or omit the prop to use the fallback theme's family."
      })
    );
  }
  function emitNeutralFallbackDiagnostic() {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_THEME_NEUTRAL_FALLBACK",
        level: "warning",
        message: "No usable theme was available; the neutral fallback theme was applied.",
        context: { api: "ThemeProvider", property: "themes" },
        hint: "Pass a non-empty `themes` array to register your own catalog."
      })
    );
  }
  function emitInvalidOptionDiagnostic(option) {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_CONFIG_OPTION_INVALID",
        level: "warning",
        message: `The "${option.property}" option is not usable; the previous setting was kept.`,
        context: {
          api: "configure",
          property: option.property,
          received: option.received,
          expected: option.expected
        },
        hint: "Correct the option value; the runtime retained its last valid configuration."
      })
    );
  }
  function emitScheduledThemeUnresolvedDiagnostic(names) {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_SCHEDULE_THEME_UNRESOLVED",
        level: "warning",
        message: "The scheduled configuration names a light/dark theme that is not registered, so the schedule is not driving the selection.",
        context: {
          api: "configure",
          property: "scheduled",
          received: [names.lightTheme, names.darkTheme].filter(
            (name) => typeof name === "string"
          ),
          expected: "registered theme names"
        },
        hint: "Register the named themes, or omit `lightTheme`/`darkTheme` so the pair is derived from the active theme's family."
      })
    );
  }
  function getDefaultMetaTimestamp() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  var ThemeRegistry = class {
    _themes = [];
    _listeners = /* @__PURE__ */ new Set();
    _batchDepth = 0;
    _dirty = false;
    /**
     * Creates an empty registry, or one pre-populated with `themes`.
     *
     * @param options Initial themes and other registry configuration.
     */
    constructor(options) {
      this._themes.length = 0;
      if (options?.themes !== void 0) {
        const seen = /* @__PURE__ */ new Set();
        for (const theme of options.themes) {
          if (seen.has(theme.name)) continue;
          seen.add(theme.name);
          this._themes.push(theme);
        }
      }
    }
    /**
     * The registered themes. Returns the internal live array.
     *
     * The array is replaced *in place*, never reassigned, so a consumer that
     * holds the reference — `runtime.themes`, a scoped-theme binding — sees every
     * later `register`, `unregister`, `use` and `clear`. This is the only reason
     * `clear()` empties the array rather than assigning a new one.
     */
    get themes() {
      return this._themes;
    }
    /**
     * Subscribe to registry mutations (register / unregister / replace / use /
     * clear).
     *
     * Fires whenever the registered theme set changes, so a consumer that derives
     * a value from {@link themes} — a theme picker, or the generated-theme
     * accessor — re-reads it. This is the notification `runtime.use(pack)` relies
     * on: a pack installs themes *into the registry*, without changing the active
     * selection, so a store/selection subscription alone would never see it.
     *
     * @param listener Called after every change. Registering the same set twice
     *   still notifies (the definitions may have changed).
     * @returns An unsubscribe function.
     */
    subscribe(listener) {
      this._listeners.add(listener);
      return () => {
        this._listeners.delete(listener);
      };
    }
    /**
     * Runs `fn` as one atomic registry transaction.
     *
     * Every mutation inside — `register`, `registerMany`, `unregister`, `replace`,
     * `use`, `clear` — is applied immediately (readers of {@link themes} /
     * {@link get} / {@link list} see the live state), but subscribers are notified
     * **once**, after `fn` returns, only if anything changed.
     *
     * This is what keeps a logical restore from exposing its intermediate states:
     * the `clear()` + re-register sequence emits a single coherent notification
     * instead of one empty and N partial ones, so a registry-derived consumer
     * never observes a half-applied registry.
     *
     * Batches nest: the inner-most `batch` flushes. If `fn` throws, the pending
     * notification is still flushed so subscribers do not miss the mutations that
     * did apply.
     *
     * @param fn The transactional work.
     */
    batch(fn) {
      this._batchDepth += 1;
      try {
        fn();
      } finally {
        this._batchDepth -= 1;
        if (this._batchDepth === 0 && this._dirty) {
          this._dirty = false;
          this.fireListeners();
        }
      }
    }
    /** @internal Notify registry subscribers, or defer to the enclosing batch. */
    notify() {
      if (this._batchDepth > 0) {
        this._dirty = true;
        return;
      }
      this.fireListeners();
    }
    /** @internal Deliver a notification to every subscriber. */
    fireListeners() {
      for (const listener of this._listeners) listener();
    }
    /**
     * Registers a theme, stamping `meta.created` / `meta.updated` when absent.
     *
     * @param theme Theme to register.
     * @returns `true` when registered, `false` when a theme with the same name
     *   already exists (no-op in that case).
     */
    register(theme) {
      if (this._themes.some((t) => t.name === theme.name)) {
        return false;
      }
      this._themes.push({
        ...theme,
        meta: {
          ...theme.meta,
          created: theme.meta?.created ?? getDefaultMetaTimestamp(),
          updated: theme.meta?.updated ?? getDefaultMetaTimestamp()
        }
      });
      this.notify();
      return true;
    }
    /**
     * Registers multiple themes as one atomic transaction.
     *
     * @param themes Themes to register.
     * @returns The number of themes actually registered (duplicates skipped).
     */
    registerMany(themes) {
      let count = 0;
      this.batch(() => {
        for (const theme of themes) {
          if (this.register(theme)) count++;
        }
      });
      return count;
    }
    /**
     * Removes a theme by name.
     *
     * @param name Theme name to remove.
     * @returns `true` when a theme was removed, `false` when none matched.
     */
    unregister(name) {
      const index = this._themes.findIndex((t) => t.name === name);
      if (index === -1) return false;
      this._themes.splice(index, 1);
      this.notify();
      return true;
    }
    /**
     * Replaces a registered theme with a new definition, stamping
     * `meta.updated`.
     *
     * @param name Name of the theme to replace.
     * @param theme Replacement definition.
     * @returns `true` when replaced, `false` when no theme with that name is
     *   registered.
     */
    replace(name, theme) {
      const index = this._themes.findIndex((t) => t.name === name);
      if (index === -1) return false;
      this._themes[index] = {
        ...theme,
        meta: {
          ...theme.meta,
          updated: getDefaultMetaTimestamp()
        }
      };
      this.notify();
      return true;
    }
    /**
     * Looks up a theme by name.
     *
     * @param name Theme name.
     * @returns The theme definition, or `undefined` when not registered.
     */
    get(name) {
      return this._themes.find((t) => t.name === name);
    }
    /**
     * Checks whether a theme name is registered.
     *
     * @param name Theme name.
     * @returns `true` when registered.
     */
    has(name) {
      return this._themes.some((t) => t.name === name);
    }
    /**
     * Returns a defensive copy of the registered themes.
     */
    list() {
      return [...this._themes];
    }
    /**
     * Installs a theme pack, tagging each theme with `pack:<name>` and
     * replacing any existing theme of the same name.
     *
     * @param pack The pack to install.
     */
    use(pack) {
      const packThemes = [...pack.themes].map((theme) => ({
        ...theme,
        meta: {
          ...theme.meta,
          tags: [...theme.meta?.tags ?? [], `pack:${pack.name}`],
          created: theme.meta?.created ?? getDefaultMetaTimestamp(),
          updated: theme.meta?.updated ?? getDefaultMetaTimestamp()
        }
      }));
      for (const theme of packThemes) {
        const existing = this._themes.findIndex((t) => t.name === theme.name);
        if (existing !== -1) {
          this._themes[existing] = theme;
        } else {
          this._themes.push(theme);
        }
      }
      this.notify();
    }
    /**
     * Lists the distinct theme families. Themes without `meta.family` count
     * as the `"default"` family.
     */
    getFamilies() {
      const families = /* @__PURE__ */ new Set();
      for (const theme of this._themes) {
        const family = theme.meta?.family ?? "default";
        families.add(family);
      }
      return [...families];
    }
    /**
     * Returns the themes belonging to a family.
     *
     * @param family Family name; `"default"` matches themes without
     *   `meta.family`.
     */
    getThemesByFamily(family) {
      return this._themes.filter((t) => (t.meta?.family ?? "default") === family);
    }
    /**
     * Removes all registered themes.
     */
    clear() {
      this._themes.length = 0;
      this.notify();
    }
    /**
     * Releases registry resources by clearing all themes.
     *
     * Idempotent. The registry remains usable (empty) after destruction.
     */
    destroy() {
      this._themes.length = 0;
    }
  };
  function createThemeRegistry(options) {
    return new ThemeRegistry(options);
  }
  function createThemeSelectionController(options) {
    const persistence = options.persistence ?? null;
    const broadcast = options.broadcast ?? null;
    const readPersistenceOnInit = options.readPersistenceOnInit ?? true;
    const initialTheme = options.themes[0];
    if (!initialTheme) {
      throw new Error("At least one theme must be provided.");
    }
    const saved = readPersistenceOnInit ? persistence?.get() : null;
    let state = {
      mode: saved?.mode ?? options.initialMode ?? "system",
      family: normalizeThemeFamily(
        options.themes,
        saved?.family ?? options.initialFamily,
        initialTheme
      )
    };
    let systemBinding = null;
    let unsubscribePersistence = null;
    let unsubscribeBroadcast = null;
    let unsubscribeStore = null;
    let destroyed = false;
    let applyingFromController = false;
    let externalAutomaticDriver = false;
    const selectionListeners = /* @__PURE__ */ new Set();
    const effectiveListeners = /* @__PURE__ */ new Set();
    function deriveEffective() {
      const theme = options.store.get();
      return {
        family: getThemeFamily(theme),
        mode: getThemeMode(theme) === "dark" ? "dark" : "light"
      };
    }
    let effective = deriveEffective();
    function notifySelectionListeners() {
      const current = { ...state };
      for (const listener of selectionListeners) {
        listener(current);
      }
    }
    function publishEffective(next = deriveEffective()) {
      if (next.family === effective.family && next.mode === effective.mode) {
        return;
      }
      effective = next;
      for (const listener of effectiveListeners) {
        listener({ ...effective });
      }
    }
    function stopSystemBinding() {
      systemBinding?.destroy();
      systemBinding = null;
    }
    function bindSystemTheme(nextState, applyOnCreate = true) {
      systemBinding = createSystemThemeBinding(options.store, {
        lightTheme: resolveSelectionTheme({
          themes: options.themes,
          selection: {
            family: nextState.family,
            mode: "light"
          }
        }).theme,
        darkTheme: resolveSelectionTheme({
          themes: options.themes,
          selection: {
            family: nextState.family,
            mode: "dark"
          }
        }).theme,
        applyOnCreate,
        ...options.view ? { view: options.view } : {}
      });
      return systemBinding !== null;
    }
    function applySelection(nextState, sync = true, api = "applyState", suppressTransition = !sync) {
      if (destroyed) return;
      stopSystemBinding();
      if (sync) {
        runSyncAdapter(api, "persistence", () => persistence?.set(nextState));
        runSyncAdapter(api, "broadcast", () => broadcast?.post(nextState));
      }
      notifySelectionListeners();
      if (nextState.mode === "system") {
        if (!externalAutomaticDriver) {
          const bound = bindSystemTheme(nextState);
          if (!bound) {
            applyingFromController = true;
            options.store.set(
              resolveSelectionTheme({
                themes: options.themes,
                selection: {
                  family: nextState.family,
                  mode: "light"
                }
              }).theme,
              { suppressTransition }
            );
            applyingFromController = false;
          }
        }
        publishEffective();
        return;
      }
      const resolution = resolveSelectionTheme({
        themes: options.themes,
        selection: nextState
      });
      applyingFromController = true;
      options.store.set(resolution.theme, { suppressTransition });
      applyingFromController = false;
      publishEffective();
    }
    function setMode(nextMode) {
      if (state.mode === nextMode) return;
      if (!isThemeMode(nextMode)) {
        emitInvalidModeDiagnostic(nextMode);
        return;
      }
      state = {
        ...state,
        mode: nextMode
      };
      applySelection(state, true, "setMode");
    }
    function setFamily(nextFamily) {
      if (state.family === nextFamily) return;
      if (!getThemeFamilies(options.themes).includes(nextFamily)) return;
      state = {
        ...state,
        family: nextFamily
      };
      applySelection(state, true, "setFamily");
    }
    function getAppliedMode() {
      return getThemeMode(options.store.get()) === "dark" ? "dark" : "light";
    }
    function toggleTheme() {
      setMode(getAppliedMode() === "dark" ? "light" : "dark");
    }
    function applyState(nextState, opts = {}) {
      if (destroyed) return;
      if (!isThemeMode(nextState.mode)) {
        emitInvalidModeDiagnostic(nextState.mode);
        return;
      }
      const family = normalizeThemeFamily(options.themes, nextState.family, options.themes[0]);
      state = { family, mode: nextState.mode };
      const persist = opts.persist ?? false;
      applySelection(state, persist, "applyState", opts.suppressTransition ?? !persist);
    }
    const onSyncApply = options.onSyncApply ?? null;
    function applyAutomaticTheme(theme, opts = {}) {
      if (destroyed) return;
      stopSystemBinding();
      applyingFromController = true;
      try {
        options.store.set(theme, {
          suppressTransition: opts.suppressTransition ?? false
        });
      } finally {
        applyingFromController = false;
      }
      publishEffective();
    }
    function setAutomaticDriverActive(active) {
      if (destroyed) return;
      if (active === externalAutomaticDriver) return;
      externalAutomaticDriver = active;
      if (active) {
        stopSystemBinding();
        return;
      }
      if (state.mode === "system") {
        bindSystemTheme(state, false);
      }
    }
    function handleSyncUpdate(nextState) {
      applySelection(nextState, false);
      onSyncApply?.();
    }
    if (persistence) {
      unsubscribePersistence = persistence.subscribe((nextState) => {
        if (!nextState) return;
        if (nextState.mode === state.mode && nextState.family === state.family) {
          return;
        }
        state = nextState;
        handleSyncUpdate(nextState);
      });
    }
    if (broadcast) {
      unsubscribeBroadcast = broadcast.subscribe((nextState) => {
        if (nextState.mode === state.mode && nextState.family === state.family) {
          return;
        }
        state = nextState;
        handleSyncUpdate(nextState);
      });
    }
    unsubscribeStore = options.store.subscribe((theme) => {
      if (applyingFromController) return;
      const themeFamily = getThemeFamily(theme);
      const themeMode = getThemeMode(theme);
      const applied = {
        family: themeFamily,
        mode: themeMode === "dark" ? "dark" : "light"
      };
      if (themeMode && state.mode !== "system" && (themeFamily !== state.family || themeMode !== state.mode)) {
        state = { family: themeFamily, mode: themeMode };
        runSyncAdapter("storeSync", "persistence", () => persistence?.set(state));
        runSyncAdapter("storeSync", "broadcast", () => broadcast?.post(state));
        notifySelectionListeners();
      }
      publishEffective(applied);
    });
    applySelection(state, false);
    return {
      getMode() {
        return state.mode;
      },
      getFamily() {
        return state.family;
      },
      getSelection() {
        return {
          ...state
        };
      },
      /**
       * The appearance actually applied — `"light"` or `"dark"`, never
       * `"system"`.
       *
       * Differs from {@link getMode} while an automatic driver is deciding the
       * appearance: `mode` stays `"system"` because that is what the visitor
       * asked for, while this reports what is on screen. Read this to display the
       * current mode; read `mode` to edit the choice.
       *
       * Computed from the store on every read rather than cached, so it cannot go
       * stale between the store's notification and this controller's own.
       */
      getEffectiveMode() {
        return deriveEffective().mode;
      },
      /** The applied family and mode, as one snapshot. */
      getEffectiveSelection() {
        return deriveEffective();
      },
      /**
       * Subscribe to changes in the appearance actually applied.
       *
       * Fires whenever the store resolves to a different family or mode — a
       * manual change, an OS appearance change while the selection is `"system"`,
       * or a schedule transition. Separate from {@link subscribe}, which reports
       * the configured selection and therefore stays quiet through an automatic
       * change.
       */
      subscribeEffective(listener) {
        effectiveListeners.add(listener);
        return () => {
          effectiveListeners.delete(listener);
        };
      },
      setMode,
      setFamily,
      applyState,
      applyAutomaticTheme,
      setAutomaticDriverActive,
      toggleTheme,
      subscribe(listener) {
        selectionListeners.add(listener);
        return () => {
          selectionListeners.delete(listener);
        };
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        stopSystemBinding();
        unsubscribePersistence?.();
        unsubscribePersistence = null;
        unsubscribeBroadcast?.();
        unsubscribeBroadcast = null;
        broadcast?.destroy();
        unsubscribeStore?.();
        unsubscribeStore = null;
        selectionListeners.clear();
        effectiveListeners.clear();
      }
    };
  }
  function cloneThemeValue(value) {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  }
  function createThemeHistory(store, options) {
    const maxSteps = options?.maxSteps ?? 50;
    const now = options?.now ?? Date.now;
    const entries = [{
      theme: cloneThemeValue(store.get()),
      timestamp: now()
    }];
    let currentIndex = 0;
    let skipNext = false;
    let cachedHistory = null;
    const unsubscribe = store.subscribe((theme) => {
      if (skipNext) {
        skipNext = false;
        return;
      }
      cachedHistory = null;
      const entry = {
        theme: cloneThemeValue(theme),
        timestamp: now()
      };
      entries.splice(currentIndex + 1, entries.length - currentIndex - 1);
      entries.push(entry);
      currentIndex++;
      while (entries.length > maxSteps + 1) {
        entries.shift();
        currentIndex--;
      }
    });
    function applyTheme(theme) {
      skipNext = true;
      store.set(cloneThemeValue(theme), { force: true });
    }
    function undo() {
      if (!canUndo()) return;
      currentIndex--;
      applyTheme(entries[currentIndex].theme);
    }
    function redo() {
      if (!canRedo()) return;
      currentIndex++;
      applyTheme(entries[currentIndex].theme);
    }
    function canUndo() {
      return currentIndex > 0;
    }
    function canRedo() {
      return currentIndex < entries.length - 1;
    }
    function jump(index) {
      if (index < 0 || index >= entries.length) return;
      if (index === currentIndex) return;
      currentIndex = index;
      applyTheme(entries[currentIndex].theme);
    }
    function getHistory() {
      if (cachedHistory === null) {
        cachedHistory = entries.map((e) => ({ ...e, theme: cloneThemeValue(e.theme) }));
      }
      return cachedHistory;
    }
    return {
      undo,
      redo,
      canUndo,
      canRedo,
      jump,
      getHistory,
      clear() {
        cachedHistory = null;
        entries.length = 0;
        entries.push({
          theme: cloneThemeValue(store.get()),
          timestamp: now()
        });
        currentIndex = 0;
      },
      destroy() {
        cachedHistory = null;
        unsubscribe();
        entries.length = 0;
        currentIndex = -1;
      }
    };
  }
  function createThemeLifecycle() {
    const handlers = /* @__PURE__ */ new Map();
    function getEventSet(event) {
      let set = handlers.get(event);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        handlers.set(event, set);
      }
      return set;
    }
    return {
      on(event, handler) {
        getEventSet(event).add(handler);
        return () => {
          getEventSet(event).delete(handler);
        };
      },
      off(event, handler) {
        getEventSet(event).delete(handler);
      },
      emit(event, data) {
        const set = handlers.get(event);
        if (!set) return;
        for (const handler of set) {
          handler(data);
        }
      },
      destroy() {
        handlers.clear();
      }
    };
  }
  function createPluginManager() {
    const plugins = /* @__PURE__ */ new Map();
    function sorted() {
      return [...plugins.values()].sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
    }
    return {
      use(plugin) {
        if (plugins.has(plugin.name)) {
          console.warn(`[themvora] Plugin "${plugin.name}" is already registered. Skipping.`);
          return () => {
          };
        }
        plugins.set(plugin.name, plugin);
        return () => plugins.delete(plugin.name);
      },
      remove(name) {
        return plugins.delete(name);
      },
      list() {
        return sorted();
      },
      get(name) {
        return plugins.get(name);
      },
      destroy() {
        for (const plugin of sorted()) {
          try {
            plugin.onDestroy?.();
          } catch (error) {
            emitDiagnostic(
              createDiagnostic({
                code: "TV_PLUGIN_DESTROY_FAILED",
                level: "warning",
                message: `Plugin "${plugin.name}" threw while being destroyed. The remaining plugins were still destroyed.`,
                context: {
                  api: "pluginManager.destroy",
                  property: "onDestroy",
                  received: plugin.name
                },
                hint: "Make onDestroy() tolerant of partial initialisation \u2014 it runs even when the plugin never finished starting.",
                cause: error
              })
            );
          }
        }
        plugins.clear();
      }
    };
  }
  function createDefaultPersistence() {
    if (typeof window === "undefined") return null;
    let storage = null;
    try {
      storage = window.localStorage;
    } catch {
      return null;
    }
    const key = "theme-selection";
    function parseState(value) {
      if (!value) return null;
      try {
        const p = JSON.parse(value);
        if ((p.mode === "light" || p.mode === "dark" || p.mode === "system") && typeof p.family === "string") {
          return { mode: p.mode, family: p.family };
        }
      } catch {
      }
      return null;
    }
    return {
      get() {
        try {
          return parseState(storage.getItem(key));
        } catch {
          return null;
        }
      },
      set(value) {
        try {
          storage.setItem(key, JSON.stringify(value));
        } catch {
        }
      },
      remove() {
        try {
          storage.removeItem(key);
        } catch {
        }
      },
      subscribe(listener) {
        const handler = (event) => {
          if (event.key !== key) return;
          listener(parseState(event.newValue));
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
      }
    };
  }
  function createDefaultBroadcast() {
    return createThemeSelectionBroadcast({ channelName: "theme-selection" });
  }
  function resolveTransitionConfig(value) {
    if (value === void 0) return void 0;
    if (typeof value === "object") return value;
    return value ? {} : { enabled: false };
  }
  function createThemeRuntime(options = {}) {
    const initialThemes = options.themes !== void 0 ? [...normalizeThemeCatalog(options.themes)] : [...getBuiltInThemes()];
    if (options.themes !== void 0 && !options.themes.some(isUsableTheme)) {
      emitNeutralFallbackDiagnostic();
    }
    const registry = createThemeRegistry({ themes: initialThemes });
    const themes = registry.themes;
    const pluginManager = createPluginManager();
    if (options.plugins) {
      for (const plugin of options.plugins) {
        pluginManager.use(plugin);
      }
    }
    const persistence = options.persistence === void 0 ? createDefaultPersistence() : options.persistence;
    const readPersistenceOnInit = options.readPersistenceOnInit ?? true;
    const view = options.view ?? (typeof window !== "undefined" ? window : void 0);
    const prefersDark = typeof view?.matchMedia === "function" && view.matchMedia("(prefers-color-scheme: dark)").matches;
    let initialFamily = options.initialFamily;
    let initialMode = options.initialMode;
    function readSavedSelection() {
      let value = null;
      runSyncAdapter("createRuntime", "persistence", () => {
        value = persistence?.get() ?? null;
      });
      return value;
    }
    if (readPersistenceOnInit && !options.initial) {
      const saved = readSavedSelection();
      if (saved) {
        initialFamily = saved.family;
        initialMode = saved.mode;
      }
    }
    const bootstrapState = typeof document !== "undefined" ? readBootstrapState(themes) : null;
    const adoptBootstrap = bootstrapState?.ready === true ? bootstrapState : null;
    const baseResolution = (
      // Client only: adopt the pre-paint bootstrap's state when it is present.
      // By the time a client renders, `<html>` already carries the resolved theme
      // — the blocking script wrote it before first paint — so the DOM is the
      // authority on what the visitor is looking at, and anything that re-derives
      // the theme can disagree with it. Note this overrides `options.initial`:
      // that is the *server's* resolution, which cannot know
      // `prefers-color-scheme`, while the bootstrap can. `runtime.initial` below
      // deliberately keeps the server's value, because React's hydration snapshot
      // has to match the markup the server sent.
      adoptBootstrap ? resolveInitialTheme({
        themes,
        ...options.defaultTheme !== void 0 ? { defaultTheme: options.defaultTheme } : {},
        family: adoptBootstrap.selection.family,
        mode: adoptBootstrap.selection.mode,
        prefersDark
      }) : options.initial ?? resolveInitialTheme({
        themes,
        ...options.defaultTheme !== void 0 ? { defaultTheme: options.defaultTheme } : {},
        ...initialFamily !== void 0 ? { family: initialFamily } : {},
        ...initialMode !== void 0 ? { mode: initialMode } : {},
        prefersDark
      })
    );
    const overrideSelection = resolveThemeOverrideReporting(
      themes,
      options.themeOverride,
      baseResolution.selection
    );
    const resolution = overrideSelection ? {
      selection: overrideSelection,
      theme: resolveSelectedTheme(themes, {
        ...overrideSelection,
        mode: overrideSelection.mode === "system" ? prefersDark ? "dark" : "light" : overrideSelection.mode
      })
    } : baseResolution;
    const requestedFamily = options.initialFamily;
    if (!options.initial && !adoptBootstrap && // An applied override is a *different* request that deliberately replaced
    // the family; reporting the one it replaced would be noise, not a mistake.
    !overrideSelection && requestedFamily !== void 0 && requestedFamily.length > 0 && initialFamily === requestedFamily && // `initialFamily` accepts a variant name too, and that is not a mistake: the
    // resolved family simply differs from the text. Only a reference that names
    // nothing at all is reported.
    resolveThemeReference(themes, requestedFamily) === null && resolution.selection.family !== requestedFamily) {
      emitUnknownFamilyDiagnostic(
        requestedFamily,
        resolution.selection.family,
        themes
      );
    }
    const serverBase = options.initial ?? resolveInitialTheme({
      themes,
      ...options.defaultTheme !== void 0 ? { defaultTheme: options.defaultTheme } : {},
      ...options.initialFamily !== void 0 ? { family: options.initialFamily } : {},
      ...options.initialMode !== void 0 ? { mode: options.initialMode } : {},
      prefersDark: false
    });
    const serverOverride = resolveThemeOverride(
      themes,
      options.themeOverride,
      serverBase.selection
    );
    const serverResolution = serverOverride ? {
      selection: serverOverride,
      theme: resolveSelectedTheme(themes, {
        ...serverOverride,
        mode: serverOverride.mode === "system" ? "light" : serverOverride.mode
      })
    } : serverBase;
    const initial = Object.freeze({
      theme: serverResolution.theme,
      selection: serverResolution.selection,
      // A server render starts from an empty history: `createThemeHistory` seeds
      // exactly one entry and the initial `applySelection` re-applies the same
      // theme, so nothing is appended. Synthesised rather than read from the live
      // controller, which has already recorded the client-resolved theme.
      canUndo: false,
      canRedo: false,
      history: Object.freeze([
        { theme: serverResolution.theme, timestamp: 0 }
      ])
    });
    const store = createThemeStore({
      initialTheme: resolution.theme
    });
    const lifecycleController = createThemeLifecycle();
    const historyController = createThemeHistory(
      store,
      typeof document === "undefined" ? { now: () => 0 } : {}
    );
    let transitionOpt = resolveTransitionConfig(options.transition);
    const domOptions = mergeDOMOptions(options.dom, transitionOpt);
    const cssVarOptions = mergeCSSOptions(options.cssVariables, transitionOpt);
    const domTransitionExplicit = options.dom !== false && options.dom?.transition !== void 0;
    const cssTransitionExplicit = options.cssVariables !== false && options.cssVariables?.transition !== void 0;
    let scheduleHandle = null;
    let overrideActive = overrideSelection !== null;
    const selectionController = createThemeSelectionController({
      store,
      themes,
      initialFamily: resolution.selection.family,
      initialMode: resolution.selection.mode,
      readPersistenceOnInit: false,
      persistence,
      ...options.broadcast === void 0 ? { broadcast: createDefaultBroadcast() } : options.broadcast ? { broadcast: options.broadcast } : {},
      ...view ? { view } : {},
      onSyncApply: () => {
        scheduleHandle?.setLastSyncTime(Date.now());
      }
    });
    const scheduleStore = {
      get: () => store.get(),
      set: (theme, setOptions) => selectionController.applyAutomaticTheme(theme, setOptions),
      subscribe: (listener) => store.subscribe(listener)
    };
    scheduleHandle = createScheduleController(
      scheduleStore,
      themes,
      options.scheduled,
      // An explicit `themeOverride` outranks the schedule, so a scheduled apply is
      // refused while one is in force. Read live, because the override can arrive
      // or be removed long after the schedule was built.
      () => !overrideActive
    );
    function syncAutomaticDriver() {
      selectionController.setAutomaticDriverActive(
        !overrideActive && scheduleHandle?.enabled === true
      );
    }
    syncAutomaticDriver();
    let unsubscribeScheduleState = null;
    function watchScheduleOwnership() {
      unsubscribeScheduleState?.();
      unsubscribeScheduleState = scheduleHandle?.subscribe(() => {
        syncAutomaticDriver();
      }) ?? null;
    }
    watchScheduleOwnership();
    const unsubscribeManualSelection = selectionController.subscribe(() => {
      if (applyingConfiguration) return;
      if (appliedOverrideKey === null) return;
      manualSelectionSinceOverride = true;
    });
    const cssBindingDrivesDom = cssVarOptions !== void 0 && cssVarOptions.styleSheet !== true;
    const domBinding = domOptions ? createDOMBinding(store, {
      ...domOptions,
      selection: selectionController,
      subscribe: !cssBindingDrivesDom
    }) : null;
    const cssVariablesBinding = cssVarOptions ? createCSSVariablesBinding(store, {
      ...cssVarOptions,
      ...domBinding ? { onBeforeSwap: domBinding.apply } : {}
    }) : null;
    if (domBinding && cssBindingDrivesDom && !cssVariablesBinding) {
      domBinding.apply(store.get(), { suppressTransition: true });
    }
    function wirePluginHooks() {
      for (const plugin of pluginManager.list()) {
        if (plugin.onBeforeThemeChange) {
          lifecycleController.on(
            "beforeThemeChange",
            plugin.onBeforeThemeChange
          );
        }
        if (plugin.onAfterThemeChange) {
          lifecycleController.on(
            "afterThemeChange",
            plugin.onAfterThemeChange
          );
        }
        if (plugin.onBeforePersist) {
          lifecycleController.on(
            "beforePersist",
            plugin.onBeforePersist
          );
        }
        if (plugin.onAfterPersist) {
          lifecycleController.on(
            "afterPersist",
            plugin.onAfterPersist
          );
        }
        if (plugin.onBeforeApply) {
          lifecycleController.on(
            "beforeApply",
            plugin.onBeforeApply
          );
        }
        if (plugin.onAfterApply) {
          lifecycleController.on(
            "afterApply",
            plugin.onAfterApply
          );
        }
      }
    }
    function use(pack) {
      registry.use(pack);
    }
    function mergeDOMOptions(explicit, fallbackTransition) {
      if (explicit === false) return void 0;
      const base = explicit ?? {};
      if (base.transition) return base;
      if (fallbackTransition) return { ...base, transition: fallbackTransition };
      return base;
    }
    function mergeCSSOptions(explicit, fallbackTransition) {
      if (explicit === false) return void 0;
      const base = explicit ?? {};
      if (base.transition) return base;
      if (fallbackTransition) return { ...base, transition: fallbackTransition };
      return base;
    }
    function batch(callback) {
      store.batch(callback);
    }
    function snapshot() {
      return {
        theme: cloneThemeValue(store.get()),
        selection: { ...selectionController.getSelection() },
        history: [...historyController.getHistory()],
        registry: {
          themes: registry.list().map((t) => cloneThemeValue(t))
        }
      };
    }
    function restore(snap) {
      updatingFromRuntime = true;
      registry.batch(() => {
        store.batch(() => {
          registry.clear();
          for (const theme of snap.registry.themes) {
            registry.register(theme);
          }
          historyController.clear();
          store.set(cloneThemeValue(snap.theme), { force: true });
          previousTheme = store.get();
          applyingConfiguration = true;
          try {
            selectionController.setMode(snap.selection.mode);
            if (snap.selection.family) {
              selectionController.setFamily(snap.selection.family);
            }
          } finally {
            applyingConfiguration = false;
          }
        });
      });
      updatingFromRuntime = false;
    }
    let updatingFromRuntime = false;
    let previousTheme = store.get();
    let appliedConfig = {
      defaultTheme: options.defaultTheme,
      themeOverride: options.themeOverride,
      initialFamily: options.initialFamily,
      initialMode: options.initialMode,
      initial: options.initial
    };
    let appliedOverrideKey = overrideSelection ? themeOverrideKey(options.themeOverride, themes) : null;
    let appliedOverrideRequestKey = overrideSelection ? themeOverrideKey(options.themeOverride) : null;
    let overrideBaseSelection = overrideSelection ? { ...baseResolution.selection } : null;
    let manualSelectionSinceOverride = false;
    let applyingConfiguration = false;
    let appliedTransition = transitionOpt;
    let appliedScheduled = options.scheduled;
    function sameCatalog(a, b) {
      return a.length === b.length && a.every((theme, index) => theme === b[index]);
    }
    function sameStringList(a, b) {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((value, index) => value === b[index]);
    }
    function samePreset(a, b) {
      if (a === b) return true;
      return sameStringList(
        Array.isArray(a) ? a : void 0,
        Array.isArray(b) ? b : void 0
      );
    }
    function sameTransition(a, b) {
      if (a === b) return true;
      if (!a || !b) return false;
      return (a.enabled ?? true) === (b.enabled ?? true) && (a.duration ?? DEFAULT_THEME_TRANSITION.duration) === (b.duration ?? DEFAULT_THEME_TRANSITION.duration) && (a.easing ?? DEFAULT_THEME_TRANSITION.easing) === (b.easing ?? DEFAULT_THEME_TRANSITION.easing) && (a.useViewTransition ?? DEFAULT_THEME_TRANSITION.useViewTransition) === (b.useViewTransition ?? DEFAULT_THEME_TRANSITION.useViewTransition) && samePreset(a.preset, b.preset) && sameStringList(
        a.properties ?? DEFAULT_THEME_TRANSITION.properties,
        b.properties ?? DEFAULT_THEME_TRANSITION.properties
      );
    }
    function sameScheduled(a, b) {
      if (a === b) return true;
      if (a === false || b === false || !a || !b) return false;
      return a.lightTheme === b.lightTheme && a.darkTheme === b.darkTheme && a.latitude === b.latitude && a.longitude === b.longitude && a.timeZone === b.timeZone && a.autoDetectLocation === b.autoDetectLocation && a.checkInterval === b.checkInterval && a.skipApplyMs === b.skipApplyMs && a.enabled === b.enabled;
    }
    function applyTransitionConfig(next) {
      transitionOpt = next;
      if (domBinding && !domTransitionExplicit) domBinding.setTransition(next);
      if (cssVariablesBinding && !cssTransitionExplicit) {
        cssVariablesBinding.setTransition(next);
      }
    }
    function scheduledSetOptions(next) {
      const opts = {
        lightTheme: next.lightTheme,
        darkTheme: next.darkTheme
      };
      if (next.latitude !== void 0) opts.latitude = next.latitude;
      if (next.longitude !== void 0) opts.longitude = next.longitude;
      if (next.timeZone !== void 0) opts.timeZone = next.timeZone;
      if (next.checkInterval !== void 0)
        opts.checkInterval = next.checkInterval;
      if (next.skipApplyMs !== void 0) opts.skipApplyMs = next.skipApplyMs;
      if (next.enabled !== void 0) opts.enabled = next.enabled;
      const hasCoordinates = next.latitude !== void 0 || next.longitude !== void 0 || next.timeZone !== void 0;
      if (!hasCoordinates && next.autoDetectLocation !== false) {
        opts.autoDetectLocation = true;
      }
      return opts;
    }
    function reconcileSchedule(next) {
      if (next === false) {
        scheduleHandle?.destroy();
        scheduleHandle = null;
        watchScheduleOwnership();
        selectionController.setAutomaticDriverActive(false);
        return;
      }
      if (!scheduleHandle) {
        scheduleHandle = createScheduleController(
          scheduleStore,
          themes,
          next
        );
        watchScheduleOwnership();
      } else {
        scheduleHandle.set(scheduledSetOptions(next));
      }
      syncAutomaticDriver();
    }
    function invalidTransitionOption(options2) {
      if (options2.duration !== void 0 && (!Number.isFinite(options2.duration) || options2.duration < 0)) {
        return {
          property: "transition.duration",
          received: options2.duration,
          expected: "a finite number of milliseconds >= 0"
        };
      }
      if (options2.easing !== void 0 && (typeof options2.easing !== "string" || options2.easing.trim().length === 0)) {
        return {
          property: "transition.easing",
          received: options2.easing,
          expected: "a non-empty CSS timing function"
        };
      }
      return null;
    }
    function invalidScheduledOption(options2) {
      const { checkInterval, skipApplyMs, latitude, longitude } = options2;
      if (checkInterval !== void 0 && (!Number.isFinite(checkInterval) || checkInterval <= 0)) {
        return {
          property: "scheduled.checkInterval",
          received: checkInterval,
          expected: "a finite number of milliseconds > 0"
        };
      }
      if (skipApplyMs !== void 0 && (!Number.isFinite(skipApplyMs) || skipApplyMs < 0)) {
        return {
          property: "scheduled.skipApplyMs",
          received: skipApplyMs,
          expected: "a finite number of milliseconds >= 0"
        };
      }
      if (latitude !== void 0 && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
        return {
          property: "scheduled.latitude",
          received: latitude,
          expected: "a number in [-90, 90]"
        };
      }
      if (longitude !== void 0 && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
        return {
          property: "scheduled.longitude",
          received: longitude,
          expected: "a number in [-180, 180]"
        };
      }
      return null;
    }
    function reportUnresolvedSchedule(next) {
      if (!scheduleHandle) return;
      if (scheduleHandle.lightTheme && scheduleHandle.darkTheme) return;
      const missing = (name) => name !== void 0 && !themes.some((theme) => theme.name === name);
      if (missing(next.lightTheme) || missing(next.darkTheme)) {
        emitScheduledThemeUnresolvedDiagnostic(next);
      }
    }
    function configure(update) {
      let nextThemes;
      if (update.themes === void 0) {
        nextThemes = themes;
      } else {
        const hadUsable = update.themes.some(isUsableTheme);
        nextThemes = normalizeThemeCatalog(update.themes);
        if (!hadUsable) emitNeutralFallbackDiagnostic();
      }
      const catalogChanged = !sameCatalog(nextThemes, themes);
      const has = (key) => Object.prototype.hasOwnProperty.call(update, key);
      const nextDefaultTheme = has("defaultTheme") ? update.defaultTheme : appliedConfig.defaultTheme;
      const nextInitialFamily = has("initialFamily") ? update.initialFamily : appliedConfig.initialFamily;
      const nextInitialMode = has("initialMode") ? update.initialMode : appliedConfig.initialMode;
      const initial2 = update.initial;
      const previousInitial = appliedConfig.initial;
      const initialUsable = initial2 !== void 0 && isSelectionResolvable(nextThemes, initial2.selection);
      const initialChanged = initialUsable && (previousInitial === void 0 || String(initial2.theme?.name) !== String(previousInitial.theme?.name) || initial2.selection.mode !== previousInitial.selection.mode || initial2.selection.family !== previousInitial.selection.family);
      const selectionPropsChanged = nextDefaultTheme !== appliedConfig.defaultTheme || nextInitialFamily !== appliedConfig.initialFamily || nextInitialMode !== appliedConfig.initialMode;
      const nextOverride = has("themeOverride") ? update.themeOverride : appliedConfig.themeOverride;
      const nextOverrideKey = themeOverrideKey(nextOverride, nextThemes);
      const nextOverrideRequestKey = themeOverrideKey(nextOverride);
      const overrideChanged = nextOverrideKey !== null && nextOverrideKey !== appliedOverrideKey && nextOverrideRequestKey !== appliedOverrideRequestKey;
      const overrideRemoved = nextOverrideKey === null && appliedOverrideKey !== null;
      const currentSelection = selectionController.getSelection();
      const overrideResolution = overrideChanged ? resolveThemeOverrideReporting(nextThemes, nextOverride, currentSelection) : null;
      const transitionConfig = has("transition") ? resolveTransitionConfig(update.transition) : appliedTransition;
      const transitionChanged = has("transition") && !sameTransition(transitionConfig, appliedTransition);
      const scheduledSupplied = has("scheduled") && update.scheduled !== void 0;
      const scheduledChanged = scheduledSupplied && !sameScheduled(update.scheduled, appliedScheduled);
      if (!catalogChanged && !initialChanged && !selectionPropsChanged && !overrideChanged && !overrideRemoved && !transitionChanged && !scheduledChanged) {
        return;
      }
      if (transitionChanged) {
        const invalid = invalidTransitionOption(transitionConfig ?? {});
        if (invalid) {
          emitInvalidOptionDiagnostic(invalid);
        } else {
          applyTransitionConfig(transitionConfig);
          appliedTransition = transitionConfig;
        }
      }
      if (scheduledChanged) {
        const nextScheduled = update.scheduled;
        const invalid = nextScheduled === false ? null : invalidScheduledOption(nextScheduled);
        if (invalid) {
          emitInvalidOptionDiagnostic(invalid);
        } else {
          reconcileSchedule(nextScheduled);
          appliedScheduled = update.scheduled;
          if (nextScheduled !== false) reportUnresolvedSchedule(nextScheduled);
        }
      }
      if (!catalogChanged && !initialChanged && !selectionPropsChanged && !overrideRemoved && !overrideResolution) {
        return;
      }
      const previous = currentSelection;
      let nextSelection;
      if (initialChanged && update.initial && isSelectionResolvable(nextThemes, update.initial.selection)) {
        nextSelection = update.initial.selection;
      } else {
        const requestedFamily2 = nextInitialFamily;
        const preserve = catalogChanged && !selectionPropsChanged && !initialChanged && !(requestedFamily2 !== void 0 && requestedFamily2 !== previous.family);
        nextSelection = resolveEffectiveConfiguration({
          themes: nextThemes,
          defaultTheme: preserve ? void 0 : nextDefaultTheme,
          initialFamily: preserve ? void 0 : nextInitialFamily,
          initialMode: preserve ? void 0 : nextInitialMode,
          prefersDark,
          previousSelection: previous,
          preservePrevious: preserve
        }).selection;
      }
      let overrideApplied = false;
      let overrideWasRemoved = false;
      if (overrideResolution) {
        if (appliedOverrideKey === null) {
          overrideBaseSelection = { ...previous };
          manualSelectionSinceOverride = false;
        }
        nextSelection = overrideResolution;
        overrideApplied = true;
      } else if (overrideRemoved) {
        nextSelection = manualSelectionSinceOverride ? { ...previous } : { ...overrideBaseSelection ?? previous };
        overrideBaseSelection = null;
        manualSelectionSinceOverride = false;
        overrideWasRemoved = true;
      }
      updatingFromRuntime = true;
      registry.batch(() => {
        store.batch(() => {
          if (catalogChanged) {
            registry.clear();
            registry.registerMany(nextThemes);
          }
          applyingConfiguration = true;
          try {
            selectionController.applyState(
              nextSelection,
              // The override must not write to storage or the cross-tab channel: it
              // is a transient preview, and overwriting the visitor's saved choice
              // would make a prop look like a user action. It *should* animate, since
              // it is a visible theme change the consumer asked for. Restoring the
              // underlying selection is not a user action either, so it does not
              // persist — that state is already what storage says, or it is a
              // fallback that was never a choice.
              overrideApplied || overrideWasRemoved ? { persist: false, suppressTransition: false } : {}
            );
          } finally {
            applyingConfiguration = false;
          }
          previousTheme = store.get();
        });
      });
      updatingFromRuntime = false;
      appliedConfig = {
        themes: nextThemes,
        defaultTheme: nextDefaultTheme,
        themeOverride: nextOverride,
        initialFamily: nextInitialFamily,
        initialMode: nextInitialMode,
        // Only a resolution the catalog accepted is remembered. Storing an
        // unusable one would make the *same* object look "already applied" once
        // the catalog gains that family, so the update would be skipped exactly
        // when it had become valid.
        initial: initialUsable ? initial2 : appliedConfig.initial
      };
      if (overrideApplied) {
        appliedOverrideKey = nextOverrideKey;
        appliedOverrideRequestKey = nextOverrideRequestKey;
        overrideActive = true;
      } else if (overrideWasRemoved) {
        appliedOverrideKey = null;
        appliedOverrideRequestKey = null;
        overrideActive = false;
      }
      if (overrideApplied || overrideWasRemoved) {
        syncAutomaticDriver();
      }
    }
    const unsubscribeStoreSelection = store.subscribe((theme) => {
      if (updatingFromRuntime) return;
      if (theme === previousTheme) return;
      lifecycleController.emit("beforeThemeChange", {
        current: previousTheme,
        next: theme
      });
      lifecycleController.emit("beforePersist", {
        selection: selectionController.getSelection()
      });
      lifecycleController.emit("afterPersist", {
        selection: selectionController.getSelection()
      });
      lifecycleController.emit("afterThemeChange", { theme });
      previousTheme = theme;
    });
    let adapterRegistry = null;
    const runtime = {
      store,
      initial,
      registry,
      get themes() {
        return themes;
      },
      selection: selectionController,
      history: historyController,
      lifecycle: lifecycleController,
      adapters: null,
      get schedule() {
        return scheduleHandle;
      },
      get transition() {
        return transitionOpt;
      },
      update(tokens) {
        const current = store.get();
        const next = { ...current };
        let merged = mergeTokens(current.tokens, tokens);
        if (merged) {
          for (const plugin of pluginManager.list()) {
            if (plugin.transformTokens) {
              merged = plugin.transformTokens(merged, { theme: next });
            }
          }
          merged = resolveTokens(merged);
        }
        next.tokens = merged ?? current.tokens;
        updatingFromRuntime = true;
        lifecycleController.emit("beforeThemeChange", { current, next });
        lifecycleController.emit("beforePersist", {
          selection: selectionController.getSelection()
        });
        store.set(next, { force: true });
        previousTheme = next;
        updatingFromRuntime = false;
        lifecycleController.emit("afterPersist", {
          selection: selectionController.getSelection()
        });
        lifecycleController.emit("afterThemeChange", { theme: next });
      },
      use,
      configure,
      batch,
      snapshot,
      restore,
      destroy() {
        unsubscribeStoreSelection();
        unsubscribeManualSelection();
        unsubscribeScheduleState?.();
        unsubscribeScheduleState = null;
        pluginManager.destroy();
        selectionController.destroy();
        historyController.destroy();
        domBinding?.destroy();
        cssVariablesBinding?.destroy();
        scheduleHandle?.destroy();
        adapterRegistry?.destroy();
        registry.destroy();
        lifecycleController.destroy();
      }
    };
    for (const plugin of pluginManager.list()) {
      plugin.onRuntimeCreated?.(runtime);
    }
    wirePluginHooks();
    adapterRegistry = createAdapterRegistry(runtime);
    runtime.adapters = adapterRegistry;
    for (const adapter of options.adapters ?? []) {
      adapterRegistry.use(adapter);
    }
    return runtime;
  }
  function createScheduleController(store, themes, scheduled, allowApply) {
    if (!scheduled) return null;
    return createThemeSchedule(store, themes, {
      ...scheduled.lightTheme !== void 0 ? { lightTheme: scheduled.lightTheme } : {},
      ...scheduled.darkTheme !== void 0 ? { darkTheme: scheduled.darkTheme } : {},
      ...scheduled.latitude !== void 0 ? { latitude: scheduled.latitude } : {},
      ...scheduled.longitude !== void 0 ? { longitude: scheduled.longitude } : {},
      ...scheduled.timeZone !== void 0 ? { timeZone: scheduled.timeZone } : {},
      ...scheduled.autoDetectLocation !== void 0 ? { autoDetectLocation: scheduled.autoDetectLocation } : {},
      ...scheduled.checkInterval !== void 0 ? { checkInterval: scheduled.checkInterval } : {},
      ...scheduled.skipApplyMs !== void 0 ? { skipApplyMs: scheduled.skipApplyMs } : {},
      ...scheduled.enabled !== void 0 ? { enabled: scheduled.enabled } : {},
      ...scheduled.getTimes !== void 0 ? { getTimes: scheduled.getTimes } : {},
      ...allowApply ? { onBeforeApply: () => allowApply() } : {}
    });
  }
  var PACK_TAG = /^pack:(.+)$/;
  function declaredProvenance(meta) {
    const generation = meta?.generation;
    if (generation?.kind === "generated") {
      return { kind: "generated", algorithm: generation.algorithm };
    }
    for (const tag of meta?.tags ?? []) {
      const match = PACK_TAG.exec(tag);
      if (match?.[1]) return { kind: "pack", pack: match[1] };
    }
    return void 0;
  }
  function tokensEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
      return false;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return a.every((value, index) => tokensEqual(value, b[index]));
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!tokensEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  function metaEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    const { created: _aCreated, updated: _aUpdated, ...aRest } = a;
    const { created: _bCreated, updated: _bUpdated, ...bRest } = b;
    return tokensEqual(aRest, bRest);
  }
  function variantEqual(a, b) {
    if (a === b) return true;
    return a.name === b.name && a.mode === b.mode && a.theme === b.theme && metaEqual(a.meta, b.meta) && tokensEqual(a.tokens, b.tokens);
  }
  function familyEqual(a, b) {
    if (a === b) return true;
    if (a.id !== b.id || a.family !== b.family || a.name !== b.name || !metaEqual(a.meta, b.meta) || !tokensEqual(a.provenance, b.provenance) || a.variants.length !== b.variants.length) {
      return false;
    }
    return a.variants.every((variant, index) => variantEqual(variant, b.variants[index]));
  }
  function createVariant(theme, previous) {
    if (previous && previous.theme === theme) return previous;
    return {
      name: String(theme.name),
      mode: getThemeMode(theme),
      ...theme.meta ? { meta: theme.meta } : {},
      tokens: resolveTokens(theme.tokens ?? {}),
      theme
    };
  }
  function normalizeProvidedThemes(themes, previous = []) {
    const byFamily = /* @__PURE__ */ new Map();
    for (const theme of themes) {
      const family = getThemeFamily(theme);
      const variants = byFamily.get(family);
      if (variants) {
        if (!variants.some((variant) => variant.name === theme.name)) {
          variants.push(createVariant(theme));
        }
      } else {
        byFamily.set(family, [createVariant(theme)]);
      }
    }
    const previousByFamily = new Map(previous.map((family) => [family.id, family]));
    const result = [];
    for (const [family, variants] of byFamily) {
      const prior = previousByFamily.get(family);
      const priorVariants = new Map(
        (prior?.variants ?? []).map((variant) => [variant.name, variant])
      );
      const stableVariants = variants.map(
        (variant) => createVariant(variant.theme, priorVariants.get(variant.name))
      );
      const labelled = stableVariants.find((variant) => variant.meta?.label);
      const meta = stableVariants.find((variant) => variant.meta)?.meta;
      const provenance = stableVariants.map((variant) => declaredProvenance(variant.meta)).find((value) => value !== void 0);
      const next = {
        id: family,
        family,
        name: labelled?.meta?.label ?? family,
        ...meta ? { meta } : {},
        ...provenance ? { provenance } : {},
        variants: stableVariants
      };
      result.push(prior && familyEqual(prior, next) ? prior : next);
    }
    if (previous.length === result.length && result.every((family, i) => family === previous[i])) {
      return previous;
    }
    return result;
  }
  function clamp2(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }
  function toArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }
  function computeThumbSize(clientLen, contentLen, minThumbSize, offset) {
    if (contentLen <= clientLen) return 0;
    const ideal = clientLen * clientLen / contentLen;
    return clamp2(Math.round(ideal), minThumbSize, clientLen - offset * 2);
  }
  function computeMaxScroll(contentLen, clientLen) {
    return Math.max(contentLen - clientLen, 0);
  }
  function overscrollFactor(scrollPos, maxScroll, clientLen, enabled, maxCompress = 0.18) {
    if (!enabled) return 1;
    let over = 0;
    if (scrollPos < 0) over = -scrollPos;
    else if (scrollPos > maxScroll) over = scrollPos - maxScroll;
    if (over <= 0) return 1;
    const t = clamp2(over / Math.max(clientLen, 1), 0, 1);
    return 1 - maxCompress * t;
  }
  var FRAME_MS = 16.667;
  function easeAlpha(animationDurationMs, dtMs = FRAME_MS) {
    if (animationDurationMs <= 0) return 1;
    return 1 - Math.exp(-dtMs / animationDurationMs);
  }
  function lerp(current, target, alpha) {
    return current + (target - current) * alpha;
  }
  function isSettled(current, target, epsilon = 0.25) {
    return Math.abs(current - target) <= epsilon;
  }
  function prefersReducedMotion3() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }
  function elementOf(target) {
    if (target && target instanceof HTMLElement && target.nodeType === 1) {
      return target;
    }
    return null;
  }
  function observeScrollbarSizing(isHost, hooks) {
    function onScrollCapture(e) {
      const el = elementOf(e.target);
      if (el && isHost(el)) hooks.onTargetActivity(el);
      else hooks.onGlobalActivity();
      hooks.onResize();
    }
    function onWheelCapture(e) {
      let node = elementOf(e.target);
      while (node) {
        if (isHost(node)) {
          hooks.onTargetActivity(node);
          hooks.onResize();
          return;
        }
        node = node.parentElement;
      }
      hooks.onGlobalActivity();
    }
    function onTransitionRun(e) {
      if (e.propertyName !== "opacity") return;
      const el = elementOf(e.target);
      if (el) hooks.onOpacityTransition(el);
    }
    let scanRaf = null;
    let pendingRecords = [];
    function requestScan(records) {
      if (records && records.length) pendingRecords.push(...records);
      if (scanRaf != null) return;
      scanRaf = requestAnimationFrame(() => {
        scanRaf = null;
        const recs = pendingRecords;
        pendingRecords = [];
        hooks.onMutate(recs);
      });
    }
    let mutationObserver = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(requestScan);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "dir"]
      });
    }
    function onLoad() {
      requestScan();
    }
    window.addEventListener("scroll", onScrollCapture, { capture: true, passive: true });
    window.addEventListener("resize", hooks.onResize);
    window.addEventListener("wheel", onWheelCapture, { passive: true });
    window.addEventListener("transitionrun", onTransitionRun, { capture: true, passive: true });
    window.addEventListener("load", onLoad);
    return {
      dispose() {
        window.removeEventListener("scroll", onScrollCapture, { capture: true });
        window.removeEventListener("resize", hooks.onResize);
        window.removeEventListener("wheel", onWheelCapture);
        window.removeEventListener("transitionrun", onTransitionRun, { capture: true });
        window.removeEventListener("load", onLoad);
        if (scanRaf != null) cancelAnimationFrame(scanRaf);
        mutationObserver?.disconnect();
      }
    };
  }
  var PRE_PAINT_SCROLLBAR_CSS = (
    // Page / window: collapsed (no reserved strip).
    "html.tv-scrollbar,html.tv-scrollbar body,body.tv-scrollbar{scrollbar-width:none;-ms-overflow-style:none}html.tv-scrollbar::-webkit-scrollbar,html.tv-scrollbar body::-webkit-scrollbar,body.tv-scrollbar::-webkit-scrollbar{width:0;height:0}html.tv-scrollbar *::-webkit-scrollbar{width:15px;height:15px;background:transparent}html.tv-scrollbar *::-webkit-scrollbar-thumb,html.tv-scrollbar *::-webkit-scrollbar-track,html.tv-scrollbar *::-webkit-scrollbar-corner{background:transparent}[data-themvora-scrollbar=overlay]::-webkit-scrollbar{width:15px;height:15px;background:transparent}[data-themvora-scrollbar=overlay]::-webkit-scrollbar-thumb,[data-themvora-scrollbar=overlay]::-webkit-scrollbar-track,[data-themvora-scrollbar=overlay]::-webkit-scrollbar-corner{background:transparent}@supports not selector(::-webkit-scrollbar){html.tv-scrollbar *{scrollbar-width:thin;scrollbar-color:transparent transparent}html.tv-scrollbar body{scrollbar-width:none}[data-themvora-scrollbar=overlay]{scrollbar-width:thin;scrollbar-color:transparent transparent}}"
  );
  var SCROLLBAR_HIDING_STYLE_ID = "tv-scrollbar-style";
  var SCROLLBAR_HIDING_STYLE_ATTR = "data-themvora-scrollbar-hiding";
  function hidingStylesheets() {
    const found = [];
    const byId = document.getElementById(SCROLLBAR_HIDING_STYLE_ID);
    if (byId instanceof HTMLStyleElement) found.push(byId);
    const marked = document.querySelectorAll(
      `style[${SCROLLBAR_HIDING_STYLE_ATTR}]`
    );
    for (let i = 0; i < marked.length; i += 1) {
      const el = marked[i];
      if (el && !found.includes(el)) found.push(el);
    }
    return found;
  }
  var hidingClaims = 0;
  function restoreNativeScrollbar() {
    hidingClaims = 0;
    if (typeof document === "undefined") return;
    try {
      const docEl = document.documentElement;
      docEl.classList.remove("tv-scrollbar");
      docEl.classList.remove("tv-scrollbar-ready");
      for (const sheet of hidingStylesheets()) sheet.remove();
    } catch {
    }
  }
  function hideNativeScrollbar() {
    if (typeof document === "undefined") return () => {
    };
    try {
      const docEl = document.documentElement;
      if (!docEl.classList.contains("tv-scrollbar")) {
        docEl.classList.add("tv-scrollbar");
      }
      if (hidingStylesheets().length === 0) {
        const style = document.createElement("style");
        style.id = SCROLLBAR_HIDING_STYLE_ID;
        style.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
        style.textContent = PRE_PAINT_SCROLLBAR_CSS;
        document.head.appendChild(style);
      }
    } catch {
    }
    hidingClaims += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      hidingClaims = Math.max(0, hidingClaims - 1);
      if (hidingClaims === 0) restoreNativeScrollbar();
    };
  }
  var THUMB_CONTRAST_FLOOR = 3;
  var SCROLLBAR_THUMB_CANDIDATES = ["primary", "accent", "foreground"];
  function hexToRgb(hex) {
    const m = hex.trim().replace(/^#/, "");
    if (/^[0-9a-f]{6}$/i.test(m)) {
      const n = parseInt(m, 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    if (/^[0-9a-f]{3}$/i.test(m)) {
      const n = parseInt(
        m.split("").map((c) => c + c).join(""),
        16
      );
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    return null;
  }
  function luminance([r, g, b]) {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function contrast2(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }
  function pickThumbColor(colors) {
    const canvasHex = colors.background;
    const canvas = typeof canvasHex === "string" ? hexToRgb(canvasHex) : null;
    const candidates = SCROLLBAR_THUMB_CANDIDATES.map(
      (role) => typeof colors[role] === "string" ? hexToRgb(colors[role]) : null
    );
    if (canvas) {
      for (const candidate of candidates) {
        if (candidate && contrast2(candidate, canvas) >= THUMB_CONTRAST_FLOOR) return candidate;
      }
    }
    const reading = candidates[2];
    if (reading) return reading;
    for (const candidate of candidates) if (candidate) return candidate;
    return null;
  }
  function pickThumbFromCandidates(candidates, canvas) {
    if (canvas) {
      for (const candidate of candidates) {
        if (candidate && contrast2(candidate, canvas) >= THUMB_CONTRAST_FLOOR) return candidate;
      }
    }
    const reading = candidates[2];
    if (reading) return reading;
    for (const candidate of candidates) if (candidate) return candidate;
    return null;
  }
  function resolveOptions(options) {
    const thickness = options.thickness ?? 8;
    return {
      autoHide: options.autoHide ?? true,
      autoHideDelay: options.autoHideDelay ?? 900,
      hoverExpand: options.hoverExpand ?? false,
      draggable: options.draggable ?? true,
      clickToJump: options.clickToJump ?? true,
      // Exact tracking by default: the thumb always sits at the exact scroll
      // value (no easing lag). `smooth: true` opts into eased travel.
      smooth: options.smooth ?? false,
      overscroll: options.overscroll ?? true,
      arrows: options.arrows ?? true,
      arrowIcon: options.arrowIcon ?? void 0,
      arrowUpIcon: options.arrowUpIcon ?? void 0,
      arrowDownIcon: options.arrowDownIcon ?? void 0,
      arrowLeftIcon: options.arrowLeftIcon ?? void 0,
      arrowRightIcon: options.arrowRightIcon ?? void 0,
      arrowIconRenderer: options.arrowIconRenderer,
      thickness,
      hoverThickness: options.hoverThickness ?? thickness + 4,
      radius: options.radius ?? 999,
      minThumbSize: options.minThumbSize ?? 32,
      iconSize: validIconSize(options.iconSize),
      // Edge clearance (per side) and the content-side separation. `offset` is
      // the public knob for the former; the latter is an internal constant
      // exposed as `--tv-scrollbar-gap` on every strip.
      insets: resolveInsets(options.offset),
      gap: DEFAULT_CONTENT_GAP,
      trackOpacity: options.trackOpacity ?? 0.32,
      thumbOpacity: options.thumbOpacity ?? 0.92,
      thumbColor: options.thumbColor,
      trackColor: options.trackColor,
      activeThumbColor: options.activeThumbColor,
      thumbHoverColor: options.thumbHoverColor,
      zIndex: options.zIndex,
      duration: options.duration ?? 200,
      animationDuration: options.animationDuration ?? 140,
      axes: options.axes ?? ["vertical", "horizontal"],
      include: toArray(options.include),
      exclude: toArray(options.exclude),
      touch: options.touch ?? false,
      dir: resolveDir(options.dir)
    };
  }
  function resolveDir(dir) {
    if (dir === "ltr" || dir === "rtl") return dir;
    try {
      const d = document.documentElement.getAttribute("dir") || getComputedStyle(document.documentElement).direction || "ltr";
      return d === "rtl" ? "rtl" : "ltr";
    } catch {
      return "ltr";
    }
  }
  function isCoarsePointer() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }
  function documentCanScroll() {
    if (typeof document === "undefined") return true;
    try {
      const h = getComputedStyle(document.documentElement).overflowY;
      const b = getComputedStyle(document.body).overflowY;
      if (h === "hidden" || h === "clip") return false;
      if ((h === "visible" || h === "") && (b === "hidden" || b === "clip")) return false;
      return true;
    } catch {
      return true;
    }
  }
  var DEFAULT_OVERLAY_Z = 0;
  var ROOT_OVERLAY_Z = 55;
  var DEFAULT_EDGE_INSET = 4;
  var DEFAULT_INSETS = {
    top: DEFAULT_EDGE_INSET,
    right: DEFAULT_EDGE_INSET,
    bottom: DEFAULT_EDGE_INSET,
    left: 0
  };
  var DEFAULT_CONTENT_GAP = 8;
  var ARROW_MIN_STEP = 16;
  var ARROW_HOLD_STEP_MS = 60;
  var ARROW_HOLD_DELAY_MS = 350;
  var ARROW_EASE_MS = 55;
  var ARROW_SETTLE_PX = 0.5;
  var ICON_MIN_SIZE = 8;
  function stripCrossSize(opts, thickness = opts.thickness) {
    return thickness + opts.gap;
  }
  function glyphSizeFor(requested, cross, long) {
    const usable = Math.max(0, Math.min(cross, long));
    if (requested === void 0) return usable;
    return clamp2(requested, Math.min(ICON_MIN_SIZE, usable), usable);
  }
  function validIconSize(value) {
    if (value === void 0) return void 0;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    warnInvalidOption("iconSize", value, "a positive, finite number of px");
    return void 0;
  }
  function warnInvalidOption(property, received, expected) {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_SCROLLBAR_OPTION_INVALID",
        level: "warning",
        message: `ThemeScrollbar received an unusable \`${property}\`; the default was used instead.`,
        context: { api: "createThemeScrollbar", property, received, expected },
        hint: "Pass a non-negative, finite number of px \u2014 e.g. offset: 4 or offset: { top: 4, right: 4, bottom: 4 }."
      })
    );
  }
  function validInset(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  }
  function resolveInsets(offset) {
    if (offset === void 0) return { ...DEFAULT_INSETS };
    if (typeof offset === "number") {
      const v = validInset(offset);
      if (v === null) {
        warnInvalidOption("offset", offset, "a non-negative, finite number or a per-side object");
        return { ...DEFAULT_INSETS };
      }
      return { top: v, right: v, bottom: v, left: v };
    }
    if (typeof offset !== "object" || offset === null) {
      warnInvalidOption("offset", offset, "a non-negative, finite number or a per-side object");
      return { ...DEFAULT_INSETS };
    }
    const sides = offset;
    const out = { ...DEFAULT_INSETS };
    for (const side of ["top", "right", "bottom", "left"]) {
      const raw = sides[side];
      if (raw === void 0) continue;
      const v = validInset(raw);
      if (v === null) {
        warnInvalidOption(`offset.${side}`, raw, "a non-negative, finite number");
        continue;
      }
      out[side] = v;
    }
    return out;
  }
  function createOverlayScrollbar(store, options = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }
    const releaseHiding = hideNativeScrollbar();
    if (isCoarsePointer() && !options.touch) {
      releaseHiding();
      return null;
    }
    const opts = resolveOptions(options);
    const docEl = document.documentElement;
    const scrollingEl = document.scrollingElement || docEl;
    const reduced = () => prefersReducedMotion3();
    function insetsFor(host) {
      return host.isRoot ? DEFAULT_INSETS : opts.insets;
    }
    function railSideFor(host) {
      if (host.isRoot) return "right";
      return opts.dir === "rtl" ? "left" : "right";
    }
    function axisInsets(host, vertical) {
      const ins = insetsFor(host);
      return vertical ? { start: ins.top, end: ins.bottom } : { start: ins.left, end: ins.right };
    }
    function resolveOverlayZIndex(host) {
      if (opts.zIndex !== void 0) return opts.zIndex;
      if (host.isRoot) return ROOT_OVERLAY_Z;
      let node = host.target;
      let highest = Number.NEGATIVE_INFINITY;
      while (node && node.nodeType === 1) {
        try {
          const cs = getComputedStyle(node);
          if (cs.position !== "static") {
            const z = parseFloat(cs.zIndex);
            if (Number.isFinite(z) && z > highest) highest = z;
          }
        } catch {
        }
        if (node === docEl || node === document.body) break;
        node = node.parentElement;
      }
      if (Number.isFinite(highest)) return highest;
      return DEFAULT_OVERLAY_Z;
    }
    const hosts = /* @__PURE__ */ new Map();
    let scrollableCache = /* @__PURE__ */ new WeakMap();
    let needsRescan = true;
    let destroyed = false;
    const isRootCandidate = (el) => el === docEl || el === document.body || el === scrollingEl;
    let base = resolveBaseColor(store);
    function readCSSVariableColor() {
      try {
        const cs = getComputedStyle(docEl);
        const vars = [
          "--theme-color-primary",
          "--theme-color-accent",
          "--theme-color-foreground"
        ];
        const parsed = vars.map((v) => cs.getPropertyValue(v).trim()).filter((val) => val.length > 0).map((val) => hexToRgb(val));
        const canvas = hexToRgb(cs.getPropertyValue("--theme-color-background").trim());
        return pickThumbFromCandidates(parsed, canvas);
      } catch {
      }
      return null;
    }
    function resolveBaseColor(s) {
      try {
        const theme = s.get();
        const colors = theme?.tokens?.colors ?? theme?.colors ?? {};
        const rgb = pickThumbColor(colors);
        if (rgb) return rgb;
      } catch {
      }
      const cssVar = readCSSVariableColor();
      if (cssVar) return cssVar;
      return [115, 115, 115];
    }
    const rgba = (a) => `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${a})`;
    const trackColor = () => `var(--tv-scrollbar-track, ${rgba(0.22)})`;
    const thumbRest = () => `var(--tv-scrollbar-thumb, ${rgba(0.9)})`;
    const thumbHover = () => `var(--tv-scrollbar-thumb-hover, ${thumbRest()})`;
    const thumbActive = () => `var(--tv-scrollbar-thumb-active, ${thumbHover()})`;
    const storeUnsubscribe = store.subscribe(() => {
      base = resolveBaseColor(store);
      for (const host of hosts.values()) {
        if (host.vertical) paintAxis(host.vertical);
        if (host.horizontal) paintAxis(host.horizontal);
      }
      requestRender();
    });
    function paintAxis(state) {
      state.thumb.style.background = thumbRest();
      state.track.style.background = trackColor();
      state.btnTop.style.background = "transparent";
      state.btnBottom.style.background = "transparent";
      state.btnTop.style.color = thumbRest();
      state.btnBottom.style.color = thumbRest();
    }
    const scrollTopOf = (host) => host.isRoot ? scrollingEl.scrollTop : host.target.scrollTop;
    const scrollLeftOf = (host) => host.isRoot ? scrollingEl.scrollLeft : host.target.scrollLeft;
    const contentLenOf = (host) => host.isRoot ? scrollingEl.scrollHeight : host.target.scrollHeight;
    const contentWidthOf = (host) => host.isRoot ? scrollingEl.scrollWidth : host.target.scrollWidth;
    const clientLenOf = (host, vertical) => vertical ? host.isRoot ? window.innerHeight : host.target.clientHeight : host.isRoot ? window.innerWidth : host.target.clientWidth;
    const maxScroll = (host, vertical) => computeMaxScroll(vertical ? contentLenOf(host) : contentWidthOf(host), clientLenOf(host, vertical));
    const scrollOf = (host, vertical) => vertical ? scrollTopOf(host) : scrollLeftOf(host);
    function axisEndInset(host, state) {
      const vertical = state.axis === "vertical";
      const otherActive = vertical ? host.horizontal !== null && contentWidthOf(host) > clientLenOf(host, false) + 1 : host.vertical !== null && contentLenOf(host) > clientLenOf(host, true) + 1;
      return otherActive ? stripCrossSize(opts) : 0;
    }
    function hostRect(host) {
      if (host.isRoot) {
        return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      }
      const raw = host.target.getBoundingClientRect();
      return { left: raw.left, top: raw.top, width: raw.width, height: raw.height };
    }
    function nativeScrollbarHidden(el) {
      try {
        return getComputedStyle(el).scrollbarWidth === "none";
      } catch {
        return false;
      }
    }
    function hostCornerRadius(host) {
      if (host.isRoot) return { tl: 0, tr: 0, br: 0, bl: 0 };
      try {
        const cs = getComputedStyle(host.target);
        const px = (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) && n > 0 ? n : 0;
        };
        return {
          tl: px(cs.borderTopLeftRadius),
          tr: px(cs.borderTopRightRadius),
          br: px(cs.borderBottomRightRadius),
          bl: px(cs.borderBottomLeftRadius)
        };
      } catch {
        return { tl: 0, tr: 0, br: 0, bl: 0 };
      }
    }
    function applyHostClip(host, state, rect, stripLeft, stripTop, stripWidth, stripHeight) {
      if (host.isRoot) return;
      const r = hostCornerRadius(host);
      if (!r.tl && !r.tr && !r.br && !r.bl) {
        if (state.root.style.clipPath) state.root.style.clipPath = "";
        return;
      }
      const insetTop = rect.top - stripTop;
      const insetRight = stripLeft + stripWidth - (rect.left + rect.width);
      const insetBottom = stripTop + stripHeight - (rect.top + rect.height);
      const insetLeft = rect.left - stripLeft;
      state.root.style.clipPath = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px round ${r.tl}px ${r.tr}px ${r.br}px ${r.bl}px)`;
    }
    function writeScroll(el, vertical, value) {
      const prev = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
      try {
        if (vertical) el.scrollTop = value;
        else el.scrollLeft = value;
      } finally {
        el.style.scrollBehavior = prev;
      }
    }
    function scrollTo(host, value, vertical, smooth = false) {
      const max = maxScroll(host, vertical);
      const next = clamp2(value, 0, max);
      if (host.isRoot) {
        if (smooth) {
          if (vertical) window.scrollTo({ top: next, behavior: "smooth" });
          else window.scrollTo({ left: next, behavior: "smooth" });
        } else {
          writeScroll(scrollingEl, vertical, next);
        }
        return;
      }
      if (smooth) {
        host.target.scrollTo({ top: vertical ? next : 0, left: vertical ? 0 : next, behavior: "smooth" });
      } else {
        writeScroll(host.target, vertical, next);
      }
    }
    function setArrowContent(el, icon) {
      const items = Array.isArray(icon) ? icon : [icon];
      for (const item of items) {
        if (item == null) continue;
        if (typeof item === "string") {
          el.insertAdjacentHTML("beforeend", item);
        } else {
          el.appendChild(item);
        }
      }
    }
    function rotatedIcon(icon, deg) {
      const items = Array.isArray(icon) ? icon : [icon];
      const meaningful = items.filter((i) => i != null && i !== "");
      if (meaningful.length === 0) return void 0;
      const wrap = document.createElement("span");
      wrap.className = "tv-arrow-glyph-rot";
      wrap.style.cssText = "display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:var(--tv-arrow-size,100%);height:var(--tv-arrow-size,100%);max-width:100%;max-height:100%;transform:rotate(" + deg + "deg)";
      for (const item of meaningful) {
        if (typeof item === "string") wrap.insertAdjacentHTML("beforeend", item);
        else wrap.appendChild(item.cloneNode(true));
      }
      return wrap;
    }
    function makeArrow(className, dir, label, icon) {
      const el = document.createElement("div");
      el.className = `tv-arrow ${className}`;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", label);
      if (opts.arrowIconRenderer) {
        opts.arrowIconRenderer(el, dir);
      } else if (icon) {
        el.classList.add("tv-arrow-custom");
        setArrowContent(el, icon);
      }
      return el;
    }
    function createAxis(host, axis) {
      const vertical = axis === "vertical";
      const root = document.createElement("div");
      root.className = `tv-scrollbar ${vertical ? "tv-v" : "tv-h"}`;
      root.setAttribute("aria-hidden", "true");
      root.setAttribute("data-themvora-host", "");
      root.style.display = "none";
      const ensureChild = (selector, create) => {
        const existing = root.querySelector(selector);
        if (existing) return existing;
        const el = create();
        root.appendChild(el);
        return el;
      };
      const track = ensureChild(".tv-track", () => {
        const el = document.createElement("div");
        el.className = "tv-track";
        return el;
      });
      const thumb = ensureChild(".tv-thumb", () => {
        const el = document.createElement("div");
        el.className = "tv-thumb";
        return el;
      });
      const allRotated = (main, ...alts) => main || alts.reduce((acc, [icon, deg]) => acc || rotatedIcon(icon, deg), void 0) || "";
      const topIcon = vertical ? allRotated(opts.arrowUpIcon || opts.arrowIcon, [opts.arrowRightIcon, -90], [opts.arrowLeftIcon, 90]) : allRotated(opts.arrowLeftIcon || opts.arrowIcon, [opts.arrowUpIcon, -90], [opts.arrowRightIcon, 180]);
      const bottomIcon = vertical ? allRotated(opts.arrowDownIcon || opts.arrowIcon, [opts.arrowRightIcon, 90], [opts.arrowLeftIcon, -90]) : allRotated(opts.arrowRightIcon || opts.arrowIcon, [opts.arrowUpIcon, 90], [opts.arrowLeftIcon, 180]);
      const btnTop = ensureChild(
        `.tv-arrow.${vertical ? "tv-arrow-up" : "tv-arrow-left"}`,
        () => makeArrow(vertical ? "tv-arrow-up" : "tv-arrow-left", vertical ? "up" : "left", vertical ? "Scroll up" : "Scroll left", topIcon)
      );
      const btnBottom = ensureChild(
        `.tv-arrow.${vertical ? "tv-arrow-down" : "tv-arrow-right"}`,
        () => makeArrow(vertical ? "tv-arrow-down" : "tv-arrow-right", vertical ? "down" : "right", vertical ? "Scroll down" : "Scroll right", bottomIcon)
      );
      if (host.isRoot) {
        document.body.appendChild(root);
        root.style.position = "fixed";
      } else {
        document.body.appendChild(root);
        root.setAttribute("data-overlay", "true");
        root.style.position = "fixed";
      }
      root.style.zIndex = String(resolveOverlayZIndex(host));
      const insets = insetsFor(host);
      const railSide = railSideFor(host);
      root.setAttribute("data-rail", vertical ? railSide : "bottom");
      root.style.setProperty(
        "--tv-scrollbar-inset",
        `${railSide === "left" ? insets.left : insets.right}px`
      );
      root.style.setProperty("--tv-scrollbar-gap", `${opts.gap}px`);
      if (opts.thumbColor != null) root.style.setProperty("--tv-scrollbar-thumb", opts.thumbColor);
      if (opts.trackColor != null) root.style.setProperty("--tv-scrollbar-track", opts.trackColor);
      if (opts.thumbHoverColor != null) root.style.setProperty("--tv-scrollbar-thumb-hover", opts.thumbHoverColor);
      if (opts.activeThumbColor != null) root.style.setProperty("--tv-scrollbar-thumb-active", opts.activeThumbColor);
      if (!opts.arrows) {
        btnTop.remove();
        btnBottom.remove();
      }
      const state = {
        axis,
        root,
        track,
        thumb,
        btnTop,
        btnBottom,
        dragging: false,
        hovered: false,
        shown: false,
        pointerId: -1,
        dragStartClient: 0,
        dragStartScroll: 0,
        render: { size: 0, drawSize: 0, targetTranslate: 0, currentTranslate: 0 },
        lastGeometry: null,
        __displayed: false,
        __hideTimer: void 0,
        __cleanup: void 0
      };
      paintAxis(state);
      applyGlyphSizing(state, opts.thickness);
      thumb.style.borderRadius = `${opts.radius}px`;
      track.style.borderRadius = `${opts.radius}px`;
      thumb.style.opacity = "0";
      track.style.opacity = "0";
      btnTop.style.opacity = "0";
      btnBottom.style.opacity = "0";
      root.style.transition = `width ${opts.duration}ms ease, height ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
      track.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
      thumb.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease, width ${opts.duration}ms ease, height ${opts.duration}ms ease`;
      btnTop.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
      btnBottom.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
      if (vertical) {
        root.style.width = `${stripCrossSize(opts)}px`;
        thumb.style.top = "0";
        thumb.style.height = "0px";
        btnTop.style.top = "0";
        btnBottom.style.bottom = "0";
      } else {
        root.style.height = `${stripCrossSize(opts)}px`;
        thumb.style.left = "0";
        thumb.style.width = "0px";
        btnTop.style.left = "0";
        btnBottom.style.right = "0";
      }
      wireAxis(host, state);
      return state;
    }
    function buttonSize(state) {
      if (!opts.arrows) return 0;
      return Math.max(10, Math.round(opts.thickness * 1.4));
    }
    function applyGlyphSizing(state, thickness) {
      const size = glyphSizeFor(opts.iconSize, thickness, buttonSize());
      state.root.style.setProperty("--tv-arrow-size", `${size}px`);
      const half = opts.iconSize === void 0 ? Math.max(3, Math.floor((thickness - 2) / 2)) : Math.max(1, Math.round(size / 2));
      state.root.style.setProperty("--tv-arrow", `${half}px`);
    }
    function wireAxis(host, state) {
      const vertical = state.axis === "vertical";
      const { root, track, thumb, btnTop, btnBottom } = state;
      const onEnter = () => {
        state.hovered = true;
        applyGrow(state);
        showAxis(state);
        thumb.style.background = thumbHover();
      };
      const onLeave = () => {
        state.hovered = false;
        applyGrow(state);
        scheduleAutoHide(host);
        if (!state.dragging) {
          thumb.style.background = thumbRest();
        }
      };
      root.addEventListener("mouseenter", onEnter);
      root.addEventListener("mouseleave", onLeave);
      const onPointerDown = (e) => {
        if (!opts.draggable) return;
        state.pointerId = e.pointerId;
        state.dragging = true;
        state.dragStartClient = vertical ? e.clientY : e.clientX;
        state.dragStartScroll = scrollOf(host, vertical);
        thumb.setPointerCapture(e.pointerId);
        thumb.style.background = thumbActive();
        showAxis(state);
        e.preventDefault();
      };
      const onPointerMove = (e) => {
        if (!state.dragging || e.pointerId !== state.pointerId) return;
        const client = clientLenOf(host, vertical);
        const btn = buttonSize();
        const corner = axisEndInset(host, state);
        const { start, end } = axisInsets(host, vertical);
        const effClient = Math.max(client - btn * 2 - start - end - corner, 1);
        const thumbTravel = vertical ? thumb.offsetHeight : thumb.offsetWidth;
        const usable = Math.max(effClient - thumbTravel, 1);
        const max = maxScroll(host, vertical);
        const now = vertical ? e.clientY : e.clientX;
        const delta = now - state.dragStartClient;
        const next = state.dragStartScroll + delta / usable * max;
        scrollTo(host, next, vertical);
      };
      const onPointerUp = (e) => {
        if (e.pointerId !== state.pointerId) return;
        state.dragging = false;
        state.pointerId = -1;
        thumb.style.background = state.hovered ? thumbHover() : thumbRest();
        try {
          thumb.releasePointerCapture(e.pointerId);
        } catch {
        }
        scheduleAutoHide(host);
      };
      const onTrackPointerDown = (e) => {
        if (state.dragging || !opts.clickToJump || e.target === thumb) return;
        const client = clientLenOf(host, vertical);
        const btn = buttonSize();
        const corner = axisEndInset(host, state);
        const { start, end } = axisInsets(host, vertical);
        const effClient = Math.max(client - btn * 2 - start - end - corner, 1);
        const thumbTravel = vertical ? thumb.offsetHeight : thumb.offsetWidth;
        const usable = Math.max(effClient - thumbTravel, 1);
        const max = maxScroll(host, vertical);
        const rect = hostRect(host);
        const pos = (vertical ? e.clientY - rect.top : e.clientX - rect.left) - btn - start;
        if (pos < thumbTravel / 2) {
          scrollTo(host, 0, vertical, true);
        } else {
          const ratio2 = clamp2((pos - thumbTravel) / usable, 0, 1);
          scrollTo(host, ratio2 * max, vertical, true);
        }
        showAxis(state);
      };
      let arrowRaf = 0;
      let arrowLastTs = 0;
      let arrowDir = 0;
      let arrowTarget = 0;
      let arrowSpeed = 0;
      let arrowHoldTimer = null;
      const arrowStep = () => Math.max(ARROW_MIN_STEP, clientLenOf(host, vertical) * 0.05);
      const arrowPosition = () => scrollOf(host, vertical);
      function arrowClearHoldTimer() {
        if (arrowHoldTimer) {
          clearTimeout(arrowHoldTimer);
          arrowHoldTimer = null;
        }
      }
      function arrowStopLoop() {
        if (arrowRaf) {
          cancelAnimationFrame(arrowRaf);
          arrowRaf = 0;
        }
        arrowLastTs = 0;
      }
      function arrowTick(ts) {
        arrowRaf = 0;
        if (destroyed) return;
        const dt = arrowLastTs ? Math.min(ts - arrowLastTs, 50) : FRAME_MS;
        arrowLastTs = ts;
        const cur = arrowPosition();
        let next;
        if (arrowDir !== 0) {
          next = clamp2(cur + arrowDir * arrowSpeed * dt, 0, maxScroll(host, vertical));
        } else if (Math.abs(arrowTarget - cur) < ARROW_SETTLE_PX) {
          next = arrowTarget;
        } else {
          const k = reduced() ? 1 : 1 - Math.exp(-dt / ARROW_EASE_MS);
          next = cur + (arrowTarget - cur) * k;
        }
        if (Math.abs(next - cur) > 1e-6) {
          scrollTo(host, next, vertical);
          showAxis(state);
          arrowRaf = requestAnimationFrame(arrowTick);
          return;
        }
        arrowDir = 0;
        arrowSpeed = 0;
        arrowTarget = cur;
        arrowLastTs = 0;
        scheduleAutoHide(host);
      }
      function arrowStartLoop() {
        if (arrowRaf || destroyed) return;
        arrowLastTs = 0;
        arrowRaf = requestAnimationFrame(arrowTick);
      }
      function arrowStepOnce(dir) {
        const base2 = arrowRaf && arrowDir === 0 ? arrowTarget : arrowPosition();
        arrowDir = 0;
        arrowSpeed = 0;
        arrowTarget = clamp2(base2 + dir * arrowStep(), 0, maxScroll(host, vertical));
        showAxis(state);
        arrowStartLoop();
      }
      function arrowBeginHold(dir) {
        arrowDir = dir;
        arrowSpeed = arrowStep() / ARROW_HOLD_STEP_MS;
        arrowTarget = arrowPosition();
        showAxis(state);
        arrowStartLoop();
      }
      function arrowPress(dir) {
        arrowStepOnce(dir);
        arrowClearHoldTimer();
        arrowHoldTimer = setTimeout(() => {
          arrowHoldTimer = null;
          arrowBeginHold(dir);
        }, ARROW_HOLD_DELAY_MS);
      }
      function arrowRelease() {
        arrowClearHoldTimer();
        if (arrowDir !== 0) {
          arrowDir = 0;
          arrowSpeed = 0;
          arrowTarget = arrowPosition();
          arrowStopLoop();
          scheduleAutoHide(host);
        }
      }
      function arrowCancel() {
        arrowClearHoldTimer();
        arrowDir = 0;
        arrowSpeed = 0;
        arrowStopLoop();
        arrowTarget = arrowPosition();
        scheduleAutoHide(host);
      }
      const onArrowDown = (btn, dir) => (e) => {
        e.preventDefault();
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {
        }
        arrowPress(dir);
      };
      const onBtnTopDown = onArrowDown(btnTop, -1);
      const onBtnBottomDown = onArrowDown(btnBottom, 1);
      btnTop.addEventListener("pointerdown", onBtnTopDown);
      btnBottom.addEventListener("pointerdown", onBtnBottomDown);
      for (const btn of [btnTop, btnBottom]) {
        btn.addEventListener("pointerup", arrowRelease);
        btn.addEventListener("pointercancel", arrowCancel);
        btn.addEventListener("lostpointercapture", arrowCancel);
      }
      const arrowInterrupt = () => arrowCancel();
      const interruptTarget = host.isRoot ? window : host.target;
      interruptTarget.addEventListener("wheel", arrowInterrupt, { passive: true });
      interruptTarget.addEventListener("touchstart", arrowInterrupt, { passive: true });
      thumb.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      track.addEventListener("pointerdown", onTrackPointerDown);
      state.__cleanup = () => {
        root.removeEventListener("mouseenter", onEnter);
        root.removeEventListener("mouseleave", onLeave);
        thumb.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        track.removeEventListener("pointerdown", onTrackPointerDown);
        btnTop.removeEventListener("pointerdown", onBtnTopDown);
        btnBottom.removeEventListener("pointerdown", onBtnBottomDown);
        for (const btn of [btnTop, btnBottom]) {
          btn.removeEventListener("pointerup", arrowRelease);
          btn.removeEventListener("pointercancel", arrowCancel);
          btn.removeEventListener("lostpointercapture", arrowCancel);
        }
        interruptTarget.removeEventListener("wheel", arrowInterrupt);
        interruptTarget.removeEventListener("touchstart", arrowInterrupt);
        arrowClearHoldTimer();
        arrowDir = 0;
        arrowSpeed = 0;
        arrowStopLoop();
        if (state.__hideTimer) clearTimeout(state.__hideTimer);
      };
    }
    function applyGrow(state) {
      const vertical = state.axis === "vertical";
      const size = state.hovered && opts.hoverExpand ? opts.hoverThickness : opts.thickness;
      const cross = stripCrossSize(opts, size);
      if (vertical) state.root.style.width = `${cross}px`;
      else state.root.style.height = `${cross}px`;
      applyGlyphSizing(state, size);
    }
    function showAxis(state) {
      state.shown = true;
      writeShownOpacity(state);
    }
    function showHost(host) {
      if (host.vertical) showAxis(host.vertical);
      if (host.horizontal) showAxis(host.horizontal);
    }
    function revealDoc() {
      if (documentCanScroll()) {
        showHost(rootHost);
        scheduleAutoHide(rootHost);
      }
    }
    function writeShownOpacity(state) {
      state.thumb.style.opacity = String(opts.thumbOpacity);
      state.track.style.opacity = String(opts.trackOpacity);
      state.btnTop.style.opacity = String(Math.min(1, opts.thumbOpacity));
      state.btnBottom.style.opacity = String(Math.min(1, opts.thumbOpacity));
    }
    function applyCurrentOpacity(state) {
      if (state.shown) writeShownOpacity(state);
      else setIdle(state);
    }
    function setIdle(state) {
      if (!state) return;
      state.thumb.style.opacity = "0";
      state.track.style.opacity = "0";
      state.btnTop.style.opacity = "0";
      state.btnBottom.style.opacity = "0";
    }
    function setIdleAll(host) {
      setIdle(host.vertical);
      setIdle(host.horizontal);
    }
    function revealStrip(state) {
      if (state.__displayed) return;
      state.__displayed = true;
      if (state.__hideTimer) {
        clearTimeout(state.__hideTimer);
        state.__hideTimer = void 0;
      }
      state.root.style.display = "";
      setIdle(state);
      requestAnimationFrame(() => {
        if (destroyed || !state.__displayed) return;
        applyCurrentOpacity(state);
      });
    }
    function concealStrip(state) {
      if (!state.__displayed) return;
      state.__displayed = false;
      setIdle(state);
      if (state.__hideTimer) clearTimeout(state.__hideTimer);
      state.__hideTimer = setTimeout(() => {
        if (!destroyed && !state.__displayed) state.root.style.display = "none";
      }, opts.duration + 120);
    }
    function concealStripImmediate(state) {
      if (!state.__displayed) return;
      state.__displayed = false;
      setIdle(state);
      if (state.__hideTimer) clearTimeout(state.__hideTimer);
      if (!destroyed && !state.__displayed) state.root.style.display = "none";
    }
    function scheduleAutoHide(host) {
      if (!opts.autoHide) return;
      if (host.hideTimer) clearTimeout(host.hideTimer);
      host.hideTimer = setTimeout(() => {
        if (!host.vertical?.dragging && !host.vertical?.hovered) setIdle(host.vertical);
        if (!host.horizontal?.dragging && !host.horizontal?.hovered) setIdle(host.horizontal);
      }, opts.autoHideDelay);
    }
    function overflowStyleOf(el) {
      let style = scrollableCache.get(el);
      if (!style) {
        let ov = "visible";
        let ox = "visible";
        try {
          const cs = getComputedStyle(el);
          ov = cs.overflowY;
          ox = cs.overflowX;
        } catch {
        }
        style = {
          v: ov === "auto" || ov === "scroll" || ov === "overlay",
          h: ox === "auto" || ox === "scroll" || ox === "overlay"
        };
        scrollableCache.set(el, style);
      }
      return style;
    }
    function scrollableVia(el) {
      const style = overflowStyleOf(el);
      return {
        v: style.v && el.scrollHeight > el.clientHeight + 1,
        h: style.h && el.scrollWidth > el.clientWidth + 1
      };
    }
    function isExcluded(el) {
      if (opts.exclude.length === 0) return false;
      return opts.exclude.some((sel) => {
        try {
          return el.matches(sel);
        } catch {
          return false;
        }
      });
    }
    function collectScrollables() {
      const result = [];
      const push = (el) => {
        if (isRootCandidate(el)) return;
        if (isExcluded(el)) return;
        if (el.closest("[data-themvora-host]")) return;
        if (scrollableVia(el).v || scrollableVia(el).h) result.push(el);
      };
      if (opts.include.length > 0) {
        for (const sel of opts.include) {
          try {
            for (const el of Array.from(document.querySelectorAll(sel))) push(el);
          } catch {
          }
        }
        return result;
      }
      for (const el of Array.from(document.querySelectorAll("*"))) push(el);
      return result;
    }
    function makeHost(el, isRoot) {
      const host = { target: el, isRoot, vertical: null, horizontal: null, ro: null, hideTimer: null };
      if (opts.axes.includes("vertical")) host.vertical = createAxis(host, "vertical");
      if (opts.axes.includes("horizontal")) host.horizontal = createAxis(host, "horizontal");
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => requestRender());
        ro.observe(el);
        host.ro = ro;
      }
      if (!isRoot) el.setAttribute("data-themvora-scrollbar", "overlay");
      if (!isRoot) {
        const onHoverEnter = () => {
          showHost(host);
          scheduleAutoHide(host);
        };
        const onHoverLeave = () => {
          if (opts.autoHide) setIdleAll(host);
        };
        el.addEventListener("mouseenter", onHoverEnter);
        el.addEventListener("mouseleave", onHoverLeave);
        host.targetCleanup = () => {
          el.removeEventListener("mouseenter", onHoverEnter);
          el.removeEventListener("mouseleave", onHoverLeave);
        };
      }
      return host;
    }
    function destroyHost(host, el) {
      host.vertical?.__cleanup?.();
      host.horizontal?.__cleanup?.();
      if (host.vertical?.__hideTimer) clearTimeout(host.vertical.__hideTimer);
      if (host.horizontal?.__hideTimer) clearTimeout(host.horizontal.__hideTimer);
      host.vertical?.root.remove();
      host.horizontal?.root.remove();
      host.ro?.disconnect();
      if (host.hideTimer) clearTimeout(host.hideTimer);
      host.targetCleanup?.();
      if (!host.isRoot) el.removeAttribute("data-themvora-scrollbar");
      hosts.delete(el);
    }
    function syncHosts() {
      if (needsRescan) {
        const desired = new Set(collectScrollables());
        for (const [el, host] of [...hosts.entries()]) {
          if (isRootCandidate(el)) continue;
          if (!document.body.contains(el) || !(overflowStyleOf(el).v || overflowStyleOf(el).h)) {
            destroyHost(host, el);
          }
        }
        for (const el of desired) {
          if (isRootCandidate(el) || hosts.has(el) || !document.body.contains(el)) continue;
          hosts.set(el, makeHost(el, false));
        }
        needsRescan = false;
      }
    }
    function visibilityOf(el) {
      let node = el;
      let opacity = 1;
      while (node && node.nodeType === 1) {
        try {
          const cs = getComputedStyle(node);
          if (cs.visibility === "hidden" || cs.visibility === "collapse") {
            return { visible: false, opacity };
          }
          if (cs.display === "none") {
            return { visible: false, opacity };
          }
          const op = parseFloat(cs.opacity);
          if (!isNaN(op)) {
            opacity *= op;
            if (opacity === 0) return { visible: false, opacity };
          }
        } catch {
          return { visible: false, opacity };
        }
        if (node === docEl) break;
        node = node.parentElement;
      }
      return { visible: true, opacity };
    }
    function commitGeometry(state, next) {
      const prev = state.lastGeometry;
      const changed = !prev || prev.display !== next.display || Math.abs(prev.left - next.left) > 0.5 || Math.abs(prev.top - next.top) > 0.5 || Math.abs(prev.width - next.width) > 0.5 || Math.abs(prev.height - next.height) > 0.5;
      state.lastGeometry = next;
      return changed;
    }
    function layoutAxis(host, state) {
      const vertical = state.axis === "vertical";
      const rect = hostRect(host);
      const client = clientLenOf(host, vertical);
      const content = vertical ? contentLenOf(host) : contentWidthOf(host);
      const nextGeometry = {
        display: "",
        left: 0,
        top: 0,
        width: 0,
        height: 0
      };
      if (host.isRoot && !documentCanScroll()) {
        concealStripImmediate(state);
        nextGeometry.display = "none";
        return commitGeometry(state, nextGeometry);
      }
      let justRevealed = false;
      if (!host.isRoot) {
        const vis = visibilityOf(host.target);
        if (host.prevVisible === void 0) {
          host.prevVisible = vis.visible;
        } else if (!host.prevVisible && vis.visible) {
          host.prevVisible = true;
          justRevealed = true;
        } else {
          host.prevVisible = vis.visible;
        }
        if (!vis.visible || getComputedStyle(host.target).overflowY === "hidden" || getComputedStyle(host.target).overflowX === "hidden") {
          concealStripImmediate(state);
          nextGeometry.display = "none";
          return commitGeometry(state, nextGeometry);
        }
        if (host.prevOpacity !== void 0 && vis.opacity < host.prevOpacity - 5e-3) {
          concealStrip(state);
          nextGeometry.display = "none";
          return commitGeometry(state, nextGeometry);
        }
        host.prevOpacity = vis.opacity;
      }
      if (content <= client + 1) {
        concealStripImmediate(state);
        nextGeometry.display = "none";
        return commitGeometry(state, nextGeometry);
      }
      revealStrip(state);
      if (justRevealed) {
        if (host.vertical) host.vertical.shown = true;
        if (host.horizontal) host.horizontal.shown = true;
        scheduleAutoHide(host);
      }
      const thickness = opts.hoverExpand && state.hovered ? opts.hoverThickness : opts.thickness;
      const btn = buttonSize();
      if (vertical) {
        const corner2 = axisEndInset(host, state);
        const cross = stripCrossSize(opts, thickness);
        const ins = insetsFor(host);
        const side = railSideFor(host);
        const railInset = side === "left" ? ins.left : ins.right;
        const stripLeft = side === "left" ? rect.left + railInset : rect.left + rect.width - railInset - cross;
        const stripTop = rect.top + ins.top;
        const stripHeight = Math.max(rect.height - ins.top - ins.bottom - corner2, 0);
        state.root.style.top = `${stripTop}px`;
        state.root.style.left = `${stripLeft}px`;
        state.root.style.height = `${stripHeight}px`;
        state.btnTop.style.width = `${thickness}px`;
        state.btnTop.style.height = `${btn}px`;
        state.btnBottom.style.width = `${thickness}px`;
        state.btnBottom.style.height = `${btn}px`;
        applyHostClip(host, state, rect, stripLeft, stripTop, cross, stripHeight);
        nextGeometry.left = stripLeft;
        nextGeometry.top = stripTop;
        nextGeometry.width = cross;
        nextGeometry.height = stripHeight;
      } else {
        const corner2 = axisEndInset(host, state);
        const cross = stripCrossSize(opts, thickness);
        const ins = insetsFor(host);
        const rootWidth = host.isRoot && typeof document !== "undefined" ? document.documentElement.clientWidth : rect.width;
        const scrollbarV = host.isRoot ? 0 : nativeScrollbarHidden(host.target) ? 0 : host.target.offsetWidth - host.target.clientWidth;
        const stripLeft = rect.left + ins.left;
        const stripTop = rect.top + rect.height - ins.bottom - cross;
        const stripWidth = Math.max(rootWidth - scrollbarV - ins.left - ins.right - corner2, 0);
        state.root.style.left = `${stripLeft}px`;
        state.root.style.top = `${stripTop}px`;
        state.root.style.width = `${stripWidth}px`;
        state.btnTop.style.height = `${thickness}px`;
        state.btnTop.style.width = `${btn}px`;
        state.btnBottom.style.height = `${thickness}px`;
        state.btnBottom.style.width = `${btn}px`;
        applyHostClip(host, state, rect, stripLeft, stripTop, stripWidth, cross);
        nextGeometry.left = stripLeft;
        nextGeometry.top = stripTop;
        nextGeometry.width = stripWidth;
        nextGeometry.height = cross;
      }
      const max = maxScroll(host, vertical);
      const scrollPos = scrollOf(host, vertical);
      const corner = axisEndInset(host, state);
      const { start, end } = axisInsets(host, vertical);
      const effClient = Math.max(client - btn * 2 - start - end - corner, 1);
      const baseSize = Math.min(
        // The public helper clamps to `clientLen - offset·2`; passing the mean of
        // the two end insets keeps that clamp equal to `clientLen - (start + end)`.
        computeThumbSize(client, content, opts.minThumbSize, (start + end) / 2),
        effClient
      );
      const factor = overscrollFactor(scrollPos, max, client, opts.overscroll);
      const drawSize = Math.max(Math.round(baseSize * factor), Math.min(opts.minThumbSize, effClient));
      const maxTranslate = Math.max(effClient - baseSize, 0);
      const targetTranslate = client > 0 && max > 0 ? clamp2(scrollPos / max * maxTranslate, 0, maxTranslate) : 0;
      const render = state.render;
      const prevSize = render.size;
      const prevDraw = render.drawSize;
      const prevTarget = render.targetTranslate;
      render.size = baseSize;
      render.drawSize = drawSize;
      render.targetTranslate = targetTranslate;
      if (vertical) {
        state.thumb.style.top = `${btn}px`;
        state.thumb.style.height = `${Math.round(drawSize)}px`;
      } else {
        state.thumb.style.left = `${btn}px`;
        state.thumb.style.width = `${Math.round(drawSize)}px`;
      }
      const geomChanged = commitGeometry(state, nextGeometry);
      const thumbChanged = Math.abs(prevSize - baseSize) > 0.5 || Math.abs(prevDraw - drawSize) > 0.5 || Math.abs(prevTarget - targetTranslate) > 0.5;
      return geomChanged || thumbChanged;
    }
    function applyTransform(state, value) {
      const vertical = state.axis === "vertical";
      const sign = !vertical && opts.dir === "rtl" ? -1 : 1;
      const v = (value * sign).toFixed(2);
      state.thumb.style.transform = vertical ? `translate3d(0, ${v}px, 0)` : `translate3d(${v}px, 0, 0)`;
    }
    let rafId = null;
    let lastTs = 0;
    function renderFrame() {
      if (destroyed) return;
      const now = performance.now();
      const dt = lastTs ? Math.min(now - lastTs, 50) : FRAME_MS;
      lastTs = now;
      syncHosts();
      let moving = false;
      for (const host of hosts.values()) {
        if (host.vertical) moving = layoutAxis(host, host.vertical) || moving;
        if (host.horizontal) moving = layoutAxis(host, host.horizontal) || moving;
      }
      const ease = reduced() || !opts.smooth ? 1 : easeAlpha(opts.animationDuration, dt);
      let active = false;
      for (const host of hosts.values()) {
        for (const state of [host.vertical, host.horizontal]) {
          if (!state) continue;
          const render = state.render;
          const target = render.targetTranslate;
          if (state.dragging || ease === 1) {
            render.currentTranslate = target;
          } else if (!isSettled(render.currentTranslate, target, 0.25)) {
            render.currentTranslate = lerp(render.currentTranslate, target, ease);
            active = true;
          } else {
            render.currentTranslate = target;
          }
          applyTransform(state, render.currentTranslate);
        }
      }
      if (active || moving) requestTick();
    }
    function requestTick() {
      if (rafId != null || destroyed) return;
      rafId = requestAnimationFrame(() => {
        if (destroyed) {
          rafId = null;
          return;
        }
        rafId = null;
        renderFrame();
      });
    }
    function requestRender() {
      if (destroyed) return;
      requestTick();
    }
    const rootHost = makeHost(scrollingEl, true);
    hosts.set(scrollingEl, rootHost);
    const controls = observeScrollbarSizing(
      (el) => hosts.has(el),
      {
        onTargetActivity(target) {
          const host = hosts.get(target);
          if (host) {
            showHost(host);
            scheduleAutoHide(host);
          } else {
            revealDoc();
          }
        },
        onGlobalActivity() {
          revealDoc();
        },
        onResize() {
          requestRender();
        },
        onMutate(records) {
          for (const record of records) {
            if (record.type === "attributes" && record.target instanceof HTMLElement) {
              scrollableCache.delete(record.target);
            }
          }
          needsRescan = true;
          requestRender();
        },
        onOpacityTransition(el) {
          for (const [target, host] of hosts.entries()) {
            if (host.isRoot) continue;
            if (el === target || el.contains(target)) {
              if (host.vertical) concealStrip(host.vertical);
              if (host.horizontal) concealStrip(host.horizontal);
            }
          }
        }
      }
    );
    const rescanTimer = setInterval(() => {
      if (destroyed) return;
      scrollableCache = /* @__PURE__ */ new WeakMap();
      needsRescan = true;
      requestRender();
    }, 4e3);
    const onResizeRescan = () => {
      scrollableCache = /* @__PURE__ */ new WeakMap();
      needsRescan = true;
      requestRender();
    };
    window.addEventListener("resize", onResizeRescan, { passive: true });
    requestRender();
    setTimeout(() => {
      if (destroyed) return;
      docEl.classList.add("tv-scrollbar-ready");
      if (opts.autoHide) {
        revealDoc();
      } else {
        for (const h of hosts.values()) showHost(h);
      }
    }, 80);
    return {
      update() {
        scrollableCache = /* @__PURE__ */ new WeakMap();
        needsRescan = true;
        requestRender();
      },
      destroy() {
        destroyed = true;
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        clearInterval(rescanTimer);
        window.removeEventListener("resize", onResizeRescan);
        controls.dispose();
        storeUnsubscribe();
        for (const [el, host] of [...hosts.entries()]) destroyHost(host, el);
        hosts.clear();
        releaseHiding();
      }
    };
  }
  var GROUP_RANK = new Map(TOKEN_GROUPS.map((group, index) => [group, index]));
  var COLOR_RANK = new Map([
    ...CORE_COLORS.map((role, index) => [role, index]),
    ...OPTIONAL_SEMANTICS.map((role, index) => [role, CORE_COLORS.length + index])
  ]);

  // src/utils.ts
  var RUNTIME_SYMBOL = "__themvoraRuntime";
  function setProviderRuntime(el, runtime) {
    el[RUNTIME_SYMBOL] = runtime;
  }
  function getProviderRuntime(el) {
    return el?.[RUNTIME_SYMBOL];
  }
  function findProviderRuntime(el) {
    let current = el;
    while (current) {
      const runtime = current[RUNTIME_SYMBOL];
      if (runtime) return runtime;
      current = current.parentElement;
    }
    return void 0;
  }

  // src/custom-element-base.ts
  var CustomElementBase = typeof HTMLElement !== "undefined" ? HTMLElement : class {
  };

  // src/diagnostics.ts
  function emitInvalidAttributeDiagnostic(tag, attribute, received, expected, action) {
    emitDiagnostic(
      createDiagnostic({
        code: "TV_CONFIG_OPTION_INVALID",
        level: "warning",
        message: `The "${attribute}" attribute on <${tag}> is not usable; ${action}.`,
        context: {
          api: tag,
          property: attribute,
          received,
          expected
        },
        hint: `Expected ${expected}. Check the attribute in your markup \u2014 the element kept a defined state rather than failing.`
      })
    );
  }

  // src/events.ts
  var THEME_READY_EVENT = "theme-ready";
  var THEMES_CHANGE_EVENT = "themes-change";

  // src/provider.ts
  var TAG = "themvora-provider";
  var ThemvoraProvider = class _ThemvoraProvider extends CustomElementBase {
    static observedAttributes = [
      "themes",
      "default-theme",
      "theme-override",
      "initial-mode",
      "initial-family",
      "scheduled",
      "transition"
    ];
    runtime = null;
    /** Guard against re-entering attribute handling from inside `configure()`. */
    configuring = false;
    /** Releases the runtime's catalog subscription. */
    unsubscribeThemes = null;
    /** The catalog to announce on the next microtask, if one is scheduled. */
    pendingCatalog = null;
    catalogDispatchScheduled = false;
    // Parsed snapshot of the attributes. `undefined` means "not supplied".
    parsedThemes;
    parsedDefaultTheme;
    parsedThemeOverride;
    /** Whether `theme-override` was ever set, so its removal is reported. */
    hadThemeOverride = false;
    parsedInitialMode;
    parsedInitialFamily;
    parsedScheduled;
    parsedTransition;
    /** Lifecycle hook: parses attributes and initializes the runtime. */
    connectedCallback() {
      if (this.runtime) return;
      this.parseAttributes();
      this.initRuntime();
    }
    /** Lifecycle hook: destroys the runtime. */
    disconnectedCallback() {
      this.destroyRuntime();
    }
    /** Lifecycle hook: re-resolves the runtime when an observed attribute changes. */
    attributeChangedCallback(name, _oldValue, _newValue) {
      if (!this.runtime || this.configuring) return;
      this.parseAttributes();
      const update = {};
      if (name === "themes") {
        if (this.parsedThemes) update.themes = this.parsedThemes;
      } else if (name === "default-theme") {
        if (this.parsedDefaultTheme !== void 0) {
          update.defaultTheme = this.parsedDefaultTheme;
        }
      } else if (name === "theme-override") {
        if (this.parsedThemeOverride !== void 0) this.hadThemeOverride = true;
        if (this.hadThemeOverride) update.themeOverride = this.parsedThemeOverride;
      } else if (name === "initial-mode") {
        if (this.parsedInitialMode !== void 0) {
          update.initialMode = this.parsedInitialMode;
        }
      } else if (name === "initial-family") {
        if (this.parsedInitialFamily !== void 0) {
          update.initialFamily = this.parsedInitialFamily;
        }
      } else if (name === "transition") {
        update.transition = this.parsedTransition;
      } else if (name === "scheduled") {
        update.scheduled = this.parsedScheduled ?? false;
      }
      this.configuring = true;
      try {
        this.runtime.configure(update);
      } finally {
        this.configuring = false;
      }
    }
    /**
     * Mirrors the runtime's catalog signal onto the DOM.
     *
     * Subscribed once per runtime, so it also covers `runtime.use(pack)` and
     * `runtime.restore()` — not just attribute-driven changes. A catalog change
     * can leave the active theme untouched, so the store subscription cannot
     * report it; consumers that resolve themes themselves need the change itself.
     *
     * The dispatch is deferred to a microtask on purpose. The registry
     * notification fires *inside* `configure()`, and a consumer handling the
     * event may legitimately write back to `themes`; dispatching synchronously
     * would re-enter `attributeChangedCallback` while this element is still
     * configuring and the write would be dropped by the re-entrancy guard.
     * Deferring also coalesces several changes made in one task into a single
     * event carrying the final catalog, which is what a listener wants.
     */
    subscribeThemes() {
      const runtime = this.runtime;
      if (!runtime) return;
      this.unsubscribeThemes = runtime.registry.subscribe(() => {
        this.pendingCatalog = runtime.themes.map((theme) => String(theme.name));
        if (this.catalogDispatchScheduled) return;
        this.catalogDispatchScheduled = true;
        queueMicrotask(() => {
          this.catalogDispatchScheduled = false;
          const catalog = this.pendingCatalog;
          this.pendingCatalog = null;
          if (!catalog || !this.isConnected) return;
          this.dispatchEvent(
            new CustomEvent(THEMES_CHANGE_EVENT, {
              bubbles: true,
              composed: true,
              detail: { themes: catalog }
            })
          );
        });
      });
    }
    /**
     * The catalog a name is resolved against.
     *
     * Deliberately a *superset* of the active catalog — the built-in set plus
     * everything the runtime knows about — so that restricting the catalog with
     * one attribute edit does not make the other names unresolvable on the next
     * one (`themes="light"` followed by `themes="light dark"` must still find
     * `dark`). Themes registered imperatively through `runtime.use()` are
     * included, so an attribute edit cannot silently drop them.
     *
     * Before the runtime exists, the same union is read from
     * `resolveRuntimeOptions()`, which is where a build-integration's
     * transported catalog would come from.
     */
    themePool() {
      const registered = this.runtime ? this.runtime.themes : resolveRuntimeOptions({}).themes ?? getBuiltInThemes();
      const byName = /* @__PURE__ */ new Map();
      for (const theme of getBuiltInThemes()) {
        byName.set(String(theme.name), theme);
      }
      for (const theme of registered) {
        byName.set(String(theme.name), theme);
      }
      return [...byName.values()];
    }
    parseAttributes() {
      this.parsedThemes = this.parseThemes();
      this.parsedDefaultTheme = this.parseDefaultTheme(this.parsedThemes);
      this.parsedThemeOverride = this.parseThemeOverride();
      this.parsedInitialMode = this.parseInitialMode();
      this.parsedInitialFamily = this.parseInitialFamily();
      this.parsedScheduled = this.parseJsonOption(
        "scheduled",
        (value) => typeof value === "object" && value !== null && !Array.isArray(value),
        `a JSON object, e.g. '{"latitude":27.7,"longitude":85.3}'`
      );
      this.parsedTransition = this.parseJsonOption(
        "transition",
        (value) => typeof value === "boolean" || typeof value === "object" && value !== null && !Array.isArray(value),
        `a JSON boolean or object, e.g. 'true' or '{"enabled":true,"duration":250}'`
      );
    }
    /**
     * Parses the `theme-override` attribute.
     *
     * Two syntaxes, matching the prop's two forms: a bare theme name
     * (`theme-override="mint-dark"`) or a JSON family/mode request
     * (`theme-override='{"family":"mint","mode":"dark"}'`). A JSON object that is
     * not a valid request is reported and ignored, like every other attribute.
     *
     * @returns The override, or `undefined` when the attribute is absent or unusable.
     */
    parseThemeOverride() {
      const raw = this.getAttribute("theme-override");
      if (raw === null) return void 0;
      const value = raw.trim();
      if (value.length === 0) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "theme-override",
          raw,
          `a theme name, or a JSON object like '{"family":"mint","mode":"dark"}'`,
          "the attribute was ignored"
        );
        return void 0;
      }
      if (!value.startsWith("{")) return value;
      try {
        const parsed = JSON.parse(value);
        const family = typeof parsed.family === "string" ? parsed.family : void 0;
        const mode = parsed.mode;
        const modeValid = mode === void 0 || mode === "light" || mode === "dark" || mode === "system";
        if (modeValid && (family !== void 0 || mode !== void 0)) {
          return {
            ...family !== void 0 ? { family } : {},
            ...mode !== void 0 ? { mode } : {}
          };
        }
      } catch {
      }
      emitInvalidAttributeDiagnostic(
        this.localName,
        "theme-override",
        raw,
        `a theme name, or a JSON object like '{"family":"mint","mode":"dark"}'`,
        "the attribute was ignored"
      );
      return void 0;
    }
    /**
     * Parses the `themes` attribute in either supported syntax.
     *
     * @returns The resolved catalog, or `undefined` when the attribute is absent
     *   or unusable (the caller then leaves the live catalog alone).
     */
    parseThemes() {
      const raw = this.getAttribute("themes");
      if (raw === null) return void 0;
      const value = raw.trim();
      if (value.length === 0) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "themes",
          raw,
          "a space-separated list of theme names, or a JSON array of theme definitions",
          "the attribute was ignored"
        );
        return void 0;
      }
      if (value.startsWith("[")) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.every(
            (theme) => typeof theme === "object" && theme !== null && typeof theme.name === "string"
          )) {
            return parsed;
          }
        } catch {
        }
        emitInvalidAttributeDiagnostic(
          this.localName,
          "themes",
          raw,
          "a JSON array of theme definitions, each with a string `name`",
          "the attribute was ignored"
        );
        return void 0;
      }
      const pool = this.themePool();
      const byName = new Map(pool.map((theme) => [String(theme.name), theme]));
      const identifiers = value.split(/[\s,]+/).filter((id) => id.length > 0);
      const resolved = [];
      const unknown = [];
      const seen = /* @__PURE__ */ new Set();
      for (const identifier of identifiers) {
        const theme = byName.get(identifier);
        if (!theme) {
          unknown.push(identifier);
          continue;
        }
        if (seen.has(identifier)) continue;
        seen.add(identifier);
        resolved.push(theme);
      }
      if (unknown.length > 0) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "themes",
          unknown,
          `registered theme names (known: ${pool.slice(0, 6).map((theme) => String(theme.name)).join(", ")}, \u2026)`,
          unknown.length === identifiers.length ? "none of the listed names matched a registered theme, so the attribute was ignored" : `the unknown name${unknown.length === 1 ? " was" : "s were"} skipped`
        );
      }
      return resolved.length > 0 ? resolved : void 0;
    }
    /**
     * Parses and validates `default-theme` against the effective catalog.
     *
     * An unknown name is reported here rather than left to the runtime, which
     * falls back to the catalog's first theme without a word. Ignoring the
     * attribute produces that same fallback, so the diagnosis costs nothing and
     * the outcome is unchanged.
     */
    parseDefaultTheme(catalog) {
      const raw = this.getAttribute("default-theme");
      if (raw === null) return void 0;
      const value = raw.trim();
      if (value.length === 0) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "default-theme",
          raw,
          'the name of a registered theme, e.g. "light"',
          "the attribute was ignored"
        );
        return void 0;
      }
      const pool = catalog ?? this.themePool();
      if (!pool.some((theme) => String(theme.name) === value)) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "default-theme",
          value,
          "the name of a registered theme",
          "the attribute was ignored and the runtime kept its own default"
        );
        return void 0;
      }
      return value;
    }
    parseInitialMode() {
      const raw = this.getAttribute("initial-mode");
      if (raw === null) return void 0;
      const value = raw.trim().toLowerCase();
      if (value === "light" || value === "dark" || value === "system") {
        return value;
      }
      emitInvalidAttributeDiagnostic(
        this.localName,
        "initial-mode",
        raw,
        '"light", "dark" or "system"',
        "the attribute was ignored and the mode was left to the runtime"
      );
      return void 0;
    }
    parseInitialFamily() {
      const raw = this.getAttribute("initial-family");
      if (raw === null) return void 0;
      const value = raw.trim();
      if (value.length === 0) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "initial-family",
          raw,
          'a theme family name, e.g. "plum"',
          "the attribute was ignored"
        );
        return void 0;
      }
      return value;
    }
    parseJsonOption(attribute, isValid, expected) {
      const raw = this.getAttribute(attribute);
      if (raw === null) return void 0;
      try {
        const parsed = JSON.parse(raw);
        if (isValid(parsed)) return parsed;
      } catch {
      }
      emitInvalidAttributeDiagnostic(
        this.localName,
        attribute,
        raw,
        expected,
        "the attribute was ignored and the previous setting was kept"
      );
      return void 0;
    }
    resolveTransition() {
      if (this.parsedTransition === void 0) return void 0;
      if (typeof this.parsedTransition === "object") return this.parsedTransition;
      if (this.parsedTransition === true) return {};
      return { enabled: false };
    }
    initRuntime() {
      const resolvedTransition = this.resolveTransition();
      const explicit = {
        ...this.parsedThemes ? { themes: this.parsedThemes } : {},
        ...this.parsedDefaultTheme ? { defaultTheme: this.parsedDefaultTheme } : {},
        // Mirror the pre-paint bootstrap's mode/family. Without these the runtime
        // resolves the mode from `defaultTheme` alone and overwrites the theme
        // the script already painted from `prefers-color-scheme`.
        ...this.parsedInitialMode !== void 0 ? { initialMode: this.parsedInitialMode } : {},
        ...this.parsedInitialFamily !== void 0 ? { initialFamily: this.parsedInitialFamily } : {},
        ...this.parsedScheduled ? { scheduled: this.parsedScheduled } : {},
        ...this.parsedThemeOverride !== void 0 ? { themeOverride: this.parsedThemeOverride } : {}
      };
      if (this.parsedThemeOverride !== void 0) this.hadThemeOverride = true;
      this.runtime = createThemeRuntime({
        ...resolveRuntimeOptions(explicit),
        ...resolvedTransition !== void 0 ? { transition: resolvedTransition } : {},
        // Empty binding options (not explicit `transition` values): the runtime
        // merges its top-level `transition` into both bindings and, because the
        // caller did not supply an explicit per-binding transition, owns
        // reconciling them on a live `transition` change.
        dom: {},
        cssVariables: {}
      });
      setProviderRuntime(this, this.runtime);
      this.subscribeThemes();
      this.dispatchEvent(
        new CustomEvent(THEME_READY_EVENT, {
          bubbles: true,
          composed: true
        })
      );
    }
    destroyRuntime() {
      this.unsubscribeThemes?.();
      this.unsubscribeThemes = null;
      this.runtime?.destroy();
      this.runtime = null;
    }
    static define(tag = TAG) {
      if (typeof customElements === "undefined") return;
      if (!customElements.get(tag)) {
        customElements.define(tag, _ThemvoraProvider);
      }
    }
  };

  // src/runtime-consumer.ts
  var ThemvoraRuntimeConsumer = class extends CustomElementBase {
    #runtime = null;
    #listening = false;
    #unsubscribeThemes = null;
    /** Lifecycle hook: starts following the nearest provider runtime. */
    connectedCallback() {
      this.#listen();
      this.#attach();
    }
    /** Lifecycle hook: releases subscriptions and stops listening. */
    disconnectedCallback() {
      this.#unlisten();
      this.#detach();
    }
    /** The runtime this element is currently following, if any. */
    get runtime() {
      return this.#runtime;
    }
    /**
     * Called before the runtime is released — on disconnection, and before
     * {@link ThemvoraRuntimeConsumer.onRuntime} runs for a replacement runtime.
     */
    onDetach() {
    }
    /**
     * Called after the provider replaced its theme catalog (a `themes`
     * attribute change), with the runtime the element already follows.
     */
    onCatalogChange(_runtime) {
    }
    #listen() {
      if (this.#listening) return;
      document.addEventListener(THEME_READY_EVENT, this.#handleThemeReady);
      this.#listening = true;
    }
    #unlisten() {
      if (!this.#listening) return;
      document.removeEventListener(THEME_READY_EVENT, this.#handleThemeReady);
      this.#listening = false;
    }
    #handleThemeReady = () => {
      if (!this.isConnected) return;
      this.#attach();
    };
    #attach() {
      const runtime = findProviderRuntime(this);
      if (!runtime) return;
      if (runtime === this.#runtime) return;
      this.#detach();
      this.#runtime = runtime;
      this.onRuntime(runtime);
      this.#unsubscribeThemes = runtime.registry.subscribe(() => {
        if (!this.isConnected) return;
        const current = this.#runtime;
        if (current) this.onCatalogChange(current);
      });
    }
    #detach() {
      this.#unsubscribeThemes?.();
      this.#unsubscribeThemes = null;
      if (!this.#runtime) return;
      this.#runtime = null;
      this.onDetach();
    }
  };

  // src/scope.ts
  var TAG2 = "themvora-scope";
  var ThemvoraScope = class _ThemvoraScope extends ThemvoraRuntimeConsumer {
    static observedAttributes = ["theme", "theme-transition"];
    #binding = null;
    #theme = null;
    #transition;
    #unsubscribeStore = null;
    /**
     * Whether `theme` names a family rather than an exact theme.
     *
     * Only a family selection has a mode to follow; an exact name pins both
     * halves of the selection.
     */
    #isFamilySelection() {
      const runtime = this.runtime;
      const theme = this.#theme;
      if (!runtime || !theme) return false;
      return !runtime.themes.some((candidate) => String(candidate.name) === theme);
    }
    /** Lifecycle hook: parses the element's own attributes. */
    connectedCallback() {
      this.#parseAttributes();
      super.connectedCallback();
    }
    /** Lifecycle hook: re-applies the scope when an observed attribute changes. */
    attributeChangedCallback(_name, _oldValue, _newValue) {
      this.#parseAttributes();
      if (this.isConnected) this.#apply();
    }
    onRuntime(runtime) {
      this.#unsubscribeStore = runtime.store.subscribe(() => {
        if (this.#isFamilySelection()) this.#apply();
      });
      this.#apply();
    }
    onDetach() {
      this.#unsubscribeStore?.();
      this.#unsubscribeStore = null;
      this.#destroy();
    }
    onCatalogChange(_runtime) {
      this.#apply();
    }
    #parseAttributes() {
      const theme = this.getAttribute("theme");
      this.#theme = theme === null ? null : theme.trim();
      this.#transition = this.#parseTransition(
        this.getAttribute("theme-transition")
      );
    }
    #parseTransition(raw) {
      if (raw === null) return void 0;
      const value = raw.trim();
      if (value === "true") return true;
      if (value === "false") return false;
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null && typeof parsed.duration === "number" && typeof parsed.easing === "string") {
          return parsed;
        }
      } catch {
      }
      emitInvalidAttributeDiagnostic(
        this.localName,
        "theme-transition",
        raw,
        'a JSON object with a numeric `duration` and a string `easing`, or "true" / "false"',
        "the attribute was ignored and the scope inherited the provider's transition"
      );
      return void 0;
    }
    /**
     * Whether `theme` names something this provider can resolve — a theme name
     * or a family name.
     */
    #isResolvable(runtime, theme) {
      return runtime.themes.some(
        (candidate) => String(candidate.name) === theme || getThemeFamily(candidate) === theme
      );
    }
    #apply() {
      const runtime = this.runtime;
      if (!runtime) return;
      this.#destroy();
      const theme = this.#theme;
      if (!theme) return;
      if (!this.#isResolvable(runtime, theme)) {
        emitInvalidAttributeDiagnostic(
          this.localName,
          "theme",
          theme,
          "a registered theme name or family name",
          "the scope fell back to the catalog's first theme"
        );
      }
      const transition = resolveScopeTransition(runtime.transition, this.#transition);
      const exact = runtime.themes.some(
        (candidate) => String(candidate.name) === theme
      );
      const selection = exact ? theme : { family: theme, mode: runtime.selection.getMode() };
      this.#binding = createScopedThemeBinding(
        runtime.themes,
        this,
        selection,
        transition !== void 0 ? { transition } : {}
      );
    }
    #destroy() {
      this.#binding?.destroy();
      this.#binding = null;
    }
    static define(tag = TAG2) {
      if (typeof customElements === "undefined") return;
      if (!customElements.get(tag)) {
        customElements.define(tag, _ThemvoraScope);
      }
    }
  };

  // src/toggle.ts
  var SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  var MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/></svg>`;
  var SYSTEM_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`;
  var TAG3 = "themvora-toggle";
  var ThemvoraToggle = class _ThemvoraToggle extends ThemvoraRuntimeConsumer {
    #button = null;
    #unsubscribeSelection = null;
    #unsubscribeStore = null;
    #renderedMode = null;
    onRuntime(runtime) {
      this.#ensureButton();
      this.#render(runtime);
      this.#unsubscribeSelection = runtime.selection.subscribe(() => {
        this.#render(runtime);
      });
      this.#unsubscribeStore = runtime.store.subscribe(() => {
        this.#render(runtime);
      });
    }
    onDetach() {
      this.#unsubscribeSelection?.();
      this.#unsubscribeSelection = null;
      this.#unsubscribeStore?.();
      this.#unsubscribeStore = null;
    }
    /**
     * Creates the inner button once.
     *
     * Reused across reconnections so a re-mount cannot attach a second click
     * listener. Re-created only when a consumer replaced the element's children.
     */
    #ensureButton() {
      if (this.#button && this.#button.parentNode === this) return;
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Dark mode");
      button.addEventListener("click", this.#handleClick);
      this.replaceChildren(button);
      this.#button = button;
      this.#renderedMode = null;
    }
    #handleClick = () => {
      this.runtime?.selection.toggleTheme();
    };
    #render(runtime) {
      const button = this.#button;
      if (!button) return;
      const theme = runtime.store.get();
      const applied = getThemeMode(theme);
      const selection = runtime.selection.getSelection();
      const isSystem = selection.mode === "system";
      const state = isSystem ? "system" : applied;
      const isDark = applied === "dark";
      const label = isDark ? "Switch to light theme" : "Switch to dark theme";
      if (this.getAttribute("data-mode") !== state) {
        this.setAttribute("data-mode", state);
      }
      const pressed = isSystem ? "mixed" : String(isDark);
      if (button.getAttribute("aria-pressed") !== pressed) {
        button.setAttribute("aria-pressed", pressed);
      }
      if (button.title !== label) button.title = label;
      if (this.#renderedMode !== state) {
        button.innerHTML = state === "system" ? SYSTEM_ICON : state === "dark" ? MOON_ICON : SUN_ICON;
        this.#renderedMode = state;
      }
    }
    static define(tag = TAG3) {
      if (typeof customElements === "undefined") return;
      if (!customElements.get(tag)) {
        customElements.define(tag, _ThemvoraToggle);
      }
    }
  };

  // src/select.ts
  var TAG4 = "themvora-select";
  var MODE_OPTIONS = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ];
  var ThemvoraSelect = class _ThemvoraSelect extends ThemvoraRuntimeConsumer {
    static observedAttributes = ["type", "label"];
    #select = null;
    #type = "mode";
    #optionsSignature = "";
    #unsubscribeSelection = null;
    #unsubscribeStore = null;
    /** Lifecycle hook: parses the element's own attributes. */
    connectedCallback() {
      this.#parseAttributes();
      super.connectedCallback();
    }
    /** Lifecycle hook: re-renders when `type` or `label` changes. */
    attributeChangedCallback(name, _oldValue, _newValue) {
      if (name === "type") {
        this.#parseAttributes();
        this.#applyLabel();
        this.#optionsSignature = "";
      } else if (name === "label") {
        this.#applyLabel();
        return;
      }
      const runtime = this.runtime;
      if (runtime && this.isConnected) this.#render(runtime);
    }
    onRuntime(runtime) {
      this.#ensureSelect();
      this.#applyLabel();
      this.#render(runtime);
      this.#unsubscribeSelection = runtime.selection.subscribe(() => {
        this.#render(runtime);
      });
      this.#unsubscribeStore = runtime.store.subscribe(() => {
        this.#render(runtime);
      });
    }
    onDetach() {
      this.#unsubscribeSelection?.();
      this.#unsubscribeSelection = null;
      this.#unsubscribeStore?.();
      this.#unsubscribeStore = null;
    }
    /**
     * A catalog change can leave the active theme untouched, so it never reaches
     * the store subscription — but it can add or remove families.
     */
    onCatalogChange(runtime) {
      this.#render(runtime);
    }
    #parseAttributes() {
      const raw = this.getAttribute("type");
      if (raw === null) {
        this.#type = "mode";
        return;
      }
      const value = raw.trim().toLowerCase();
      if (value === "mode" || value === "family") {
        this.#type = value;
        return;
      }
      emitInvalidAttributeDiagnostic(
        this.localName,
        "type",
        raw,
        '"mode" or "family"',
        'the attribute was ignored and the element fell back to "mode"'
      );
      this.#type = "mode";
    }
    #ensureSelect() {
      if (this.#select && this.#select.parentNode === this) return;
      const select = document.createElement("select");
      select.addEventListener("change", this.#handleChange);
      this.replaceChildren(select);
      this.#select = select;
      this.#optionsSignature = "";
    }
    #applyLabel() {
      const select = this.#select;
      if (!select) return;
      const explicit = this.getAttribute("label")?.trim();
      const fallback = this.#type === "family" ? "Theme family" : "Theme mode";
      const label = explicit && explicit.length > 0 ? explicit : fallback;
      if (select.getAttribute("aria-label") !== label) {
        select.setAttribute("aria-label", label);
      }
    }
    #render(runtime) {
      const select = this.#select;
      if (!select) return;
      const options = this.#type === "mode" ? MODE_OPTIONS.map((option) => ({
        value: String(option.value),
        label: option.label
      })) : this.#familyOptions(runtime);
      const signature = `${this.#type}\0${options.map((option) => option.value).join("")}`;
      if (signature !== this.#optionsSignature) {
        const fragment = document.createDocumentFragment();
        for (const option of options) {
          const el = document.createElement("option");
          el.value = option.value;
          el.textContent = option.label;
          fragment.appendChild(el);
        }
        select.replaceChildren(fragment);
        this.#optionsSignature = signature;
      }
      const current = this.#type === "mode" ? String(runtime.selection.getMode()) : String(runtime.selection.getFamily());
      if (select.value !== current && options.some((o) => o.value === current)) {
        select.value = current;
      }
    }
    #familyOptions(runtime) {
      const seen = /* @__PURE__ */ new Set();
      const options = [];
      for (const theme of runtime.themes) {
        const family = getThemeFamily(theme);
        if (!family || seen.has(family)) continue;
        seen.add(family);
        options.push({ value: family, label: family });
      }
      return options;
    }
    #handleChange = () => {
      const select = this.#select;
      const runtime = this.runtime;
      if (!select || !runtime) return;
      const value = select.value;
      if (this.#type === "mode") {
        if (isThemeMode(value)) {
          runtime.selection.setMode(value);
          return;
        }
        this.#render(runtime);
        return;
      }
      if (this.#familyOptions(runtime).some((option) => option.value === value)) {
        runtime.selection.setFamily(value);
        return;
      }
      this.#render(runtime);
    };
    static define(tag = TAG4) {
      if (typeof customElements === "undefined") return;
      if (!customElements.get(tag)) {
        customElements.define(tag, _ThemvoraSelect);
      }
    }
  };

  // src/scrollbar.ts
  function injectPrePaintScrollbarCSS() {
    if (typeof document === "undefined") return;
    const docEl = document.documentElement;
    if (!document.getElementById(SCROLLBAR_HIDING_STYLE_ID) && document.querySelector(`style[${SCROLLBAR_HIDING_STYLE_ATTR}]`) === null) {
      const style = document.createElement("style");
      style.id = SCROLLBAR_HIDING_STYLE_ID;
      style.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
      style.textContent = PRE_PAINT_SCROLLBAR_CSS;
      document.head.appendChild(style);
    }
    docEl.classList.add("tv-scrollbar");
  }
  function parseBool(value) {
    if (value === null) return void 0;
    return value !== "false" && value !== "0";
  }
  function parseNum(value) {
    if (value === null || value === "") return void 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : void 0;
  }
  function parseList(value) {
    if (value === null) return void 0;
    const items = value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
    return items.length > 0 ? items : void 0;
  }
  function optionsFrom(el) {
    const opts = {};
    const autoHide = parseBool(el.getAttribute("auto-hide"));
    const autoHideDelay = parseNum(el.getAttribute("auto-hide-delay"));
    const hoverExpand = parseBool(el.getAttribute("hover-expand"));
    const draggable = parseBool(el.getAttribute("draggable"));
    const clickToJump = parseBool(el.getAttribute("click-to-jump"));
    const smooth = parseBool(el.getAttribute("smooth"));
    const overscroll = parseBool(el.getAttribute("overscroll"));
    const arrows = parseBool(el.getAttribute("arrows"));
    const arrowIcon = el.getAttribute("arrow-icon") ?? void 0;
    const arrowUpIcon = el.getAttribute("arrow-up-icon") ?? void 0;
    const arrowDownIcon = el.getAttribute("arrow-down-icon") ?? void 0;
    const arrowLeftIcon = el.getAttribute("arrow-left-icon") ?? void 0;
    const arrowRightIcon = el.getAttribute("arrow-right-icon") ?? void 0;
    const touch = parseBool(el.getAttribute("touch"));
    const thickness = parseNum(el.getAttribute("thickness"));
    const hoverThickness = parseNum(el.getAttribute("hover-thickness"));
    const radius = parseNum(el.getAttribute("radius"));
    const minThumbSize = parseNum(el.getAttribute("min-thumb-size"));
    const iconSize = parseNum(el.getAttribute("icon-size"));
    const offset = parseNum(el.getAttribute("offset"));
    const offsetTop = parseNum(el.getAttribute("offset-top"));
    const offsetRight = parseNum(el.getAttribute("offset-right"));
    const offsetBottom = parseNum(el.getAttribute("offset-bottom"));
    const offsetLeft = parseNum(el.getAttribute("offset-left"));
    const trackOpacity = parseNum(el.getAttribute("track-opacity"));
    const thumbOpacity = parseNum(el.getAttribute("thumb-opacity"));
    const duration = parseNum(el.getAttribute("duration"));
    const animationDuration = parseNum(el.getAttribute("animation-duration"));
    const thumbColor = el.getAttribute("thumb-color") ?? void 0;
    const trackColor = el.getAttribute("track-color") ?? void 0;
    const activeThumbColor = el.getAttribute("active-thumb-color") ?? void 0;
    const thumbHoverColor = el.getAttribute("thumb-hover-color") ?? void 0;
    const zIndex = parseNum(el.getAttribute("z-index"));
    if (autoHide !== void 0) opts.autoHide = autoHide;
    if (autoHideDelay !== void 0) opts.autoHideDelay = autoHideDelay;
    if (hoverExpand !== void 0) opts.hoverExpand = hoverExpand;
    if (draggable !== void 0) opts.draggable = draggable;
    if (clickToJump !== void 0) opts.clickToJump = clickToJump;
    if (smooth !== void 0) opts.smooth = smooth;
    if (overscroll !== void 0) opts.overscroll = overscroll;
    if (arrows !== void 0) opts.arrows = arrows;
    if (arrowIcon !== void 0) opts.arrowIcon = arrowIcon;
    if (arrowUpIcon !== void 0) opts.arrowUpIcon = arrowUpIcon;
    if (arrowDownIcon !== void 0) opts.arrowDownIcon = arrowDownIcon;
    if (arrowLeftIcon !== void 0) opts.arrowLeftIcon = arrowLeftIcon;
    if (arrowRightIcon !== void 0) opts.arrowRightIcon = arrowRightIcon;
    if (touch !== void 0) opts.touch = touch;
    if (thickness !== void 0) opts.thickness = thickness;
    if (hoverThickness !== void 0) opts.hoverThickness = hoverThickness;
    if (radius !== void 0) opts.radius = radius;
    if (minThumbSize !== void 0) opts.minThumbSize = minThumbSize;
    if (iconSize !== void 0) opts.iconSize = iconSize;
    const sides = {
      ...offsetTop !== void 0 ? { top: offsetTop } : {},
      ...offsetRight !== void 0 ? { right: offsetRight } : {},
      ...offsetBottom !== void 0 ? { bottom: offsetBottom } : {},
      ...offsetLeft !== void 0 ? { left: offsetLeft } : {}
    };
    if (Object.keys(sides).length > 0) opts.offset = sides;
    else if (offset !== void 0) opts.offset = offset;
    if (trackOpacity !== void 0) opts.trackOpacity = trackOpacity;
    if (thumbOpacity !== void 0) opts.thumbOpacity = thumbOpacity;
    if (duration !== void 0) opts.duration = duration;
    if (animationDuration !== void 0) opts.animationDuration = animationDuration;
    if (thumbColor !== void 0) opts.thumbColor = thumbColor;
    if (trackColor !== void 0) opts.trackColor = trackColor;
    if (activeThumbColor !== void 0) opts.activeThumbColor = activeThumbColor;
    if (thumbHoverColor !== void 0) opts.thumbHoverColor = thumbHoverColor;
    if (zIndex !== void 0) opts.zIndex = zIndex;
    const dir = el.getAttribute("dir");
    if (dir === "ltr" || dir === "rtl" || dir === "auto") opts.dir = dir;
    const axes = el.getAttribute("axes");
    if (axes) {
      opts.axes = axes.split(",").map((a) => a.trim()).filter(
        (a) => a === "vertical" || a === "horizontal"
      );
    }
    const include = parseList(el.getAttribute("include"));
    if (include) opts.include = include;
    const exclude = parseList(el.getAttribute("exclude"));
    if (exclude) opts.exclude = exclude;
    return opts;
  }
  var ThemvoraScrollbar = class _ThemvoraScrollbar extends ThemvoraRuntimeConsumer {
    handle = null;
    /**
     * Every attribute `optionsFrom` reads.
     *
     * The engine resolves its options once, when the overlay is created, so a
     * changed attribute has to rebuild it — without this list a new value was
     * ignored until the page was reloaded.
     */
    static get observedAttributes() {
      return [
        "auto-hide",
        "auto-hide-delay",
        "hover-expand",
        "draggable",
        "click-to-jump",
        "smooth",
        "overscroll",
        "arrows",
        "arrow-icon",
        "arrow-up-icon",
        "arrow-down-icon",
        "arrow-left-icon",
        "arrow-right-icon",
        "touch",
        "thickness",
        "hover-thickness",
        "radius",
        "min-thumb-size",
        "icon-size",
        "offset",
        "offset-top",
        "offset-right",
        "offset-bottom",
        "offset-left",
        "track-opacity",
        "thumb-opacity",
        "duration",
        "animation-duration",
        "thumb-color",
        "track-color",
        "active-thumb-color",
        "thumb-hover-color",
        "z-index",
        "dir",
        "axes",
        "include",
        "exclude"
      ];
    }
    /** Lifecycle hook: rebuilds the overlay when a watched attribute changes. */
    attributeChangedCallback() {
      const runtime = this.runtime;
      if (!runtime || !this.isConnected) return;
      this.rebuild(runtime);
    }
    onRuntime(runtime) {
      this.rebuild(runtime);
    }
    /** Lifecycle hook: destroys the overlay scrollbar. */
    onDetach() {
      this.handle?.destroy();
      this.handle = null;
    }
    rebuild(runtime) {
      const previous = this.handle;
      this.handle = createOverlayScrollbar(
        runtime.store,
        optionsFrom(this)
      );
      previous?.destroy();
    }
    static define(tag = "themvora-scrollbar") {
      if (typeof customElements === "undefined") return;
      if (!customElements.get(tag)) {
        customElements.define(tag, _ThemvoraScrollbar);
      }
    }
  };

  // src/inspector.ts
  var DEFAULT_BOTTOM = 104;
  var DEFAULT_RIGHT = 32;
  var DEFAULT_SIZE = 40;
  var DEFAULT_Z_INDEX = 9999;
  var EYE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  var X_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  function flattenTokens2(obj, prefix = "") {
    if (!obj) return [];
    const entries = [];
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        entries.push(...flattenTokens2(value, path));
      } else if (typeof value === "string") {
        entries.push([path, value]);
      }
    }
    return entries;
  }
  function isColorValue2(value) {
    return /^(#|rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb|color-mix|light-dark)/i.test(
      value.trim()
    );
  }
  function styled(tag, cssText, text) {
    const node = document.createElement(tag);
    node.style.cssText = cssText;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function entryRow(path, value) {
    const row = styled(
      "div",
      "display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11.5px;padding:3px 4px;border-radius:6px;font-family:var(--font-mono, ui-monospace, monospace);"
    );
    const label = styled(
      "span",
      "color:var(--theme-color-muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;",
      path
    );
    label.title = path;
    row.appendChild(label);
    const right = styled(
      "span",
      "display:flex;align-items:center;gap:6px;min-width:0;max-width:60%;justify-content:flex-end;"
    );
    if (isColorValue2(value)) {
      const swatch = styled(
        "span",
        "width:10px;height:10px;border-radius:3px;flex-shrink:0;border:1px solid var(--theme-color-border);box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06);"
      );
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.setProperty("background", value);
      right.appendChild(swatch);
    }
    const text = styled(
      "span",
      "color:var(--theme-color-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",
      value
    );
    text.title = value;
    right.appendChild(text);
    row.appendChild(right);
    return row;
  }
  function sectionHeader(label, count) {
    const header = styled(
      "div",
      "display:flex;align-items:center;gap:7px;margin-bottom:6px;"
    );
    header.appendChild(
      styled(
        "span",
        "width:3px;height:12px;border-radius:2px;background:var(--theme-color-primary);opacity:0.75;flex-shrink:0;"
      )
    );
    header.appendChild(
      styled(
        "span",
        "font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.09em;color:var(--theme-color-muted-foreground);",
        label
      )
    );
    if (typeof count === "number") {
      header.appendChild(
        styled(
          "span",
          "margin-left:auto;font-size:10px;font-family:var(--font-mono, ui-monospace, monospace);color:var(--theme-color-muted-foreground);opacity:0.65;",
          String(count)
        )
      );
    }
    return header;
  }
  function identityChip(value, accent = false) {
    const chip = styled(
      "span",
      "display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;text-transform:capitalize;font-family:var(--font-sans, system-ui, sans-serif);border:1px solid var(--theme-color-border);",
      value
    );
    chip.style.setProperty(
      "background",
      accent ? "color-mix(in srgb, var(--theme-color-primary) 14%, transparent)" : "var(--theme-color-muted)"
    );
    chip.style.setProperty(
      "color",
      accent ? "var(--theme-color-primary)" : "var(--theme-color-muted-foreground)"
    );
    return chip;
  }
  function tokenSection(label, count, rows, limit) {
    const section = styled("section", "margin-top:16px;");
    section.appendChild(sectionHeader(label, count));
    for (const [path, value] of rows.slice(0, limit)) {
      section.appendChild(entryRow(path, value));
    }
    if (count > limit) {
      section.appendChild(
        styled(
          "div",
          "color:var(--theme-color-muted-foreground);font-size:10.5px;margin-top:4px;padding-left:4px;",
          `+${count - limit} more`
        )
      );
    }
    return section;
  }
  var ThemvoraInspector = class _ThemvoraInspector extends ThemvoraRuntimeConsumer {
    static observedAttributes = ["bottom", "right", "size", "z-index"];
    unsubscribe = null;
    open = false;
    toggleEl = null;
    panelEl = null;
    rootEl = null;
    bottom = DEFAULT_BOTTOM;
    right = DEFAULT_RIGHT;
    size = DEFAULT_SIZE;
    zIndex = DEFAULT_Z_INDEX;
    /** Lifecycle hook: parses attributes and follows the provider runtime. */
    connectedCallback() {
      this.parseAttributes();
      super.connectedCallback();
    }
    /** Lifecycle hook: re-renders the inspector when an observed attribute changes. */
    attributeChangedCallback() {
      this.parseAttributes();
      const runtime = this.runtime;
      if (this.isConnected && runtime) this.render(runtime);
    }
    onRuntime(runtime) {
      this.parseAttributes();
      this.render(runtime);
      this.unsubscribe = runtime.store.subscribe(
        () => this.updatePanel(runtime)
      );
      window.addEventListener("keydown", this.handleKeydown);
      document.addEventListener("pointerdown", this.handlePointerDown);
    }
    /** Lifecycle hook: unsubscribes and removes global listeners. */
    onDetach() {
      this.unsubscribe?.();
      this.unsubscribe = null;
      window.removeEventListener("keydown", this.handleKeydown);
      document.removeEventListener("pointerdown", this.handlePointerDown);
      this.innerHTML = "";
      this.toggleEl = null;
      this.panelEl = null;
      this.rootEl = null;
      this.open = false;
    }
    parseAttributes() {
      this.bottom = parseIntAttr(this.getAttribute("bottom"), DEFAULT_BOTTOM);
      this.right = parseIntAttr(this.getAttribute("right"), DEFAULT_RIGHT);
      this.size = parseIntAttr(this.getAttribute("size"), DEFAULT_SIZE);
      this.zIndex = parseIntAttr(this.getAttribute("z-index"), DEFAULT_Z_INDEX);
    }
    render(runtime) {
      this.innerHTML = "";
      this.open = false;
      this.rootEl = document.createElement("div");
      const size = this.size;
      this.toggleEl = document.createElement("button");
      this.toggleEl.type = "button";
      this.toggleEl.setAttribute("part", "inspector-toggle");
      this.toggleEl.setAttribute("aria-label", "Open theme inspector");
      this.toggleEl.setAttribute("aria-expanded", "false");
      this.toggleEl.title = "Toggle Theme Inspector";
      this.toggleEl.style.cssText = `position:fixed;bottom:${this.bottom}px;right:${this.right}px;width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:color-mix(in srgb, var(--theme-color-primary) 80%, transparent);color:var(--theme-color-primary-foreground, var(--theme-color-primaryForeground));border:1px solid var(--theme-color-border);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px -8px color-mix(in srgb, var(--theme-color-primary) 60%, transparent);z-index:${this.zIndex};font-size:16px;transition:transform 150ms cubic-bezier(0.16,1,0.3,1);`;
      this.toggleEl.innerHTML = EYE_ICON;
      this.toggleEl.addEventListener("click", () => this.toggle(runtime));
      this.toggleEl.addEventListener("mouseenter", () => {
        if (this.toggleEl) this.toggleEl.style.transform = "scale(1.06)";
      });
      this.toggleEl.addEventListener("mouseleave", () => {
        if (this.toggleEl) this.toggleEl.style.transform = "scale(1)";
      });
      const panelBottom = this.bottom + size + 8;
      const panelMaxHeight = `min(480px, calc(100vh - ${panelBottom + 56}px))`;
      this.panelEl = document.createElement("div");
      this.panelEl.setAttribute("part", "inspector-panel");
      this.panelEl.setAttribute("role", "dialog");
      this.panelEl.setAttribute("aria-label", "Theme inspector");
      this.panelEl.tabIndex = -1;
      this.panelEl.style.cssText = `position:fixed;bottom:${panelBottom}px;right:${this.right}px;width:320px;max-height:${panelMaxHeight};overflow-y:auto;overscroll-behavior:contain;background:color-mix(in srgb, var(--theme-color-card) 92%, transparent);backdrop-filter:blur(14px) saturate(160%);-webkit-backdrop-filter:blur(14px) saturate(160%);border:1px solid var(--theme-color-border);border-radius:14px;box-shadow:0 24px 64px -24px rgba(0,0,0,0.45);padding:14px 20px 16px 16px;font-family:var(--font-sans, system-ui, sans-serif);font-size:12px;color:var(--theme-color-foreground);z-index:${this.zIndex};opacity:0;visibility:hidden;pointer-events:none;transition:opacity 200ms ease, transform 200ms cubic-bezier(0.16,1,0.3,1);transform-origin:bottom right;`;
      this.rootEl.appendChild(this.toggleEl);
      this.rootEl.appendChild(this.panelEl);
      this.appendChild(this.rootEl);
      this.updatePanel(runtime);
    }
    toggle(runtime) {
      this.open = !this.open;
      if (!this.toggleEl || !this.panelEl) return;
      this.toggleEl.setAttribute("aria-expanded", String(this.open));
      this.toggleEl.setAttribute("aria-label", this.open ? "Close theme inspector" : "Open theme inspector");
      this.toggleEl.innerHTML = this.open ? X_ICON : EYE_ICON;
      this.toggleEl.style.background = this.open ? "var(--theme-color-muted)" : "color-mix(in srgb, var(--theme-color-primary) 80%, transparent)";
      this.toggleEl.style.color = this.open ? "var(--theme-color-foreground)" : "var(--theme-color-primary-foreground, var(--theme-color-primaryForeground))";
      this.panelEl.style.opacity = this.open ? "1" : "0";
      this.panelEl.style.transform = this.open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)";
      this.panelEl.style.visibility = this.open ? "visible" : "hidden";
      this.panelEl.style.pointerEvents = this.open ? "auto" : "none";
      if (this.open) this.panelEl.focus();
    }
    updatePanel(runtime) {
      if (!this.panelEl) return;
      const theme = runtime.store.get();
      const selection = runtime.selection.getSelection();
      const mode = runtime.selection.getMode();
      const family = runtime.selection.getFamily();
      const vars = themeToCSSVariables(theme);
      const tokenEntries = flattenTokens2(theme.tokens);
      const varEntries = Object.entries(vars);
      const panel = document.createDocumentFragment();
      const top = styled(
        "div",
        "display:flex;align-items:center;justify-content:space-between;gap:8px;padding-right:8px;"
      );
      const identity = styled("div", "display:flex;align-items:center;gap:8px;");
      const dot = styled(
        "span",
        "width:8px;height:8px;border-radius:50%;background:var(--theme-color-card);box-shadow:0 0 0 3px color-mix(in srgb, var(--theme-color-primary) 22%, transparent);"
      );
      dot.setAttribute("aria-hidden", "true");
      identity.appendChild(dot);
      identity.appendChild(
        styled(
          "span",
          "font-weight:700;font-size:12px;letter-spacing:0.01em;",
          "Theme Inspector"
        )
      );
      top.appendChild(identity);
      const closeButton = styled(
        "button",
        "background:transparent;border:1px solid transparent;border-radius:7px;cursor:pointer;font-size:14px;line-height:1;width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:var(--theme-color-muted-foreground);"
      );
      closeButton.type = "button";
      closeButton.dataset.close = "";
      closeButton.innerHTML = X_ICON;
      closeButton.addEventListener("click", () => this.close());
      top.appendChild(closeButton);
      panel.appendChild(top);
      const chips = styled(
        "div",
        "display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:10px;padding-right:8px;"
      );
      chips.appendChild(
        styled(
          "span",
          "font-size:12.5px;font-weight:600;color:var(--theme-color-foreground);margin-right:2px;",
          String(theme.name)
        )
      );
      chips.appendChild(identityChip(family));
      chips.appendChild(identityChip(mode, true));
      panel.appendChild(chips);
      panel.appendChild(
        styled(
          "div",
          "height:1px;margin:14px 0 0;background:linear-gradient(90deg, var(--theme-color-border), transparent);"
        )
      );
      const themeSection = styled("section", "margin-top:16px;");
      themeSection.appendChild(sectionHeader("Theme"));
      themeSection.appendChild(entryRow("Name", String(theme.name)));
      themeSection.appendChild(entryRow("Family", family));
      themeSection.appendChild(entryRow("Mode", mode));
      panel.appendChild(themeSection);
      const selectionSection = styled("section", "margin-top:16px;");
      selectionSection.appendChild(sectionHeader("Selection"));
      selectionSection.appendChild(entryRow("family", selection.family));
      selectionSection.appendChild(entryRow("mode", selection.mode));
      panel.appendChild(selectionSection);
      panel.appendChild(
        tokenSection("Tokens", tokenEntries.length, tokenEntries, 16)
      );
      panel.appendChild(
        tokenSection("CSS Variables", varEntries.length, varEntries, 8)
      );
      this.panelEl.innerHTML = "";
      this.panelEl.appendChild(panel);
    }
    close() {
      if (!this.open) return;
      this.open = false;
      if (this.toggleEl) {
        this.toggleEl.setAttribute("aria-expanded", "false");
        this.toggleEl.setAttribute("aria-label", "Open theme inspector");
        this.toggleEl.innerHTML = EYE_ICON;
        this.toggleEl.style.background = "color-mix(in srgb, var(--theme-color-primary) 80%, transparent)";
        this.toggleEl.style.color = "var(--theme-color-primary-foreground, var(--theme-color-primaryForeground))";
      }
      if (this.panelEl) {
        this.panelEl.style.opacity = "0";
        this.panelEl.style.transform = "translateY(12px) scale(0.96)";
        this.panelEl.style.visibility = "hidden";
        this.panelEl.style.pointerEvents = "none";
      }
      this.toggleEl?.focus();
    }
    handleKeydown = (event) => {
      if (event.key !== "Escape") return;
      const active = document.activeElement;
      const inside = this.panelEl?.contains(active) || this.toggleEl === active;
      if (inside) this.close();
    };
    handlePointerDown = (event) => {
      if (!this.open) return;
      if (this.rootEl?.contains(event.target)) return;
      this.close();
    };
    static define(tag = "themvora-inspector") {
      if (typeof customElements === "undefined") return;
      if (!customElements.get(tag)) {
        customElements.define(tag, _ThemvoraInspector);
      }
    }
  };
  function parseIntAttr(raw, fallback) {
    const n = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  // src/styles.ts
  var COMPONENT_STYLE_ID = "themvora-elements-style";
  var COMPONENT_CSS = `
/* ---------------------------------------------------------------- toggle */
:where(themvora-toggle) {
  display: inline-flex;
  vertical-align: middle;
}

:where(themvora-toggle) > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0;
  padding: 0;
  font: inherit;
  line-height: 1;
  color: var(--theme-color-foreground, #111827);
  background-color: var(--theme-color-muted, #f3f4f6);
  border: 1px solid var(--theme-color-border, #d4d4d8);
  border-radius: var(--theme-radius-md, 0.375rem);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    border-color 150ms ease;
}

:where(themvora-toggle) > button:hover {
  color: var(--theme-color-accentForeground, var(--theme-color-foreground, #111827));
  background-color: var(--theme-color-accent, #e5e7eb);
}

:where(themvora-toggle) > button:focus-visible {
  outline: 2px solid var(--theme-color-ring, #6366f1);
  outline-offset: 2px;
}

:where(themvora-toggle) > button > svg {
  display: block;
  width: 1.125rem;
  height: 1.125rem;
  flex: none;
  pointer-events: none;
}

/* ---------------------------------------------------------------- select */
:where(themvora-select) {
  display: inline-flex;
  vertical-align: middle;
}

:where(themvora-select) > select {
  box-sizing: border-box;
  margin: 0;
  padding: 0.375rem 0.625rem;
  font: inherit;
  line-height: 1.25;
  color: var(--theme-color-foreground, #111827);
  background-color: var(--theme-color-background, #ffffff);
  border: 1px solid var(--theme-color-input, var(--theme-color-border, #d4d4d8));
  border-radius: var(--theme-radius-md, 0.375rem);
  cursor: pointer;
}

:where(themvora-select) > select:focus-visible {
  outline: 2px solid var(--theme-color-ring, #6366f1);
  outline-offset: 2px;
}

/* ------------------------------------------------------------- motion off */
@media (prefers-reduced-motion: reduce) {
  :where(themvora-toggle) > button {
    transition: none;
  }
}
`.trim();
  function injectComponentStyles() {
    if (typeof document === "undefined") return false;
    if (document.getElementById(COMPONENT_STYLE_ID)) return false;
    const parent = document.head ?? document.documentElement;
    if (!parent) return false;
    const style = document.createElement("style");
    style.id = COMPONENT_STYLE_ID;
    style.textContent = COMPONENT_CSS;
    parent.appendChild(style);
    return true;
  }

  // src/index.ts
  function useThemeRuntime() {
    const providers = typeof document === "undefined" ? [] : Array.from(document.querySelectorAll("themvora-provider"));
    for (const el of providers) {
      const runtime = findProviderRuntime(el);
      if (runtime) return runtime;
    }
    throw new Error("useThemeRuntime must be used after a <themvora-provider> has initialized");
  }
  function useThemeValue() {
    return useThemeRuntime().store.get();
  }
  function useGeneratedTheme() {
    const runtime = useThemeRuntime();
    return resolveGeneratedTheme(runtime.themes, runtime.store.get());
  }
  function useProvidedThemes() {
    return normalizeProvidedThemes(useThemeRuntime().themes);
  }
  function useThemeTokens() {
    return useThemeRuntime().store.get().tokens;
  }
  function useThemeMode() {
    return useThemeRuntime().selection.getMode();
  }
  function useEffectiveThemeMode() {
    return useThemeRuntime().selection.getEffectiveMode();
  }
  function observeEffectiveThemeMode(listener) {
    return useThemeRuntime().selection.subscribeEffective(listener);
  }
  function useThemeFamily() {
    return useThemeRuntime().selection.getFamily();
  }
  function getThemeSchedule() {
    return useThemeRuntime().schedule ?? null;
  }
  function defineCustomElements() {
    ThemvoraProvider.define();
    ThemvoraScope.define();
    ThemvoraToggle.define();
    ThemvoraSelect.define();
    ThemvoraScrollbar.define();
    ThemvoraInspector.define();
    injectComponentStyles();
  }
  if (typeof customElements !== "undefined") {
    defineCustomElements();
  }
  return __toCommonJS(cdn_exports);
})();
