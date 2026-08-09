<template>
  <div class="rounded-lg border border-line/8 bg-surface px-3.5 py-3">
    <p class="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">{{ label }}</p>
    <p class="mt-1 flex items-baseline gap-2">
      <span class="font-disp text-[1.5rem] font-semibold leading-none tracking-tight">{{
        value
      }}</span>
      <span
        v-if="delta !== undefined && delta !== null"
        class="flex items-center gap-0.5 font-mono text-[0.68rem] tabular-nums"
        :class="deltaTone"
      >
        <component :is="delta >= 0 ? TrendingUp : TrendingDown" :size="12" :stroke-width="2" />
        {{ Math.abs(delta) }}%
      </span>
    </p>
    <p v-if="hint" class="mt-1 text-[0.68rem] text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TrendingDown, TrendingUp } from '@lucide/vue'

const props = withDefaults(
  defineProps<{ label: string; value: string; delta?: number | null; hint?: string }>(),
  { delta: undefined, hint: '' },
)

const deltaTone = computed(() => {
  if (props.delta === undefined || props.delta === null) return 'text-muted'
  return props.delta >= 0 ? 'text-sage' : 'text-rust'
})
</script>
