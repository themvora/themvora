import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  DestroyRef,
  inject,
  ElementRef,
} from "@angular/core";
import type {
  ThemeRuntime,
  ThemeDefinition,
  ThemeTransitionOptions,
} from "@themvora/core";
import { THEME_RUNTIME } from "./tokens";
import { createScopedThemeBinding } from "@themvora/core";

/**
 * Applies a named theme to a single element, overriding the environment
 * runtime for that element's subtree.
 *
 * Use the `themvoraScope` attribute with a theme name to scope the theme to
 * the host element. The optional `themvoraScopeTransition` input configures
 * the transition used when the scoped theme is applied. The binding is
 * destroyed automatically when the directive is destroyed.
 *
 * @remarks
 * The scoped theme overrides the environment theme for the element and its
 * descendants. When the named theme is not found, no binding is created and
 * the environment theme remains in effect.
 *
 * Reactive to its inputs: a changed `themvoraScope` re-resolves the bound
 * element, and a changed `themvoraScopeTransition` updates the transition —
 * both without recreating the binding.
 *
 * @see {@link THEME_SCOPED_RUNTIME}
 * @see {@link ThemeScrollbarDirective}
 * @see {@link injectThemeRuntime}
 */
@Directive({
  selector: "[themvoraScope]",
  standalone: true,
})
export class ThemeScopeDirective implements OnChanges, OnDestroy {
  private runtime = inject<ThemeRuntime<ThemeDefinition>>(THEME_RUNTIME);
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private unsubscribeThemes: (() => void) | null = null;

  /** Theme name to scope to (`[themvoraScope]="'plum-dark'"`). Empty string
   *  disables the scope. */
  @Input("themvoraScope") themeName = "";
  /** Transition override for scoped theme changes. Inherits the runtime's
   *  transition when omitted. */
  @Input("themvoraScopeTransition") transition?: ThemeTransitionOptions;

  private previousTheme: ThemeDefinition | null = null;
  private binding: ReturnType<typeof createScopedThemeBinding> | null = null;

  constructor() {
    // The catalog is not the theme: a `themes` change that preserves the active
    // selection never reaches the store, so without this the scope keeps
    // rendering a theme the runtime has already dropped. It is also what makes
    // a late registration work — `ngOnChanges` bails out when the named theme
    // is not registered *yet*, and nothing re-checked.
    this.unsubscribeThemes = this.runtime.registry.subscribe(() => {
      if (!this.themeName) return;
      if (this.binding === null) {
        this.ngOnChanges();
        return;
      }
      this.binding.refresh();
    });

    this.destroyRef.onDestroy(() => {
      this.unsubscribeThemes?.();
      this.unsubscribeThemes = null;
      this.binding?.destroy();
      this.binding = null;
    });
  }

  // Runs on every input change, including the first (before `ngOnInit`), so it
  // is the single entry point for creating and updating the binding.
  ngOnChanges(): void {
    if (!this.themeName) {
      this.binding?.destroy();
      this.binding = null;
      return;
    }

    if (this.binding === null) {
      const known = (this.runtime.themes as ThemeDefinition[]).some(
        (t) => t.name === this.themeName,
      );
      if (!known) return; // not registered yet — apply when it appears

      this.previousTheme = this.runtime.store.get();
      this.binding = createScopedThemeBinding(
        this.runtime.themes,
        this.el.nativeElement,
        this.themeName,
        this.transition ? { transition: this.transition } : {},
      );
      return;
    }

    if (this.transition !== undefined) {
      this.binding.setTransition(this.transition);
    }
    this.binding.update(this.themeName);
  }

  ngOnDestroy(): void {
    // Kept for consumers implementing the interface directly; the
    // `DestroyRef` hook above releases the catalog subscription too.
    this.binding?.destroy();
  }
}
