<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loadFailed = ref(false)

onMounted(async () => {
  try {
    await userStore.loadUsers()
  } catch {
    loadFailed.value = true
  }
})

function onChange(event: Event): void {
  userStore.selectUser(Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <label class="user-picker">
    <span class="label">Acting as</span>
    <select :value="userStore.currentUserId ?? ''" :disabled="loadFailed" @change="onChange">
      <option v-if="loadFailed" value="">Users unavailable</option>
      <option v-for="user in userStore.users" :key="user.id" :value="user.id">
        {{ user.name }}{{ user.role === 'ADMIN' ? ' (admin)' : '' }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.user-picker {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
</style>
