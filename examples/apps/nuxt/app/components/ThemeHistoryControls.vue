<script setup lang="ts">
// Both composables and both components are auto-imported by the module.
const { undo, redo, canUndo, canRedo } = useThemeHistory();
const { theme, setFamily } = useTheme();
</script>

<template>
  <ThemeScope theme="plum-dark" :transition="{ duration: 300, easing: 'ease' }">
    <p>This subtree is always plum-dark.</p>
  </ThemeScope>

  <button @click="undo" :disabled="!canUndo">Undo</button>
  <button @click="redo" :disabled="!canRedo">Redo</button>

  <button @click="setFamily('mint')">{{ theme.name }}</button>

  <ThemeScrollbar :behavior="{ autoHide: true }" />
</template>
