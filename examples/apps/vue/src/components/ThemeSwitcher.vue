<script setup lang="ts">
import { useTheme } from "@themvora/vue";

const { toggleTheme } = useTheme();
</script>

<template>
  <div class="my-4 flex items-center justify-center">
    <button
      type="button"
      @click="toggleTheme()"
      class="w-full max-w-fit cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--theme-color-ring)"
    >
      Toggle light/dark
    </button>
  </div>
</template>
