## @themvora/remix/server
> Generated from `packages/remix/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `getInitialThemeState<T extends ThemeDefinition<string>>(request, options): Promise<InitialThemeResolution<T>>`
Resolves the initial theme state server-side from the request's theme
cookies, so the browser paints already themed (zero-flash). Pair with
`ThemeProvider` (pass the result as `initial`) and `ThemeHead` in the
document `<head>`.

**See also:** `ThemeProvider`, `ThemeHead`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `request` | `Request` | The incoming request. |
| `options` | `ResolveInitialThemeOptions<T>` | The theme registry and fallback selection. |

**Returns** `Promise<InitialThemeResolution<T>>` — The resolved initial theme state.

The saved selection is only honoured when the `theme-fingerprint` cookie
matches the current registry: a cookie written by an older build — different
themes, or a different `defaultTheme` — is ignored. That is the same rule
`ThemeHead`'s pre-paint script and `createRemixThemePersistence` apply, and
without it the server rendered the stale cookie's theme while the client
rejected it, producing a hydration mismatch and a visible flash for returning
visitors. A **missing** fingerprint is still accepted, which is the legacy
cookie contract every integration shares.

---

## Related docs

- [Remix](/framework-guides/remix) — the framework integration
