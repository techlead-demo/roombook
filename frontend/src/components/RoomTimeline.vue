<script setup lang="ts">
import { computed } from 'vue'
import type { BusyInterval } from '@/api/types'
import { TIMELINE_END_HOUR, TIMELINE_START_HOUR } from '@/config'
import { formatOfficeTimeRange, minutesFromOfficeMidnight } from '@/utils/time'

const props = defineProps<{
  /** Busy intervals in UTC, as returned by the API. */
  busy: BusyInterval[]
  /** Calendar day (YYYY-MM-DD) in `timeZone`. */
  date: string
  timeZone: string
}>()

const windowStart = TIMELINE_START_HOUR * 60
const windowEnd = TIMELINE_END_HOUR * 60
const windowLength = windowEnd - windowStart

const hours = Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 }, (_, i) => TIMELINE_START_HOUR + i)

const blocks = computed(() =>
  props.busy.flatMap((interval) => {
    const start = Math.max(minutesFromOfficeMidnight(interval.start_at, props.date, props.timeZone), windowStart)
    const end = Math.min(minutesFromOfficeMidnight(interval.end_at, props.date, props.timeZone), windowEnd)
    if (end <= start) return []
    return [
      {
        key: interval.start_at,
        left: ((start - windowStart) / windowLength) * 100,
        width: ((end - start) / windowLength) * 100,
        label: `Busy ${formatOfficeTimeRange(interval.start_at, interval.end_at, props.timeZone)}`,
      },
    ]
  }),
)
</script>

<template>
  <div class="timeline">
    <div class="track">
      <div
        v-for="block in blocks"
        :key="block.key"
        class="busy"
        :style="{ left: `${block.left}%`, width: `${block.width}%` }"
        :title="block.label"
      >
        <span class="visually-hidden">{{ block.label }}</span>
      </div>
      <span v-if="blocks.length === 0" class="visually-hidden">
        Free all day ({{ TIMELINE_START_HOUR }}:00–{{ TIMELINE_END_HOUR }}:00)
      </span>
    </div>
    <div class="hours" aria-hidden="true">
      <span v-for="hour in hours" :key="hour" :style="{ left: `${((hour * 60 - windowStart) / windowLength) * 100}%` }">
        {{ String(hour).padStart(2, '0') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  padding-bottom: var(--space-5);
  position: relative;
}

.track {
  position: relative;
  height: var(--timeline-height);
  border-radius: var(--radius-sm);
  background: var(--color-free);
  border: 1px solid var(--color-free-border);
  overflow: hidden;
}

.busy {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--color-busy);
  border-left: 1px solid var(--color-surface);
  border-right: 1px solid var(--color-surface);
}

.hours {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--space-5);
}

.hours span {
  position: absolute;
  top: var(--space-1);
  transform: translateX(-50%);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
