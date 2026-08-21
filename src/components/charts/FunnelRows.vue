<template>
  <ul v-if="rows.length" class="space-y-2.5" role="list">
    <li v-for="(row, index) in rows" :key="row.key">
      <div class="mb-1 flex items-baseline gap-2">
        <span class="min-w-0 flex-1 truncate text-[0.78rem] capitalize">{{ row.key }}</span>
        <span class="shrink-0 font-mono text-[0.7rem] tabular-nums text-ink-soft"
          >{{ reach(row.count) }}%</span
        >
        <span
          v-if="index > 0"
          class="w-12 shrink-0 text-end font-mono text-[0.66rem] tabular-nums"
          :class="drop(index) > 30 ? 'text-gold' : 'text-muted'"
          :title="t('ui.dropOffFrom', { step: rows[index - 1].key })"
          >−{{ drop(index) }}%</span
        >
      </div>
      <span class="block h-[9px] overflow-hidden rounded-full bg-bg-tint">
        <span
          class="block h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          :style="{ width: `${Math.max(2, reach(row.count))}%` }"
        ></span>
      </span>
    </li>
  </ul>

  <p v-else class="py-4 text-center text-[0.78rem] text-muted">
    {{ t('ui.funnelEmpty') }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsBreakdown } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps<{ rows: AnalyticsBreakdown[]; sessions: number }>()

const base = computed(() => Math.max(1, props.sessions || props.rows[0]?.count || 1))

function reach(count: number): number {
  return Math.min(100, Math.round((count / base.value) * 100))
}

function drop(index: number): number {
  const previous = reach(props.rows[index - 1].count)
  return Math.max(0, previous - reach(props.rows[index].count))
}
</script>
