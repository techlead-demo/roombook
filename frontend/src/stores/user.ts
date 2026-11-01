import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setActingUserId } from '@/api/http'
import type { User } from '@/api/types'
import { fetchUsers } from '@/api/users'

const STORAGE_KEY = 'roombook.user_id'

function readStoredUserId(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** The acting user, chosen in the user picker (there is no real login). */
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const currentUserId = ref<number | null>(null)

  const currentUser = computed(() => users.value.find((user) => user.id === currentUserId.value) ?? null)
  const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

  function selectUser(id: number | null): void {
    currentUserId.value = id
    setActingUserId(id)
    try {
      if (id === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, String(id))
    } catch {
      // Storage unavailable: the choice lasts for this page load only.
    }
  }

  async function loadUsers(): Promise<void> {
    users.value = await fetchUsers()
    const storedId = readStoredUserId()
    const known = users.value.some((user) => user.id === storedId)
    selectUser(known ? storedId : (users.value[0]?.id ?? null))
  }

  return { users, currentUserId, currentUser, isAdmin, selectUser, loadUsers }
})
