import { InjectionToken, type Signal } from "@angular/core";
import type { ThemeRuntime, ThemeDefinition } from "@themvora/core";

/**
 * Angular dependency-injection token that provides the active Themvora
 * runtime.
 *
 * The runtime is created by {@link provideTheme} (or supplied directly via
 * {@link provideThemeRuntime}) and is scoped to the environment injector
 * where it is provided. Inject it to access the runtime's store, selection,
 * history, lifecycle, and scheduling APIs.
 *
 * @see {@link THEME_SCOPED_RUNTIME}
 * @see {@link provideTheme}
 */
export const THEME_RUNTIME = new InjectionToken<ThemeRuntime<ThemeDefinition>>(
  "@themvora/runtime",
);

/**
 * Angular dependency-injection token that provides a runtime scoped to a
 * nested theme scope.
 *
 * When a {@link ThemeScopeDirective} is active, this token resolves to the
 * scoped runtime for that element; otherwise it is absent and consumers fall
 * back to {@link THEME_RUNTIME}. Inject it to read the runtime that
 * applies to the current element's scope.
 *
 * @see {@link THEME_RUNTIME}
 * @see {@link ThemeScopeDirective}
 */
export const THEME_SCOPED_RUNTIME = new InjectionToken<ThemeRuntime<ThemeDefinition>>(
  "@themvora/scoped-runtime",
);
