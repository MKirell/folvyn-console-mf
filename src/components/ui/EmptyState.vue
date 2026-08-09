<template>
  <div
    class="hatch grid place-items-center rounded-lg border border-dashed border-line/14 px-6 py-12 text-center"
  >
    <div class="max-w-[42ch]">
      <component
        :is="glyph"
        v-if="glyph"
        :size="26"
        :stroke-width="1.4"
        class="mx-auto mb-3 text-muted"
        aria-hidden="true"
      />
      <p class="font-disp text-[0.98rem] font-semibold tracking-tight">{{ title }}</p>
      <p v-if="description" class="mt-1.5 text-[0.82rem] text-muted">{{ description }}</p>
      <div v-if="$slots.default" class="mt-4 flex justify-center gap-2">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { iconComponent } from '@/registry/icons'

const props = withDefaults(defineProps<{ title: string; description?: string; icon?: string }>(), {
  description: '',
  icon: 'Sparkles',
})

const glyph = computed(() => iconComponent(props.icon))
</script>
