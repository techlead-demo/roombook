<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import UserPicker from '@/components/UserPicker.vue'

const router = useRouter()

/** Shown on the room list after a booking; it lives only as long as the room list is shown. */
const successMessage = ref<string | null>(null)

router.afterEach((to) => {
  if (to.name !== 'rooms') successMessage.value = null
})

function openForm(roomId: number): void {
  router.push({ name: 'book', params: { roomId } })
}

function showRooms(message: string | null): void {
  successMessage.value = message
  router.push({ name: 'rooms' })
}
</script>

<template>
  <header class="app-header">
    <span class="brand">RoomBook</span>
    <UserPicker />
  </header>
  <main class="app-main">
    <RouterView v-slot="{ Component, route }">
      <component
        :is="Component"
        v-if="route.name === 'book'"
        :key="route.fullPath"
        @booked="(message: string) => showRooms(message)"
        @cancel="showRooms(null)"
      />
      <component :is="Component" v-else-if="Component" :success-message="successMessage" @book="openForm" />
    </RouterView>
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
