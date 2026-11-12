// @vitest-environment node
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { themvoraVitePlugin } from "../src/vite-plugin";

/**
 * A `theme.config.*` edit must take effect without restarting the dev server.
 *
 * The plugin used to memoize the resolved configuration for the lifetime of the
 * process. `theme.config.ts` is not imported by the application, so nothing in
 * Vite invalidated it either: an edit to the catalog, the fallback theme or
 * `transition` kept serving the assets derived from the configuration the
 * server started with. Reported as "`transition: { enabled: false }` is not
 * being disabled" — indistinguishable from a broken option.
 */

const PAGE = `<html><head></head><body><main id="app"></main></body></html>`;

function writeConfig(dir: string, body: string): string {
  const file = join(dir, "theme.config.mjs");
  writeFileSync(file, body, "utf8");
  return file;
}

const configWith = (transition: string) => `
const light = { name: "sample-light", meta: { family: "sample", mode: "light" }, tokens: { colors: { background: "#ffffff" } } };
const dark = { name: "sample-dark", meta: { family: "sample", mode: "dark" }, tokens: { colors: { background: "#101014" } } };
export default { themes: [light, dark], defaultTheme: "sample-light", initialMode: "system"${transition} };
`;

/** The `window.__THEMVORA_CONFIG__` payload the plugin injected. */
function configPayload(tags: Array<{ attrs?: Record<string, string>; children?: string }>): string {
  const tag = tags.find((entry) => entry.attrs?.id === "themvora-config");
  if (!tag?.children) throw new Error("no config tag was injected");
  return tag.children;
}

describe("Vite plugin — theme.config changes during dev", () => {
  it("re-derives the injected configuration after the file changes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "themvora-config-reload-"));
    const file = writeConfig(dir, configWith(`, transition: { enabled: false }`));

    const plugin = themvoraVitePlugin();

    // The hooks the plugin registers against the dev server.
    const handlers = new Map<string, (changed: string) => void>();
    const send = vi.fn();

    plugin.configResolved({
      root: dir,
      command: "serve",
      logger: { warn: () => {} },
    } as never);
    plugin.configureServer({
      watcher: {
        on: (event: string, handler: (changed: string) => void) => {
          handlers.set(event, handler);
        },
      },
      hot: { send },
    } as never);

    const first = (await plugin.transformIndexHtml!(PAGE)) as Array<{
      attrs?: Record<string, string>;
      children?: string;
    }>;
    expect(configPayload(first)).toContain('"transition":{"enabled":false}');

    // The developer edits the option while the server is running.
    writeConfig(dir, configWith(`, transition: { enabled: true, duration: 900 }`));
    handlers.get("change")?.(file);

    // A full reload is what makes the browser ask for the HTML again, which is
    // the only way the injected tags can be rebuilt.
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });

    const second = (await plugin.transformIndexHtml!(PAGE)) as Array<{
      attrs?: Record<string, string>;
      children?: string;
    }>;
    const payload = configPayload(second);
    expect(payload).toContain('"duration":900');
    expect(payload).not.toContain('"enabled":false');
  });

  it("keeps serving the same configuration when nothing changed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "themvora-config-stable-"));
    writeConfig(dir, configWith(`, transition: { enabled: false }`));

    const plugin = themvoraVitePlugin();
    plugin.configResolved({ root: dir, command: "serve", logger: { warn: () => {} } } as never);
    plugin.configureServer({ watcher: { on: () => {} }, hot: { send: () => {} } } as never);

    const first = (await plugin.transformIndexHtml!(PAGE)) as Array<{ children?: string }>;
    const second = (await plugin.transformIndexHtml!(PAGE)) as Array<{ children?: string }>;

    // The memo is still a memo: two renders of the same file must not re-run the
    // esbuild config load.
    expect(configPayload(second)).toBe(configPayload(first));
  });
});
