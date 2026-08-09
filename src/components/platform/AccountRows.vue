<template>
  <ul v-if="rows.length" class="grid min-h-0 flex-1 gap-1.5" :style="template" role="list">
    <li
      v-for="row in rows"
      :key="row.id"
      class="flex items-center gap-3 rounded-[9px] border border-line/8 bg-bg px-3"
    >
      <RouterLink
        :to="`/platform/portfolios/${row.id}`"
        class="min-w-0 flex-1 truncate font-mono text-[0.78rem] hover:text-accent-deep"
        >/{{ row.slug }}</RouterLink
      >
      <span
        class="shrink-0 rounded-[5px] px-1.5 py-[1px] font-mono text-[0.62rem] uppercase"
        :class="tone(row.status)"
        >{{ row.status }}</span
      >
      <span class="w-24 shrink-0 text-end font-mono text-[0.7rem] tabular-nums text-muted">{{
        when(row)
      }}</span>
      <span class="w-14 shrink-0 text-end font-mono text-[0.74rem] tabular-nums">{{
        row.sessions.toLocaleString()
      }}</span>
    </li>
  </ul>

  <p v-else class="grid flex-1 place-items-center text-center text-[0.8rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { PortfolioRow } from '@/types/analytics'

const props = withDefaults(
  defineProps<{ rows: PortfolioRow[]; slots?: number; empty?: string }>(),
  { slots: 0, empty: 'Nothing here.' },
)

const template = computed(() => ({
  gridTemplateRows: `repeat(${Math.max(props.slots, props.rows.length)}, minmax(0, 1fr))`,
}))

function tone(status: string): string {
  if (status === 'published') return 'bg-sage/15 text-sage'
  if (status === 'suspended') return 'bg-rust/15 text-rust'
  return 'bg-line/10 text-muted'
}

function when(row: PortfolioRow): string {
  const stamp = row.publishedAt ?? row.createdAt
  return stamp ? stamp.slice(0, 10) : '—'
}
</script>
