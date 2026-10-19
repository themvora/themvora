import {
  createScopedThemeBinding,
  getThemeFamily,
  resolveScopeTransition,
  type ThemeDefinition,
  type ThemeRuntime,
  type ThemeTransitionOptions,
} from "@themvora/core";
import { ThemvoraRuntimeConsumer } from "./runtime-consumer";
import { emitInvalidAttributeDiagnostic } from "./diagnostics";

const TAG = "themvora-scope";

/**
 * Custom element `<themvora-scope>` that applies a scoped theme to its
 * subtree.
 *
 * Framework-free (vanilla JS). Applies the theme named by the `theme`
 * attribute as CSS variables on the element, overriding the provider's
 * selection for the subtree. Consumer markup stays in the light DOM, so the
 * variables inherit into it normally. Observes the `theme` and
 * `theme-transition` attributes.
 *
 * @remarks
 * **Attributes.**
 *
 * - `theme` — an exact theme name (`plum-dark`) or a family name (`plum`).
 *   Omit to disable the scope. An unavailable value falls back to the
 *   catalog's first theme and is reported (`TV_CONFIG_OPTION_INVALID`).
 * - `theme-transition` — `true`, `false`, or JSON
 *   (`'{"duration":300,"easing":"ease"}'`). Omitted → inherits the provider's
 *   transition. Malformed JSON is reported and ignored.
 *
 * **Properties.** None of its own beyond the standard `HTMLElement` surface.
 *
 * **Events.** Dispatches nothing of its own.
 *
 * **Slots.** Its children are ordinary light-DOM content and inherit the
 * scoped variables.
 *
 * **One implementation of the variables.** The element delegates entirely to
 * the canonical `createScopedThemeBinding`, which owns the variable set, the
 * `--color-*` / `--radius-*` aliases, the `data-theme` / `data-mode` / `.dark`
 * attributes, the transition animation, and the cleanup of variables that are
 * no longer part of the new theme. Nothing about the token model is
 * re-implemented here.
 *
 * **Isolation.** The variables are written inline on this element only, so a
 * nested scope overrides its ancestor and never the reverse, and siblings are
 * untouched.
 *
 * **Fallbacks.** `theme` accepts a theme name (`plum-dark`) or a family name
 * (`plum`, resolved to that family's theme for the current mode). An
 * unavailable value is reported and falls back to the catalog's first theme —
 * the same rule the framework `ThemeScope` components use and the documented
 * contract. Removing the attribute is different: the binding is destroyed, so
 * the subtree inherits the surrounding theme and no stale variables survive.
 *
 * **Re-resolution.** The element re-applies when `theme` changes, when the
 * provider's catalog changes (`themes-change`), and when a provider creates a
 * new runtime (`theme-ready`), so a scope never holds a theme that the
 * provider no longer knows about.
 *
 * Requires an ancestor `<themvora-provider>`.
 *
 * @example
 * ```html
 * <themvora-provider default-theme="light">
 *   <themvora-scope theme="plum-dark">...</themvora-scope>
 * </themvora-provider>
 * ```
 *
 * @see {@link defineCustomElements}
 * @see {@link ThemvoraProvider}
 */
export class ThemvoraScope extends ThemvoraRuntimeConsumer {
  static observedAttributes = ["theme", "theme-transition"];

  #binding: { destroy(): void } | null = null;
  #theme: string | null = null;
  #transition: boolean | ThemeTransitionOptions | undefined;
  #unsubscribeStore: (() => void) | null = null;

