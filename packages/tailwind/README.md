# @themvora/tailwind

## Install

```bash
npm install @themvora/core @themvora/tailwind tailwindcss
```

`@themvora/tailwind` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Tailwind CSS v4 integration that maps every semantic token to utilities and `@theme` variables.

## Set up

```css
/* src/globals.css */
@import "tailwindcss";
@import "@themvora/tailwind";
```

That import is the whole integration — Tailwind maps tokens to utilities at
build time and never runs in the browser.

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```html
<!-- Plain HTML. Tailwind utilities resolve to Themvora tokens, so there is
     no framework and no component library here. -->
<main class="min-h-screen bg-background text-foreground p-8">
  <h1 class="text-2xl font-semibold">Themvora + Tailwind</h1>
  <section class="mt-6 rounded-xl border border-border bg-card p-4">
    <h2 class="font-semibold text-card-foreground">Themed card</h2>
    <button class="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground">
      Toggle theme
    </button>
  </section>
</main>
```

Switching needs a runtime, which Tailwind does not provide — install a Theme
Kit runtime for your framework and keep Tailwind's `.dark` class in step with
it using `synchronizeDarkClass`.

## Style it with Themvora tokens

Themvora emits the active theme's tokens as CSS custom properties, so the
document itself is themed and your own classes read the same variables without
any per-theme CSS. The rules use only required semantic colours — spacing,
typography and layout stay ordinary CSS:

```css
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  padding: 1rem;
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

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
