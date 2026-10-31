import { Component, OnDestroy, computed, inject, signal } from "@angular/core";
import { ThemeScopeDirective, injectTheme } from "@themvora/angular";
import {
  docsLinks,
  tailwindSnippet,
  cssSnippet,
  docsHome,
} from "@themvora/app-shared/content";
import {
  selection,
  modes,
  previewColors,
  scopedTheme,
} from "@themvora/app-shared/themes";
import { ui } from "@themvora/app-shared/ui";
import { ThemeSwitcherComponent } from "./theme-switcher.component";

type ColorTokens = Record<string, string | undefined>;

@Component({
  selector: "app-themvora-default",
  standalone: true,
  imports: [ThemeScopeDirective, ThemeSwitcherComponent],
  templateUrl: "./themvora-default.component.html",
})
export class ThemvoraDefaultComponent implements OnDestroy {
  readonly state = injectTheme();

  readonly ui = ui;
  readonly docsLinks = docsLinks;
  readonly selection = selection;
  readonly modes = modes;
  readonly previewColors = previewColors;
  readonly scopedTheme = scopedTheme;
  readonly tailwindSnippet = tailwindSnippet;
  readonly cssSnippet = cssSnippet;
  readonly docsHome = docsHome;

  readonly copied = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly colors = computed(
    () => (this.state().theme.tokens?.colors ?? {}) as unknown as ColorTokens,
  );

  readonly colorEntries = computed(() =>
    Object.keys(this.colors())
      .map((name) => ({ name, value: this.getColor(name) }))
      .filter((entry) => entry.value),
  );

  getColor(name: string, fallback = ""): string {
    const value = this.colors()[name];
    return typeof value === "string" ? value : fallback;
  }

  /** Angular's scope directive resolves by registered theme name. */
  scopedThemeName(): string {
    return `${scopedTheme}-${this.state().resolvedMode}`;
  }

  async copy(id: string, value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(id);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.copied.set(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
