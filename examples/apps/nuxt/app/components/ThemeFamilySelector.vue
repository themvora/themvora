
<script setup lang="ts">
import { ref } from 'vue';

const { setFamily } = useTheme();

function handleFamilyChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const family = target.value;

  if (family) {
    setFamily(family);
  }
}

const {value} = useProvidedThemes();
const families = value.map((v) => v.meta?.family);
const selectedFamily = ref(families[0] ?? '');
</script>

<template>
  <select
    v-model="selectedFamily"
    @change="handleFamilyChange"
  >
    <option
      v-for="family in families"
      :key="family"
      :value="family"
    >
      {{ family }}
    </option>
  </select>
</template>
