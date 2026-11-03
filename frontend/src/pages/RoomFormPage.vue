<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createRoom, fetchAdminRooms, updateRoom } from '@/api/adminRooms'
import { ApiError } from '@/api/http'
import type { Equipment, RoomInput } from '@/api/types'
import { useNoticeStore } from '@/stores/notice'
import { useUserStore } from '@/stores/user'
import { EQUIPMENT_LABELS } from '@/utils/equipment'
import { ADMIN_ONLY_MESSAGE, problemDetailOr } from '@/utils/roomMessages'

const props = defineProps<{ id?: number }>()

const NAME_REQUIRED = 'Enter a name.'
const NAME_TAKEN = 'A room with this name already exists.'
const CAPACITY_INVALID = 'Enter a whole number from 1 to 100.'
const EQUIPMENT_ORDER: Equipment[] = ['TV', 'WHITEBOARD', 'VIDEO_CONFERENCE']

const router = useRouter()
const userStore = useUserStore()
const noticeStore = useNoticeStore()

const isEdit = computed(() => props.id !== undefined)
const accessDenied = computed(() => userStore.currentUser !== null && !userStore.isAdmin)

const name = ref('')
// A number input bound with v-model yields a number, or '' when empty or not a number
const capacity = ref<number | string>('')
const equipment = ref<Equipment[]>([])

const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const nameError = ref<string | null>(null)
const capacityError = ref<string | null>(null)

// Only the latest load may touch the form; an older one ends silently when another room (or the Add form) was opened
let currentLoad = 0

async function loadRoom(id: number): Promise<void> {
  const load = ++currentLoad
  loading.value = true
  loadError.value = null
  try {
    const room = (await fetchAdminRooms()).find((candidate) => candidate.id === id)
    if (load !== currentLoad) return
    if (!room) {
      loadError.value = `Room ${id} not found.`
      return
    }
    name.value = room.name
    capacity.value = room.capacity
    equipment.value = [...room.equipment]
  } catch (e) {
    if (load !== currentLoad) return
    loadError.value = problemDetailOr(e, 'Could not load rooms. Try again later.')
  } finally {
    if (load === currentLoad) loading.value = false
  }
}

function resetForm(): void {
  currentLoad++
  loading.value = false
  name.value = ''
  capacity.value = ''
  equipment.value = []
  loadError.value = null
  formError.value = null
  nameError.value = null
  capacityError.value = null
}

// The router reuses this component between /admin/rooms/new and /admin/rooms/:id/edit, so the id can change
watch(
  [() => userStore.isAdmin, () => props.id],
  ([isAdmin, id], previous) => {
    if (id !== previous?.[1]) resetForm()
    if (isAdmin && id !== undefined) void loadRoom(id)
  },
  { immediate: true },
)

function parseCapacity(value: number | string): number | null {
  if (value === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 && number <= 100 ? number : null
}

/** BR-9, checked before anything is sent (RMB-4 AC-12, AC-13). */
function validate(): RoomInput | null {
  const trimmed = name.value.trim()
  const parsedCapacity = parseCapacity(capacity.value)
  nameError.value = trimmed === '' ? NAME_REQUIRED : null
  capacityError.value = parsedCapacity === null ? CAPACITY_INVALID : null
  if (nameError.value || parsedCapacity === null) return null
  return {
    name: trimmed,
    capacity: parsedCapacity,
    equipment: EQUIPMENT_ORDER.filter((item) => equipment.value.includes(item)),
  }
}

function showSaveError(error: unknown): void {
  if (error instanceof ApiError && error.status === 409) {
    nameError.value = NAME_TAKEN
    return
  }
  const fieldErrors = error instanceof ApiError ? error.problem?.errors : undefined
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const fields = fieldErrors.map((entry: { field?: unknown }) => entry.field)
    if (fields.includes('name')) nameError.value = NAME_REQUIRED
    if (fields.includes('capacity')) capacityError.value = CAPACITY_INVALID
    if (nameError.value || capacityError.value) return
  }
  formError.value = problemDetailOr(error, 'Could not save the room. Try again later.')
}

async function save(): Promise<void> {
  formError.value = null
  const input = validate()
  if (!input) return
  saving.value = true
  try {
    if (props.id !== undefined) {
      const room = await updateRoom(props.id, input)
      noticeStore.set(`Saved ${room.name}.`)
    } else {
      const room = await createRoom(input)
      noticeStore.set(`Added ${room.name}.`)
    }
    await router.push({ name: 'manage-rooms' })
  } catch (e) {
    showSaveError(e)
  } finally {
    saving.value = false
  }
}

function cancel(): void {
  void router.push({ name: 'manage-rooms' })
}
</script>

<template>
  <section>
    <p v-if="accessDenied" class="alert alert-danger" role="alert">{{ ADMIN_ONLY_MESSAGE }}</p>

    <template v-else>
      <div class="page-header">
        <h1>{{ isEdit ? 'Edit room' : 'Add room' }}</h1>
      </div>

      <p v-if="loading" class="card muted">Loading room…</p>
      <p v-else-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</p>

      <form v-else class="card room-form" novalidate @submit.prevent="save">
        <p v-if="formError" class="alert alert-danger" role="alert">{{ formError }}</p>

        <div class="field" :class="{ invalid: nameError }">
          <label for="room-name">Name</label>
          <input
            id="room-name"
            v-model="name"
            type="text"
            maxlength="50"
            :aria-invalid="nameError ? 'true' : 'false'"
            :aria-describedby="nameError ? 'room-name-error' : undefined"
          />
          <p v-if="nameError" id="room-name-error" class="field-error">{{ nameError }}</p>
        </div>

        <div class="field" :class="{ invalid: capacityError }">
          <label for="room-capacity">Capacity</label>
          <input
            id="room-capacity"
            v-model="capacity"
            type="number"
            min="1"
            max="100"
            step="1"
            :aria-invalid="capacityError ? 'true' : 'false'"
            :aria-describedby="capacityError ? 'room-capacity-error' : 'room-capacity-hint'"
          />
          <p v-if="capacityError" id="room-capacity-error" class="field-error">{{ capacityError }}</p>
          <p v-else id="room-capacity-hint" class="hint">People, from 1 to 100.</p>
        </div>

        <fieldset class="field">
          <legend>Equipment</legend>
          <div class="checks">
            <label v-for="item in EQUIPMENT_ORDER" :key="item">
              <input v-model="equipment" type="checkbox" :value="item" />
              {{ EQUIPMENT_LABELS[item] }}
            </label>
          </div>
        </fieldset>

        <div class="actions">
          <button class="btn btn-primary" type="submit" :disabled="saving">Save room</button>
          <button class="btn" type="button" @click="cancel">Cancel</button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.page-header {
  margin-bottom: var(--space-5);
}

h1 {
  font-size: var(--font-size-xl);
}

p {
  margin: 0;
}

.muted,
.hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.room-form {
  display: grid;
  gap: var(--space-3);
  max-width: 480px;
}

.field {
  display: grid;
  gap: var(--space-1);
  align-content: start;
}

fieldset.field {
  margin: 0;
  padding: 0;
  border: 0;
}

.field label,
.field legend {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.field input {
  width: 100%;
  min-width: 0;
  height: var(--control-height);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.field.invalid input {
  border-color: var(--color-danger);
}

.field-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.checks label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-md);
  font-weight: normal;
}

.checks input {
  width: auto;
  height: auto;
}

.actions {
  display: flex;
  gap: var(--space-2);
}
</style>
