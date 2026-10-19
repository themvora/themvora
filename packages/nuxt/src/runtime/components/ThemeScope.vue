<script setup lang="ts">
import { ThemeScope as VueThemeScope } from "@themvora/vue";
import type { ThemeScopeProps } from "@themvora/vue";

const props = defineProps<ThemeScopeProps>();

defineSlots<{ default: () => any }>();
</script>

<template>
  <VueThemeScope v-bind="props">
    <slot />
  </VueThemeScope>
</template>
