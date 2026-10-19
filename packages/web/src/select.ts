import {
  getThemeFamily,
  isThemeMode,
  type ThemeDefinition,
  type ThemeMode,
  type ThemeRuntime,
} from "@themvora/core";
import { ThemvoraRuntimeConsumer } from "./runtime-consumer";
import { emitInvalidAttributeDiagnostic } from "./diagnostics";

const TAG = "themvora-select";

/**
 * The selectable modes, in display order.
 *
 * This is the canonical `ThemeMode` union — a fixed enum, not a catalog — so
 * it is the one list this element is allowed to own. Families are always read
 * from the runtime.
 */
const MODE_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

type SelectType = "mode" | "family";

/**
 * Custom element `<themvora-select>` that renders a `<select>` for choosing
 * the theme mode or family.
 *
 * Framework-free (vanilla JS). When the `type` attribute is `mode` (default),
 * it lists `system`, `light`, and `dark`; when `family`, it lists the theme
 * families currently registered on the provider. Changing the selection
 * updates the provider's selection.
 *
 * @remarks
 * **Attributes.**
 *
 * - `type` — `"mode"` (default) or `"family"`. Anything else is reported and
 *   treated as `"mode"`.
 * - `label` — accessible name for the inner `<select>` (sets `aria-label`).
 *   Omitted → `"Theme mode"` / `"Theme family"`, chosen by `type`.
 *
 * **Properties.** None of its own; the inner `<select>` is reachable as
 * `el.querySelector("select")` for a consumer that needs it.
 *
 * **Events.** Dispatches nothing of its own. A change calls
 * `runtime.selection.setMode()` / `setFamily()`, which the rest of the page
 * observes through the runtime (`store`, `selection`, `registry`) or the
 * provider's `themes-change`.
 *
 * **Slots.** None — the element owns its content.
 *
 * **Options come from the runtime.** The family list is derived from
 * `runtime.themes` on every store tick and every `themes-change` event, so a
 * theme removed from the catalog cannot linger as a stale option and a newly
 * registered one appears without a reload. The element keeps no family list of
 * its own.
 *
 * **Accessibility.** The inner `<select>` is native — keyboard behaviour,
 * type-ahead and platform rendering are the browser's. Its accessible name is
 * the `label` attribute when supplied, otherwise `"Theme mode"` /
 * `"Theme family"`.
 *
 * **Cleanup.** Subscriptions are released on disconnection and re-established
 * on reconnection; the rendered `<select>` is reused rather than recreated, so
 * re-mounting cannot double the change listener.
 *
 * Requires an ancestor `<themvora-provider>`.
 *
 * @example
 * ```html
 * <themvora-provider default-theme="light">
 *   <themvora-select type="mode"></themvora-select>
 *   <themvora-select type="family" label="Theme family"></themvora-select>
 * </themvora-provider>
 * ```
 *
 * @see {@link defineCustomElements}
 * @see {@link ThemvoraProvider}
 */
export class ThemvoraSelect extends ThemvoraRuntimeConsumer {
  static observedAttributes = ["type", "label"];

  #select: HTMLSelectElement | null = null;
  #type: SelectType = "mode";
  #optionsSignature = "";
  #unsubscribeSelection: (() => void) | null = null;
  #unsubscribeStore: (() => void) | null = null;

  /** Lifecycle hook: parses the element's own attributes. */
  override connectedCallback() {
    this.#parseAttributes();
    super.connectedCallback();
  }

