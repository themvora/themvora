<script lang="ts">
  import { onMount } from "svelte";
  import {
    createScopedThemeBinding,
    resolveScopeTransition,
    resolveScopedTheme,
    scopeToCSSVariables,
    themeToCSSVariables,
    type ScopedThemeSelection,
    type ThemeDefinition,
    type ThemeMode,
    type ThemeTransitionOptions,
  } from "@themvora/core";
  import { getThemeRuntime } from "./context";
  import type { ThemeScopeProps } from "./index";

  let {
    theme,
    family,
    mode,
    themes: localThemes,
    transition,
    className,
    children,
    ...rest
  }: ThemeScopeProps = $props();

  const runtime = getThemeRuntime();

  function withGlobalMode(sel: ScopedThemeSelection, globalMode: ThemeMode): ScopedThemeSelection {
    if (typeof sel === "string") return sel;
    if ("name" in sel) return sel;
    return { ...sel, mode: sel.mode ?? globalMode };
  }

  const selection = $derived<ScopedThemeSelection>(
    theme !== undefined
      ? theme
      : family !== undefined
        ? mode !== undefined
          ? { family, mode }
          : { family }
        : { family: runtime.selection.getFamily() ?? "default" },
  );

  // First-paint variables, emitted in both the server and client render so the
  // SSR markup already carries the scoped tokens (hydration-safe); the live
  // binding takes over after mount.
  const prepaintStyle = $derived.by(() => {
    const resolved = resolveScopedTheme<ThemeDefinition>(
      [...(localThemes ?? []), ...runtime.registry.themes] as ThemeDefinition[],
      withGlobalMode(selection, runtime.selection.getMode()),
      false,
    );
    const vars = themeToCSSVariables(resolved, { prefix: "theme-" });
    const all = { ...vars, ...scopeToCSSVariables(vars, "theme-") };
    return Object.entries(all)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");
  });

  let wrapper: HTMLDivElement | undefined = $state();
  let binding: ReturnType<typeof createScopedThemeBinding> | null = null;

  onMount(() => {
    if (!wrapper) return;
    const scopeTransition = resolveScopeTransition(runtime.transition, transition);
    binding = createScopedThemeBinding<ThemeDefinition>(
      runtime.registry.themes as ThemeDefinition[],
      wrapper,
      withGlobalMode(selection, runtime.selection.getMode()),
      {
        ...(localThemes !== undefined ? { localThemes } : {}),
        ...(scopeTransition !== undefined ? { transition: scopeTransition } : {}),
      },
    );

    // Family / boundary scopes keep following the provider's mode while mounted.
    const unsubscribeStore = runtime.store.subscribe(() => {
      const sel = selection;
      if (typeof sel === "string") return;
      if ("name" in sel || sel.mode !== undefined) return;
      binding?.update(withGlobalMode(sel, runtime.selection.getMode()));
    });

    // Follow the provider's catalog. A `themes` change that preserves the
    // active theme never reaches the mode subscription above, so without this
    // the scope keeps rendering a theme the runtime has dropped.
    const unsubscribeThemes = runtime.registry.subscribe(() => {
      binding?.refresh();
    });

    return () => {
      unsubscribeStore();
      unsubscribeThemes();
      binding?.destroy();
      binding = null;
    };
  });

  // Reactive to the scope's own props: a changed theme / family / mode /
  // local-themes / transition re-resolves the binding without a remount.
  $effect(() => {
    if (!binding) return;
    binding.setTransition(resolveScopeTransition(runtime.transition, transition));
    binding.setLocalThemes(localThemes);
    binding.update(withGlobalMode(selection, runtime.selection.getMode()));
  });
</script>

<div bind:this={wrapper} class={className} style={prepaintStyle} {...rest}>
  {@render children?.()}
</div>
