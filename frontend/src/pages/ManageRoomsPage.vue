<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { activateRoom, deactivateRoom, fetchAdminRooms } from '@/api/adminRooms'
import type { AdminRoom } from '@/api/types'
import { useNoticeStore } from '@/stores/notice'
import { useUserStore } from '@/stores/user'
import { EQUIPMENT_LABELS } from '@/utils/equipment'
import {
  ADMIN_ONLY_MESSAGE,
  deactivateConfirmation,
  deactivatedMessage,
  problemDetailOr,
} from '@/utils/roomMessages'

type Action = 'open-confirm' | 'deactivate' | 'activate'

const userStore = useUserStore()
const noticeStore = useNoticeStore()

const rooms = ref<AdminRoom[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const notice = ref<string | null>(null)
const actionError = ref<string | null>(null)
const confirming = ref<{ roomId: number; upcoming: number } | null>(null)
const pending = ref<{ roomId: number; action: Action } | null>(null)

const accessDenied = computed(() => userStore.currentUser !== null && !userStore.isAdmin)

onMounted(() => {
  notice.value = noticeStore.take()
})

async function loadRooms(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    rooms.value = await fetchAdminRooms()
  } catch (e) {
    loadError.value = problemDetailOr(e, 'Could not load rooms. Try again later.')
  } finally {
    loading.value = false
  }
}

watch(
  () => userStore.isAdmin,
  (isAdmin) => {
    if (isAdmin) void loadRooms()
  },
  { immediate: true },
)

function isPending(roomId: number, action: Action): boolean {
  return pending.value?.roomId === roomId && pending.value.action === action
}

function replaceRoom(updated: AdminRoom): void {
  rooms.value = rooms.value.map((room) => (room.id === updated.id ? updated : room))
}

async function runAction(roomId: number, action: Action, request: () => Promise<void>): Promise<void> {
  pending.value = { roomId, action }
  actionError.value = null
  notice.value = null
  try {
    await request()
  } catch (e) {
    actionError.value = problemDetailOr(e, 'Could not change the room. Try again later.')
  } finally {
    pending.value = null
  }
}

/** The number of upcoming bookings is taken when the confirmation opens (RMB-4 A-3). */
function openConfirmation(room: AdminRoom): Promise<void> {
  return runAction(room.id, 'open-confirm', async () => {
    rooms.value = await fetchAdminRooms()
    const current = rooms.value.find((candidate) => candidate.id === room.id)
    if (current?.active) confirming.value = { roomId: room.id, upcoming: current.upcoming_bookings }
  })
}

function confirmDeactivation(room: AdminRoom): Promise<void> {
  return runAction(room.id, 'deactivate', async () => {
    const result = await deactivateRoom(room.id)
    replaceRoom(result.room)
    confirming.value = null
    notice.value = deactivatedMessage(result.room.name, result.cancelled_bookings)
  })
}

function putBackInService(room: AdminRoom): Promise<void> {
  return runAction(room.id, 'activate', async () => {
    const updated = await activateRoom(room.id)
    replaceRoom(updated)
    notice.value = `${updated.name} is back in service.`
  })
}
</script>

<template>
  <section>
    <p v-if="accessDenied" class="alert alert-danger" role="alert">{{ ADMIN_ONLY_MESSAGE }}</p>

    <template v-else>
      <div class="page-header">
        <div>
          <h1>Manage rooms</h1>
          <p class="subtitle">All rooms, including rooms out of service.</p>
        </div>
        <RouterLink class="btn btn-primary" :to="{ name: 'add-room' }">Add room</RouterLink>
      </div>

      <div v-if="notice || actionError" class="messages">
        <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>
        <p v-if="actionError" class="alert alert-danger" role="alert">{{ actionError }}</p>
      </div>

      <p v-if="loading" class="card muted">Loading rooms…</p>
      <p v-else-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</p>

      <ul v-else class="room-list">
        <li
          v-for="room in rooms"
          :key="room.id"
          class="card room-row"
          :class="{ 'out-of-service': !room.active }"
          data-testid="admin-room-row"
        >
          <div>
            <h2>{{ room.name }}</h2>
            <p class="muted">Up to {{ room.capacity }} people</p>
            <ul class="chips">
              <li v-for="item in room.equipment" :key="item" class="chip">{{ EQUIPMENT_LABELS[item] }}</li>
            </ul>
          </div>
          <span v-if="room.active" class="status status-in">In service</span>
          <span v-else class="status status-out">Out of service</span>
          <div class="actions">
            <RouterLink class="btn" :to="{ name: 'edit-room', params: { id: room.id } }">Edit</RouterLink>
            <button
              v-if="room.active"
              class="btn btn-danger"
              type="button"
              :disabled="isPending(room.id, 'open-confirm')"
              @click="openConfirmation(room)"
            >
              Take out of service
            </button>
            <button
              v-else
              class="btn"
              type="button"
              :disabled="isPending(room.id, 'activate')"
              @click="putBackInService(room)"
            >
              Put back in service
            </button>
          </div>
          <div v-if="confirming?.roomId === room.id && room.active" class="confirm" role="alertdialog" :aria-label="`Take ${room.name} out of service`">
            <p>{{ deactivateConfirmation(room.name, confirming.upcoming) }}</p>
            <div class="actions">
              <button
                class="btn btn-danger"
                type="button"
                :disabled="isPending(room.id, 'deactivate')"
                @click="confirmDeactivation(room)"
              >
                Take out of service
              </button>
              <button class="btn" type="button" @click="confirming = null">Keep in service</button>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

h1 {
  font-size: var(--font-size-xl);
}

h2 {
  font-size: var(--font-size-lg);
}

p {
  margin: 0;
}

.subtitle,
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.messages {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.room-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.room-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-5);
  align-items: center;
}

.room-row.out-of-service h2,
.room-row.out-of-service .chips {
  color: var(--color-text-muted);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.chip {
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-chip-bg);
  color: var(--color-chip-text);
  font-size: var(--font-size-xs);
}

.status {
  padding: 0 var(--space-2);
  border: 1px solid;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
}

.status-in {
  color: var(--color-success);
  background: var(--color-success-bg);
  border-color: var(--color-success-border);
}

.status-out {
  color: var(--color-text-muted);
  background: var(--color-bg);
  border-color: var(--color-border);
}

.actions {
  display: flex;
  gap: var(--space-2);
}

.confirm {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 640px) {
  .room-row {
    grid-template-columns: 1fr;
  }
}
</style>
