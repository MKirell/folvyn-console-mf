<template>
  <div v-if="total > 0" class="flex min-h-0 flex-1 flex-col justify-center gap-3">
    <span class="flex h-[34px] w-full gap-[2px] overflow-hidden rounded-[6px]" role="img">
      <span
        v-for="segment in segments"
        :key="segment.key"
        class="block h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
        :style="{ width: `${segment.share}%`, opacity: segment.weight }"
        :title="`${segment.key} — ${segment.count.toLocaleString()} (${segment.share}%)`"
      ></span>
    </span>

    <ul class="flex flex-wrap gap-x-4 gap-y-1.5" role="list">
      <li v-for="segment in segments" :key="segment.key" class="flex items-baseline gap-1.5">
        <span
          class="block h-2.5 w-2.5 shrink-0 self-center rounded-[3px] bg-accent"
          :style="{ opacity: segment.weight }"
          aria-hidden="true"
        ></span>
        <span class="text-[0.76rem] leading-none">{{ segment.key }}</span>
        <span class="font-mono text-[0.68rem] leading-none tabular-nums text-muted"
          >{{ segment.share }}%</span
        >
      </li>
    </ul>
  </div>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const WEIGHTS = [1, 0.74, 0.52, 0.34, 0.22]

const props = withDefaults(defineProps<{ rows: AnalyticsBreakdown[]; empty?: string }>(), {
  empty: 'Not enough data yet',
})

const ranked = computed(() => [...props.rows].sort((a, b) => b.count - a.count))
const total = computed(() => ranked.value.reduce((sum, row) => sum + row.count, 0))

const segments = computed(() =>
  ranked.value.map((row, index) => ({
    ...row,
    share: Math.round((row.count / total.value) * 100),
    weight: WEIGHTS[index] ?? WEIGHTS[WEIGHTS.length - 1],
  })),
)
</script>
