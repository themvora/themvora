## @themvora/web
Themvora web components — framework-free theming for any app.

Provides the custom elements `ThemvoraProvider`, `ThemvoraScope`,
`ThemvoraToggle`, `ThemvoraSelect`, `ThemvoraScrollbar`, and
`ThemvoraInspector`, plus the `useTheme*` hooks, `getProviderRuntime`,
`getThemeSchedule`, and the `defineCustomElements` registration helper.

## HTML-first usage

Importing this entry is enough: it registers the built-in elements and
injects their stylesheet once, so the consumer writes semantic HTML and
nothing else.

```html
<themvora-provider themes="light dark plum-dark" default-theme="light">
  <themvora-toggle></themvora-toggle>
  <themvora-select type="family"></themvora-select>
  <themvora-scope theme="plum-dark">…</themvora-scope>
</themvora-provider>
```

```ts
import "@themvora/web";
```

Registration is idempotent and browser-only: importing the package during a
server render is a no-op, so Next.js, Remix, Nuxt, Astro and SvelteKit can
import it without a browser guard.

> Generated from `packages/web/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `defineCustomElements(): void`
Registers all Themvora custom elements with the browser and injects the
built-in component stylesheet.

Framework-free (vanilla JS). Defines `<themvora-provider>`,
`<themvora-scope>`, `<themvora-toggle>`, `<themvora-select>`,
`<themvora-scrollbar>` and `<themvora-inspector>` if not already registered,
and adds the component stylesheet once. Safe to call more than once, and a
no-op on the server.

**See also:** `ThemvoraProvider`

**Returns** `void`

Importing `@themvora/web` already calls this, so a consumer normally never
calls it. It stays public for two cases: a consumer who wants to register a
different tag name (`ThemvoraProvider.define("my-provider")`), and a consumer
who needs the registration to happen at a specific point rather than at
module evaluation.

```ts
import { defineCustomElements } from "@themvora/web";
defineCustomElements();
```

---


### `getProviderRuntime(el?): ThemeRuntime<ThemeDefinition<string>> | undefined`
Returns the Themvora runtime attached to a provider element, if any.

Framework-free (vanilla JS). Reads the runtime stored on the element by
setProviderRuntime.

**See also:** `findProviderRuntime`, `ThemvoraProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `el` | `ThemvoraProviderElement` (optional) | The provider element to read from. |

**Returns** `ThemeRuntime<ThemeDefinition<string>> | undefined` — The attached runtime, or `undefined` when none is present.

---


### `getThemeSchedule(): ThemeSchedule | null`
Reactive sunrise/sunset schedule controller. Returns `null` when the
provider was created without the `scheduled` option.

```ts
const schedule = getThemeSchedule();
schedule?.enable();
schedule?.disable();
schedule?.set({ timeZone: "Asia/Kathmandu" });
```

**Returns** `ThemeSchedule | null`

---


### `injectComponentStyles(): boolean`
Injects COMPONENT_CSS into the document once.

Idempotent: repeated calls, duplicate bundle evaluation and a consumer who
already pasted the stylesheet into their own `<style id="themvora-elements-style">`
all leave exactly one copy in the document. A no-op on the server.

**Returns** `boolean` — `true` when this call inserted the stylesheet, `false` when it was
  already present or the environment has no DOM.

---


### `injectPrePaintScrollbarCSS(): void`
Injects the pre-paint scrollbar-hiding CSS and class into the document.

Framework-free (vanilla JS). Adds a `<style>` carrying the pre-paint
scrollbar CSS and the `tv-scrollbar` class to the document root so the
native scrollbar is hidden before first paint. Idempotent and a no-op on the
server.

This is a manual bootstrap helper for a page that wants the native bar hidden
before its own script runs. It is *not* how ThemvoraScrollbar hides
the bar — that happens through `createOverlayScrollbar`, which claims the
hiding and gives it back on `destroy()`. Calling this directly therefore
hides the bar without registering a claim, so pair it with
`restoreNativeScrollbar()` if you later want the native bar back.

**See also:** `ThemvoraScrollbar`

**Returns** `void`

---


### `observeEffectiveThemeMode(listener): __type(): void`
Calls `listener` whenever the applied mode changes, and returns an
unsubscribe function.

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
The listener is **not** called once up front — read
useEffectiveThemeMode for the current value and call it again from the
listener.

```ts
const stop = observeEffectiveThemeMode(() => {
  label.textContent = useEffectiveThemeMode();
});
```

**See also:** `useEffectiveThemeMode`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `listener` | `__type(selection: ThemeEffectiveSelection): void` | Called after the applied mode changes. |

**Returns** `__type(): void` — An unsubscribe function.

---


### `resolveGeneratedTheme<T extends ThemeDefinition<string>>(themes, active?): T`
Resolve the single generated theme registered with a provider, or throw.

The throwing counterpart of findGeneratedTheme, for call sites that
need a theme rather than a status — the framework accessors, which surface the
failure to the caller.

**See also:** `- isGeneratedTheme
 - findGeneratedTheme`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `themes` | `readonly T[]` | The themes registered with the provider. |
| `active` | `T` (optional) | The currently active theme, used to disambiguate multiple generated themes. |

**Returns** `T` — The resolved generated theme.

---


### `useEffectiveThemeMode(): "light" | "dark"`
Returns the mode actually **applied** — `"light"` or `"dark"`, never
`"system"`.

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.

Use this when a control states the current appearance. useThemeMode
reports what the visitor asked for: it stays `"system"` while that choice
stands and it does not move at a sunrise/sunset transition, so a label bound
to it kept announcing the old mode while the page changed colour.

Pair it with observeEffectiveThemeMode to re-render on change.

**See also:** `useThemeMode`, `observeEffectiveThemeMode`

**Returns** `"light" | "dark"` — The applied mode.

---


### `useGeneratedTheme(): ThemeDefinition<string>`
Returns the theme produced by `generateTheme()` and registered with the
active `<themvora-provider>`.

Resolves the registered theme that carries the generator's origin marker
(`meta.generation.kind === "generated"`); shipped presets never qualify. When
both halves of one `generateTheme()` call are registered, the theme the active
selection resolves to is returned.

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.

Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
registered and the active selection does not identify one.

Reads live on every call, so a theme removed from the registry is reported
immediately rather than a stale value being returned.

**See also:** `useThemeValue`

**Returns** `ThemeDefinition<string>` — The registered generated theme.

---


### `useProvidedThemes(): readonly ProvidedThemeFamily<ThemeDefinition<string>>[]`
Returns the themes the active `<themvora-provider>` was given, grouped by
family.

