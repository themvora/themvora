# Themvora + Angular

Runnable parity app for the `@themvora/angular` integration.

- **Stack:** Angular 22 (standalone, zoneless) built with `@angular/build` + Tailwind CSS v4 via PostCSS.
- **Integration:** `@themvora/angular` — `provideTheme()` (environment provider), `injectTheme()` signal, `ThemeScopeDirective` (`[themvoraScope]`), `ThemeScrollbarDirective` (`[themvoraScrollbar]`).
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
src/
  main.ts                             # bootstrapApplication(AppComponent, appConfig)
  styles.css                          # Tailwind + @themvora/tailwind + shared base (PostCSS)
  app/app.config.ts                   # provideTheme({ themes, defaultTheme, initialMode, transition })
  app/app.component.ts                # <main themvoraScrollbar [themvoraScrollbarOptions]> + overflow box
  app/components/themvora-default.component.ts/.html
  app/components/theme-switcher.component.ts
```

There is **no provider component** in Angular: `provideTheme()` goes in the
provider array and `injectTheme()` returns a `Signal<ThemeState>` (`theme`,
`mode`, `family`, `resolvedMode`, `setMode`, `setFamily`, `toggleTheme`).

### Framework-specific behaviour

`ThemeScopeDirective` resolves a **registered theme name**, not a family, so the
scoped region follows the mode explicitly (`"cocoa-" + resolvedMode`) — the same
visual result as the other apps' family-scoped regions.

## Run

```bash
pnpm --filter @themvora/app-angular dev        # http://localhost:5194
pnpm --filter @themvora/app-angular build      # ng build (+ template type-check)
pnpm --filter @themvora/app-angular typecheck  # tsc -p tsconfig.app.json --noEmit
pnpm --filter @themvora/app-angular preview    # serves dist/browser
```
