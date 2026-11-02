<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError } from '@/api/http'
import { fetchAvailability, fetchRooms } from '@/api/rooms'
import type { Availability, BusyInterval, Room } from '@/api/types'
import RoomTimeline from '@/components/RoomTimeline.vue'
import { OFFICE_TIME_ZONE } from '@/config'
import { EQUIPMENT_LABELS } from '@/utils/equipment'
import { formatCalendarDate, toOfficeDate } from '@/utils/time'

defineProps<{
  /** Shown above the list after a booking was made. */
  successMessage?: string | null
}>()

const emit = defineEmits<{
  book: [roomId: number]
}>()

const today = toOfficeDate(new Date(), OFFICE_TIME_ZONE)

const rooms = ref<Room[]>([])
const availability = ref<Availability | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const busyByRoom = computed(
  () => new Map<number, BusyInterval[]>(availability.value?.rooms.map((room) => [room.room_id, room.busy]) ?? []),
)

onMounted(async () => {
  try {
    const [roomList, todayAvailability] = await Promise.all([fetchRooms(), fetchAvailability(today)])
    rooms.value = roomList
    availability.value = todayAvailability
  } catch (e) {
    error.value = e instanceof ApiError ? e.detail : 'Could not load rooms. Try again later.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <div class="page-header">
      <h1>Rooms</h1>
      <p class="subtitle">Today's availability · {{ formatCalendarDate(today) }} · times in office time ({{ OFFICE_TIME_ZONE }})</p>
    </div>

    <p v-if="successMessage" class="alert alert-success success" role="status">{{ successMessage }}</p>

    <p v-if="loading" class="status">Loading rooms…</p>
    <p v-else-if="error" class="status error" role="alert">{{ error }}</p>
    <p v-else-if="rooms.length === 0" class="status">No rooms yet.</p>

    <ul v-else class="room-list">
      <li v-for="room in rooms" :key="room.id" class="room-card" data-testid="room-card">
        <div class="room-info">
          <h2>{{ room.name }}</h2>
          <p class="capacity">Up to {{ room.capacity }} people</p>
          <ul class="equipment">
            <li v-for="item in room.equipment" :key="item" class="chip">{{ EQUIPMENT_LABELS[item] }}</li>
          </ul>
        </div>
        <RoomTimeline
          class="room-timeline"
          :busy="busyByRoom.get(room.id) ?? []"
          :date="today"
          :time-zone="availability?.time_zone ?? OFFICE_TIME_ZONE"
        />
        <button class="btn" type="button" @click="emit('book', room.id)">Book</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.page-header {
  margin-bottom: var(--space-5);
}

h1 {
  font-size: var(--font-size-xl);
}

.subtitle,
.capacity {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.success {
  margin-bottom: var(--space-3);
}

.status {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.status.error {
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
}

.room-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.room-card {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: var(--space-5);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

h2 {
  font-size: var(--font-size-lg);
}

.equipment {
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

@media (max-width: 640px) {
  .room-card {
    grid-template-columns: 1fr;
  }
}
</style>
