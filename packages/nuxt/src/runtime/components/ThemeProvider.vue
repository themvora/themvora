<script setup lang="ts">
import { watch } from "vue";
import { ThemeProvider as VueThemeProvider, useThemeRuntime } from "@themvora/vue";
import type { ThemeProviderProps } from "@themvora/vue";

// The @themvora/nuxt plugin already installs an app-wide runtime; pass it
// through so this component never creates a second one.
const props = defineProps<ThemeProviderProps>();
const runtime = useThemeRuntime();

// Live configuration: the app-wide runtime is created by the plugin, so this
// wrapper forwards *its* prop changes to it. Only supplied props are forwarded.
watch(
  () =>
    [
      props.themes,
      props.defaultTheme,
      props.initialFamily,
      props.initialMode,
      props.initial,
      props.transition,
      props.scheduled,
    ] as const,
  () => {
    const update: Record<string, unknown> = {};
    if (props.themes !== undefined) update.themes = props.themes;
    if (props.defaultTheme !== undefined) update.defaultTheme = props.defaultTheme;
    if (props.initialFamily !== undefined) update.initialFamily = props.initialFamily;
    if (props.initialMode !== undefined) update.initialMode = props.initialMode;
    if (props.initial !== undefined) update.initial = props.initial;
    if (props.transition !== undefined) update.transition = props.transition;
    if (props.scheduled !== undefined) update.scheduled = props.scheduled;
    runtime.configure(update);
  },
);

defineSlots<{ default: () => any }>();
</script>

<template>
  <VueThemeProvider :runtime="runtime" v-bind="$attrs">
    <slot />
  </VueThemeProvider>
</template>