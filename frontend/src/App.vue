<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import UserPicker from '@/components/UserPicker.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
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
    <RouterLink to="/" class="brand">RoomBook</RouterLink>
    <nav class="nav" aria-label="Main">
      <RouterLink v-if="userStore.isAdmin" :to="{ name: 'manage-rooms' }">Manage rooms</RouterLink>
    </nav>
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
      <component :is="Component" v-else-if="route.name === 'rooms'" :success-message="successMessage" @book="openForm" />
      <component :is="Component" v-else-if="Component" />
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
  text-decoration: none;
}

.nav {
  display: flex;
  gap: var(--space-4);
  margin-right: auto;
  margin-left: var(--space-5);
}

.nav a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.nav a.router-link-active {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

.app-main {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-5);
}
</style>
