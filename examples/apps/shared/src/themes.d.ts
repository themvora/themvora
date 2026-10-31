import type { ThemeDefinition, ThemeMode } from "@themvora/core";

export declare const brandThemes: ThemeDefinition[];
export declare const selection: string[];
export declare const presetThemes: ThemeDefinition[];
export declare const themes: ThemeDefinition[];
export declare const defaultTheme: string;
export declare const initialMode: ThemeMode;
export declare const transition: {
  enabled: boolean;
  duration: number;
  easing: string;
};
export declare const modes: readonly ["light", "dark", "system"];
export declare const previewColors: readonly [
  "primary",
  "secondary",
  "accent",
  "muted",
];
export declare const scopedTheme: string;
