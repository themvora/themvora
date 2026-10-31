/**
 * The DOM contract shared between the Astro components, the pre-paint bootstrap
 * and the browser controller.
 *
 * @remarks
 * These live in their own module so the two browser entries (`./runtime`) and
 * the component implementations agree on one literal each, rather than on a
 * string typed out three times. A typo in any one of them is silent: the
 * attribute simply never matches, and the element keeps the server-rendered
 * value — which is the "label fluctuates on reload" symptom this contract exists
 * to remove.
 */

/**
 * Opts an element into the **bootstrap readout** contract: its text is owned by
 * Themvora.
 *
 * @remarks
 * `data-tv-readout="theme" | "mode" | "family"` — or
 * `data-tv-readout="var:--theme-color-primary"` to display a resolved CSS
 * variable. The pre-paint bootstrap patches the element from `<head>`, before
 * the body is parsed, so the text is never painted with the server's guess and
 * then corrected; `getThemeController()` keeps it in sync from then on.
 *
 * Put it on its own element — the whole `textContent` is replaced, exactly as
 * React's `<ThemeReadout />` renders a `<span>` whose only child is the value.
 *
 * @see {@link THEME_TOGGLE_ATTRIBUTE}
 */
export const THEME_READOUT_ATTRIBUTE = "data-tv-readout";

/**
 * Marks an element as a Themvora theme toggle.
 *
 * @remarks
 * `<ThemeToggle />` sets it, and the component's bundled script delegates clicks
 * from any element that carries it. Delegation rather than a per-element
 * listener is what makes the attribute the whole contract: an application can
 * render its own `<button data-tv-toggle>` and get the behaviour without
 * importing the component, and a toggle added later by client-side navigation
 * still works.
 *
 * @see {@link THEME_READOUT_ATTRIBUTE}
 */
export const THEME_TOGGLE_ATTRIBUTE = "data-tv-toggle";

/**
 * Opts a `<select>` into the **selection-control** contract:
 * `data-tv-select="family"` or `data-tv-select="mode"`.
 *
 * @remarks
 * The runtime owns two halves of the relationship, and a hand-written binding
 * owns neither:
 *
 * - **In.** A `change` event is delegated from `document`, so every element
 *   carrying the attribute is live — however many the page rendered, and
 *   including ones a client-side navigation swapped in afterwards.
 * - **Out.** The live selection is written back into the element's `value` on
 *   every change, so two controls of the same kind never disagree and a
 *   selection restored from a cookie is reflected rather than displayed as the
 *   first option.
 *
 * Both halves are what `document.getElementById("family")` cannot give you: it
 * matches one node, and — because Astro bundles a page's `<script>` as a module
 * and module scripts never re-execute across `ClientRouter` navigations — it is
 * also never re-run for a page you navigate back to. The symptom is a control
 * that does nothing until a file save triggers HMR and the script runs again.
 *
 * `installThemeBindings()` (or any Themvora component, which calls it) is what
 * installs the delegation. It registers one `document`-level listener for the
 * life of the document, so it survives navigation without re-running.
 *
 * @see {@link THEME_TOGGLE_ATTRIBUTE}
 * @see {@link THEME_READOUT_ATTRIBUTE}
 */
export const THEME_SELECTION_ATTRIBUTE = "data-tv-select";

/**
 * Marks an element as one option of a **segmented control**:
 * `data-tv-pressed="mode"` or `data-tv-pressed="family"`.
 *
 * @remarks
 * Pair it with {@link THEME_PRESSED_VALUE_ATTRIBUTE}, which names the option the
 * element represents. The element's `aria-pressed` is then owned by Themvora:
 * the pre-paint bootstrap writes it from `<head>` — before the body is parsed —
 * and the controller keeps it in step afterwards.
 *
 * ```astro
 * {modes.map((mode) => (
 *   <button type="button" data-tv-pressed="mode" data-tv-value={mode}>{mode}</button>
 * ))}
 * ```
 *
 * **Only `aria-pressed` is written**, and that is the contract rather than an
 * implementation detail. A control whose selected look is a class of its own
 * ends up with two sources of truth — the class the markup rendered and the
 * `aria-pressed` the runtime wrote — and they drift the moment one of them is
 * updated without the other. Keying the token class off the attribute
 * (`aria-pressed:bg-primary`) makes the accessible state and the visual state
 * the same fact, so neither can be right while the other is wrong.
 *
 * Without this, a server-rendered segmented control asserts whatever the
 * prerender rendered — usually "nothing selected" — on a page the bootstrap has
 * already painted in the visitor's theme, and corrects itself once the runtime
 * mounts. That is the "toggle flickers between light and dark" symptom.
 *
 * @see {@link THEME_PRESSED_VALUE_ATTRIBUTE}
 * @see {@link THEME_READOUT_ATTRIBUTE}
 */
export const THEME_PRESSED_ATTRIBUTE = "data-tv-pressed";

/**
 * The option a {@link THEME_PRESSED_ATTRIBUTE} element represents, compared
 * against the live mode selection (`"light"` / `"dark"` / `"system"`) or the
 * live family selection.
 *
 * @remarks
 * Compared against the **selection**, not the resolved mode: a `"system"`
 * button is the pressed one while the visitor's choice is `"system"`, even
 * though the painted theme is a concrete light or dark. Comparing against the
 * resolved mode would light up `light`/`dark` and leave `system` permanently
 * unpressed, which contradicts the button the visitor actually clicked.
 */
export const THEME_PRESSED_VALUE_ATTRIBUTE = "data-tv-value";
