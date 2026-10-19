## @themvora/daisyui/angular
Angular injection helper for the daisyUI adapter
(`@themvora/daisyui/angular`).

`injectDaisyTheme(runtime, options?)` registers the daisyUI adapter on an
explicitly provided Themvora runtime and unregisters it when the current
injection context is destroyed.

> Generated from `packages/daisyui/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `injectDaisyTheme<T extends ThemeDefinition<string>>(runtime, options): ThemeAdapter<T>`
Angular injectable that registers the daisyUI adapter on the given Themvora
runtime. Maintains a tagged `:root` style element with concrete `--color-*`
variables, kept in sync as the active theme changes.

Call in your component (or root) constructor or field initializer — the
function uses `DestroyRef` to unregister the adapter, so it must run in an
injection context (the runtime usually comes from
`injectThemeRuntime()` in `@themvora/angular`):

```ts
import { injectDaisyTheme } from "@themvora/daisyui/angular";

export class AppComponent {
  adapter = injectDaisyTheme(runtime);
}
```

**See also:** `injectBootstrapTheme`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The active Themvora runtime to register the adapter on. |
| `options` | `InjectAdapterOptions` | Adapter options. Defaults to `{}`. |

**Returns** `ThemeAdapter<T>` — The installed adapter instance.

---

## Interfaces

### `InjectAdapterOptions`
Options for the Angular adapter injection functions (for example
injectDaisyTheme).

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | The adapter strategy to use when registering the adapter. |

---

## Related docs

- [daisyUI](/libraries/daisyui) — the adapter integration
