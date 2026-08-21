<template>
  <div v-if="sessions > 0" class="flex min-h-0 flex-1 flex-col gap-[3px]" role="list">
    <div
      v-for="band in bands"
      :key="band.depth"
      class="relative flex min-h-[26px] flex-1 items-center overflow-hidden rounded-[5px] bg-bg-tint"
      role="listitem"
      :title="`${band.share}% of sessions read past ${band.depth}% of the page`"
    >
      <span
        class="absolute inset-y-0 start-0 bg-accent transition-[width] duration-500 motion-reduce:transition-none"
        :style="{ width: `${Math.max(2, band.share)}%`, opacity: band.weight }"
        aria-hidden="true"
      ></span>
      <span class="relative flex w-full items-baseline gap-2 px-2.5">
        <span class="min-w-0 flex-1 truncate text-[0.74rem]">{{ band.label }}</span>
        <span class="shrink-0 font-mono text-[0.72rem] tabular-nums">{{ band.share }}%</span>
      </span>
    </div>
  </div>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const DEPTHS = [25, 50, 75, 100]
const WEIGHTS = [0.34, 0.55, 0.78, 1]

const props = defineProps<{
  quartiles: number[]
  sessions: number
  labels: string[]
  empty: string
}>()

const LABELS = computed(() => props.labels)

const bands = computed(() =>
  DEPTHS.map((depth, index) => ({
    depth,
    label: LABELS.value[index],
    weight: WEIGHTS[index],
    share:
      props.sessions === 0
        ? 0
        : Math.min(100, Math.round(((props.quartiles[index] ?? 0) / props.sessions) * 100)),
  })),
)
</script>
