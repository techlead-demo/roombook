<script setup lang="ts">
import { ref } from 'vue'
import UserPicker from '@/components/UserPicker.vue'
import BookingFormPage from '@/pages/BookingFormPage.vue'
import RoomListPage from '@/pages/RoomListPage.vue'

/** The shown screen. The success message lives only as long as the room list is shown. */
type View = { page: 'rooms'; successMessage: string | null } | { page: 'book'; roomId: number }

const view = ref<View>({ page: 'rooms', successMessage: null })
</script>

<template>
  <header class="app-header">
    <span class="brand">RoomBook</span>
    <UserPicker />
  </header>
  <main class="app-main">
    <BookingFormPage
      v-if="view.page === 'book'"
      :room-id="view.roomId"
      @booked="(message) => (view = { page: 'rooms', successMessage: message })"
      @cancel="view = { page: 'rooms', successMessage: null }"
    />
    <RoomListPage
      v-else
      :success-message="view.successMessage"
      @book="(roomId) => (view = { page: 'book', roomId })"
    />
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
