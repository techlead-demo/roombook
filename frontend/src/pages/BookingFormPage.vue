<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { createBooking } from '@/api/bookings'
import { ApiError } from '@/api/http'
import { fetchAvailability, fetchRooms } from '@/api/rooms'
import type { BusyInterval, Room } from '@/api/types'
import RoomTimeline from '@/components/RoomTimeline.vue'
import { OFFICE_TIME_ZONE } from '@/config'
import { type BookingFormErrors, TITLE_MAX_LENGTH, validateBookingForm } from '@/utils/bookingForm'
import { formatCalendarDate, formatOfficeTimeRange, toOfficeDate, toUtcInstant } from '@/utils/time'

const props = defineProps<{
  /** Room preselected in the form. */
  roomId: number
}>()

const emit = defineEmits<{
  booked: [message: string]
  cancel: []
}>()

const rooms = ref<Room[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const form = reactive({
  roomId: props.roomId,
  date: toOfficeDate(new Date(), OFFICE_TIME_ZONE),
  start: '',
  end: '',
  title: '',
})
const errors = ref<BookingFormErrors>({})
const submitError = ref<string | null>(null)
const submitting = ref(false)

const busy = ref<BusyInterval[]>([])
const availabilityState = ref<'loading' | 'error' | 'loaded'>('loading')
let availabilityRequest = 0

const selectedRoom = computed(() => rooms.value.find((room) => room.id === form.roomId) ?? null)

const busyText = computed(() =>
  busy.value.length === 0
    ? 'No bookings on this day.'
    : `Already booked: ${busy.value.map((interval) => formatOfficeTimeRange(interval.start_at, interval.end_at, OFFICE_TIME_ZONE)).join(', ')}`,
)

watch(
  () => form.title,
  (title) => {
    if (title.length > TITLE_MAX_LENGTH) form.title = title.slice(0, TITLE_MAX_LENGTH)
  },
)

async function loadAvailability(): Promise<void> {
  const request = ++availabilityRequest
  const { roomId, date } = form
  busy.value = []
  if (!date) return
  availabilityState.value = 'loading'
  try {
    const availability = await fetchAvailability(date)
    if (request !== availabilityRequest) return
    busy.value = availability.rooms.find((room) => room.room_id === roomId)?.busy ?? []
    availabilityState.value = 'loaded'
  } catch {
    if (request !== availabilityRequest) return
    availabilityState.value = 'error'
  }
}

watch(() => [form.roomId, form.date], loadAvailability)

onMounted(async () => {
  try {
    rooms.value = await fetchRooms()
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.detail : 'Could not load rooms. Try again later.'
  } finally {
    loading.value = false
  }
  await loadAvailability()
})

async function submit(): Promise<void> {
  if (submitting.value) return
  submitError.value = null
  errors.value = validateBookingForm(form, new Date(), OFFICE_TIME_ZONE)
  if (Object.keys(errors.value).length > 0) return

  submitting.value = true
  try {
    const booking = await createBooking({
      room_id: form.roomId,
      title: form.title.trim(),
      start_at: toUtcInstant(form.date, form.start, OFFICE_TIME_ZONE),
      end_at: toUtcInstant(form.date, form.end, OFFICE_TIME_ZONE),
    })
    const roomName = selectedRoom.value?.name ?? ''
    const date = toOfficeDate(booking.start_at, OFFICE_TIME_ZONE)
    const times = formatOfficeTimeRange(booking.start_at, booking.end_at, OFFICE_TIME_ZONE)
    emit('booked', `Booked ${roomName}, ${formatCalendarDate(date)}, ${times}.`)
  } catch (e) {
    submitError.value = (e instanceof ApiError ? e.problem?.detail : undefined) ?? 'Could not book the room. Try again later.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section>
    <div class="page-header">
      <h1>Book a room</h1>
    </div>

    <p v-if="loading" class="card muted">Loading rooms…</p>
    <p v-else-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</p>

    <div v-else class="booking-layout">
      <form class="card stack" novalidate @submit.prevent="submit">
        <p v-if="submitError" class="alert alert-danger" role="alert">{{ submitError }}</p>

        <div class="field">
          <label for="booking-room">Room</label>
          <select id="booking-room" v-model="form.roomId">
            <option v-for="room in rooms" :key="room.id" :value="room.id">
              {{ room.name }} · up to {{ room.capacity }} people
            </option>
          </select>
        </div>

        <div class="field" :class="{ invalid: errors.date }">
          <label for="booking-date">Date</label>
          <input id="booking-date" v-model="form.date" type="date" aria-describedby="booking-date-error" />
          <p v-if="errors.date" id="booking-date-error" class="field-error" role="alert">{{ errors.date }}</p>
        </div>

        <div class="row">
          <div class="field" :class="{ invalid: errors.start }">
            <label for="booking-start">Start</label>
            <input id="booking-start" v-model="form.start" type="time" step="900" aria-describedby="booking-start-error" />
            <p v-if="errors.start" id="booking-start-error" class="field-error" role="alert">{{ errors.start }}</p>
          </div>
          <div class="field" :class="{ invalid: errors.end }">
            <label for="booking-end">End</label>
            <input id="booking-end" v-model="form.end" type="time" step="900" aria-describedby="booking-end-error" />
            <p v-if="errors.end" id="booking-end-error" class="field-error" role="alert">{{ errors.end }}</p>
          </div>
        </div>
        <p class="hint">Times are office time ({{ OFFICE_TIME_ZONE }}), in 15-minute steps.</p>

        <div class="field" :class="{ invalid: errors.title }">
          <label for="booking-title">Title</label>
          <input
            id="booking-title"
            v-model="form.title"
            type="text"
            :maxlength="TITLE_MAX_LENGTH"
            aria-describedby="booking-title-error"
          />
          <p v-if="errors.title" id="booking-title-error" class="field-error" role="alert">{{ errors.title }}</p>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit" :disabled="submitting">Book room</button>
          <button class="btn" type="button" @click="emit('cancel')">Cancel</button>
        </div>
      </form>

      <aside class="card" aria-labelledby="booking-availability-heading">
        <h2 id="booking-availability-heading">{{ selectedRoom?.name }}<template v-if="form.date"> · {{ formatCalendarDate(form.date) }}</template></h2>
        <template v-if="form.date">
          <p v-if="availabilityState === 'loading'" class="muted">Loading availability…</p>
          <p v-else-if="availabilityState === 'error'" class="muted">Could not load availability.</p>
          <p v-else class="muted">{{ busyText }}</p>
          <RoomTimeline class="side-timeline" :busy="busy" :date="form.date" :time-zone="OFFICE_TIME_ZONE" />
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.page-header {
  margin-bottom: var(--space-5);
}

h1 {
  font-size: var(--font-size-xl);
}

h2 {
  margin-bottom: var(--space-1);
  font-size: var(--font-size-lg);
}

.booking-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--space-4);
  align-items: start;
}

.stack {
  display: grid;
  gap: var(--space-3);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.field {
  display: grid;
  gap: var(--space-1);
  align-content: start;
}

.field label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.field input,
.field select {
  width: 100%;
  min-width: 0;
  height: var(--control-height);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.field.invalid input,
.field.invalid select {
  border-color: var(--color-danger);
}

.field-error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.actions {
  display: flex;
  gap: var(--space-2);
}

.side-timeline {
  margin-top: var(--space-3);
}

@media (max-width: 640px) {
  .booking-layout {
    grid-template-columns: 1fr;
  }
}
</style>
