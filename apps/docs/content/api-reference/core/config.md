## @themvora/core/config
Build-time entry: discovery of the application's `theme.config.ts`.

Imported from `@themvora/core/config`. Kept out of the main entry because it
uses node builtins, which a browser bundle of `@themvora/core` must never
pull in — the main entry is runtime code, this is build-time code.

> Generated from `packages/core/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `findThemvoraConfigPath(root, configPath?): Promise<string | null>`
Resolves the path of the application's `theme.config.*` without loading it.

**See also:** `loadThemvoraConfig`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `root` | `string` | The project root to search. |
| `configPath` | `string` (optional) | An explicit path, relative to `root` or absolute. When omitted the conventional filenames are tried in order. |

**Returns** `Promise<string | null>` — The absolute path, or `null` when no config file exists.

Separate from loadThemvoraConfig because a *watch* registration needs
the path and nothing else: Astro's `addWatchFile` and the Vite plugin's
watcher both restart or reload on a change to this file, and neither can pay
for a full esbuild config load just to learn where it lives.

---


### `loadThemvoraConfig<T extends ThemeDefinition<string>>(root, configPath?): Promise<ThemvoraConfig<T> | null>`
Finds and loads the application's ThemvoraConfig.

**See also:** `defineThemvoraConfig`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `root` | `string` | The project root to search. |
| `configPath` | `string` (optional) | An explicit path, relative to `root` or absolute. When omitted the conventional filenames are tried in order. |

**Returns** `Promise<ThemvoraConfig<T> | null>` — The configuration, or `null` when there is none — or when it cannot
  be loaded, which is warned about rather than thrown, so a broken config
  cannot take a build down.

Shared by the Vite plugin and the Astro integration so both discover the
configuration the same way. Loading goes through Vite's own config loader
rather than a hand-rolled transform, so a TypeScript config resolves its
imports exactly as `vite.config.ts` does.

`vite` is resolved from the *project*, not from here: core does not depend on
Vite, so a bare `import("vite")` fails wherever the package is only linked
where it is declared — which is the normal case under pnpm.

---

## Variables

### `THEMVORA_CONFIG_FILES`
Conventional config filenames, in resolution order.

**See also:** `loadThemvoraConfig`

`readonly ["theme.config.ts", "theme.config.tsx", "theme.config.mts", "theme.config.mjs", "theme.config.js", "theme.config.cjs"]`

---

## Related docs

- [Zero-flash bootstrap](/zero-flash) — Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.
