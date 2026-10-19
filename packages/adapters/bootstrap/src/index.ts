/**
 * Themvora Bootstrap adapter — framework-neutral entry.
 *
 * Exports the React-free `createBootstrapAdapter` factory (also available from
 * `@themvora/bootstrap/factory`), the `createBootstrapVariables` generator,
 * and the `injectBootstrapCSS` helper. Framework wrappers live on their own
 * subpaths: `useBootstrapTheme(runtime)` on `@themvora/bootstrap/react`, and
 * equivalent composables/injectables on `/vue`, `/svelte`, `/solid`, and
 * `/angular`.
 *
 * @packageDocumentation
 */
import bootstrapCss from "./bootstrap.css";

import { createBootstrapAdapter } from "./adapter";
import { createBootstrapVariables } from "./generator";

export { createBootstrapAdapter, createBootstrapVariables };
export type { CreateBootstrapAdapterOptions } from "./adapter";
export type { BootstrapAdapterOptions } from "./defaults";

const STYLE_ID = "@themvora/bootstrap";

/**
 * Injects the Bootstrap compatibility CSS (idempotent, SSR-safe). Called
 * automatically the first time `useBootstrapTheme` installs an adapter.
 */
export function injectBootstrapCSS(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.setAttribute("data-css", "");
  style.textContent = bootstrapCss;
  document.head.appendChild(style);
}
