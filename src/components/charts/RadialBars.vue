<template>
  <div v-if="arcs.length" class="flex min-h-0 flex-1 items-center gap-4 max-700:gap-3">
    <ul class="min-w-0 flex-1 space-y-1.5" role="list">
      <li v-for="arc in arcs" :key="arc.key" class="flex items-baseline gap-2">
        <span
          class="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
          :style="{ opacity: arc.weight }"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 truncate text-[0.78rem]" :title="arc.key">{{ arc.key }}</span>
        <span class="shrink-0 font-mono text-[0.72rem] tabular-nums">{{
          arc.count.toLocaleString()
        }}</span>
        <span class="w-9 shrink-0 text-end font-mono text-[0.7rem] tabular-nums text-ink-soft"
          >{{ arc.share }}%</span
        >
      </li>
    </ul>

    <svg
      class="h-[122px] w-[122px] shrink-0 max-700:h-[92px] max-700:w-[92px]"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="`${label}: ${arcs.map((arc) => `${arc.key} ${arc.share}%`).join(', ')}`"
    >
      <g transform="rotate(-90 50 50)">
        <template v-for="arc in arcs" :key="arc.key">
          <circle
            :cx="CENTRE"
            :cy="CENTRE"
            :r="arc.radius"
            fill="none"
            stroke="currentColor"
            class="text-bg-tint"
            :stroke-width="THICKNESS"
          />
          <circle
            :cx="CENTRE"
            :cy="CENTRE"
            :r="arc.radius"
            fill="none"
            stroke="currentColor"
            class="text-accent transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
            :stroke-width="THICKNESS"
            :stroke-opacity="arc.weight"
            stroke-linecap="round"
            :stroke-dasharray="arc.length"
            :stroke-dashoffset="arc.offset"
          >
            <title>{{ arc.key }} — {{ arc.count.toLocaleString() }} ({{ arc.share }}%)</title>
          </circle>
        </template>
      </g>
    </svg>
  </div>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const CENTRE = 50
const OUTER = 44
const THICKNESS = 7
const STEP = 10
const WEIGHTS = [1, 0.74, 0.52, 0.34, 0.22]

const props = defineProps<{ rows: AnalyticsBreakdown[]; label: string; empty: string }>()

const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))

const arcs = computed(() => {
  if (total.value === 0) return []

  return [...props.rows]
    .sort((a, b) => b.count - a.count)
    .slice(0, WEIGHTS.length)
    .map((row, index) => {
      const radius = OUTER - index * STEP
      const circumference = 2 * Math.PI * radius
      const share = Math.round((row.count / total.value) * 100)

      return {
        ...row,
        radius,
        share,
        length: circumference,
        offset: circumference * (1 - Math.min(1, row.count / total.value)),
        weight: WEIGHTS[index] ?? WEIGHTS[WEIGHTS.length - 1],
      }
    })
})
</script>
