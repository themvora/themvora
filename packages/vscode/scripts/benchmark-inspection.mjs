/**
 * Performance benchmark harness for project inspection.
 *
 * Measures inspection duration, file counts, and memory usage across
 * different project scales.
 */
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { performance } from "perf_hooks";

import { inspectProject } from "../dist/index.js";
import { createWorkspaceReader } from "../dist/index.js";
import { Uri } from "vscode";

/** Generate a synthetic theme definition. */
function generateThemeContent(name, index) {
  return `import { defineTheme } from '@themvora/core';

export const ${name} = defineTheme({
  name: '${name}',
  meta: { mode: '${index % 2 === 0 ? "light" : "dark"}', family: 'benchmark' },
  tokens: {
    colors: {
      background: '#${String(index * 111111).padStart(6, "0").slice(0, 6)}',
      foreground: '#${String(999999 - index * 111111).padStart(6, "0").slice(0, 6)}',
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
    },
  },
});
`;
}

/** Generate a synthetic provider file. */
function generateProviderContent(themeNames) {
  const imports = themeNames.map((name) => `import { ${name} } from './themes/${name}';`).join("\n");
  const themeList = themeNames.join(", ");
  return `${imports}
import { ThemeProvider } from '@themvora/react';

export function App() {
  return (
    <ThemeProvider themes={[${themeList}]}>
      <div>App</div>
    </ThemeProvider>
  );
}
`;
}

/** Create a synthetic project fixture. */
function createFixture(baseDir, name, fileCount, themeCount) {
  const projectDir = join(baseDir, name);
  rmSync(projectDir, { recursive: true, force: true });
  mkdirSync(projectDir, { recursive: true });
  mkdirSync(join(projectDir, "src", "themes"), { recursive: true });

  // Create package.json
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify(
      {
        name: `benchmark-${name}`,
        version: "1.0.0",
        dependencies: {
          "@themvora/core": "workspace:*",
          "@themvora/react": "workspace:*",
          react: "^19.0.0",
        },
      },
      null,
      2,
    ),
  );

  // Create theme files
  const themeNames = [];
  for (let i = 0; i < themeCount; i++) {
    const themeName = `theme${i}`;
    themeNames.push(themeName);
    writeFileSync(
      join(projectDir, "src", "themes", `${themeName}.ts`),
      generateThemeContent(themeName, i),
    );
  }

  // Create additional source files to reach fileCount
  const remainingFiles = fileCount - themeCount - 2; // -2 for package.json and provider
  for (let i = 0; i < remainingFiles; i++) {
    writeFileSync(
      join(projectDir, "src", `file${i}.ts`),
      `// Source file ${i}\nexport const value${i} = ${i};\n`,
    );
  }

  // Create provider file
  writeFileSync(join(projectDir, "src", "App.tsx"), generateProviderContent(themeNames));

  // Create theme registry
  const registryImports = themeNames
    .map((name) => `export { ${name} } from './themes/${name}';`)
    .join("\n");
  writeFileSync(join(projectDir, "src", "themes", "index.ts"), registryImports);

  return projectDir;
}

/** Run a benchmark on a fixture. */
async function benchmarkFixture(projectDir, name) {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const memBefore = process.memoryUsage().heapUsed;
  const start = performance.now();

  const reader = createWorkspaceReader(Uri.file(projectDir));
  const inspection = await inspectProject(projectDir, reader);

  const duration = performance.now() - start;
  const memAfter = process.memoryUsage().heapUsed;

  const themeCount = inspection.registries.reduce(
    (sum, reg) => sum + (reg.themes?.length ?? 0),
    0,
  );

  // Count files by walking
  const files = await reader.walk();

  return {
    name,
    fileCount: files.length,
    themeCount,
    inspectionDurationMs: Math.round(duration * 100) / 100,
    memoryUsageMB: Math.round(((memAfter - memBefore) / 1024 / 1024) * 100) / 100,
  };
}

/** Main benchmark runner. */
async function main() {
  const baseDir = join(process.cwd(), "benchmarks");
  mkdirSync(baseDir, { recursive: true });

  console.log("Running performance benchmarks...\n");

  const fixtures = [
    { name: "small", files: 10, themes: 2 },
    { name: "medium", files: 100, themes: 20 },
    { name: "large", files: 500, themes: 100 },
  ];

  const results = [];

  for (const fixture of fixtures) {
    console.log(`Creating ${fixture.name} fixture (${fixture.files} files, ${fixture.themes} themes)...`);
    const projectDir = createFixture(baseDir, fixture.name, fixture.files, fixture.themes);

    console.log(`Benchmarking ${fixture.name}...`);
    // Run 3 times and take median
    const runs = [];
    for (let i = 0; i < 3; i++) {
      runs.push(await benchmarkFixture(projectDir, fixture.name));
    }
    runs.sort((a, b) => a.inspectionDurationMs - b.inspectionDurationMs);
    results.push(runs[1]); // Median

    console.log(
      `  ${fixture.name}: ${results.at(-1).inspectionDurationMs}ms, ${results.at(-1).fileCount} files, ${results.at(-1).themeCount} themes\n`,
    );
  }

  // Print summary
  console.log("\n=== Benchmark Summary ===\n");
  console.log("Name\t\tFiles\tThemes\tDuration (ms)\tMemory (MB)");
  console.log("----\t\t-----\t------\t-------------\t-----------");
  for (const result of results) {
    console.log(
      `${result.name.padEnd(8)}\t${result.fileCount}\t${result.themeCount}\t${result.inspectionDurationMs}\t\t${result.memoryUsageMB}`,
    );
  }

  // Cleanup
  rmSync(baseDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