Framework-free (vanilla JS). Reads live on every call, so a theme registered
after the provider initialized appears immediately — the vanilla surface has
no reactive wrapper by design, matching useThemeValue. For a push
notification, listen for the provider's `themes-change` event.

```js
const families = useProvidedThemes();
families.forEach((family) => {
  console.log(family.family, family.variants.map((v) => v.mode));
});
```

**See also:** `useThemeRuntime`, `normalizeProvidedThemes`

**Returns** `readonly ProvidedThemeFamily<ThemeDefinition<string>>[]` — The provider's theme families, in supplied order.

---


### `useThemeFamily(): string`
Returns the current theme family.

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.

**See also:** `useThemeRuntime`, `defineCustomElements`

**Returns** `string` — The current theme family.

---


### `useThemeMode(): ThemeMode`
Returns the current theme mode (`system`, `light`, or `dark`).

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.

**See also:** `useThemeRuntime`, `defineCustomElements`

**Returns** `ThemeMode` — The current mode.

---


### `useThemeRuntime(): ThemeRuntime<ThemeDefinition<string>>`
Resolves the active Themvora runtime from the first initialized
`<themvora-provider>` in the document.

Framework-free (vanilla JS). Must be called after a `<themvora-provider>`
has initialized.

**Multiple providers:** this returns the *first* provider in document order
that has a runtime. It is a page-level convenience, not a way to address a
specific provider — use `getProviderRuntime(element)` when more than one
provider exists, or when the element you hold is not the first.

**See also:** `getProviderRuntime`, `defineCustomElements`

**Returns** `ThemeRuntime<ThemeDefinition<string>>` — The provider's runtime.

```ts
const runtime = useThemeRuntime();
runtime.selection.setMode("dark");
```

---


### `useThemeTokens(): ThemeTokens | undefined`
Returns the active theme's token group from the active runtime.

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.

**See also:** `useThemeRuntime`, `defineCustomElements`

**Returns** `ThemeTokens | undefined` — The active theme's tokens.

---


### `useThemeValue(): ThemeDefinition<string>`
Returns the currently selected theme definition from the active runtime.

Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.

**See also:** `useThemeRuntime`, `defineCustomElements`

**Returns** `ThemeDefinition<string>` — The active theme definition.

---

## Classes

### `class ThemvoraInspector`

**Extends** `ThemvoraRuntimeConsumer`
Custom element `<themvora-inspector>` that inspects the active theme.

Framework-free (vanilla JS). Renders a floating toggle that opens a panel
showing the active theme's identity, selection, tokens, and resolved CSS
variables, updating live as the theme changes. Observes the `bottom`,
`right`, `size`, and `z-index` attributes.

**See also:** `defineCustomElements`, `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraInspector` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `observedAttributes` | `string[]` | — |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.** All four are positional and optional:

- `bottom` — distance from the bottom of the viewport, in px (default `104`).
- `right` — distance from the right edge, in px (default `32`).
- `size` — toggle button size, in px (default `40`).
- `z-index` — stacking order of the toggle and panel (default `9999`).

Non-numeric values are ignored in favour of the default.

**Properties.** None of its own beyond the standard `HTMLElement` surface.

**Events.** Dispatches nothing of its own.

**Slots.** None — the panel is built from the runtime's data.

Requires an ancestor `<themvora-provider>`. If the provider is not yet
initialized, it waits for the `theme-ready` event. `define()` is SSR-safe
and no-ops when `customElements` is unavailable.

```ts
<themvora-inspector bottom="24" right="24"></themvora-inspector>
```

---


### `class ThemvoraProvider`

**Extends** `CustomElementBase`
Custom element `<themvora-provider>` that owns a Themvora runtime and
applies the active theme to the document.

Framework-free (vanilla JS). Creates and destroys its runtime across its
lifecycle, applies DOM/CSS variable bindings, and dispatches a bubbling
`theme-ready` event once initialized. Observes the `themes`,
`default-theme`, `initial-mode`, `initial-family`, `scheduled`, and
`transition` attributes.

**See also:** `ThemvoraProviderProps`, `defineCustomElements`, `ThemvoraScope`, `ThemvoraToggle`, `ThemvoraSelect`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraProvider` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `observedAttributes` | `string[]` | — |
| `classList` | `void` | — |
| `part` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.** All six are observed and applied to the live runtime.

- `themes` — the catalog. Either space-separated registered identifiers
  (`"light dark plum-light"`) or a JSON array of full theme definitions
  (`'[{"name":"brand","tokens":{…}}]'`). An unknown identifier is reported
  and skipped; an empty or unusable list falls back to the neutral
  light/dark pair (`TV_THEME_NEUTRAL_FALLBACK`).
- `default-theme` — theme name used when nothing is persisted. Supplies both
  the fallback theme's family and its mode; an unknown name resolves to the
  catalog's first theme.
- `initial-mode` — `"light"`, `"dark"` or `"system"` (case-insensitive).
  Overrides the mode `default-theme` implies. An invalid value is reported
  (`TV_CONFIG_OPTION_INVALID`) and ignored.
- `initial-family` — family used when nothing is persisted. Overrides the
  family `default-theme` implies; an unregistered one is reported
  (`TV_THEME_FAMILY_UNKNOWN`) and normalised.
- `transition` — `true`, `false`, or JSON
  (`'{"enabled":true,"duration":250,"easing":"ease-in-out"}'`). Changing it
  reconfigures the live bindings; removing it returns to no transition.
- `scheduled` — JSON sunrise/sunset options
  (`'{"latitude":27.7,"longitude":85.3}'`). Removing it tears the schedule
  down.

**Properties.** None of its own beyond the standard `HTMLElement` surface.
The runtime is reached with getProviderRuntime (or
useThemeRuntime for the first provider on the page).

**Events.** `theme-ready` (bubbles, composed) once the runtime exists and the
first theme is applied; `themes-change` (bubbles, composed) on a microtask
after the catalog changes, with `detail.themes` holding the new names.

**Slots.** Its children are ordinary light-DOM content — the consumer's
markup and the other `<themvora-*>` elements. The element renders no wrapper
and styles nothing of its own.

When an observed attribute changes after initialization, the change is
applied to the live runtime through the shared `configure()` contract — the
runtime is never destroyed and recreated, so history, persistence and the
current selection survive, and the transition/schedule subsystems are
reconciled in place.

**Removing an attribute never resets the runtime.** A removed `themes`,
`default-theme`, `initial-mode` or `initial-family` stops contributing to
the configuration; the live catalog and selection stay as they are, and the
removal takes effect on the next mount (where `resolveRuntimeOptions` runs
again). `transition` and `scheduled` are the exception: removing them turns
the subsystem off, because "off" is expressible for them.

The element never writes its own observed attributes, so an attribute
change always originates from the consumer and cannot feed back into
itself. The `configuring` guard additionally covers a consumer that
reflects state into the attribute during `themes-change`.

```ts
<themvora-provider themes="light dark plum-dark" default-theme="light">
  ...
