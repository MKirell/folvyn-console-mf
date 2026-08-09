<template>
  <figure
    v-if="points.length"
    class="m-0 flex min-h-0 flex-col gap-2"
    :class="dense ? '' : 'flex-1'"
  >
    <div
      class="flex items-end gap-[2px]"
      :class="dense ? 'h-[38px]' : 'min-h-[90px] flex-1'"
      role="list"
    >
      <span
        v-for="point in columns"
        :key="point.date"
        class="flex h-full min-w-0 flex-1 items-end"
        role="listitem"
        :title="`${point.date} — ${point.value.toLocaleString()} ${unit}`"
      >
        <span
          class="block w-full rounded-t-[3px] transition-[height] duration-500 motion-reduce:transition-none"
          :class="point.value === 0 ? 'bg-line/12' : 'bg-accent'"
          :style="{ height: `${point.height}%` }"
        ></span>
      </span>
    </div>

    <figcaption
      class="flex items-baseline justify-between font-mono text-[0.64rem] tabular-nums text-muted"
    >
      <span>{{ points[0]?.date }}</span>
      <span>{{ total.toLocaleString() }} {{ unit }} · peak {{ peak.toLocaleString() }}</span>
      <span>{{ points[points.length - 1]?.date }}</span>
    </figcaption>
  </figure>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const FLOOR = 3

const props = withDefaults(
  defineProps<{
    points: { date: string; value: number }[]
    unit?: string
    dense?: boolean
    empty?: string
  }>(),
  { unit: 'events', dense: false, empty: 'Nothing recorded yet' },
)

const peak = computed(() => Math.max(0, ...props.points.map((point) => point.value)))
const total = computed(() => props.points.reduce((sum, point) => sum + point.value, 0))

const columns = computed(() =>
  props.points.map((point) => ({
    ...point,
    height:
      peak.value === 0 ? FLOOR : Math.max(FLOOR, Math.round((point.value / peak.value) * 100)),
  })),
)
</script>
