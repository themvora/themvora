import type { ThemeDefinition, ThemeMode } from "@themvora/core";
import {
  THEME_PRESSED_ATTRIBUTE,
  THEME_PRESSED_VALUE_ATTRIBUTE,
  THEME_READOUT_ATTRIBUTE,
  THEME_SELECTION_ATTRIBUTE,
} from "./attributes";

/**
 * The DOM writes the Astro runtime performs on state change.
 *
 * @remarks
 * These are separated from {@link ThemeController} because two callers need
 * them and neither should import the other: the controller (on every state
 * change) and `installThemeBindings()` (immediately after an interaction, before
 * the controller's own subscription has been attached). One implementation
 * means a readout cannot be live on one path and stale on the other — which is
 * exactly the class of bug this contract exists to remove.
 */

/**
 * Resolves the text a readout element should display.
 *
 * @param kind - The element's `data-tv-readout` value.
 * @param theme - The resolved theme.
 * @param mode - The visitor's mode selection.
 * @param family - The visitor's family selection.
 * @returns The text, or `null` for a kind this contract does not own.
 *
 * @internal
 */
export function readoutValue<T extends ThemeDefinition>(
  kind: string | null,
  theme: T,
  mode: ThemeMode,
  family: string,
): string | null {
  if (kind === "theme") return String(theme.name);
  // The human label, which is what a page actually wants to display. Kept
  // separate from `"theme"` because that one is the machine name — the value
  // written to `<html data-theme>` — and a readout that silently changed from
  // one to the other would be a content change disguised as a fix.
  //
  // A theme with no `meta.label` returns `null` rather than falling back to its
  // name: the caller rendered a label, and substituting a machine name for it
  // is not this contract's decision to make.
  if (kind === "label") {
    const label = theme.meta?.label;
    return typeof label === "string" && label ? label : null;
  }
  if (kind === "mode") return mode;
  if (kind === "family") return family;
  return null;
}

/**
 * Writes a readout's text without replacing the text node.
 *
 * @param el - The readout element.
 * @param value - The text to display.
 *
 * @remarks
 * `textContent = value` replaces every child node. When the element is one React
 * rendered — `ThemeReadout`, or a `[data-tv-readout]` span inside an island —
 * React's fiber still points at the node that was just discarded, so a later
 * unmount calls `removeChild` on a node that is no longer a child and throws
 * `NotFoundError`. Updating `nodeValue` keeps the node identity React tracks.
 *
 * The fallback is for the cases a single text node cannot express: an empty
 * element (no child to write into) and one whose content is mixed markup.
 *
 * @internal
 */
export function writeReadoutText(el: Element, value: string): void {
  const only = el.firstChild;
  if (only && only.nodeType === 3 && !only.nextSibling) {
    if (only.nodeValue !== value) only.nodeValue = value;
    return;
  }
  el.textContent = value;
}

/**
 * Writes the live state into every `[data-tv-readout]` element under `root`.
 *
 * @param theme - The resolved theme.
 * @param mode - The visitor's mode selection.
 * @param family - The visitor's family selection.
 * @param root - The tree to patch. Defaults to the live `document`.
 *
 * @internal
 */
export function patchReadouts<T extends ThemeDefinition>(
  theme: T,
  mode: ThemeMode,
  family: string,
  root: ParentNode | null = typeof document === "undefined" ? null : document,
): void {
  if (!root) return;

  const els = root.querySelectorAll<HTMLElement>(`[${THEME_READOUT_ATTRIBUTE}]`);
  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]!;
    const value = readoutValue(
      el.getAttribute(THEME_READOUT_ATTRIBUTE),
      theme,
      mode,
      family,
    );
    if (value != null && el.textContent !== value) {
      writeReadoutText(el, value);
    }
  }
}

/**
 * Writes the live selection into every `[data-tv-select]` element under `root`.
 *
 * @param mode - The visitor's mode selection.
 * @param family - The visitor's family selection.
 * @param root - The tree to patch. Defaults to the live `document`.
 *
 * @remarks
 * Only a value the element actually offers as an `<option>` is written. A
 * `<select>` whose options do not include the live family — a control built
 * from a subset of the registry — would otherwise be assigned `""`, which
 * selects nothing and looks like the control is broken rather than
 * out of scope.
 *
 * Assigning `value` does not fire `change`, so this cannot feed back into the
 * delegated listener.
 *
 * @internal
 */
export function syncSelectionControls(
  mode: ThemeMode,
  family: string,
  root: ParentNode | null = typeof document === "undefined" ? null : document,
): void {
  if (!root) return;

  const els = root.querySelectorAll<HTMLSelectElement>(`[${THEME_SELECTION_ATTRIBUTE}]`);
  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]!;
    const kind = el.getAttribute(THEME_SELECTION_ATTRIBUTE);
    const next = kind === "family" ? family : kind === "mode" ? mode : null;
    if (next == null || el.value === next) continue;

    // `HTMLSelectElement.value` is a plain setter: assigning a value with no
    // matching option leaves the element selected at nothing, silently.
    let offers = false;
    for (let o = 0; o < el.options.length; o += 1) {
      if (el.options[o]!.value === next) {
        offers = true;
        break;
      }
    }
    if (offers) el.value = next;
  }
}

/**
 * Writes the live selection into every `[data-tv-pressed]` element under
 * `root`, as `aria-pressed`.
 *
 * @param mode - The visitor's mode selection.
 * @param family - The visitor's family selection.
 * @param root - The tree to patch. Defaults to the live `document`.
 *
 * @remarks
 * The runtime half of {@link THEME_PRESSED_ATTRIBUTE}. The pre-paint bootstrap
 * reconciles the same elements from `<head>` so the first paint is already
 * correct; this keeps them correct after a change, where the bootstrap has long
 * finished.
 *
 * A `[data-tv-pressed]` element with no `data-tv-value`, or with a kind this
 * contract does not own, is left alone rather than set to `"false"`. That
 * distinction matters: `"false"` is an assertion the element is *not* the
 * selected option, and for an element that represents nothing — a decorative
 * wrapper that happens to carry the attribute — it is a lie a screen reader
 * will read out.
 *
 * @internal
 */
export function syncPressedControls(
  mode: ThemeMode,
  family: string,
  root: ParentNode | null = typeof document === "undefined" ? null : document,
): void {
  if (!root) return;

  const els = root.querySelectorAll<HTMLElement>(`[${THEME_PRESSED_ATTRIBUTE}]`);
  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]!;
    const kind = el.getAttribute(THEME_PRESSED_ATTRIBUTE);
    const value = el.getAttribute(THEME_PRESSED_VALUE_ATTRIBUTE);
    if (value == null) continue;

    const current = kind === "family" ? family : kind === "mode" ? mode : null;
    if (current == null) continue;

    const next = String(current === value);
    if (el.getAttribute("aria-pressed") !== next) {
      el.setAttribute("aria-pressed", next);
    }
  }
}
