<script setup lang="ts">
// useTheme is auto-imported by the module — no import statement needed.
const { theme, mode, setMode, toggleTheme } = useTheme();

const modes = ["system", "light", "dark"] as const;
</script>

<template>
  <main class="page">
    <h1>Themvora</h1>
    <p>Current theme: {{ theme.name }} ({{ mode }})</p>

    <div class="modes" role="group" aria-label="Theme mode">
      <button
        v-for="option in modes"
        :key="option"
        type="button"
        class="mode"
        :class="{ 'mode-active': mode === option }"
        :aria-pressed="mode === option"
        @click="setMode(option)"
      >
        {{ option }}
      </button>
    </div>

    <button class="primary" @click="toggleTheme">Toggle theme</button>

    <section class="card">
      <h2>Themed card</h2>
      <p class="muted">Surface, border and text follow the theme.</p>
    </section>
  </main>
</template>

<style scoped>
  .page {
    background: var(--theme-color-background);
    color: var(--theme-color-foreground);
    min-height: 100vh;
    padding: 2rem;
  }
  .modes {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .mode {
    background: var(--theme-color-secondary);
    color: var(--theme-color-secondaryForeground);
    border: 1px solid var(--theme-color-border);
    border-radius: 0.5rem;
    padding: 0.4rem 0.8rem;
    font: inherit;
    text-transform: capitalize;
    cursor: pointer;
  }
  .mode-active {
    background: var(--theme-color-primary);
    color: var(--theme-color-primaryForeground);
    border-color: var(--theme-color-primary);
  }
  .mode:focus-visible {
    outline: 2px solid var(--theme-color-ring);
    outline-offset: 2px;
  }
  .primary {
    background: var(--theme-color-primary);
    color: var(--theme-color-primaryForeground);
    border: 0;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
  }
  .card {
    background: var(--theme-color-card);
    border: 1px solid var(--theme-color-border);
    border-radius: 0.75rem;
    margin-top: 1.5rem;
    padding: 1rem;
  }
  .muted {
    color: var(--theme-color-mutedForeground);
  }
</style>
