import { describe, expect, it } from "vitest";
import type { ThemeDefinition } from "@themvora/core";

import { generatePatchProposal } from "../src/domain/patchProposal";

const sampleTheme: ThemeDefinition = {
  name: "test-theme",
  meta: { mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#000000",
      primary: "#007bff",
    },
  },
};

describe("generatePatchProposal", () => {
  it("generates a create-theme-file patch for React", () => {
    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/themes/test-theme.ts",
      patchType: "create-theme-file",
      framework: "react",
      originalContent: "",
      themeVariableName: "testTheme",
      saveFormat: "ts",
    });

    expect(patch.action).toBe("create");
    expect(patch.path).toBe("src/themes/test-theme.ts");
    expect(patch.original).toBe("");
    expect(patch.updated).toContain("test-theme");
    expect(patch.description).toContain("Create");
    expect(patch.description).toContain("react");
    expect(patch.generatedCode.imports).toContain("import { ThemeProvider } from '@themvora/react';");
  });

  it("generates an add-to-theme-file patch for Vue", () => {
    const originalContent = `import { defineTheme } from '@themvora/core';\n\nexport const existingTheme = defineTheme({ name: 'existing' });\n`;

    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/themes/index.ts",
      patchType: "add-to-theme-file",
      framework: "vue",
      originalContent,
      themeVariableName: "testTheme",
      saveFormat: "ts",
    });

    expect(patch.action).toBe("update");
    expect(patch.path).toBe("src/themes/index.ts");
    expect(patch.original).toBe(originalContent);
    expect(patch.updated).toContain("import { ThemeProvider } from '@themvora/vue';");
    expect(patch.updated).toContain("test-theme");
    expect(patch.description).toContain("Add");
    expect(patch.description).toContain("vue");
  });

  it("generates a register-theme patch for Angular", () => {
    const originalContent = `import { registerTheme } from '@themvora/core';\n`;

    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/main.ts",
      patchType: "register-theme",
      framework: "angular",
      originalContent,
      themeVariableName: "testTheme",
      saveFormat: "ts",
    });

    expect(patch.action).toBe("update");
    expect(patch.generatedCode.imports).toContain("import { ThemeModule } from '@themvora/angular';");
    expect(patch.generatedCode.registration).toContain("registerTheme(testTheme);");
    expect(patch.description).toContain("Register");
    expect(patch.description).toContain("angular");
  });

  it("generates a mount-in-component patch for Svelte", () => {
    const originalContent = `<script>\n  // Component code\n</script>\n\n<main>\n  <!-- Content -->\n</main>\n`;

    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/App.svelte",
      patchType: "mount-in-component",
      framework: "svelte",
      originalContent,
      themeVariableName: "testTheme",
      saveFormat: "ts",
    });

    expect(patch.action).toBe("update");
    expect(patch.generatedCode.imports).toContain("import { ThemeProvider } from '@themvora/svelte';");
    expect(patch.generatedCode.providerMounting).toContain("<ThemeProvider theme={testTheme}>");
    expect(patch.description).toContain("Mount");
    expect(patch.description).toContain("svelte");
  });

  it("generates a patch for web-components", () => {
    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/index.html",
      patchType: "mount-in-component",
      framework: "web-components",
      originalContent: "",
      themeVariableName: "testTheme",
      saveFormat: "ts",
    });

    expect(patch.generatedCode.imports).toContain("import '@themvora/web';");
    expect(patch.generatedCode.providerMounting).toContain('<theme-provider theme="testTheme">');
  });

  it("generates a patch with JSON format", () => {
    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/themes/test-theme.json",
      patchType: "create-theme-file",
      framework: "react",
      originalContent: "",
      themeVariableName: "testTheme",
      saveFormat: "json",
    });

    expect(patch.updated).toContain('"name": "test-theme"');
    expect(patch.updated).toContain('"background": "#ffffff"');
  });

  it("uses default values when options are omitted", () => {
    const patch = generatePatchProposal({
      theme: sampleTheme,
      targetPath: "src/theme.ts",
      patchType: "create-theme-file",
      framework: "react",
    });

    expect(patch.action).toBe("create");
    expect(patch.original).toBe("");
    expect(patch.description).toContain("react");
  });
});
