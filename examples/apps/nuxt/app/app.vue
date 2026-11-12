<template>
  <div>
    <NuxtRouteAnnouncer />
    <ThemeSwitcher />
    <section class="themvora-extras">
      <WorkspaceCard />
      <ThemeHistoryControls />
    </section>
  </div>
</template>

<style scoped>
  .themvora-extras {
    display: grid;
    gap: 1.5rem;
    max-width: 72rem;
    margin: 0 auto;
    padding: 0 2rem 3rem;
  }
</style>
