<script lang="ts" generics="T extends ThemeDefinition = ThemeDefinition">
  import { onMount, setContext } from "svelte";
  import {
    createCSSVariablesBinding,
    createDOMBinding,
    createThemeBootstrapScript,
    createThemeRuntime,
    resolveRuntimeOptions,
    type CSSVariablesOptions,
    type DOMBindingOptions,
    type ThemeDefinition,
    type ThemeRuntime,
    type ThemeTransitionOptions,
  } from "@themvora/core";
  import { ThemeKey } from "./context";
  import type { ThemeProviderProps } from "./index";

  let { runtime, children, ...rest }: ThemeProviderProps<T> = $props();

  const ownsRuntime = runtime === undefined;

  const transitionOption = rest.transition as boolean | ThemeTransitionOptions | undefined;
  const resolvedTransition =
    transitionOption === undefined
      ? undefined
      : typeof transitionOption === "object"
        ? transitionOption
        : transitionOption === true
          ? {}
          : { enabled: false };

  // Created once, synchronously, so descendants read it from context on the
  // very first render. A runes component body runs exactly once per instance,
  // and on the server once per request — so no request-specific state is shared
  // through a module singleton.
  let runtimeInstance: ThemeRuntime<T>;
  if (runtime) {
    runtimeInstance = runtime;
  } else {
    const { dom, cssVariables, transition, ...coreOptions } = rest as any;
    runtimeInstance = createThemeRuntime({
      ...resolveRuntimeOptions(coreOptions),
      dom: false,
      cssVariables: false,
      ...(resolvedTransition !== undefined ? { transition: resolvedTransition } : {}),
    } as any) as ThemeRuntime<T>;
  }

  setContext(ThemeKey, runtimeInstance);

  // Once this provider has supplied `themeOverride` it owns the input and must
  // report its removal (see the React provider).
  let overrideSupplied = rest.themeOverride !== undefined;

  let domBinding: { setTransition?(transition: ThemeTransitionOptions | undefined): void; destroy(): void } | null = null;
  let cssBinding: { setTransition?(transition: ThemeTransitionOptions | undefined): void; destroy(): void } | null = null;

  if (typeof window !== "undefined") {
    const domOpts = rest.dom as false | DOMBindingOptions | undefined;
    const cssOpts = rest.cssVariables as false | CSSVariablesOptions | undefined;

    // Flash-proofing: a blocking bootstrap that reads the persisted selection
    // and applies the theme before first paint. Owner-only, idempotent.
    if (
      ownsRuntime &&
      document.head &&
      rest.persistence !== null &&
      (rest.themes as readonly ThemeDefinition[] | undefined)?.length &&
      !document.getElementById("themvora-bootstrap")
    ) {
      const bootstrap = createThemeBootstrapScript({
        themes: rest.themes as ThemeDefinition[],
        ...(rest.defaultTheme !== undefined ? { defaultTheme: rest.defaultTheme as string } : {}),
        ...(rest.initialMode !== undefined ? { initialMode: rest.initialMode } : {}),
        ...(rest.initialFamily !== undefined ? { initialFamily: rest.initialFamily } : {}),
        ...(rest.themeOverride !== undefined ? { themeOverride: rest.themeOverride } : {}),
      });
      if (bootstrap) {
        const script = document.createElement("script");
        script.id = "themvora-bootstrap";
        script.textContent = bootstrap;
        document.head.appendChild(script);
      }
    }

    if (domOpts !== false) {
      domBinding = createDOMBinding(runtimeInstance.store, {
        ...(domOpts !== undefined ? domOpts : {}),
        ...(resolvedTransition !== undefined ? { transition: resolvedTransition } : {}),
      });
    }
    if (cssOpts !== false) {
      cssBinding = createCSSVariablesBinding(runtimeInstance.store, {
        ...(cssOpts !== undefined ? cssOpts : {}),
        ...(resolvedTransition !== undefined ? { transition: resolvedTransition } : {}),
      });
    }
  }

  // Live configuration via the shared core contract. Reading the props inside
  // the effect keeps the dependency tracking intact; only *supplied* props are
  // forwarded, so an absent prop cannot reset a value the runtime was created
  // with. `configure` no-ops when nothing relevant changed.
  $effect(() => {
    const update: Record<string, unknown> = {};
    if (rest.themes !== undefined) update.themes = rest.themes;
    if (rest.initial !== undefined) update.initial = rest.initial;
    if (rest.defaultTheme !== undefined) update.defaultTheme = rest.defaultTheme;
    if (rest.themeOverride !== undefined) overrideSupplied = true;
    if (overrideSupplied) update.themeOverride = rest.themeOverride;
    if (rest.initialFamily !== undefined) update.initialFamily = rest.initialFamily;
    if (rest.initialMode !== undefined) update.initialMode = rest.initialMode;
    if (rest.transition !== undefined) update.transition = rest.transition;
    if (rest.scheduled !== undefined) update.scheduled = rest.scheduled;

    // The runtime owns validation/comparison; an identity change on
    // `runtime.transition` means the new options were applied, so the
    // provider's own bindings are pushed them too (the runtime does not own
    // them — it was created with `dom: false` / `cssVariables: false`).
    const transitionBefore = runtimeInstance.transition;
    runtimeInstance.configure(update);
    if (runtimeInstance.transition !== transitionBefore) {
      domBinding?.setTransition?.(runtimeInstance.transition);
      cssBinding?.setTransition?.(runtimeInstance.transition);
    }
  });

  onMount(() => () => {
    domBinding?.destroy();
    cssBinding?.destroy();
    if (ownsRuntime) runtimeInstance.destroy();
  });
</script>

{@render children?.()}
