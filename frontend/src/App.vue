<script setup lang="ts">
import UserPicker from '@/components/UserPicker.vue'
import RoomListPage from '@/pages/RoomListPage.vue'
</script>

<template>
  <header class="app-header">
    <span class="brand">RoomBook</span>
    <UserPicker />
  </header>
  <main class="app-main">
    <RoomListPage />
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.app-main {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-5);
}
</style>