</themvora-provider>
```

---


### `class ThemvoraRuntimeConsumer`

**Extends** `CustomElementBase`
Base class for a Themvora element that reads and follows the nearest
`<themvora-provider>`'s runtime.

## The lifecycle problem it solves

A descendant element can connect before, after, or instead of its provider
initializing, and a provider that is removed and re-added creates a *new*
runtime. Handling that by hand produced three defects that this base class
removes:

1. **A one-shot listener that never fires.** The provider dispatches
   `theme-ready` on itself with `bubbles: true`, which travels *up* the tree
   and can never reach a descendant. Listening on the element itself only
   worked when the provider happened to initialize first.
2. **Duplicate subscriptions.** Every reconnection ran `init()` again and
   added another store listener, so a re-mounted element updated twice,
   three times, and so on.
3. **Stale runtimes.** After a provider was recreated, an element kept
   listening to the destroyed runtime and silently stopped updating.

Subclasses implement ThemvoraRuntimeConsumer.onRuntime to subscribe
and ThemvoraRuntimeConsumer.onDetach to release what they took.
Reconnection re-runs the pair, so a subscription can never outlive its
connection or be created twice.

The catalog subscription is taken by this class, not by each subclass: every
consumer that resolves themes itself (a scope, a family selector) must see a
catalog change, and the runtime's registry notification is the one signal
that reports it in the same task.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraRuntimeConsumer` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` (abstract) | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |

Subclasses that override `connectedCallback` / `disconnectedCallback` must
call `super`.

---


### `class ThemvoraScope`

**Extends** `ThemvoraRuntimeConsumer`
Custom element `<themvora-scope>` that applies a scoped theme to its
subtree.

Framework-free (vanilla JS). Applies the theme named by the `theme`
attribute as CSS variables on the element, overriding the provider's
selection for the subtree. Consumer markup stays in the light DOM, so the
variables inherit into it normally. Observes the `theme` and
`theme-transition` attributes.

**See also:** `defineCustomElements`, `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraScope` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `observedAttributes` | `string[]` | — |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.**

- `theme` — an exact theme name (`plum-dark`) or a family name (`plum`).
  Omit to disable the scope. An unavailable value falls back to the
  catalog's first theme and is reported (`TV_CONFIG_OPTION_INVALID`).
- `theme-transition` — `true`, `false`, or JSON
  (`'{"duration":300,"easing":"ease"}'`). Omitted → inherits the provider's
  transition. Malformed JSON is reported and ignored.

**Properties.** None of its own beyond the standard `HTMLElement` surface.

**Events.** Dispatches nothing of its own.

**Slots.** Its children are ordinary light-DOM content and inherit the
scoped variables.

**One implementation of the variables.** The element delegates entirely to
the canonical `createScopedThemeBinding`, which owns the variable set, the
`--color-*` / `--radius-*` aliases, the `data-theme` / `data-mode` / `.dark`
attributes, the transition animation, and the cleanup of variables that are
no longer part of the new theme. Nothing about the token model is
re-implemented here.

**Isolation.** The variables are written inline on this element only, so a
nested scope overrides its ancestor and never the reverse, and siblings are
untouched.

**Fallbacks.** `theme` accepts a theme name (`plum-dark`) or a family name
(`plum`, resolved to that family's theme for the current mode). An
unavailable value is reported and falls back to the catalog's first theme —
the same rule the framework `ThemeScope` components use and the documented
contract. Removing the attribute is different: the binding is destroyed, so
the subtree inherits the surrounding theme and no stale variables survive.

**Re-resolution.** The element re-applies when `theme` changes, when the
provider's catalog changes (`themes-change`), and when a provider creates a
new runtime (`theme-ready`), so a scope never holds a theme that the
provider no longer knows about.

Requires an ancestor `<themvora-provider>`.

```ts
<themvora-provider default-theme="light">
  <themvora-scope theme="plum-dark">...</themvora-scope>
</themvora-provider>
```

---


### `class ThemvoraScrollbar`

**Extends** `ThemvoraRuntimeConsumer`
Phase 2 — ThemvoraScrollbar (Web Component): overlay only.

Creates the custom scrollbar overlay.

Lifecycle:
  connectedCallback  → resolve the runtime
                       ↓
  onRuntime          → hide native bar (Phase 1) → create overlay → attach
                       ↓ (Phase 2)
  later              → add tv-scrollbar-ready
                       ↓ (Phase 3)
  onDetach / destroy → remove overlay → restore native bar

Phase 1 happens synchronously inside the overlay's construction. For static
HTML served via the Vite plugin (scrollbar: true), the pre-paint script in
<head> runs before first paint; for an SSR'd provider the class and CSS are
in the markup. This component's own hiding is the fallback for
dynamically-inserted elements (which may have already painted).

The teardown is a real teardown. The hiding is claimed, not switched on, so
removing the element gives the native scrollbar back instead of leaving the
page with no scrollbar at all — and an attribute change swaps the overlay
without ever passing through the "hidden, but nothing drawn" state.

**See also:** `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraScrollbar` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `observedAttributes` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.** Every option is an attribute; changing one rebuilds the
overlay. Booleans are presence-based: present (any value except `false` or
`0`) enables, absent or `false` disables. Numbers are unitless pixels.

- Behaviour — `auto-hide`, `auto-hide-delay`, `hover-expand`, `draggable`,
  `click-to-jump`, `smooth`, `overscroll`, `touch`.
- Arrows — `arrows`, `arrow-icon`, `arrow-up-icon`, `arrow-down-icon`,
  `arrow-left-icon`, `arrow-right-icon` (SVG markup or URL).
- Geometry — `thickness`, `hover-thickness`, `radius`, `min-thumb-size`,
  `icon-size`, `offset` (uniform inset), `offset-top`, `offset-right`,
  `offset-bottom`, `offset-left` (per-side insets win over `offset`).
- Motion and paint — `track-opacity`, `thumb-opacity`, `duration`,
  `animation-duration`, `thumb-color`, `track-color`, `active-thumb-color`,
  `thumb-hover-color`. Colors default to the active theme's tokens.
- Placement — `z-index`, `dir` (`ltr` / `rtl` / `auto`), `axes`
  (comma-separated `vertical` / `horizontal`), `include` / `exclude`
  (comma-separated CSS selectors for the containers to track).

**Properties.** None of its own beyond the standard `HTMLElement` surface.

**Events.** Dispatches nothing of its own; it adds `tv-scrollbar-ready` to
the element once the overlay is measured and attached.

**Slots.** None — the element renders nothing into the document flow; the
overlay it creates lives outside it.

---


### `class ThemvoraSelect`

**Extends** `ThemvoraRuntimeConsumer`
Custom element `<themvora-select>` that renders a `<select>` for choosing
the theme mode or family.

Framework-free (vanilla JS). When the `type` attribute is `mode` (default),
it lists `system`, `light`, and `dark`; when `family`, it lists the theme
families currently registered on the provider. Changing the selection
updates the provider's selection.

**See also:** `defineCustomElements`, `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraSelect` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `observedAttributes` | `string[]` | — |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `attributeChangedCallback` | `void` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.**

- `type` — `"mode"` (default) or `"family"`. Anything else is reported and
  treated as `"mode"`.
- `label` — accessible name for the inner `<select>` (sets `aria-label`).
  Omitted → `"Theme mode"` / `"Theme family"`, chosen by `type`.

**Properties.** None of its own; the inner `<select>` is reachable as
`el.querySelector("select")` for a consumer that needs it.

**Events.** Dispatches nothing of its own. A change calls
`runtime.selection.setMode()` / `setFamily()`, which the rest of the page
observes through the runtime (`store`, `selection`, `registry`) or the
provider's `themes-change`.

**Slots.** None — the element owns its content.

**Options come from the runtime.** The family list is derived from
`runtime.themes` on every store tick and every `themes-change` event, so a
theme removed from the catalog cannot linger as a stale option and a newly
registered one appears without a reload. The element keeps no family list of
its own.

**Accessibility.** The inner `<select>` is native — keyboard behaviour,
type-ahead and platform rendering are the browser's. Its accessible name is
the `label` attribute when supplied, otherwise `"Theme mode"` /
`"Theme family"`.

**Cleanup.** Subscriptions are released on disconnection and re-established
on reconnection; the rendered `<select>` is reused rather than recreated, so
re-mounting cannot double the change listener.

Requires an ancestor `<themvora-provider>`.

```ts
<themvora-provider default-theme="light">
  <themvora-select type="mode"></themvora-select>
  <themvora-select type="family" label="Theme family"></themvora-select>
