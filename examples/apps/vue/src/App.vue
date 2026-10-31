<script setup lang="ts">
import { ThemeProvider, ThemeScrollbar } from "@themvora/vue";
import {
  themes,
  defaultTheme,
  initialMode,
  transition,
} from "@themvora/app-shared/themes";
import { scrollbarIcons } from "@themvora/app-shared/icons";
import ThemvoraDefault from "./components/ThemvoraDefault.vue";
</script>

<template>
  <ThemeProvider
    :themes="themes"
    :default-theme="defaultTheme"
    :initial-mode="'dark'"
    :transition="{duration: 400}"
  >
    <main class="page flex flex-col">
      <ThemeScrollbar :behavior="{ autoHide: false }" :icons="scrollbarIcons" />

      <ThemvoraDefault />

      <div class="max-h-40 max-w-lg overflow-auto my-8 border-2 border-border">
        <p v-for="n in 100" :key="n">
          Hello for the scrollbar example very very very very very very very
          very very very long content
        </p>
      </div>
    </main>
  </ThemeProvider>
</template>
