# @themvora/unocss
UnoCSS adapter for Themvora.
## Install
```bash
npm install @themvora/core @themvora/unocss unocss
```
## Set up

The adapter writes the library's own CSS custom properties from the active
theme. Register it once, next to the provider:

```tsx
import { useUnoTheme } from "@themvora/unocss/react";
import { useThemeRuntime } from "@themvora/react";

function ThemeZone() {
  useUnoTheme(useThemeRuntime());
  return null;
}
```

Import the library's stylesheet so its components can read the variables:

```ts
import "@themvora/unocss/unocss.css";
```

## Add a small UI

A heading, a card and a button. Nothing is styled yet — the next step wires
the variables in.

```tsx
export function Page() {
  return (
    <main className="page">
      <h1>Themvora</h1>
      <section className="card">
        <h2>Themed card</h2>
        <p>Ordinary markup — no library component required.</p>
        <button className="primary">Primary action</button>
      </section>
    </main>
  );
}
```

## Style it with Themvora tokens

The adapter has already written the library's variables, so these classes read
the active theme:

```css
.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-md);
  padding: var(--theme-spacing-4);
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

## Documentation
Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
## License
MIT

<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->

## Frameworks

| Framework | Setup |
| --------- | ----- |
| UnoCSS | [View setup](#unocss) |

Each section installs only what that framework needs. The Themvora foundation and
`@themvora/unocss` are common to all of them.

## UnoCSS

**Install**

```bash
npm install @themvora/core @themvora/unocss
```

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// uno.config.ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**Use the library**

Ordinary markup using unocss's own classes — the variables are already written.

```ts
<!-- index.html — the preset exposes Themvora tokens as utilities -->
<section class="bg-card text-card-foreground border border-border rounded-lg p-4">
  <h2 class="text-lg font-semibold">Your plan</h2>
  <p class="text-muted-foreground text-sm">
    Every utility resolves to a Themvora token.
  </p>
  <button class="bg-primary text-primary-foreground rounded-lg px-4 py-2">
    Upgrade
  </button>
</section>
```

**Theme switching**

```ts
// UnoCSS is build-time, so switching needs a runtime from a framework package.
import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "plum-light",
  initialMode: "system",
});

document.querySelector("button")!.addEventListener("click", () => {
  runtime.selection.toggleTheme();
});
```

**Complete example**

```ts
// uno.config.ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});

// index.html
<main class="min-h-screen bg-background text-foreground p-8">
  <h1 class="text-2xl font-semibold">Themvora + UnoCSS</h1>
  <section class="mt-6 rounded-xl border border-border bg-card p-4">
    <h2 class="font-semibold text-card-foreground">Themed card</h2>
    <button class="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground">
      Toggle theme
    </button>
  </section>
</main>
```

<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:START -->
<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->

## Frameworks

| Framework | Setup |
| --------- | ----- |
| UnoCSS | [View setup](#unocss) |

Each section installs only what that framework needs. The Themvora foundation and
`@themvora/unocss` are common to all of them.

## UnoCSS

**Install**

```bash
npm install @themvora/core @themvora/unocss
```

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// uno.config.ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**Use the library**

Ordinary markup using unocss's own classes — the variables are already written.

```ts
<!-- index.html — the preset exposes Themvora tokens as utilities -->
<section class="bg-card text-card-foreground border border-border rounded-lg p-4">
  <h2 class="text-lg font-semibold">Your plan</h2>
  <p class="text-muted-foreground text-sm">
    Every utility resolves to a Themvora token.
  </p>
  <button class="bg-primary text-primary-foreground rounded-lg px-4 py-2">
    Upgrade
  </button>
</section>
```

**Theme switching**

```ts
// UnoCSS is build-time, so switching needs a runtime from a framework package.
import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "plum-light",
  initialMode: "system",
});

document.querySelector("button")!.addEventListener("click", () => {
  runtime.selection.toggleTheme();
});
```

**Complete example**

```ts
// uno.config.ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";

export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});

// index.html
<main class="min-h-screen bg-background text-foreground p-8">
  <h1 class="text-2xl font-semibold">Themvora + UnoCSS</h1>
  <section class="mt-6 rounded-xl border border-border bg-card p-4">
    <h2 class="font-semibold text-card-foreground">Themed card</h2>
    <button class="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground">
      Toggle theme
    </button>
  </section>
</main>
```

<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:END -->