</themvora-provider>
```

---


### `class ThemvoraToggle`

**Extends** `ThemvoraRuntimeConsumer`
Custom element `<themvora-toggle>` that toggles the theme mode.

Framework-free (vanilla JS). Renders a native `<button>` carrying a built-in
sun, moon or monitor icon, so a working control needs no icon package, no
custom stylesheet and no consumer markup.

**See also:** `defineCustomElements`, `ThemvoraProvider`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `ThemvoraToggle` | — |
| `accessKey` | `string` | The **`HTMLElement.accessKey`** property sets the keystroke which a user can press to jump to a given element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKey) |
| readonly `accessKeyLabel` | `string` | The **`HTMLElement.accessKeyLabel`** read-only property returns a string containing the element's browser-assigned access key (if any); otherwise it returns an empty string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/accessKeyLabel) |
| `ariaActiveDescendantElement` | `Element \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaActiveDescendantElement) |
| `ariaAtomic` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAtomic) |
| `ariaAutoComplete` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaAutoComplete) |
| `ariaBrailleLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleLabel) |
| `ariaBrailleRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBrailleRoleDescription) |
| `ariaBusy` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaBusy) |
| `ariaChecked` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaChecked) |
| `ariaColCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColCount) |
| `ariaColIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndex) |
| `ariaColIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColIndexText) |
| `ariaColSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaColSpan) |
| `ariaControlsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaControlsElements) |
| `ariaCurrent` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaCurrent) |
| `ariaDescribedByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescribedByElements) |
| `ariaDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDescription) |
| `ariaDetailsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDetailsElements) |
| `ariaDisabled` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaDisabled) |
| `ariaErrorMessageElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaErrorMessageElements) |
| `ariaExpanded` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaExpanded) |
| `ariaFlowToElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaFlowToElements) |
| `ariaHasPopup` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHasPopup) |
| `ariaHidden` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaHidden) |
| `ariaInvalid` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaInvalid) |
| `ariaKeyShortcuts` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaKeyShortcuts) |
| `ariaLabel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabel) |
| `ariaLabelledByElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLabelledByElements) |
| `ariaLevel` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLevel) |
| `ariaLive` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaLive) |
| `ariaModal` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaModal) |
| `ariaMultiLine` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiLine) |
| `ariaMultiSelectable` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaMultiSelectable) |
| `ariaOrientation` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOrientation) |
| `ariaOwnsElements` | `readonly Element[] \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaOwnsElements) |
| `ariaPlaceholder` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPlaceholder) |
| `ariaPosInSet` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPosInSet) |
| `ariaPressed` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaPressed) |
| `ariaReadOnly` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaReadOnly) |
| `ariaRelevant` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRelevant) |
| `ariaRequired` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRequired) |
| `ariaRoleDescription` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRoleDescription) |
| `ariaRowCount` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowCount) |
| `ariaRowIndex` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndex) |
| `ariaRowIndexText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowIndexText) |
| `ariaRowSpan` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaRowSpan) |
| `ariaSelected` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSelected) |
| `ariaSetSize` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSetSize) |
| `ariaSort` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaSort) |
| `ariaValueMax` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMax) |
| `ariaValueMin` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueMin) |
| `ariaValueNow` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueNow) |
| `ariaValueText` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/ariaValueText) |
| readonly `assignedSlot` | `HTMLSlotElement \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/assignedSlot) |
| readonly `ATTRIBUTE_NODE` | `2` | — |
| readonly `attributes` | `NamedNodeMap` | The **`Element.attributes`** property returns a live collection of all attribute nodes registered to the specified node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/attributes) |
| readonly `attributeStyleMap` | `StylePropertyMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/attributeStyleMap) |
| `autocapitalize` | `string` | The **`autocapitalize`** property of the HTMLElement interface represents the element's capitalization behavior for user input. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocapitalize) |
| `autocorrect` | `boolean` | The **`autocorrect`** property of the HTMLElement interface controls whether or not autocorrection of editable text is enabled for spelling and/or punctuation errors. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autocorrect) |
| `autofocus` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/autofocus) |
| readonly `baseURI` | `string` | The read-only **`baseURI`** property of the Node interface returns the absolute base URL of the document containing the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/baseURI) |
| readonly `CDATA_SECTION_NODE` | `4` | node is a CDATASection node. |
| readonly `childElementCount` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/childElementCount) |
| readonly `childNodes` | `NodeListOf<ChildNode>` | The read-only **`childNodes`** property of the Node interface returns a live the first child node is assigned index `0`. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/childNodes) |
| readonly `children` | `HTMLCollection` | Returns the child elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/children) |
| `className` | `string` | The **`className`** property of the of the specified element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/className) |
| readonly `clientHeight` | `number` | The **`clientHeight`** read-only property of the Element interface is zero for elements with no CSS or inline layout boxes; otherwise, it's the inner height of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientHeight) |
| readonly `clientLeft` | `number` | The **`clientLeft`** read-only property of the Element interface returns the width of the left border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientLeft) |
| readonly `clientTop` | `number` | The **`clientTop`** read-only property of the Element interface returns the width of the top border of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientTop) |
| readonly `clientWidth` | `number` | The **`clientWidth`** read-only property of the Element interface is zero for inline elements and elements with no CSS; otherwise, it's the inner width of an element in pixels. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/clientWidth) |
| readonly `COMMENT_NODE` | `8` | node is a Comment node. |
| `contentEditable` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/contentEditable) |
| readonly `currentCSSZoom` | `number` | The **`currentCSSZoom`** read-only property of the Element interface provides the 'effective' CSS `zoom` of an element, taking into account the zoom applied to the element and all its parent elements. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/currentCSSZoom) |
| readonly `dataset` | `DOMStringMap` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset) |
| `dir` | `string` | The **`HTMLElement.dir`** property indicates the text writing directionality of the content of the current element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dir) |
| readonly `DOCUMENT_FRAGMENT_NODE` | `11` | node is a DocumentFragment node. |
| readonly `DOCUMENT_NODE` | `9` | node is a document. |
| readonly `DOCUMENT_POSITION_CONTAINED_BY` | `16` | Set when other is a descendant of node. |
| readonly `DOCUMENT_POSITION_CONTAINS` | `8` | Set when other is an ancestor of node. |
| readonly `DOCUMENT_POSITION_DISCONNECTED` | `1` | Set when node and other are not in the same tree. |
| readonly `DOCUMENT_POSITION_FOLLOWING` | `4` | Set when other is following node. |
| readonly `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC` | `32` | — |
| readonly `DOCUMENT_POSITION_PRECEDING` | `2` | Set when other is preceding node. |
| readonly `DOCUMENT_TYPE_NODE` | `10` | node is a doctype. |
| `draggable` | `boolean` | The **`draggable`** property of the HTMLElement interface gets and sets a Boolean primitive indicating if the element is draggable. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/draggable) |
| readonly `ELEMENT_NODE` | `1` | node is an element. |
| `enterKeyHint` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/enterKeyHint) |
| readonly `ENTITY_NODE` | `6` | — |
| readonly `ENTITY_REFERENCE_NODE` | `5` | — |
| readonly `firstChild` | `ChildNode \| null` | The read-only **`firstChild`** property of the Node interface returns the node's first child in the tree, or `null` if the node has no children. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/firstChild) |
| readonly `firstElementChild` | `Element \| null` | Returns the first child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/firstElementChild) |
| `hidden` | `boolean` | The HTMLElement property **`hidden`** reflects the value of the element's `hidden` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/hidden) |
| `id` | `string` | The **`id`** property of the Element interface represents the element's identifier, reflecting the **`id`** global attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/id) |
| `inert` | `boolean` | The HTMLElement property **`inert`** reflects the value of the element's `inert` attribute. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) |
| `innerHTML` | `string` | The **`innerHTML`** property of the Element interface gets or sets the HTML or XML markup contained within the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/innerHTML) |
| `innerText` | `string` | The **`innerText`** property of the HTMLElement interface represents the rendered text content of a node and its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/innerText) |
| `inputMode` | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/inputMode) |
| readonly `isConnected` | `boolean` | The read-only **`isConnected`** property of the Node interface returns a boolean indicating whether the node is connected (directly or indirectly) to a Document object. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/isConnected) |
| readonly `isContentEditable` | `boolean` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/isContentEditable) |
| `lang` | `string` | The **`lang`** property of the HTMLElement interface indicates the base language of an element's attribute values and text content, in the form of a MISSING: RFC(5646, 'BCP 47 language identifier tag')]. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/lang) |
| readonly `lastChild` | `ChildNode \| null` | The read-only **`lastChild`** property of the Node interface returns the last child of the node, or `null` if there are no child nodes. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/lastChild) |
| readonly `lastElementChild` | `Element \| null` | Returns the last child that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/lastElementChild) |
| readonly `localName` | `string` | The **`Element.localName`** read-only property returns the local part of the qualified name of an element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/localName) |
| readonly `namespaceURI` | `string \| null` | The **`Element.namespaceURI`** read-only property returns the namespace URI of the element, or `null` if the element is not in a namespace. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/namespaceURI) |
| readonly `nextElementSibling` | `Element \| null` | Returns the first following sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/nextElementSibling) |
| readonly `nextSibling` | `ChildNode \| null` | The read-only **`nextSibling`** property of the Node interface returns the node immediately following the specified one in their parent's Node.childNodes, or returns `null` if the specified node is the last child in the parent element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nextSibling) |
| readonly `nodeName` | `string` | The read-only **`nodeName`** property of Node returns the name of the current node as a string. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeName) |
| readonly `nodeType` | `number` | The read-only **`nodeType`** property of a Node interface is an integer that identifies what the node is. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeType) |
| `nodeValue` | `string \| null` | The **`nodeValue`** property of the Node interface returns or sets the value of the current node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/nodeValue) |
| `nonce` (optional) | `string` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/nonce) |
| readonly `NOTATION_NODE` | `12` | — |
| readonly `offsetHeight` | `number` | The **`offsetHeight`** read-only property of the HTMLElement interface returns the height of an element, including vertical padding and borders, as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetHeight) |
| readonly `offsetLeft` | `number` | The **`offsetLeft`** read-only property of the HTMLElement interface returns the number of pixels that the _upper left corner_ of the current element is offset to the left within the HTMLElement.offsetParent node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetLeft) |
| readonly `offsetParent` | `Element \| null` | The **`HTMLElement.offsetParent`** read-only property returns a reference to the element which is the closest (nearest in the containment hierarchy) positioned ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetParent) |
| readonly `offsetTop` | `number` | The **`offsetTop`** read-only property of the HTMLElement interface returns the distance from the outer border of the current element (including its margin) to the top padding edge of the HTMLelement.offsetParent, the _closest positioned_ ancestor element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetTop) |
| readonly `offsetWidth` | `number` | The **`offsetWidth`** read-only property of the HTMLElement interface returns the layout width of an element as an integer. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/offsetWidth) |
| `onabort` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/abort_event) |
| `onanimationcancel` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationcancel_event) |
| `onanimationend` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationend_event) |
| `onanimationiteration` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationiteration_event) |
| `onanimationstart` | `__type(this: GlobalEventHandlers, ev: AnimationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/animationstart_event) |
| `onauxclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/auxclick_event) |
| `onbeforeinput` | `__type(this: GlobalEventHandlers, ev: InputEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforeinput_event) |
| `onbeforematch` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/beforematch_event) |
| `onbeforetoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/beforetoggle_event) |
| `onblur` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/blur_event) |
| `oncancel` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/cancel_event) |
| `oncanplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplay_event) |
| `oncanplaythrough` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/canplaythrough_event) |
| `onchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/change_event) |
| `onclick` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/click_event) |
| `onclose` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) |
| `oncontextlost` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) |
| `oncontextmenu` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) |
| `oncontextrestored` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) |
| `oncopy` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) |
| `oncuechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLTrackElement/cuechange_event) |
| `oncut` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/cut_event) |
| `ondblclick` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/dblclick_event) |
| `ondrag` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drag_event) |
| `ondragend` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) |
| `ondragenter` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) |
| `ondragleave` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) |
| `ondragover` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) |
| `ondragstart` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) |
| `ondrop` | `__type(this: GlobalEventHandlers, ev: DragEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) |
| `ondurationchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) |
| `onemptied` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) |
| `onended` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ended_event) |
| `onerror` | `OnErrorEventHandler` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/error_event) |
| `onfocus` | `__type(this: GlobalEventHandlers, ev: FocusEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/focus_event) |
| `onformdata` | `__type(this: GlobalEventHandlers, ev: FormDataEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/formdata_event) |
| `onfullscreenchange` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenchange_event) |
| `onfullscreenerror` | `__type(this: Element, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) |
| `ongotpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/gotpointercapture_event) |
| `oninput` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/input_event) |
| `oninvalid` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) |
| `onkeydown` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) |
| `onkeypress` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | — |
| `onkeyup` | `__type(this: GlobalEventHandlers, ev: KeyboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) |
| `onload` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) |
| `onloadeddata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) |
| `onloadedmetadata` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadedmetadata_event) |
| `onloadstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadstart_event) |
| `onlostpointercapture` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/lostpointercapture_event) |
| `onmousedown` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousedown_event) |
| `onmouseenter` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseenter_event) |
| `onmouseleave` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseleave_event) |
| `onmousemove` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mousemove_event) |
| `onmouseout` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseout_event) |
| `onmouseover` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseover_event) |
| `onmouseup` | `__type(this: GlobalEventHandlers, ev: MouseEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/mouseup_event) |
| `onpaste` | `__type(this: GlobalEventHandlers, ev: ClipboardEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) |
| `onpause` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/pause_event) |
| `onplay` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play_event) |
| `onplaying` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/playing_event) |
| `onpointercancel` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointercancel_event) |
| `onpointerdown` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerdown_event) |
| `onpointerenter` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerenter_event) |
| `onpointerleave` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerleave_event) |
| `onpointermove` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) |
| `onpointerout` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) |
| `onpointerover` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) |
| `onpointerrawupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | Available only in secure contexts. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event) |
| `onpointerup` | `__type(this: GlobalEventHandlers, ev: PointerEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) |
| `onprogress` | `__type(this: GlobalEventHandlers, ev: ProgressEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/progress_event) |
| `onratechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) |
| `onreset` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) |
| `onresize` | `__type(this: GlobalEventHandlers, ev: UIEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) |
| `onscroll` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) |
| `onscrollend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) |
| `onsecuritypolicyviolation` | `__type(this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) |
| `onseeked` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) |
| `onseeking` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) |
| `onselect` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) |
| `onselectionchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) |
| `onselectstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/selectstart_event) |
| `onslotchange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLSlotElement/slotchange_event) |
| `onstalled` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/stalled_event) |
| `onsubmit` | `__type(this: GlobalEventHandlers, ev: SubmitEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event) |
| `onsuspend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/suspend_event) |
| `ontimeupdate` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/timeupdate_event) |
| `ontoggle` | `__type(this: GlobalEventHandlers, ev: ToggleEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/toggle_event) |
| `ontouchcancel` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchcancel_event) |
| `ontouchend` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchend_event) |
| `ontouchmove` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchmove_event) |
| `ontouchstart` (optional) | `__type(this: GlobalEventHandlers, ev: TouchEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/touchstart_event) |
| `ontransitioncancel` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitioncancel_event) |
| `ontransitionend` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionend_event) |
| `ontransitionrun` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionrun_event) |
| `ontransitionstart` | `__type(this: GlobalEventHandlers, ev: TransitionEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/transitionstart_event) |
| `onvolumechange` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/volumechange_event) |
| `onwaiting` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/waiting_event) |
| `onwebkitanimationend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationiteration` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkitanimationstart` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwebkittransitionend` | `__type(this: GlobalEventHandlers, ev: Event): any \| null` | — |
| `onwheel` | `__type(this: GlobalEventHandlers, ev: WheelEvent): any \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/wheel_event) |
| `outerHTML` | `string` | The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML) |
| `outerText` | `string` | The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText) |
| readonly `ownerDocument` | `Document` | The read-only **`ownerDocument`** property of the Node interface returns the top-level document object of the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/ownerDocument) |
| readonly `parentElement` | `HTMLElement \| null` | The read-only **`parentElement`** property of Node interface returns the DOM node's parent Element, or `null` if the node either has no parent, or its parent isn't a DOM Element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentElement) |
| readonly `parentNode` | `ParentNode \| null` | The read-only **`parentNode`** property of the Node interface returns the parent of the specified node in the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/parentNode) |
| `popover` | `string \| null` | The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover) |
| readonly `prefix` | `string \| null` | The **`Element.prefix`** read-only property returns the namespace prefix of the specified element, or `null` if no prefix is specified. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/prefix) |
| readonly `previousElementSibling` | `Element \| null` | Returns the first preceding sibling that is an element, and null otherwise. [MDN Reference](https://developer.mozilla.org/docs/Web/API/CharacterData/previousElementSibling) |
| readonly `previousSibling` | `ChildNode \| null` | The read-only **`previousSibling`** property of the Node interface returns the node immediately preceding the specified one in its parent's or `null` if the specified node is the first in that list. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/previousSibling) |
| readonly `PROCESSING_INSTRUCTION_NODE` | `7` | node is a ProcessingInstruction node. |
| `role` | `string \| null` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/role) |
| readonly `scrollHeight` | `number` | The **`scrollHeight`** read-only property of the Element interface is a measurement of the height of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollHeight) |
| `scrollLeft` | `number` | The **`scrollLeft`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its left edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollLeft) |
| `scrollTop` | `number` | The **`scrollTop`** property of the Element interface gets or sets the number of pixels by which an element's content is scrolled from its top edge. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollTop) |
| readonly `scrollWidth` | `number` | The **`scrollWidth`** read-only property of the Element interface is a measurement of the width of an element's content, including content not visible on the screen due to overflow. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/scrollWidth) |
| readonly `shadowRoot` | `ShadowRoot \| null` | The `Element.shadowRoot` read-only property represents the shadow root hosted by the element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/shadowRoot) |
| `slot` | `string` | The **`slot`** property of the Element interface returns the name of the shadow DOM slot the element is inserted in. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/slot) |
| `spellcheck` | `boolean` | The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-checking hint. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/spellcheck) |
| `tabIndex` | `number` | [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/tabIndex) |
| readonly `tagName` | `string` | The **`tagName`** read-only property of the Element interface returns the tag name of the element on which it's called. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/tagName) |
| readonly `TEXT_NODE` | `3` | node is a Text node. |
| `title` | `string` | The **`HTMLElement.title`** property represents the title of the element: the text usually displayed in a 'tooltip' popup when the mouse is over the node. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/title) |
| `translate` | `boolean` | The **`translate`** property of the HTMLElement interface indicates whether an element's attribute values and the values of its Text node children are to be translated when the page is localized, or whether to leave them unchanged. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/translate) |
| `writingSuggestions` | `string` | The **`writingSuggestions`** property of the HTMLElement interface is a string indicating if browser-provided writing suggestions should be enabled under the scope of the element or not. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/writingSuggestions) |
| `classList` | `void` | — |
| `part` | `void` | — |
| `runtime` | `void` | — |
| `style` | `void` | — |
| `textContent` | `void` | — |
| `addEventListener` | `void` | — |
| `after` | `void` | — |
| `animate` | `Animation` | — |
| `append` | `void` | — |
| `appendChild` | `T` | — |
| `attachInternals` | `ElementInternals` | — |
| `attachShadow` | `ShadowRoot` | — |
| `before` | `void` | — |
| `blur` | `void` | — |
| `checkVisibility` | `boolean` | — |
| `click` | `void` | — |
| `cloneNode` | `Node` | — |
| `closest` | `HTMLElementTagNameMap[K] \| null` | — |
| `compareDocumentPosition` | `number` | — |
| `computedStyleMap` | `StylePropertyMapReadOnly` | — |
| `connectedCallback` | `void` | — |
| `contains` | `boolean` | — |
| `disconnectedCallback` | `void` | — |
| `dispatchEvent` | `boolean` | — |
| `focus` | `void` | — |
| `getAnimations` | `Animation[]` | — |
| `getAttribute` | `string \| null` | — |
| `getAttributeNames` | `string[]` | — |
| `getAttributeNode` | `Attr \| null` | — |
| `getAttributeNodeNS` | `Attr \| null` | — |
| `getAttributeNS` | `string \| null` | — |
| `getBoundingClientRect` | `DOMRect` | — |
| `getClientRects` | `DOMRectList` | — |
| `getElementsByClassName` | `HTMLCollectionOf<Element>` | — |
| `getElementsByTagName` | `HTMLCollectionOf<HTMLElementTagNameMap[K]>` | — |
| `getElementsByTagNameNS` | `HTMLCollectionOf<HTMLElement>` | — |
| `getHTML` | `string` | — |
| `getRootNode` | `Node` | — |
| `hasAttribute` | `boolean` | — |
| `hasAttributeNS` | `boolean` | — |
| `hasAttributes` | `boolean` | — |
| `hasChildNodes` | `boolean` | — |
| `hasPointerCapture` | `boolean` | — |
| `hidePopover` | `void` | — |
| `insertAdjacentElement` | `Element \| null` | — |
| `insertAdjacentHTML` | `void` | — |
| `insertAdjacentText` | `void` | — |
| `insertBefore` | `T` | — |
| `isDefaultNamespace` | `boolean` | — |
| `isEqualNode` | `boolean` | — |
| `isSameNode` | `boolean` | — |
| `lookupNamespaceURI` | `string \| null` | — |
| `lookupPrefix` | `string \| null` | — |
| `matches` | `boolean` | — |
| `normalize` | `void` | — |
| `onCatalogChange` | `void` | — |
| `onDetach` | `void` | — |
| `onRuntime` | `void` | — |
| `prepend` | `void` | — |
| `querySelector` | `HTMLElementTagNameMap[K] \| null` | — |
| `querySelectorAll` | `NodeListOf<HTMLElementTagNameMap[K]>` | — |
| `releasePointerCapture` | `void` | — |
| `remove` | `void` | — |
| `removeAttribute` | `void` | — |
| `removeAttributeNode` | `Attr` | — |
| `removeAttributeNS` | `void` | — |
| `removeChild` | `T` | — |
| `removeEventListener` | `void` | — |
| `replaceChild` | `T` | — |
| `replaceChildren` | `void` | — |
| `replaceWith` | `void` | — |
| `requestFullscreen` | `Promise<void>` | — |
| `requestPointerLock` | `Promise<void>` | — |
| `scroll` | `void` | — |
| `scrollBy` | `void` | — |
| `scrollIntoView` | `void` | — |
| `scrollTo` | `void` | — |
| `setAttribute` | `void` | — |
| `setAttributeNode` | `Attr \| null` | — |
| `setAttributeNodeNS` | `Attr \| null` | — |
| `setAttributeNS` | `void` | — |
| `setHTMLUnsafe` | `void` | — |
| `setPointerCapture` | `void` | — |
| `showPopover` | `void` | — |
| `toggleAttribute` | `boolean` | — |
| `togglePopover` | `boolean` | — |
| `webkitMatchesSelector` | `boolean` | — |
| `define` | `void` | — |