  /** Lifecycle hook: re-renders when `type` or `label` changes. */
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ) {
    if (name === "type") {
      this.#parseAttributes();
      this.#applyLabel();
      // Force a rebuild: the option source changed even if the runtime did not.
      this.#optionsSignature = "";
    } else if (name === "label") {
      this.#applyLabel();
      return;
    }

    const runtime = this.runtime;
    if (runtime && this.isConnected) this.#render(runtime);
  }

  protected override onRuntime(runtime: ThemeRuntime<ThemeDefinition>): void {
    this.#ensureSelect();
    this.#applyLabel();
    this.#render(runtime);

    this.#unsubscribeSelection = runtime.selection.subscribe(() => {
      this.#render(runtime);
    });
    this.#unsubscribeStore = runtime.store.subscribe(() => {
      this.#render(runtime);
    });
  }

  protected override onDetach(): void {
    this.#unsubscribeSelection?.();
    this.#unsubscribeSelection = null;
    this.#unsubscribeStore?.();
    this.#unsubscribeStore = null;
  }

  /**
   * A catalog change can leave the active theme untouched, so it never reaches
   * the store subscription — but it can add or remove families.
   */
  protected override onCatalogChange(
    runtime: ThemeRuntime<ThemeDefinition>,
  ): void {
    this.#render(runtime);
  }

  #parseAttributes(): void {
    const raw = this.getAttribute("type");
    if (raw === null) {
      this.#type = "mode";
      return;
    }

    const value = raw.trim().toLowerCase();
    if (value === "mode" || value === "family") {
      this.#type = value;
      return;
    }

    emitInvalidAttributeDiagnostic(
      this.localName,
      "type",
      raw,
      '"mode" or "family"',
      'the attribute was ignored and the element fell back to "mode"',
    );
    this.#type = "mode";
  }

  #ensureSelect(): void {
    if (this.#select && this.#select.parentNode === this) return;

    const select = document.createElement("select");
    select.addEventListener("change", this.#handleChange);
    this.replaceChildren(select);
    this.#select = select;
    this.#optionsSignature = "";
  }

  #applyLabel(): void {
    const select = this.#select;
    if (!select) return;

    const explicit = this.getAttribute("label")?.trim();
    const fallback = this.#type === "family" ? "Theme family" : "Theme mode";
    const label = explicit && explicit.length > 0 ? explicit : fallback;
    if (select.getAttribute("aria-label") !== label) {
      select.setAttribute("aria-label", label);
    }
  }

  #render(runtime: ThemeRuntime<ThemeDefinition>): void {
    const select = this.#select;
    if (!select) return;

    const options =
      this.#type === "mode"
        ? MODE_OPTIONS.map((option) => ({
            value: String(option.value),
            label: option.label,
          }))
        : this.#familyOptions(runtime);

    const signature = `${this.#type}\u0000${options
      .map((option) => option.value)
      .join("\u0001")}`;

    if (signature !== this.#optionsSignature) {
      // Rebuild only when the option set actually changed: rewriting the
      // children of a focused <select> closes an open dropdown.
      const fragment = document.createDocumentFragment();
      for (const option of options) {
        const el = document.createElement("option");
        el.value = option.value;
        el.textContent = option.label;
        fragment.appendChild(el);
      }
      select.replaceChildren(fragment);
      this.#optionsSignature = signature;
    }

    const current =
      this.#type === "mode"
        ? String(runtime.selection.getMode())
        : String(runtime.selection.getFamily());

    // Never leave the control showing a value the runtime is not in.
    if (select.value !== current && options.some((o) => o.value === current)) {
      select.value = current;
    }
  }

  #familyOptions(
    runtime: ThemeRuntime<ThemeDefinition>,
  ): Array<{ value: string; label: string }> {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];

    for (const theme of runtime.themes) {
      const family = getThemeFamily(theme);
      if (!family || seen.has(family)) continue;
      seen.add(family);
      options.push({ value: family, label: family });
    }

    return options;
  }

  #handleChange = () => {
    const select = this.#select;
    const runtime = this.runtime;
    if (!select || !runtime) return;

    const value = select.value;

    if (this.#type === "mode") {
      // `setMode` validates the value itself and reports an unusable one
      // (`TV_MODE_INVALID`), so the element does not duplicate that check.
      if (isThemeMode(value)) {
        runtime.selection.setMode(value);
        return;
      }
      this.#render(runtime);
      return;
    }

    // `setFamily` refuses an unregistered family by design; re-rendering
    // restores the control to the family the runtime is actually on instead of
    // leaving a value the runtime rejected on screen.
    if (this.#familyOptions(runtime).some((option) => option.value === value)) {
      runtime.selection.setFamily(value);
      return;
    }
    this.#render(runtime);
  };

  static define(tag = TAG) {
    // SSR-safe: customElements only exists in the browser. Framework wrappers
    // (Vue, Solid, Angular, Astro, …) call define() from both server and client
    // environments, so this must be a no-op on the server.
    if (typeof customElements === "undefined") return;
    if (!customElements.get(tag)) {
      customElements.define(tag, ThemvoraSelect);
    }
  }
}
