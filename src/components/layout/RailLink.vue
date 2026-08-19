<template>
  <RouterLink
    :to="item.to"
    :data-active="active"
    :title="tight ? item.label : undefined"
    class="group relative flex items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[0.82rem] transition-[background-color,color] motion-reduce:transition-none"
    :class="[
      active ? 'bg-accent/10 text-ink' : 'text-ink-soft hover:bg-bg-tint hover:text-ink',
      tight ? 'justify-center' : '',
    ]"
    @click="ui.mobileNavOpen = false"
  >
    <component
      :is="glyph"
      v-if="glyph"
      :size="16"
      :stroke-width="1.9"
      class="shrink-0 transition-colors motion-reduce:transition-none"
      :class="active ? 'text-accent-deep' : ''"
      aria-hidden="true"
    />
    <span v-if="!tight" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
    <span
      v-if="!tight && item.count !== undefined"
      class="shrink-0 font-mono text-[0.66rem] tabular-nums"
      :class="active ? 'text-accent-deep' : 'text-muted'"
      >{{ item.count }}</span
    >
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { iconComponent } from '@/registry/icons'
import { useUiStore } from '@/stores/ui'
import type { RailItem } from '@/types/nav'

const props = defineProps<{ item: RailItem; tight: boolean }>()

const route = useRoute()
const ui = useUiStore()

const glyph = computed(() => iconComponent(props.item.icon))
const active = computed(() => {
  if (route.path === props.item.to) return true
  return props.item.exact ? false : route.path.startsWith(`${props.item.to}/`)
})
</script>
