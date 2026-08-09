<template>
  <div v-if="steps.length" class="flex min-h-0 flex-1 items-end gap-1.5" role="list">
    <div
      v-for="step in steps"
      :key="step.key"
      class="flex h-full min-w-0 flex-1 flex-col justify-end"
      role="listitem"
    >
      <p class="mb-1 font-mono text-[0.7rem] tabular-nums text-ink-soft">{{ step.share }}%</p>
      <span
        class="flex h-[92px] w-full items-end overflow-hidden rounded-t-[5px] bg-bg-tint"
        :title="`${step.key} — ${step.count.toLocaleString()} of ${sessions.toLocaleString()} sessions`"
      >
        <span
          class="block w-full rounded-t-[5px] bg-accent transition-[height] duration-500 motion-reduce:transition-none"
          :style="{ height: `${Math.max(2, step.share)}%` }"
        ></span>
      </span>
      <p class="mt-1.5 truncate text-[0.72rem] capitalize" :title="step.key">{{ step.key }}</p>
      <p
        v-if="step.drop !== null"
        class="font-mono text-[0.64rem] tabular-nums"
        :class="step.drop <= -20 ? 'text-gold' : 'text-muted'"
      >
        {{ step.drop }}%
      </p>
      <p v-else class="font-mono text-[0.64rem] text-muted">entry</p>
    </div>
  </div>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'

const props = withDefaults(
  defineProps<{ rows: AnalyticsBreakdown[]; sessions: number; empty?: string }>(),
  { empty: 'Not enough data yet' },
)

const steps = computed(() => {
  const top = props.rows[0]?.count ?? props.sessions

  return props.rows.map((row, index) => {
    const share = top === 0 ? 0 : Math.round((row.count / top) * 100)
    const previous = props.rows[index - 1]

    return {
      ...row,
      share,
      drop:
        previous && previous.count > 0
          ? Math.round(((row.count - previous.count) / previous.count) * 100)
          : null,
    }
  })
})
</script>
