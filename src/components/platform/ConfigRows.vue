<template>
  <ul v-if="rows.length" class="flex min-h-0 flex-1 flex-col justify-center gap-1.5" role="list">
    <li
      v-for="row in rows"
      :key="row.key"
      class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-[9px] border border-line/8 bg-bg px-3 py-2"
    >
      <span class="shrink-0 text-[0.79rem] font-medium">{{ row.key }}</span>
      <span
        class="ms-auto shrink-0 font-mono text-[0.74rem] tabular-nums text-accent-deep"
        :title="row.value"
        >{{ row.value }}</span
      >
      <span class="basis-full text-[0.74rem] leading-snug text-muted">{{ row.detail }}</span>
    </li>
  </ul>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import type { ConfigEntry } from '@/types/analytics'

withDefaults(defineProps<{ rows: ConfigEntry[]; empty?: string }>(), {
  empty: 'Nothing configured',
})
</script>
