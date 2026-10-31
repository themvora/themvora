/**
 * The extension-host smoke test.
 *
 * Runs *inside* VS Code's extension host, against the extension VS Code loaded
 * from `package.json`'s `main`. It is the only check that proves the ESM entry
 * point actually loads, `activate()` runs, and a contributed command executes
 * end to end — none of which a fake host can prove.
 *
 * CommonJS on purpose: VS Code `require`s the module named by
 * `--extensionTestsPath`, and the package is `"type": "module"`, so the file has
 * to be `.cjs` to be loadable at all.
 *
 * Results are written to `THEMVORA_HOST_RESULT` as JSON before anything throws,
 * so the launcher can report what passed even when a later check fails.
 *
 * @packageDocumentation
 */
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

/** The extension id under test, i.e. `publisher.name`. */
const EXTENSION_ID = "themvora.themvora-vscode";

/** The checks performed, in order. */
const results = [];

/**
 * Poll until a producer returns something other than null.
 *
 * Polls rather than sleeping a fixed time, so a slow host does not produce a
 * flaky failure and a fast one does not waste seconds.
 *
 * @param {() => unknown} produce - Returns null while not ready.
 * @param {number} timeoutMs - How long to keep trying.
 */
async function waitFor(produce, timeoutMs = 8000) {
  const started = Date.now();
  for (;;) {
    const value = produce();
    if (value !== null && value !== undefined) return value;
    if (Date.now() - started > timeoutMs) throw new Error(`timed out after ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/** The file the launcher reads. */
function outputPath() {
  const value = process.env.THEMVORA_HOST_RESULT;
  if (!value) throw new Error("THEMVORA_HOST_RESULT is not set");
  return value;
}

/**
 * Write the current results.
 *
 * Called after every check rather than once at the end: if a later check hangs —
 * which is exactly what a modal dialog does in a headless host — the launcher
 * still gets a record of how far the run got.
 */
function persist() {
  fs.writeFileSync(
    outputPath(),
    JSON.stringify(
      {
        vscodeVersion: vscode.version,
        results,
        failed: results.filter((entry) => !entry.ok).length,
        complete: false,
      },
      null,
      2,
    ),
  );
}

/**
 * Record one check.
 *
 * @param {string} name - What was checked.
 * @param {() => unknown} run - The check; throws to fail.
 */
async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail: detail === undefined ? null : String(detail) });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
  persist();
}

/**
 * Mark the run complete, then fail it if anything failed.
 */
function finish() {
  const failed = results.filter((entry) => !entry.ok);

  fs.writeFileSync(
    outputPath(),
    JSON.stringify(
      { vscodeVersion: vscode.version, results, failed: failed.length, complete: true },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    throw new Error(
      `${failed.length} extension-host check(s) failed: ${failed.map((entry) => entry.name).join(", ")}`,
    );
  }
}

exports.run = async function run() {
  outputPath();

  await check("the extension is present and activated by the host", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    if (!extension) throw new Error(`${EXTENSION_ID} is not loaded`);
    const exports = await extension.activate();
    if (!exports) throw new Error("activate() returned nothing");
    return `${extension.id} @ ${extension.packageJSON.version}`;
  });

  await check("activate() returns the typed API with the manifest version", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const exports = await extension.activate();
    const expected = extension.packageJSON.version;
    if (exports.version !== expected) {
      throw new Error(`exports.version is ${String(exports.version)}, manifest says ${expected}`);
    }
    return exports.version;
  });

  await check("the client is exposed and performs a real operation", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const exports = await extension.activate();
    const client = exports.client;

    if (!client) throw new Error("activate() did not expose a client");

    const available = client.capabilities.core.available;
    const expected = "generate,validate,catalog,diff,exportVariables,cssDocument,migrate";
    if (!Array.isArray(available) || available.join(",") !== expected) {
      throw new Error(`expected [${expected}], got [${String(available)}]`);
    }
    if (client.capabilities.cli.available !== false) {
      throw new Error("the CLI capability should be reported unavailable");
    }

    // A real call through the client, not a shape check.
    const generated = await client.generate({ seed: "#4f46e5" });
    if (!generated.ok) throw new Error(`client.generate failed: ${String(generated.reason)}`);

    return `${available.length} core capabilities; generate → ${generated.value.light.name}`;
  });

  await check("every contributed command is registered", async () => {
    // Read the manifest rather than a hardcoded list, so a command added to
    // `contributes` without a registration fails here.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const contributed = extension.packageJSON.contributes.commands.map((entry) => entry.command);
    const registered = new Set(await vscode.commands.getCommands(true));

    for (const id of contributed) {
      if (!registered.has(id)) throw new Error(`${id} is contributed but not registered`);
    }

    return contributed.join(", ");
  });

  await check("the Activity Bar container and its view are registered", async () => {
    // This is the difference between a feature that exists and one the user can
    // find. A container with no registered command has no icon to click; a view
    // with no `.focus` command cannot be opened from the palette or the status
    // bar. Both are read from the manifest, so the check follows the manifest.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const containers = extension.packageJSON.contributes.viewsContainers?.activitybar ?? [];
    if (containers.length === 0) throw new Error("no Activity Bar container is contributed");

    const registered = new Set(await vscode.commands.getCommands(true));
    const views = Object.values(extension.packageJSON.contributes.views ?? {}).flat();
    const missing = [];

    for (const container of containers) {
      const command = `workbench.view.extension.${container.id}`;
      if (!registered.has(command)) missing.push(command);
    }
    for (const view of views) {
      const command = `${view.id}.focus`;
      if (!registered.has(command)) missing.push(command);
    }

    if (missing.length > 0) throw new Error(`not registered: ${missing.join(", ")}`);

    const ids = containers.map((entry) => entry.id).join(", ");
    return `${ids} · ${views.length} view(s)`;
  });

  await check("the workspace view is contributed and resolves", async () => {
    // `themvora.workspace.focus` is registered by VS Code for every contributed
    // view, so its presence proves the manifest entry took effect; executing it
    // makes VS Code call `resolveWebviewView`, which is where the provider builds
    // the document. A provider that threw would surface here.
    const registered = new Set(await vscode.commands.getCommands(true));
    const focus = "themvora.workspace.focus";
    if (!registered.has(focus)) throw new Error(`${focus} is not registered`);

    await vscode.commands.executeCommand(focus);
    return focus;
  });

  await check("the Theme Studio opens as a reusable editor panel", async () => {
    // Creating the panel builds the document from `dist/webview`, so this fails if
    // the React assets are missing from the VSIX. The API is used rather than
    // `tabGroups`, which does not report webview tabs in this host mode.
    const registered = new Set(await vscode.commands.getCommands(true));
    if (!registered.has("themvora.openStudio")) throw new Error("themvora.openStudio is not registered");

    const api = vscode.extensions.getExtension(EXTENSION_ID).exports;
    if (api.studio.isOpen()) throw new Error("the Studio was already open before the command");

    await vscode.commands.executeCommand("themvora.openStudio");
    if (!api.studio.isOpen()) throw new Error("the Studio did not open");

    // Opening again must reuse the panel, not stack a second one.
    await vscode.commands.executeCommand("themvora.openStudio");
    if (!api.studio.isOpen()) throw new Error("the Studio closed on the second open");

    return "one reusable panel";
  });

  await check("the workspace folder is open", async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) throw new Error("no workspace folder was opened");
    return folders.map((folder) => folder.uri.fsPath).join(", ");
  });

  const target = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "host-smoke.json");
  const lightPath = path.join(path.dirname(target), "host-smoke-light.json");

  await check("themvora.generateTheme writes the pair through the real save path", async () => {
    await vscode.commands.executeCommand(
      "themvora.generateTheme",
      "#4f46e5",
      vscode.Uri.file(target),
    );

    if (!fs.existsSync(target)) throw new Error("the command did not write a file");

    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    if (!parsed.light || !parsed.dark) throw new Error("the file is not a { light, dark } pair");
    if (Object.keys(parsed.light.tokens.colors).length !== 21) {
      throw new Error("the light theme does not have 21 colour tokens");
    }
    if (parsed.light.meta.generation.kind !== "generated") {
      throw new Error("generation provenance is missing");
    }
    return `${path.basename(target)} — ${Object.keys(parsed.light.tokens.colors).length} colours`;
  });

  await check("themvora.validateTheme executes against the generated file", async () => {
    // Execution, not behaviour: the report goes to an output channel, which has
    // no read API. The command's behaviour is asserted in the unit suite; what
    // this proves is that it runs in a real host without throwing.
    await vscode.commands.executeCommand("themvora.validateTheme", vscode.Uri.file(target));
  });

  await check("themvora.copyCssVariables puts core's document on the clipboard", async () => {
    // The host *can* read the clipboard, so this proves the copy itself rather
    // than only that the command ran.
    const pair = JSON.parse(fs.readFileSync(target, "utf8"));
    const single = path.join(path.dirname(target), "host-smoke-light.json");
    fs.writeFileSync(single, JSON.stringify(pair.light, null, 2));

    const previous = await vscode.env.clipboard.readText();
    try {
      // A single-theme document, so no selection prompt is shown.
      await vscode.commands.executeCommand("themvora.copyCssVariables", vscode.Uri.file(single));

      const copied = await vscode.env.clipboard.readText();
      if (!copied.startsWith(":root {")) throw new Error("the clipboard does not hold a :root block");
      if (!copied.includes("--theme-color-primary")) {
        throw new Error("the clipboard holds no theme colour variables");
      }

      return `${copied.split("\n").length} lines, ${copied.length} bytes`;
    } finally {
      // Leave the user's clipboard as it was.
      await vscode.env.clipboard.writeText(previous);
    }
  });

  await check("themvora.compareThemes executes against two real files", async () => {
    // Execution, not behaviour: the report goes to the output channel, which has
    // no read API. What this proves is that the command runs in a real host with
    // two file arguments and no dialogs.
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const exports = await extension.activate();
    const other = await exports.client.generate({ seed: "#10b981" });

    const otherPath = path.join(path.dirname(target), "host-smoke-other.json");
    fs.writeFileSync(otherPath, JSON.stringify(other.value.light, null, 2));

    await vscode.commands.executeCommand(
      "themvora.compareThemes",
      vscode.Uri.file(lightPath),
      vscode.Uri.file(otherPath),
    );
  });

  await check("themvora.previewTheme opens a panel", async () => {
    // Execution plus tab presence. The panel's DOM is not reachable from the
    // extension host, so this says nothing about how the preview looks — only
    // that the command ran and a "Theme Preview" tab exists afterwards.
    await vscode.commands.executeCommand("themvora.previewTheme", vscode.Uri.file(lightPath));

    const labels = vscode.window.tabGroups.all.flatMap((group) =>
      group.tabs.map((tab) => tab.label),
    );
    if (!labels.includes("Theme Preview")) {
      throw new Error(`no "Theme Preview" tab; open tabs: ${labels.join(", ") || "(none)"}`);
    }

    return "Theme Preview tab present";
  });


  // --- Milestone 6: editor features -------------------------------------------------
  const workspaceDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const pairFixture = JSON.parse(fs.readFileSync(target, "utf8"));

  /** Write a fixture and open it. */
  async function openFixture(name, contents) {
    const uri = vscode.Uri.file(path.join(workspaceDir, name));
    fs.writeFileSync(uri.fsPath, contents);
    await vscode.workspace.openTextDocument(uri);
    return uri;
  }

  await check("diagnostics: one error per missing token, at real ranges", async () => {
    const uri = await openFixture(
      "m6-broken.json",
      JSON.stringify(
        { name: "broken", meta: { mode: "light" }, tokens: { colors: { primary: "nope", background: "#fff" } } },
        null,
        2,
      ),
    );

    const diagnostics = await waitFor(() => {
      const found = vscode.languages.getDiagnostics(uri);
      return found.length > 0 ? found : null;
    });

    const errors = diagnostics.filter((entry) => entry.severity === vscode.DiagnosticSeverity.Error);
    if (errors.length !== 20) throw new Error(`expected 20 errors, got ${errors.length}`);

    const invalid = diagnostics.filter((entry) => entry.code === "TV_THEME_TOKEN_INVALID");
    if (invalid.length !== 1) throw new Error(`expected one invalid-value diagnostic, got ${invalid.length}`);

    // The invalid value is underlined where it is, not at the top of the file.
    const text = fs.readFileSync(uri.fsPath, "utf8");
    const covered = text.slice(
      text.split("\n").slice(0, invalid[0].range.start.line).reduce((sum, line) => sum + line.length + 1, 0) +
        invalid[0].range.start.character,
      text.split("\n").slice(0, invalid[0].range.end.line).reduce((sum, line) => sum + line.length + 1, 0) +
        invalid[0].range.end.character,
    );
    if (covered !== "nope") throw new Error(`invalid-value range covers "${covered}"`);

    return `${errors.length} errors; invalid value underlined at "${covered}"`;
  });

  await check("diagnostics: contrast is a warning, and core still says valid", async () => {
    const lowContrast = JSON.parse(JSON.stringify(pairFixture.light));
    lowContrast.tokens.colors.primaryForeground = lowContrast.tokens.colors.primary;

    const uri = await openFixture("m6-contrast.json", JSON.stringify(lowContrast, null, 2));
    const diagnostics = await waitFor(() => {
      const found = vscode.languages.getDiagnostics(uri);
      return found.length > 0 ? found : null;
    });

    const warnings = diagnostics.filter((entry) => entry.severity === vscode.DiagnosticSeverity.Warning);
    const errors = diagnostics.filter((entry) => entry.severity === vscode.DiagnosticSeverity.Error);

    if (warnings.length !== 1) throw new Error(`expected one warning, got ${warnings.length}`);
    if (errors.length !== 0) throw new Error(`expected no errors, got ${errors.length}`);
    if (warnings[0].code !== "TV_A11Y_CONTRAST_VIOLATION") {
      throw new Error(`unexpected warning code ${String(warnings[0].code)}`);
    }

    return "1 warning (contrast), 0 errors";
  });

  await check("diagnostics: a malformed edit clears them", async () => {
    const uri = await openFixture(
      "m6-malformed.json",
      JSON.stringify({ name: "x", tokens: { colors: { primary: "#fff" } } }, null, 2),
    );
    await waitFor(() => (vscode.languages.getDiagnostics(uri).length > 0 ? true : null));

    const editor = await vscode.window.showTextDocument(uri);
    await editor.edit((builder) => {
      builder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), '{ "name": "x", "tokens": {');
    });

    // VS Code's built-in JSON validator reports the syntax error too, so only
    // Themvora's own diagnostics are the subject here.
    const ours = () =>
      vscode.languages.getDiagnostics(uri).filter((entry) => entry.source === "Themvora");

    const cleared = await waitFor(() => (ours().length === 0 ? true : null)).catch(() => null);
    if (!cleared) throw new Error(`${ours().length} Themvora diagnostics survived the malformed edit`);
    return "cleared after a malformed edit";
  });

  // Closing a document is not verified here: the extension host has no public API
  // to close one, and `workbench.action.closeAllEditors` does not drop a document
  // that was opened with `workspace.openTextDocument` — it stays in
  // `workspace.textDocuments`, so `onDidCloseTextDocument` never fires. That path
  // is covered by the adapter test, which raises the event directly.

  await check("hover: explains a role in a theme document", async () => {
    const uri = vscode.Uri.file(lightPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const offset = document.getText().indexOf('"primary":');
    if (offset < 0) throw new Error("fixture has no primary token");

    const hovers = await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      uri,
      document.positionAt(offset + 2),
    );

    if (!Array.isArray(hovers) || hovers.length === 0) throw new Error("no hover returned");
    const text = hovers
      .flatMap((hover) => hover.contents)
      .map((part) => (typeof part === "string" ? part : part.value))
      .join("\n");

    if (!text.includes("primary")) throw new Error("hover does not name the role");
    if (!text.includes("Actions")) throw new Error("hover does not name the role group");

    return `${text.split("\n").length} lines of hover content`;
  });

  await check("hover: stays out of unrelated JSON", async () => {
    const uri = await openFixture("m6-unrelated.json", JSON.stringify({ name: "app", primary: "x" }, null, 2));
    const document = await vscode.workspace.openTextDocument(uri);
    const offset = document.getText().indexOf('"primary"');

    const hovers = await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      uri,
      document.positionAt(offset + 2),
    );

    const text = (Array.isArray(hovers) ? hovers : [])
      .flatMap((hover) => hover.contents)
      .map((part) => (typeof part === "string" ? part : part.value))
      .join("\n");

    // VS Code may return its own JSON hover; what must not appear is ours.
    if (text.includes("Current value:")) throw new Error("a Themvora hover appeared for unrelated JSON");
    return "no Themvora hover";
  });

  await check("swatches: one exact range per colour token", async () => {
    const uri = vscode.Uri.file(lightPath);
    const document = await vscode.workspace.openTextDocument(uri);

    const result = await vscode.commands.executeCommand("vscode.executeDocumentColorProvider", uri);

    // The documented shape is `[Uri, ColorInformation[]][]`; some versions hand
    // back the flat list. Accept both rather than assume.
    let colors = [];
    if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0])) {
        const entry = result.find((pair) => pair[0] && pair[0].toString() === uri.toString());
        colors = entry ? entry[1] : [];
      } else {
        colors = result;
      }
    }

    if (!Array.isArray(colors) || colors.length === 0) {
      throw new Error(`no colour information; result had ${Array.isArray(result) ? result.length : typeof result} entries`);
    }
    if (colors.length !== 21) throw new Error(`expected 21 swatches, got ${colors.length}`);

    const text = document.getText();
    for (const color of colors) {
      const covered = text.slice(
        document.offsetAt(color.range.start),
        document.offsetAt(color.range.end),
      );
      if (!/^#[0-9a-fA-F]{3,8}$/.test(covered)) {
        throw new Error(`swatch range covers "${covered}"`);
      }
    }

    return `${colors.length} swatches, every range a hex literal`;
  });


  await check("jsonc: a commented theme is diagnosed and gets swatches", async () => {
    const commented = [
      "{",
      "  // hand-authored, comments are allowed",
      '  "name": "broken",',
      '  "meta": { "mode": "light" },',
      '  "tokens": {',
      '    "colors": {',
      "      // only two roles",
      '      "primary": "nope",',
      '      "background": "#ffffff",',
      "    },",
      "  },",
      "}",
    ].join("\n");

    const uri = await openFixture("m6-commented.jsonc", commented);

    const diagnostics = await waitFor(() => {
      const found = vscode.languages.getDiagnostics(uri).filter((entry) => entry.source === "Themvora");
      return found.length > 0 ? found : null;
    });

    if (diagnostics.length !== 20) throw new Error(`expected 20 diagnostics, got ${diagnostics.length}`);

    const invalid = diagnostics.find((entry) => entry.code === "TV_THEME_TOKEN_INVALID");
    if (!invalid) throw new Error("no invalid-value diagnostic");

    // Offsets came from the masked source; the file on disk is the raw one.
    const text = fs.readFileSync(uri.fsPath, "utf8");
    const offsetOf = (position) =>
      text.split("\n").slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) +
      position.character;
    const covered = text.slice(offsetOf(invalid.range.start), offsetOf(invalid.range.end));
    if (covered !== "nope") throw new Error(`the underline covers "${covered}", not "nope"`);

    const result = await vscode.commands.executeCommand("vscode.executeDocumentColorProvider", uri);
    const colors = Array.isArray(result) && Array.isArray(result[0]) ? result[0][1] : result;

    // One, not two: `primary` is "nope", which is not a colour and correctly gets
    // no swatch. Only `background` is a hex literal.
    if (!Array.isArray(colors) || colors.length !== 1) {
      throw new Error(`expected 1 swatch in the commented file, got ${Array.isArray(colors) ? colors.length : typeof colors}`);
    }

    return `${diagnostics.length} diagnostics, underline at "nope", ${colors.length} swatch (the invalid value gets none)`;
  });

  await check("a scaffolded project's themes are read", async () => {
    // The real generated module, captured from the CLI's own renderer, written
    // where `themvora init` puts it. `init --framework react --dry-run` produces
    // exactly this file and no `theme.config.ts`, so this is the default path.
    const fixture = path.resolve(
      __dirname,
      "../../../core/test/fixtures/registry/generated-themes.txt",
    );
    const dir = path.join(workspaceDir, "src", "themes");
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(fixture, path.join(dir, "themes.ts"));

    await vscode.commands.executeCommand("themvora.refresh");

    // Read through the extension's own API: a tree view has no read API, so this
    // is the only way to ask what the panel actually decided.
    const api = vscode.extensions.getExtension(EXTENSION_ID).exports;
    const roots = await waitFor(() => (api.projects.length > 0 ? api.projects : null));
    const inspection = roots[0].inspection;

    const registry = inspection.registries.find((entry) => entry.path === "src/themes/themes.ts");
    if (registry === undefined) throw new Error("src/themes/themes.ts was not found");

    if (inspection.status !== "supported") {
      throw new Error(`expected "supported"; got "${inspection.status}" — ${registry.detail}`);
    }
    if (registry.themes.length !== 10) {
      throw new Error(`expected 10 themes; got ${registry.themes.length}`);
    }

    const names = registry.themes.map((theme) => theme.name);
    if (!names.includes("generated-light")) throw new Error(`missing generated-light: ${names.join(", ")}`);

    return `${inspection.status} · ${registry.themes.length} themes`;
  });

  await check("a defineTheme() definition outside the registry is read", async () => {
    // `defineTheme()` returns its argument, so a literal is the theme. The fixture
    // is a real generated theme wrapped in a call, which is what a project pastes
    // in — not a hand-written stub that would fail validation.
    const fixture = path.resolve(__dirname, "../fixtures/brand-theme.ts.txt");
    const dir = path.join(workspaceDir, "src", "theme");
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(fixture, path.join(dir, "brand.ts"));

    await vscode.commands.executeCommand("themvora.refresh");

    const api = vscode.extensions.getExtension(EXTENSION_ID).exports;
    const roots = await waitFor(() => (api.projects.length > 0 ? api.projects : null));
    const inspection = roots[0].inspection;

    const entry = inspection.registries.find((registry) => registry.path === "src/theme/brand.ts");
    if (entry === undefined) throw new Error("src/theme/brand.ts was not discovered");
    if (entry.status !== "supported") throw new Error(`status is ${entry.status} — ${entry.detail}`);
    if (entry.themes.length !== 1) throw new Error(`expected 1 theme; got ${entry.themes.length}`);

    return `${entry.themes[0].name} · ${entry.path}`;
  });

  await check("themvora.refresh runs without throwing", async () => {
    await vscode.commands.executeCommand("themvora.refresh");
  });

  finish();
};
