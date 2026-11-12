## @themvora/antd/next
> Generated from `packages/antd/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `AntdStyleRegistry(__namedParameters): Element`
Serialises Ant Design's CSS-in-JS cache into the server HTML.

## Why this is needed

Ant Design does not ship a stylesheet — every rule lives in a cssinjs cache
that only exists at runtime. Without serialising it, the server HTML carries
the markup but none of the styling, and the first frame after a reload is
unstyled: no card surfaces, native form controls, stacked text.

## Why the layer matters

See SSR_LAYER. The short version: this block must never outrank the
live cache, or theme switching silently stops working for every component
whose colours come from antd tokens.

**Returns** `Element`

```ts
// app/layout.tsx
import { AntdStyleRegistry } from "@themvora/antd/next";

<ThemeProvider>
  <AntdStyleRegistry>{children}</AntdStyleRegistry>
</ThemeProvider>
```

---

## Variables

### `ANTD_SSR_STYLE_ID`
Id of the server-emitted style element.

`"antd-cssinjs"`

---