  /**
   * Whether `theme` names a family rather than an exact theme.
   *
   * Only a family selection has a mode to follow; an exact name pins both
   * halves of the selection.
   */
  #isFamilySelection(): boolean {
    const runtime = this.runtime;
    const theme = this.#theme;
    if (!runtime || !theme) return false;
    return !runtime.themes.some((candidate) => String(candidate.name) === theme);
  }

  /** Lifecycle hook: parses the element's own attributes. */
  override connectedCallback() {
    this.#parseAttributes();
    super.connectedCallback();
  }

  /** Lifecycle hook: re-applies the scope when an observed attribute changes. */
  attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ) {
    this.#parseAttributes();
    if (this.isConnected) this.#apply();
  }

  protected override onRuntime(runtime: ThemeRuntime<ThemeDefinition>): void {
    // A family selection follows the provider's mode (a light/dark family
    // scope), which the framework `ThemeScope` components do and an exact theme
    // name must not: the name already carries its own mode.
    this.#unsubscribeStore = runtime.store.subscribe(() => {
      if (this.#isFamilySelection()) this.#apply();
    });
    this.#apply();
  }

  protected override onDetach(): void {
    this.#unsubscribeStore?.();
    this.#unsubscribeStore = null;
    this.#destroy();
  }

  protected override onCatalogChange(
    _runtime: ThemeRuntime<ThemeDefinition>,
  ): void {
    this.#apply();
  }

  #parseAttributes(): void {
    const theme = this.getAttribute("theme");
    this.#theme = theme === null ? null : theme.trim();

    this.#transition = this.#parseTransition(
      this.getAttribute("theme-transition"),
    );
  }

  #parseTransition(
    raw: string | null,
  ): boolean | ThemeTransitionOptions | undefined {
    if (raw === null) return undefined;

    const value = raw.trim();
    if (value === "true") return true;
    if (value === "false") return false;

    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as { duration?: unknown }).duration === "number" &&
        typeof (parsed as { easing?: unknown }).easing === "string"
      ) {
        return parsed as ThemeTransitionOptions;
      }
    } catch {
      // Reported below.
    }

    emitInvalidAttributeDiagnostic(
      this.localName,
      "theme-transition",
      raw,
      'a JSON object with a numeric `duration` and a string `easing`, or "true" / "false"',
      "the attribute was ignored and the scope inherited the provider's transition",
    );
    return undefined;
  }

  /**
   * Whether `theme` names something this provider can resolve — a theme name
   * or a family name.
   */
  #isResolvable(
    runtime: ThemeRuntime<ThemeDefinition>,
    theme: string,
  ): boolean {
    return runtime.themes.some(
      (candidate) =>
        String(candidate.name) === theme || getThemeFamily(candidate) === theme,
    );
  }

  #apply(): void {
    const runtime = this.runtime;
    if (!runtime) return;

    // Destroy first: the binding restores the element's previous inline style,
    // which is what makes a removed or newly-invalid theme drop its variables
    // instead of leaving them behind.
    this.#destroy();

    const theme = this.#theme;
    if (!theme) return;

    if (!this.#isResolvable(runtime, theme)) {
      // Documented contract, shared with the framework `ThemeScope`
      // components: an unregistered name falls back to the catalog's first
      // theme. The canonical resolver below does exactly that; the diagnostic
      // is what makes the silent substitution visible. `emitDiagnostic`
      // deduplicates, so a re-apply on every catalog change logs once.
      emitInvalidAttributeDiagnostic(
        this.localName,
        "theme",
        theme,
        "a registered theme name or family name",
        "the scope fell back to the catalog's first theme",
      );
    }

    // Inherit the provider's transition unless the scope overrides it: the
    // same merge the framework `ThemeScope` components use.
    const transition = resolveScopeTransition(runtime.transition, this.#transition);

    // A family selection resolves against the provider's mode, so the mode is
    // part of the selection rather than a `prefersDark` hint: the canonical
    // resolver treats a bare family name as light (`mode ?? "light"`), and only
    // consults `prefersDark` for an explicit `system`. Passing the runtime's
    // mode here is what the framework scopes do with `withGlobalMode`. An exact
    // theme name already carries its own mode and is passed through unchanged.
    const exact = runtime.themes.some(
      (candidate) => String(candidate.name) === theme,
    );
    const selection = exact
      ? theme
      : { family: theme, mode: runtime.selection.getMode() };

    this.#binding = createScopedThemeBinding(
      runtime.themes,
      this,
      selection,
      transition !== undefined ? { transition } : {},
    );
  }

  #destroy(): void {
    this.#binding?.destroy();
    this.#binding = null;
  }

  static define(tag = TAG) {
    // SSR-safe: customElements only exists in the browser. Framework wrappers
    // (Vue, Solid, Angular, Astro, …) call define() from both server and client
    // environments, so this must be a no-op on the server.
    if (typeof customElements === "undefined") return;
    if (!customElements.get(tag)) {
      customElements.define(tag, ThemvoraScope);
    }
  }
}
