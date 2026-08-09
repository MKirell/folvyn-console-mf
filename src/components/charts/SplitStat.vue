<template>
  <div v-if="total > 0" class="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="(side, index) in sides"
        :key="side.key"
        class="rounded-[9px] border border-line/8 bg-bg px-3 py-2"
      >
        <p class="flex items-center gap-1.5">
          <span
            class="block h-2 w-2 shrink-0 rounded-[3px]"
            :class="index === 0 ? 'bg-accent' : 'bg-accent/35'"
            aria-hidden="true"
          ></span>
          <span
            class="min-w-0 truncate font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted"
            >{{ side.key }}</span
          >
        </p>
        <p class="mt-1 font-disp text-[1.7rem] font-semibold leading-none tracking-tight">
          {{ side.share }}<span class="text-[1rem] text-muted">%</span>
        </p>
        <p class="mt-1 font-mono text-[0.7rem] tabular-nums text-ink-soft">
          {{ side.count.toLocaleString() }} {{ unit }}
        </p>
      </div>
    </div>

    <span class="flex h-[7px] w-full gap-[2px] overflow-hidden rounded-full" :title="verdict">
      <span
        v-for="(side, index) in sides"
        :key="side.key"
        class="block h-full transition-[width] duration-500 motion-reduce:transition-none"
        :class="index === 0 ? 'bg-accent' : 'bg-accent/35'"
        :style="{ width: `${side.share}%` }"
      ></span>
    </span>
  </div>

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
    unit?: string
    empty?: string
    verdicts?: { strong: string; even: string; weak: string }
  }>(),
  {
    unit: 'visitors',
    empty: 'Not enough data yet',
    verdicts: () => ({
      strong: 'Most people who arrive have been here before.',
      even: 'About as many return as arrive for the first time.',
      weak: 'Almost everyone is arriving for the first time.',
    }),
  },
)

const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))

const sides = computed(() =>
  props.rows.slice(0, 2).map((row) => ({
    ...row,
    share: total.value === 0 ? 0 : Math.round((row.count / total.value) * 100),
  })),
)

const verdict = computed(() => {
  const lead = sides.value[0]?.share ?? 0
  if (lead >= 60) return props.verdicts.strong
  if (lead >= 40) return props.verdicts.even
  return props.verdicts.weak
})
</script>
