<template>
  <div v-if="total > 0" class="flex min-h-0 flex-1 items-center justify-center gap-4 max-700:gap-3">
    <svg
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      class="h-[122px] w-[122px] shrink-0 -rotate-90 max-700:h-[92px] max-700:w-[92px]"
      role="img"
      :aria-label="`${label}: ${slices.map((s) => `${s.key} ${s.share}%`).join(', ')}`"
    >
      <circle
        :cx="CENTRE"
        :cy="CENTRE"
        :r="RADIUS"
        fill="none"
        stroke="currentColor"
        class="text-bg-tint"
        :stroke-width="THICKNESS"
      />
      <circle
        v-for="slice in slices"
        :key="slice.key"
        :cx="CENTRE"
        :cy="CENTRE"
        :r="RADIUS"
        fill="none"
        stroke="currentColor"
        class="text-accent transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
        :stroke-width="THICKNESS"
        :stroke-opacity="slice.weight"
        :stroke-dasharray="`${slice.length} ${CIRCUMFERENCE}`"
        :stroke-dashoffset="-slice.offset"
        stroke-linecap="butt"
      >
        <title>{{ slice.key }} — {{ slice.count.toLocaleString() }} ({{ slice.share }}%)</title>
      </circle>
      <circle :cx="CENTRE" :cy="CENTRE" :r="RADIUS - THICKNESS / 2 - 1" class="fill-surface" />
      <circle :cx="CENTRE" :cy="CENTRE" :r="RADIUS + THICKNESS / 2 + 1" class="fill-none" />
    </svg>

    <ul class="min-w-0 flex-1 space-y-1.5" role="list">
      <li v-for="slice in slices" :key="slice.key" class="flex items-baseline gap-2">
        <span
          class="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-[3px] bg-accent"
          :style="{ opacity: slice.weight }"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 truncate text-[0.78rem]">{{ slice.key }}</span>
        <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-ink-soft"
          >{{ slice.share }}%</span
        >
      </li>
    </ul>
  </div>

  <p v-else class="py-4 text-center text-[0.78rem] text-muted">{{ empty }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const SIZE = 100
const CENTRE = SIZE / 2
const THICKNESS = 16
const RADIUS = CENTRE - THICKNESS / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const WEIGHTS = [1, 0.72, 0.48, 0.28]
const GAP = 2

const props = withDefaults(
  defineProps<{ rows: AnalyticsBreakdown[]; label: string; empty?: string }>(),
  { empty: 'Not enough data yet' },
)

const ranked = computed(() => {
  const sorted = [...props.rows].sort((a, b) => b.count - a.count)
  if (sorted.length <= WEIGHTS.length) return sorted

  const head = sorted.slice(0, WEIGHTS.length - 1)
  const rest = sorted.slice(WEIGHTS.length - 1)
  return [...head, { key: 'other', count: rest.reduce((sum, row) => sum + row.count, 0) }]
})

const total = computed(() => ranked.value.reduce((sum, row) => sum + row.count, 0))

const slices = computed(() => {
  let offset = 0

  return ranked.value.map((row, index) => {
    const length = total.value === 0 ? 0 : (row.count / total.value) * CIRCUMFERENCE
    const slice = {
      ...row,
      share: Math.round((row.count / total.value) * 100),
      weight: WEIGHTS[index] ?? WEIGHTS[WEIGHTS.length - 1],
      length: Math.max(0, length - GAP),
      offset,
    }
    offset += length
    return slice
  })
})
</script>
