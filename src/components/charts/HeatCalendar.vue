<template>
  <div v-if="points.length" class="flex min-h-0 flex-1 flex-col justify-center gap-2">
    <div class="flex items-stretch gap-[2px]" role="list">
      <span
        v-for="cell in cells"
        :key="cell.date"
        class="block h-[46px] min-w-0 flex-1 rounded-[3px] bg-accent"
        :style="{ opacity: cell.weight }"
        :title="`${cell.date} — ${cell.value.toLocaleString()} ${unit}`"
        role="listitem"
      ></span>
    </div>

    <div class="flex items-center gap-2 font-mono text-[0.64rem] text-muted">
      <span>{{ points[0]?.date }}</span>
      <span class="ms-auto flex items-center gap-[3px]">
        <span class="me-1">quiet</span>
        <span
          v-for="step in LEGEND"
          :key="step"
          class="block h-[9px] w-[9px] rounded-[2px] bg-accent"
          :style="{ opacity: step }"
          aria-hidden="true"
        ></span>
        <span class="ms-1 tabular-nums">busiest {{ peak.toLocaleString() }}</span>
      </span>
      <span class="ms-auto">{{ points[points.length - 1]?.date }}</span>
    </div>
  </div>

  <p v-else class="grid flex-1 place-items-center py-4 text-center text-[0.78rem] text-muted">
    {{ empty }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const FLOOR = 0.12
const LEGEND = [0.2, 0.45, 0.7, 1]

const props = withDefaults(
  defineProps<{ points: { date: string; value: number }[]; unit?: string; empty?: string }>(),
  { unit: 'sessions', empty: 'No traffic recorded yet' },
)

const peak = computed(() => Math.max(0, ...props.points.map((point) => point.value)))

const cells = computed(() =>
  props.points.map((point) => ({
    ...point,
    weight: peak.value === 0 ? FLOOR : Math.max(FLOOR, point.value / peak.value),
  })),
)
</script>
