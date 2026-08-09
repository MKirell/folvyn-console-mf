<template>
  <figure class="m-0 flex min-h-0 flex-1 flex-col">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="block h-full min-h-[104px] w-full flex-1"
      preserveAspectRatio="none"
      role="img"
      :aria-label="ariaLabel"
    >
      <line
        v-for="gridY in gridLines"
        :key="gridY"
        :x1="0"
        :x2="WIDTH"
        :y1="gridY"
        :y2="gridY"
        stroke="currentColor"
        stroke-width="1"
        class="text-line/8"
        vector-effect="non-scaling-stroke"
      />

      <path :d="area" class="fill-accent/12" />
      <path
        :d="line"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-accent"
        vector-effect="non-scaling-stroke"
      />

      <circle
        v-if="hovered"
        :cx="hovered.x"
        :cy="hovered.y"
        r="4"
        class="fill-accent"
        stroke="var(--color-surface)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />

      <rect
        v-for="(point, index) in points"
        :key="point.date"
        :x="index * step"
        y="0"
        :width="step"
        :height="HEIGHT"
        fill="transparent"
        @mouseenter="cursor = index"
        @mouseleave="cursor = -1"
      >
        <title>{{ point.date }} · {{ point.value }} {{ unit }}</title>
      </rect>
    </svg>

    <figcaption
      class="mt-1.5 flex items-baseline justify-between font-mono text-[0.64rem] text-muted"
    >
      <span>{{ points[0]?.date ?? '' }}</span>
      <span v-if="hovered" class="text-ink"
        >{{ hovered.date }} · {{ hovered.value }} {{ unit }}</span
      >
      <span>{{ points[points.length - 1]?.date ?? '' }}</span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface SparkPoint {
  date: string
  value: number
}

const WIDTH = 600
const HEIGHT = 120
const PAD = 8

const props = withDefaults(defineProps<{ points: SparkPoint[]; unit?: string; label?: string }>(), {
  unit: '',
  label: 'Trend',
})

const cursor = ref(-1)

const step = computed(() => (props.points.length ? WIDTH / props.points.length : WIDTH))
const max = computed(() => Math.max(1, ...props.points.map((point) => point.value)))

const gridLines = [PAD, HEIGHT / 2, HEIGHT - PAD]

const coords = computed(() =>
  props.points.map((point, index) => ({
    ...point,
    x: props.points.length === 1 ? WIDTH / 2 : (index / (props.points.length - 1)) * WIDTH,
    y: HEIGHT - PAD - (point.value / max.value) * (HEIGHT - PAD * 2),
  })),
)

const line = computed(() =>
  coords.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' '),
)

const area = computed(() => {
  if (coords.value.length === 0) return ''
  const first = coords.value[0]
  const last = coords.value[coords.value.length - 1]
  return `${line.value} L${last.x} ${HEIGHT} L${first.x} ${HEIGHT} Z`
})

const hovered = computed(() => coords.value[cursor.value])

const ariaLabel = computed(
  () => `${props.label}: ${props.points.length} days, peak ${max.value} ${props.unit}`,
)
</script>