**Attributes.** None are observed: the control is driven entirely by the
runtime. Its state is exposed for consumer styling as `data-mode` on the
element (`light` / `dark` / `system`) and `aria-pressed` on the inner button
(`true` / `false` / `mixed`).

**Properties.** None of its own beyond the standard `HTMLElement` surface.

**Events.** Dispatches nothing of its own; a click calls
`runtime.selection.toggleTheme()`.

**Slots.** None — the element owns the button and its icon.

**State.** The element reflects the *selection*, and shows three states: the
sun while the mode is explicitly `light`, the moon while it is explicitly
`dark`, and a monitor while the selection is `system` — so a visitor who
picked "System" in `<themvora-select>` can see that the control is following
the operating system rather than pinned. `data-mode` reports the same value
(`light` / `dark` / `system`).

Activating the toggle always pins an explicit mode through
`runtime.selection.toggleTheme()`, which resolves the *applied* appearance
first — so a `system` selection flips to the opposite of what is on screen.

**Accessibility.** The inner button is a real `<button>`, so focus, Enter and
Space behave natively — the element itself is not a tab stop and carries no
`role`. Its accessible name is the stable `"Dark mode"`; `aria-pressed`
carries the state, and is `"mixed"` while the selection is `system` (neither
on nor off, by design). Icon, name and state therefore always agree.

