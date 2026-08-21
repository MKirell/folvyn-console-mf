<template>
  <section class="flex flex-col rounded-lg border border-line/8 bg-surface">
    <header
      v-if="title || hasHint || $slots.title || $slots.actions"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/8 px-4 py-2.5"
    >
      <component
        :is="title ? 'h2' : 'div'"
        class="min-w-0 truncate font-disp text-[0.92rem] font-semibold tracking-tight"
        :class="hasHint ? 'shrink' : 'flex-1'"
      >
        <slot name="title">{{ title }}</slot>
      </component>
      <p
        v-if="hasHint"
        class="min-w-0 flex-1 truncate text-end font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted max-600:hidden"
        :title="hint || undefined"
      >
        <slot name="hint">{{ hint }}</slot>
      </p>
      <slot name="actions" />
    </header>
    <div class="flex min-h-0 flex-1 flex-col" :class="flush ? '' : 'p-4'">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = withDefaults(defineProps<{ title?: string; hint?: string; flush?: boolean }>(), {
  title: '',
  hint: '',
  flush: false,
})

const slots = useSlots()

const hasHint = computed(() => Boolean(props.hint) || Boolean(slots.hint))
</script>
