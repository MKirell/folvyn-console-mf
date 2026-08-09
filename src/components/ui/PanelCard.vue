<template>
  <section class="flex flex-col rounded-lg border border-line/8 bg-surface">
    <header
      v-if="title || $slots.actions"
      class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/8 px-4 py-2.5"
    >
      <h2 class="min-w-0 flex-1 truncate font-disp text-[0.92rem] font-semibold tracking-tight">
        {{ title }}
      </h2>
      <p
        v-if="hint"
        class="shrink-0 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted max-600:hidden"
      >
        {{ hint }}
      </p>
      <slot name="actions" />
    </header>
    <div class="flex min-h-0 flex-1 flex-col" :class="flush ? '' : 'p-4'">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string; hint?: string; flush?: boolean }>(), {
  title: '',
  hint: '',
  flush: false,
})
</script>
