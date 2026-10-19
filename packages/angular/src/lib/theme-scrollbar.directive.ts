import {
  Directive,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  createOverlayScrollbar,
  type OverlayScrollbarHandle,
  resolveIconOptions,
  resolveScrollbarOptions,
  type ScrollbarGroupedOptions,
  type ScrollbarIconOptions,
  type ThemeRuntime,
  type ThemeDefinition,
} from "@themvora/core";
import { THEME_RUNTIME } from "./tokens";

/**
 * Phase 2 — ThemeScrollbarDirective: overlay only.
 *
 * Creates the custom scrollbar overlay. Does NOT hide the native
 * scrollbar — that's the bootstrap script's job (Phase 1, tv-scrollbar).
 *
 * ```html
 * <div themvoraScrollbar [themvoraScrollbarOptions]="{ thickness: 8 }"></div>
 * ```
 *
 * @see {@link ThemeScopeDirective}
 * @see {@link ThemeInspectorComponent}
 * @see {@link injectThemeRuntime}
 */
@Directive({
  selector: "[themvoraScrollbar]",
  standalone: true,
})
export class ThemeScrollbarDirective implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private runtime = inject<ThemeRuntime<ThemeDefinition>>(THEME_RUNTIME);

  /** Overlay scrollbar options passed to the engine
   *  (`[themvoraScrollbarOptions]="{ thickness: 8 }"`). */
  readonly options = input<ScrollbarGroupedOptions & { icons?: ScrollbarIconOptions<string> }>(
    {},
    { alias: "themvoraScrollbarOptions" },
  );

  private handle: OverlayScrollbarHandle | null = null;

  constructor() {
    // Rebuilds whenever the options input changes — the engine resolves its
    // options once, when the overlay is created, so a new value only takes
    // effect if the overlay is rebuilt.
    effect(() => {
      const options = this.options();
      if (!isPlatformBrowser(this.platformId)) return;
      this.handle?.destroy();
      // The public API is the groups; the icons group maps onto the engine's
      // arrow options.
      this.handle = createOverlayScrollbar(
        this.runtime.store,
        {
          ...resolveScrollbarOptions({
            behavior: options.behavior,
            appearance: options.appearance,
            scope: options.scope,
          }),
          ...resolveIconOptions(options.icons),
        },
      );
    });
  }

  ngOnDestroy(): void {
    this.handle?.destroy();
    this.handle = null;
  }
}