**Reactivity.** The element subscribes to both the selection (mode changes
from another control or the runtime API) and the store (an OS appearance
change while the selection is `system`). Subscriptions are released on
disconnection and re-established on reconnection, so re-mounting never
doubles them.

Requires an ancestor `<themvora-provider>`.

```ts
<themvora-provider default-theme="light">
  <themvora-toggle></themvora-toggle>
</themvora-provider>
```

---

## Interfaces

### `ThemvoraProviderProps<T extends ThemeDefinition>`
Configuration for the `<themvora-provider>` custom element, parsed from its
attributes.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | The default theme. Parsed from the `default-theme` attribute. Accepts a supplied theme **name** (`"cocoa-light"`) or a **family** (`"cocoa"`); a family resolves to the variant for the mode in effect. |
| `initialFamily` (optional) | `ThemeIdentifier<T>` | Family used when no selection is persisted. Parsed from the `initial-family` attribute. Pair it with `initialMode` for the same reason. A variant name is accepted and normalised to its family. |
| `initialMode` (optional) | `ThemeMode` | Mode used when no selection is persisted. Parsed from the `initial-mode` attribute (`"light" \| "dark" \| "system"`). Optional: both the runtime and the pre-paint script derive the same fallback mode from `default-theme` by default. Set it only to pin a mode the script would not derive — e.g. `"system"` to follow `prefers-color-scheme` — and give `themvoraVitePlugin` the same `initialMode`. |
| `scheduled` (optional) | `ThemeScheduleOptions<ThemeDefinition<string>>` | Sunrise/sunset scheduling options. Parsed from the `scheduled` attribute (JSON). |
| `themes` (optional) | `readonly ThemeDefinition<string>[]` | Theme definitions, parsed from the `themes` attribute. The attribute accepts either syntax: - a space- or comma-separated list of **theme names** already registered in the canonical catalog — `themes="light dark plum-dark"`; - a JSON array of full theme definitions — `themes='[{"name":"brand",…}]'`. Names are resolved against the built-in catalog plus any theme already registered on the live runtime; an unknown name is reported and skipped. A list that resolves nothing is reported and the built-in set is used. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Transition configuration. Parsed from the `transition` attribute (JSON). |

