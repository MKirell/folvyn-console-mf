<template>
  <ol
    v-if="rows.length"
    class="grid min-h-0 flex-1 gap-1"
    :style="{ gridTemplateRows: `repeat(${slots}, minmax(0, 1fr))` }"
    role="list"
  >
    <li
      v-for="(row, index) in rows"
      :key="row.key"
      class="flex items-center gap-3 border-b border-line/6 last:border-0"
    >
      <span
        class="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-accent/12 font-mono text-[0.68rem] tabular-nums text-accent-deep"
        aria-hidden="true"
        >{{ index + 1 }}</span
      >
      <span class="min-w-0 flex-1 truncate font-mono text-[0.8rem]" :title="row.key">{{
        row.key
      }}</span>
      <span class="shrink-0 font-mono text-[0.76rem] tabular-nums text-ink-soft">{{
        row.count.toLocaleString()
      }}</span>
      <span class="w-9 shrink-0 text-end font-mono text-[0.66rem] tabular-nums text-muted"
        >{{ share(row.count) }}%</span
      >
    </li>
  </ol>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const props = withDefaults(
  defineProps<{ rows: AnalyticsBreakdown[]; slots?: number; empty?: string }>(),
  {
    slots: 0,
    empty: 'Not enough data yet',
  },
)

const slots = computed(() => Math.max(props.slots, props.rows.length))

const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))

function share(count: number): number {
  return total.value === 0 ? 0 : Math.round((count / total.value) * 100)
}
</script>
