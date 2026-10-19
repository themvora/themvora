<script setup lang="ts">
import { ThemeScrollbar as VueThemeScrollbar } from "@themvora/vue";
import type { ThemeScrollbarProps } from "@themvora/vue";

const props = defineProps<ThemeScrollbarProps>();

defineSlots<{ default: () => any }>();
</script>

<template>
  <VueThemeScrollbar v-bind="props">
    <slot />
  </VueThemeScrollbar>
</template>