---


### `ThemvoraThemesChangeDetail`
Detail payload of THEMES_CHANGE_EVENT.

| Member | Type | Description |
| ------ | ---- | ----------- |
| readonly `themes` | `readonly string[]` | The theme names registered on the provider after the change, in catalog order. |

---

## Variables

### `COMPONENT_CSS`
The document-level stylesheet for the built-in elements.

Exported so consumers can inspect it, and so the injection is testable
without parsing the DOM.

`string`

---


### `COMPONENT_STYLE_ID`
The `id` of the injected stylesheet element.

`"themvora-elements-style"`

---


### `PRE_PAINT_SCROLLBAR_CSS`
The CSS that hides native scrollbars while `tv-scrollbar` is present on
 `<html>`. Shared by the client bootstrap script and Next's SSR output so
 both apply identical rules.

 The bar is painted invisible while KEEPING its space, so the gutter that
 keeps content clear of the rail exists from the first frame (no load-time
 layout shift). Two groups:

 - The PAGE / window scrollbar is collapsed (`scrollbar-width: none`). Its
   rail auto-hides, so a reserved empty strip at the window edge would read
   as a missing scrollbar; the standard property also overrides the WebKit
   sizing below, so the page never reserves one.
 - INNER scroll containers keep an invisible, space-occupying scrollbar. It
   is sized through `::-webkit-scrollbar` (not only `scrollbar-color`)
   because styling those pseudo-elements is what takes Chromium/Safari off
   OVERLAY scrollbars — so the gutter is reserved on macOS too, where the
   native path would take no space. The space appears only while the
   container actually scrolls, exactly like a native `overflow: auto` bar.
 - Engines without WebKit pseudo-elements (Firefox) get the same reserve
   through the standard properties.

