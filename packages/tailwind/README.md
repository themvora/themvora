# @themvora/tailwind

## Install

```bash
npm install @themvora/core @themvora/tailwind tailwindcss
```

`@themvora/tailwind` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Tailwind CSS v4 integration that maps every semantic token to utilities and `@theme` variables.

## Set up

`@themvora/tailwind` is build-time only. Two imports in the same file: Tailwind itself, then Themvora's mapping, which emits a utility for every semantic token.

```css title="src/index.css"
@import "tailwindcss";
@import "@themvora/tailwind";
```

## Add the global stylesheet

Put the document rule in `src/index.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="src/index.css"
/* Themvora emits its design tokens as CSS custom properties on the root
   element, so a stylesheet only has to read them. Nothing here is
   theme-specific. */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

Load it once from `your app entry` with `import "./index.css";`, so the document rule applies before any component styles.

## Add a small UI

The same card with Tailwind utilities. Every class resolves to a semantic token, so a theme switch repaints it without a re-render.

```html title="index.html"
<div class="grid max-w-sm gap-2.5 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
  <div class="flex items-center justify-between gap-2">
    <h3 class="text-[15px] font-semibold">Design system</h3>
    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-success">
      Active
    </span>
  </div>
  <p class="text-[13px] text-muted-foreground">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="text-xs text-muted-foreground">Updated 2 minutes ago</p>
  <button
    type="button"
    class="justify-self-start rounded-md bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:brightness-110"
  >
    View themes
  </button>
</div>
```

## Style it with Themvora tokens

Only the component rules live here — the document rule is in the global stylesheet from step 4, so it is not repeated below. Every colour is a required semantic token, so any theme that passes `validateTheme()` emits it; radius and shadow are optional and carry fallbacks, and no typography token is read.

```css title="src/index.css"
.themvora-example-card {
  display: grid;
  gap: 10px;
  max-width: 22rem;
  padding: 16px;
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  font-family: inherit;
  line-height: 1.5;
  box-shadow: var(--theme-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.06));
}

.themvora-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.themvora-example-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.themvora-example-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-color-success);
}

.themvora-example-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}

.themvora-example-description {
  margin: 0;
  font-size: 13px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-meta {
  margin: 0;
  font-size: 12px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-button {
  justify-self: start;
  padding: 8px 14px;
  border: 0;
  /* Presets and generated themes emit --theme-radius-lg and nothing else on
     the radius scale, so the smaller step is derived from it rather than
     assumed — the same proportion the utility-class mapping uses. */
  border-radius: calc(var(--theme-radius-lg, 12px) * 0.8);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.themvora-example-button:hover {
  filter: brightness(1.08);
}

.themvora-example-button:focus-visible {
  outline: 2px solid var(--theme-color-ring);
  outline-offset: 2px;
}
```

`.themvora-example-card` and its children read Themvora tokens, so switching the active theme repaints them — no re-render, and no per-theme CSS.
## Reference snippet

```css
@import "tailwindcss";
@import "@themvora/tailwind";

body {
  @apply bg-background text-foreground;
}

.card {
  @apply bg-card text-card-foreground border-border;
}

.btn-primary {
  @apply bg-primary text-primary-foreground;
}
```

## Integration

- `@import "@themvora/tailwind"` maps tokens to `--color-*`, `--radius-*`, `--spacing-*`, `--font-*`, `--shadow-*` `@theme` variables.
- Dark mode via `@custom-variant dark (&:where(.dark, .dark *))` — scoped to the `.dark` class Themvora maintains.
- `synchronizeDarkClass(theme)` keeps the `.dark` class in sync with the active theme.
- Ships `theme.css`, `dark.css` and `preflight.css` layers.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
