import { defineTheme, defineThemvoraConfig } from "@themvora/core";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint Light", order: 10 },
    tokens: {
      colors: {
        background: "#f8fafc",
        foreground: "#0f172a",
        card: "#ffffff",
        cardForeground: "#0f172a",
        primary: "#0f766e",
        primaryForeground: "#f0fdfa",
        border: "#d7e3e0",
        muted: "#eef4f2",
        mutedForeground: "#4b5f5b",
      },
    },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark", order: 20 },
    tokens: {
      colors: {
        background: "#0b1220",
        foreground: "#e6f1ee",
        card: "#121c2b",
        cardForeground: "#e6f1ee",
        primary: "#2dd4bf",
        primaryForeground: "#04211d",
        border: "#22303f",
        muted: "#16222f",
        mutedForeground: "#9fb4b0",
      },
    },
  }),
  defineTheme({
    name: "cocoa-light",
    meta: { family: "cocoa", mode: "light", label: "Cocoa Light", order: 30 },
    tokens: {
      colors: {
        background: "#fbf7f2",
        foreground: "#2b1d16",
        card: "#ffffff",
        cardForeground: "#2b1d16",
        primary: "#9a3412",
        primaryForeground: "#fff7ed",
        border: "#e8dbcd",
        muted: "#f3ece3",
        mutedForeground: "#6b584a",
      },
    },
  }),
  defineTheme({
    name: "cocoa-dark",
    meta: { family: "cocoa", mode: "dark", label: "Cocoa Dark", order: 40 },
    tokens: {
      colors: {
        background: "#1a1310",
        foreground: "#f5e9df",
        card: "#241a15",
        cardForeground: "#f5e9df",
        primary: "#fb923c",
        primaryForeground: "#26120a",
        border: "#3a2a21",
        muted: "#2b1f19",
        mutedForeground: "#c3ac9c",
      },
    },
  }),
  defineTheme({
    name: "ocean-light",
    meta: { family: "ocean", mode: "light", label: "Ocean Light", order: 50 },
    tokens: {
      colors: {
        background: "#f5f8ff",
        foreground: "#0b1b3a",
        card: "#ffffff",
        cardForeground: "#0b1b3a",
        primary: "#1d4ed8",
        primaryForeground: "#eff6ff",
        border: "#d3ddf5",
        muted: "#eaeffb",
        mutedForeground: "#475569",
      },
    },
  }),
  defineTheme({
    name: "ocean-dark",
    meta: { family: "ocean", mode: "dark", label: "Ocean Dark", order: 60 },
    tokens: {
      colors: {
        background: "#070d1c",
        foreground: "#dbe6ff",
        card: "#0e1730",
        cardForeground: "#dbe6ff",
        primary: "#60a5fa",
        primaryForeground: "#08122b",
        border: "#1e2a4a",
        muted: "#121c36",
        mutedForeground: "#94a8cc",
      },
    },
  }),
];

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
  initialFamily: "mint",
  transition: false,
});
