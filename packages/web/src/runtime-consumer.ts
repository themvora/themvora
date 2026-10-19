import type { ThemeDefinition, ThemeRuntime } from "@themvora/core";
import { CustomElementBase } from "./custom-element-base";
import { THEME_READY_EVENT } from "./events";
import { findProviderRuntime } from "./utils";

/**
 * Base class for a Themvora element that reads and follows the nearest
 * `<themvora-provider>`'s runtime.
 *
 * ## The lifecycle problem it solves
 *
 * A descendant element can connect before, after, or instead of its provider
 * initializing, and a provider that is removed and re-added creates a *new*
 * runtime. Handling that by hand produced three defects that this base class
 * removes:
 *
 * 1. **A one-shot listener that never fires.** The provider dispatches
 *    `theme-ready` on itself with `bubbles: true`, which travels *up* the tree
 *    and can never reach a descendant. Listening on the element itself only
 *    worked when the provider happened to initialize first.
 * 2. **Duplicate subscriptions.** Every reconnection ran `init()` again and
 *    added another store listener, so a re-mounted element updated twice,
 *    three times, and so on.
 * 3. **Stale runtimes.** After a provider was recreated, an element kept
 *    listening to the destroyed runtime and silently stopped updating.
 *
 * Subclasses implement {@link ThemvoraRuntimeConsumer.onRuntime} to subscribe
 * and {@link ThemvoraRuntimeConsumer.onDetach} to release what they took.
 * Reconnection re-runs the pair, so a subscription can never outlive its
 * connection or be created twice.
 *
 * The catalog subscription is taken by this class, not by each subclass: every
 * consumer that resolves themes itself (a scope, a family selector) must see a
 * catalog change, and the runtime's registry notification is the one signal
 * that reports it in the same task.
 *
 * @remarks
 * Subclasses that override `connectedCallback` / `disconnectedCallback` must
 * call `super`.
 */
export abstract class ThemvoraRuntimeConsumer extends CustomElementBase {
  #runtime: ThemeRuntime<ThemeDefinition> | null = null;
  #listening = false;
  #unsubscribeThemes: (() => void) | null = null;

  /** Lifecycle hook: starts following the nearest provider runtime. */
  connectedCallback() {
    this.#listen();
    this.#attach();
  }

  /** Lifecycle hook: releases subscriptions and stops listening. */
  disconnectedCallback() {
    this.#unlisten();
    this.#detach();
  }

  /** The runtime this element is currently following, if any. */
  protected get runtime(): ThemeRuntime<ThemeDefinition> | null {
    return this.#runtime;
  }

  /**
   * Called with the runtime when the element connects, when a provider
   * initializes, and when a new runtime replaces the previous one.
   *
   * Subscribe here and return nothing; release the subscription in
   * {@link ThemvoraRuntimeConsumer.onDetach}.
   */
  protected abstract onRuntime(runtime: ThemeRuntime<ThemeDefinition>): void;

  /**
   * Called before the runtime is released — on disconnection, and before
   * {@link ThemvoraRuntimeConsumer.onRuntime} runs for a replacement runtime.
   */
  protected onDetach(): void {}

  /**
   * Called after the provider replaced its theme catalog (a `themes`
   * attribute change), with the runtime the element already follows.
   */
  protected onCatalogChange(
    _runtime: ThemeRuntime<ThemeDefinition>,
  ): void {}

  #listen() {
    if (this.#listening) return;
    document.addEventListener(THEME_READY_EVENT, this.#handleThemeReady);
    this.#listening = true;
  }

  #unlisten() {
    if (!this.#listening) return;
    document.removeEventListener(THEME_READY_EVENT, this.#handleThemeReady);
    this.#listening = false;
  }

  #handleThemeReady = () => {
    if (!this.isConnected) return;
    this.#attach();
  };

  #attach() {
    const runtime = findProviderRuntime(this);
    if (!runtime) return;
    if (runtime === this.#runtime) return;
    // Release the previous runtime before adopting the next one, so a
    // replaced provider cannot leave a live subscription behind.
    this.#detach();
    this.#runtime = runtime;
    this.onRuntime(runtime);

    // The registry's own signal, not the provider's DOM event: it is delivered
    // in the same task as the change, so a control never renders one frame of a
    // catalog the runtime has already replaced.
    this.#unsubscribeThemes = runtime.registry.subscribe(() => {
      if (!this.isConnected) return;
      const current = this.#runtime;
      if (current) this.onCatalogChange(current);
    });
  }

  #detach() {
    this.#unsubscribeThemes?.();
    this.#unsubscribeThemes = null;
    if (!this.#runtime) return;
    this.#runtime = null;
    this.onDetach();
  }
}
