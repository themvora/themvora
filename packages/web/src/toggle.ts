import { getThemeMode, type ThemeDefinition, type ThemeRuntime } from "@themvora/core";
import { ThemvoraRuntimeConsumer } from "./runtime-consumer";

/** Sun glyph — shown while the resolved appearance is light. */
const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;

/** Moon glyph — shown while the resolved appearance is dark. */
const MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/></svg>`;

/** Monitor glyph — shown while the selection follows the operating system. */
const SYSTEM_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`;

const TAG = "themvora-toggle";

/**
 * Custom element `<themvora-toggle>` that toggles the theme mode.
 *
 * Framework-free (vanilla JS). Renders a native `<button>` carrying a built-in
 * sun, moon or monitor icon, so a working control needs no icon package, no
 * custom stylesheet and no consumer markup.
 *
 * @remarks
 * **Attributes.** None are observed: the control is driven entirely by the
 * runtime. Its state is exposed for consumer styling as `data-mode` on the
 * element (`light` / `dark` / `system`) and `aria-pressed` on the inner button
 * (`true` / `false` / `mixed`).
 *
 * **Properties.** None of its own beyond the standard `HTMLElement` surface.
 *
 * **Events.** Dispatches nothing of its own; a click calls
 * `runtime.selection.toggleTheme()`.
 *
 * **Slots.** None — the element owns the button and its icon.
 *
 * **State.** The element reflects the *selection*, and shows three states: the
 * sun while the mode is explicitly `light`, the moon while it is explicitly
 * `dark`, and a monitor while the selection is `system` — so a visitor who
 * picked "System" in `<themvora-select>` can see that the control is following
 * the operating system rather than pinned. `data-mode` reports the same value
 * (`light` / `dark` / `system`).
 *
 * Activating the toggle always pins an explicit mode through
 * `runtime.selection.toggleTheme()`, which resolves the *applied* appearance
 * first — so a `system` selection flips to the opposite of what is on screen.
 *
 * **Accessibility.** The inner button is a real `<button>`, so focus, Enter and
 * Space behave natively — the element itself is not a tab stop and carries no
 * `role`. Its accessible name is the stable `"Dark mode"`; `aria-pressed`
 * carries the state, and is `"mixed"` while the selection is `system` (neither
 * on nor off, by design). Icon, name and state therefore always agree.
 *
 * **Reactivity.** The element subscribes to both the selection (mode changes
 * from another control or the runtime API) and the store (an OS appearance
 * change while the selection is `system`). Subscriptions are released on
 * disconnection and re-established on reconnection, so re-mounting never
 * doubles them.
 *
 * Requires an ancestor `<themvora-provider>`.
 *
 * @example
 * ```html
 * <themvora-provider default-theme="light">
 *   <themvora-toggle></themvora-toggle>
 * </themvora-provider>
 * ```
 *
 * @see {@link defineCustomElements}
 * @see {@link ThemvoraProvider}
 */
export class ThemvoraToggle extends ThemvoraRuntimeConsumer {
  #button: HTMLButtonElement | null = null;
  #unsubscribeSelection: (() => void) | null = null;
  #unsubscribeStore: (() => void) | null = null;
  #renderedMode: string | null = null;

  protected override onRuntime(runtime: ThemeRuntime<ThemeDefinition>): void {
    this.#ensureButton();
    this.#render(runtime);

    // The selection reports the *requested* mode ("system" included); the store
    // reports the theme actually applied. Both can change independently, so the
    // toggle follows both.
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
   * Creates the inner button once.
   *
   * Reused across reconnections so a re-mount cannot attach a second click
   * listener. Re-created only when a consumer replaced the element's children.
   */
  #ensureButton(): void {
    if (this.#button && this.#button.parentNode === this) return;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Dark mode");
    button.addEventListener("click", this.#handleClick);
    this.replaceChildren(button);
    this.#button = button;
    // A fresh button has no icon yet: clear the memo so the next render paints
    // it even when the mode has not changed since the previous one.
    this.#renderedMode = null;
  }

  #handleClick = () => {
    // The canonical toggle: it resolves the *applied* mode first, so a
    // `system` selection flips to the opposite of what is on screen.
    this.runtime?.selection.toggleTheme();
  };

  #render(runtime: ThemeRuntime<ThemeDefinition>): void {
    const button = this.#button;
    if (!button) return;

    const theme = runtime.store.get();
    const applied = getThemeMode(theme);
    const selection = runtime.selection.getSelection();

    // Three display states: the selection is `system` (following the OS), or it
    // is pinned to a concrete mode. The icon must show *system* when the
    // visitor asked for it, even though the resolved appearance is light/dark.
    const isSystem = selection.mode === "system";
    const state: "light" | "dark" | "system" = isSystem ? "system" : applied;
    const isDark = applied === "dark";

    const label = isDark ? "Switch to light theme" : "Switch to dark theme";

    // Host attribute: the documented hook for consumer CSS. Only written when
    // it actually changes, so a store tick does not touch the DOM needlessly.
    if (this.getAttribute("data-mode") !== state) {
      this.setAttribute("data-mode", state);
    }

    // `mixed` is the tri-state value: the control is neither pressed nor
    // released while the selection follows the system.
    const pressed = isSystem ? "mixed" : String(isDark);
    if (button.getAttribute("aria-pressed") !== pressed) {
      button.setAttribute("aria-pressed", pressed);
    }
    if (button.title !== label) button.title = label;

    if (this.#renderedMode !== state) {
      button.innerHTML =
        state === "system" ? SYSTEM_ICON : state === "dark" ? MOON_ICON : SUN_ICON;
      this.#renderedMode = state;
    }
  }

  static define(tag = TAG) {
    // SSR-safe: customElements only exists in the browser. Framework wrappers
    // (Vue, Solid, Angular, Astro, …) call define() from both server and client
    // environments, so this must be a no-op on the server.
    if (typeof customElements === "undefined") return;
    if (!customElements.get(tag)) {
      customElements.define(tag, ThemvoraToggle);
    }
  }
}
