<template>
  <div>
    <div class="flex items-center gap-2">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-line/10 bg-bg-tint"
        :class="glyph ? 'text-accent-deep' : 'text-muted'"
      >
        <component :is="glyph" v-if="glyph" :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span v-else class="font-mono text-[0.62rem]">?</span>
      </span>
      <input
        :id="id"
        :value="modelValue"
        type="text"
        class="min-w-0 flex-1 rounded-[9px] border border-line/10 bg-bg px-3 py-2 font-mono text-[0.78rem] outline-none focus:border-accent/50"
        placeholder="Trophy"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <AppButton size="sm" @click="expanded = !expanded">
        {{ expanded ? 'Hide' : 'Browse' }}
      </AppButton>
    </div>

    <p v-if="modelValue && !renderable" class="mt-1.5 text-[0.72rem] text-gold">
      The portfolio has no mapping for “{{ modelValue }}” — it will render nothing until the icon is
      added to the section component.
    </p>

    <div
      v-if="expanded"
      class="scroll-thin mt-2 grid max-h-[124px] grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-1.5 overflow-y-auto rounded-[10px] border border-line/10 bg-bg p-2"
    >
      <button
        v-for="name in PORTFOLIO_ICONS"
        :key="name"
        type="button"
        class="grid place-items-center gap-1 rounded-[8px] px-1 py-2 transition-colors motion-reduce:transition-none"
        :class="
          name === modelValue ? 'bg-accent/12 text-accent-deep' : 'text-ink-soft hover:bg-bg-tint'
        "
        :title="name"
        @click="choose(name)"
      >
        <component :is="ICONS[name]" :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span class="w-full truncate text-center font-mono text-[0.56rem]">{{ name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { ICONS, PORTFOLIO_ICONS, iconComponent, rendersInPortfolio } from '@/registry/icons'

const props = withDefaults(defineProps<{ modelValue: string; id?: string }>(), { id: undefined })
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const expanded = ref(false)

const glyph = computed(() => iconComponent(props.modelValue))
const renderable = computed(() => rendersInPortfolio(props.modelValue))

function choose(name: string): void {
  emit('update:modelValue', name)
  expanded.value = false
}
</script>
