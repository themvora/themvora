<script setup lang="ts">
import { ThemeInspector as VueThemeInspector } from "@themvora/vue";
import type { ThemeInspectorProps } from "@themvora/vue";

const props = defineProps<ThemeInspectorProps>();
</script>

<template>
  <VueThemeInspector v-bind="props" />
</template>
