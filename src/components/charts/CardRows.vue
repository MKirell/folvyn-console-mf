<template>
  <ul
    v-if="rows.length"
    class="grid min-h-0 flex-1 grid-cols-1 gap-2.5"
    :style="{ gridTemplateRows: `repeat(${slots}, minmax(0, 1fr))` }"
    role="list"
  >
    <li v-for="row in rows" :key="row.key" class="flex flex-col justify-center">
      <div class="mb-1 flex items-baseline gap-2">
        <span class="min-w-0 flex-1 truncate text-[0.78rem]" :title="row.label">{{
          row.label
        }}</span>
        <span class="shrink-0 font-mono text-[0.66rem] tabular-nums text-muted"
          >{{ row.impressions.toLocaleString() }} seen</span
        >
        <span class="shrink-0 font-mono text-[0.66rem] tabular-nums text-muted"
          >{{ row.clicks.toLocaleString() }} opened</span
        >
        <span class="w-9 shrink-0 text-end font-mono text-[0.7rem] tabular-nums text-ink-soft"
          >{{ row.rate }}%</span
        >
      </div>
      <span class="block h-[7px] overflow-hidden rounded-full bg-bg-tint">
        <span
          class="block h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          :style="{ width: `${width(row.rate)}%` }"
        ></span>
      </span>
    </li>
  </ul>

  <p v-else class="py-4 text-center text-[0.78rem] text-muted">{{ empty }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface CardRow {
  key: string
  label: string
  impressions: number
  clicks: number
  rate: number
}

const props = withDefaults(defineProps<{ rows: CardRow[]; slots?: number; empty?: string }>(), {
  slots: 0,
  empty: 'Not enough data yet',
})

const slots = computed(() => Math.max(props.slots, props.rows.length))

const max = computed(() => Math.max(1, ...props.rows.map((row) => row.rate)))

function width(rate: number): number {
  return Math.max(2, Math.round((rate / max.value) * 100))
}
</script>
