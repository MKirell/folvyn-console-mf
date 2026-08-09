<template>
  <header class="mb-4 flex flex-wrap items-center gap-2.5">
    <div class="min-w-0 flex-1 max-700:basis-full">
      <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">{{ title }}</h2>
      <p class="mt-0.5 text-[0.78rem] text-muted">{{ description }}</p>
    </div>

    <div
      v-if="periods.length"
      class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-surface p-[3px]"
      role="group"
      aria-label="Reporting period"
    >
      <button
        v-for="days in periods"
        :key="days"
        type="button"
        class="rounded-[6px] px-2.5 py-[4px] font-mono text-[0.7rem] transition-colors motion-reduce:transition-none"
        :class="days === period ? 'bg-accent/14 text-accent-deep' : 'text-muted hover:text-ink'"
        :aria-pressed="days === period"
        @click="emit('select', days)"
      >
        {{ days }}d
      </button>
    </div>

    <slot name="actions" />
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ title: string; description: string; periods?: number[]; period?: number }>(),
  { periods: () => [], period: 30 },
)

const emit = defineEmits<{ select: [days: number] }>()
</script>
