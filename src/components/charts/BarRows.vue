<template>
  <ul
    v-if="rows.length"
    class="grid min-h-0 flex-1 grid-cols-1 gap-2"
    :style="{ gridTemplateRows: `repeat(${slots}, minmax(0, 1fr))` }"
    role="list"
  >
    <li v-for="row in rows" :key="row.key" class="flex flex-col justify-center">
      <div class="mb-1 flex items-baseline gap-2">
        <span class="min-w-0 flex-1 truncate text-[0.78rem]" :title="row.key">{{ row.key }}</span>
        <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-ink-soft"
          >{{ format(row.count) }}{{ suffix }}</span
        >
        <span
          v-if="showShare"
          class="w-9 shrink-0 text-end font-mono text-[0.66rem] tabular-nums text-muted"
          >{{ share(row.count) }}%</span
        >
      </div>
      <span class="block h-[7px] overflow-hidden rounded-full bg-bg-tint">
        <span
          class="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          :class="tone"
          :style="{ width: `${width(row.count)}%` }"
        ></span>
      </span>
    </li>
  </ul>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const props = withDefaults(
  defineProps<{
    rows: AnalyticsBreakdown[]
    slots?: number
    suffix?: string
    tone?: string
    showShare?: boolean
    empty?: string
  }>(),
  { slots: 0, suffix: '', tone: 'bg-accent', showShare: false, empty: 'Not enough data yet' },
)

const slots = computed(() => Math.max(props.slots, props.rows.length))

const max = computed(() => Math.max(1, ...props.rows.map((row) => row.count)))
const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))

function width(count: number): number {
  return Math.max(2, Math.round((count / max.value) * 100))
}

function share(count: number): number {
  return total.value === 0 ? 0 : Math.round((count / total.value) * 100)
}

function format(count: number): string {
  return count.toLocaleString()
}
</script>
