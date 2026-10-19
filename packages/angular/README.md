# @themvora/angular

## Install

```bash
npm install @themvora/core @themvora/angular
```

`@themvora/angular` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

NgModule-free theming for Angular: DI providers, reactive injectables, a scoping directive and zero-flash bootstrap helpers.

## Set up

```ts
// src/app/app.config.ts
import { provideTheme } from "@themvora/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({ defaultTheme: "plum-light", initialMode: "system" }),
  ],
};
```

There is no provider component to mount — `provideTheme()` goes in the
`providers` array.

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```ts
// src/app/theme-controls.component.ts
import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "app-theme-controls",
  standalone: true,
  template: `
    <main class="page">
      <h1>Themvora</h1>
      <button type="button" (click)="theme().toggleTheme()">Toggle theme</button>
    </main>
  `,
})
export class ThemeControlsComponent {
  // injectTheme returns a Signal, so it is read as theme().
  readonly theme = injectTheme();
}
```

## Style it with Themvora tokens

Themvora emits one CSS variable per token, so your own classes read the active
theme without any per-theme CSS:

```css
.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-md);
  padding: var(--theme-spacing-4);
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

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
