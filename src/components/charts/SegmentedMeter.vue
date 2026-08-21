<template>
  <ul v-if="meters.length" class="grid min-h-0 flex-1 gap-2.5" :style="template" role="list">
    <li v-for="meter in meters" :key="meter.key" class="flex min-w-0 items-center gap-3">
      <span class="min-w-0 basis-[36%] truncate text-[0.78rem]" :title="meter.key">{{
        meter.key
      }}</span>

      <span
        class="flex min-w-0 flex-1 gap-[3px]"
        role="img"
        :aria-label="`${meter.key}: ${meter.share}%`"
      >
        <span
          v-for="tick in TICKS"
          :key="tick"
          class="h-[15px] flex-1 rounded-[2px] transition-colors duration-500 motion-reduce:transition-none"
          :class="tick <= meter.lit ? 'bg-accent' : 'bg-line/12'"
        ></span>
      </span>

      <span class="w-11 shrink-0 text-end font-mono text-[0.78rem] tabular-nums">{{
        meter.count.toLocaleString()
      }}</span>
      <span class="w-9 shrink-0 text-end font-mono text-[0.7rem] tabular-nums text-muted"
        >{{ meter.share }}%</span
      >
    </li>
  </ul>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const TICKS = 18

const props = withDefaults(
  defineProps<{ rows: AnalyticsBreakdown[]; slots?: number; empty: string }>(),
  { slots: 0 },
)

const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))
const peak = computed(() => Math.max(1, ...props.rows.map((row) => row.count)))

const meters = computed(() =>
  props.rows.map((row) => ({
    ...row,
    lit: Math.max(1, Math.round((row.count / peak.value) * TICKS)),
    share: total.value === 0 ? 0 : Math.round((row.count / total.value) * 100),
  })),
)

const template = computed(() => ({
  gridTemplateRows: `repeat(${Math.max(props.slots, props.rows.length)}, minmax(0, 1fr))`,
}))
</script>