`string`

---


### `THEME_READY_EVENT`
Dispatched once by `<themvora-provider>` after its runtime exists and its
first theme has been applied.

Custom elements are upgraded in document order, so a provider normally
initializes before its descendants. This event covers the remaining case —
an element defined or inserted after the provider — and the reconnection
case, where a provider that was removed and re-added creates a *new*
runtime.

The payload carries no detail: read state from the runtime
(`getProviderRuntime(providerEl)`).

`"theme-ready"`

---


### `THEMES_CHANGE_EVENT`
Dispatched by `<themvora-provider>` after an attribute change replaced its
theme catalog.

A catalog change can leave the active theme untouched — the runtime
preserves a selection that is still valid — so `store.subscribe()` alone
cannot tell a consumer that the set of available themes moved. This event
reports exactly that, once per applied catalog change.

It is not dispatched on initialization; THEME_READY_EVENT covers
that.

`"themes-change"`

---

## Related docs

- [Families & Modes](/core-concepts) — A selection is a family (which palette) plus a mode (light/dark/system); every framework exposes the same read/write surface for it.
- [Theme Discovery & Overrides](/advanced-features) — A provider exposes exactly the themes it was given — grouped by family, with variants and resolved tokens — and accepts an explicit one-shot themeOverride that outranks a saved selection.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [ThemeScope](/scoped-theme) — Apply a different family/mode (or a local theme definition) to a subtree, with scoped CSS variables and pre-paint support.
- [Theme generation](/theme-studio) — Generate a complete, accessible light/dark theme pair from a single seed color, ready to drop into the runtime.
- [Zero-flash bootstrap](/zero-flash) — Paint the correct theme on the first frame: a blocking script plus server-resolved initial state, with a Vite plugin for SPA builds.
- [Custom scrollbar](/custom-scrollbar) — Themed overlay scrollbars that match the active theme and pre-paint before hydration.
- [DevTools](/devtools) — Inspect and drive the live runtime from a panel: adapters, history, snapshots and performance entries.
- [Web Components](/framework-guides/web) — the framework integration
