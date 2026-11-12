# @themvora/angular

## Install

```bash
npm install @themvora/core @themvora/angular
```

`@themvora/angular` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

NgModule-free theming for Angular: DI providers, reactive injectables, a scoping directive and zero-flash bootstrap helpers.

## Set up

There is no provider component to wrap the app in. `provideTheme()` goes into `bootstrapApplication`'s providers, where it creates the runtime and wires Angular's persistence.

```ts title="src/main.ts"
import { AppComponent } from "./app/app.component";
import { provideTheme } from "@themvora/angular";
import { bootstrapApplication } from "@angular/platform-browser";

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ defaultTheme: "light", initialMode: "system" })],
});
```

## Run and choose a theme

`injectTheme()` returns a signal the template reads as `state()`. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```ts title="src/app/theme-switcher.component.ts"
import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "theme-switcher",
  standalone: true,
  template: `
    <main class="page">
      <h1>Themvora</h1>
      <p>Current theme: {{ state().theme.name }} ({{ state().mode }})</p>

      <button class="primary" type="button" (click)="toggle()">Toggle theme</button>

      <section class="card">
        <h2>Themed card</h2>
        <p class="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  `,
})
export class ThemeSwitcherComponent {
  // Must be public — Angular templates cannot access private members.
  state = injectTheme();

  toggle() {
    this.state().toggleTheme();
  }
}
```

Those four classes are plain CSS. The next step puts the document rule and those classes in a global stylesheet; nothing is inlined or scoped here.

## Add the global stylesheet

Put the document rule and the four classes from step 3 in `src/styles.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="src/styles.css"
/* Themvora emits its design tokens as CSS custom properties on the root
   element, so a stylesheet only has to read them. Nothing here is
   theme-specific. */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.page {
  min-height: 100vh;
  padding: 2rem;
}

.primary {
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

.card {
  background: var(--theme-color-card);
  border: 1px solid var(--theme-color-border);
  border-radius: 0.75rem;
  margin-top: 1.5rem;
  padding: 1rem;
}

.muted {
  color: var(--theme-color-mutedForeground);
}
```

Load it once from `angular.json` with `"styles": ["src/styles.css"]`, so the classes from step 3 pick up the theme.

## Add a small UI

A status card with a heading, a description, a status label and a primary button. The template uses a static `class` attribute; `[class.some-class]` is for state-dependent classes.

```html title="src/app/workspace-card.component.html"
<div class="themvora-example-card">
  <div class="themvora-example-header">
    <h3 class="themvora-example-title">Design system</h3>
    <span class="themvora-example-status">Active</span>
  </div>
  <p class="themvora-example-description">
    Tokens resolve at runtime, so this card follows whichever theme is active.
  </p>
  <p class="themvora-example-meta">Updated 2 minutes ago</p>
  <button class="themvora-example-button" type="button">View themes</button>
</div>
```

## Style it with Themvora tokens

Only the component rules live here — the document rule is in the global stylesheet from step 4, so it is not repeated below. Every colour is a required semantic token, so any theme that passes `validateTheme()` emits it; radius and shadow are optional and carry fallbacks, and no typography token is read.

```css title="src/styles.css"
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

```ts
// theme/themes.ts — one definition per mode, grouped by meta.family
import { defineTheme } from "@themvora/core";

export const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: {
      colors: { background: "#ffffff", foreground: "#0f172a", primary: "#0d9488" },
    },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: {
      colors: { background: "#042f2e", foreground: "#ccfbf1", primary: "#5eead4" },
    },
  }),
] as const;
```

```ts
// app.config.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { Component } from "@angular/core";
import { provideTheme, injectTheme } from "@themvora/angular";
import { themes } from "./theme/themes";

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ themes })],
});

// theme-switcher.ts
@Component({
  selector: "theme-switcher",
  template: `
    <button (click)="toggle()">
      {{ state().theme.name }} · {{ state().mode }}
    </button>
  `,
})
export class ThemeSwitcher {
  private state = injectTheme();
  toggle() {
    this.state().toggleTheme();
  }
}
```

## Setup

`provideTheme(options)` / `provideThemeRuntime(runtime)` app providers.

## Injectables

`injectThemeRuntime()`, `injectTheme()` (reactive `ThemeState`), `injectThemeHistory`, `injectThemeBatch`, `injectThemeSnapshot`, `injectThemeRestore`, `injectThemeTimeTravel`, `injectThemeLifecycle`, `injectThemePacks`.

## Directives

`ThemeScopeDirective` — element-scoped theming.

## SSR & Bootstrap

`createAngularPersistence()`, `createBlockingScriptContent`, `buildThemeCSSMap` — zero-flash bootstrap helpers.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
