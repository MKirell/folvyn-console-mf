<template>
  <div v-if="steps.length" class="flex min-h-0 flex-1 items-center gap-5 max-700:gap-3">
    <svg
      :viewBox="`0 0 ${WIDTH} ${height}`"
      class="h-[132px] w-[132px] shrink-0 max-700:h-[104px] max-700:w-[104px]"
      role="img"
      :aria-label="label"
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        v-for="step in steps"
        :key="step.key"
        :points="step.points"
        class="fill-accent transition-[opacity] duration-500 motion-reduce:transition-none"
        :opacity="step.weight"
      >
        <title>{{ step.key }} — {{ step.count.toLocaleString() }} ({{ step.share }}%)</title>
      </polygon>
    </svg>

    <ol class="min-w-0 flex-1 space-y-2.5" role="list">
      <li v-for="step in steps" :key="step.key" class="flex items-baseline gap-2">
        <span
          class="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-[3px] bg-accent"
          :style="{ opacity: step.weight }"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 truncate text-[0.78rem]" :title="step.key">{{ step.key }}</span>
        <span class="shrink-0 font-mono text-[0.74rem] tabular-nums">{{
          step.count.toLocaleString()
        }}</span>
        <span class="w-10 shrink-0 text-end font-mono text-[0.7rem] tabular-nums text-ink-soft"
          >{{ step.share }}%</span
        >
        <span
          class="w-11 shrink-0 text-end font-mono text-[0.66rem] tabular-nums"
          :class="step.drop === null ? 'text-muted' : step.drop > 30 ? 'text-gold' : 'text-muted'"
          >{{ step.drop === null ? '—' : `−${step.drop}%` }}</span
        >
      </li>
    </ol>
  </div>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const WIDTH = 100
const BAND = 30
const GAP = 3
const FLOOR = 8
const WEIGHTS = [1, 0.68, 0.44, 0.28, 0.18]

const props = defineProps<{
  rows: AnalyticsBreakdown[]
  sessions: number
  label: string
  empty: string
}>()

const base = computed(() => Math.max(1, props.sessions || props.rows[0]?.count || 1))

const height = computed(() => Math.max(BAND, props.rows.length * BAND))

function widthOf(count: number): number {
  return Math.max(FLOOR, Math.min(100, Math.round((count / base.value) * 100)))
}

const steps = computed(() =>
  props.rows.map((row, index) => {
    const share = Math.min(100, Math.round((row.count / base.value) * 100))
    const previous = props.rows[index - 1]
    const top = widthOf(row.count)
    const bottom = widthOf(props.rows[index + 1]?.count ?? row.count)

    const y = index * BAND
    const bottomY = y + BAND - GAP
    const left = (WIDTH - top) / 2
    const bottomLeft = (WIDTH - bottom) / 2

    return {
      ...row,
      share,
      weight: WEIGHTS[index] ?? WEIGHTS[WEIGHTS.length - 1],
      points: [
        `${left},${y}`,
        `${left + top},${y}`,
        `${bottomLeft + bottom},${bottomY}`,
        `${bottomLeft},${bottomY}`,
      ].join(' '),
      drop:
        previous && previous.count > 0
          ? Math.max(0, Math.round(((previous.count - row.count) / previous.count) * 100))
          : null,
    }
  }),
)
</script>
