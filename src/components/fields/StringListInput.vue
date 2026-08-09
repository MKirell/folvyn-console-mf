<template>
  <div class="space-y-1">
    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="relative flex items-start gap-1.5 pe-[70px]"
    >
      <span
        class="mt-[11px] w-4 shrink-0 text-end font-mono text-[0.66rem] tabular-nums text-muted"
        aria-hidden="true"
        >{{ index + 1 }}</span
      >

      <div class="relative min-w-0 flex-1">
        <textarea
          v-autosize="maxLength"
          :value="item"
          rows="1"
          :maxlength="maxLength"
          :placeholder="index === 0 ? placeholder : ''"
          class="scroll-thin min-h-[38px] w-full resize-none overflow-hidden rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.82rem] leading-[1.5] outline-none focus:border-accent/50"
          :aria-label="`Entry ${index + 1}`"
          @input="replaceAt(index, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </div>

      <div class="absolute end-0 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-[5px] text-muted transition-colors hover:bg-bg-tint hover:text-ink disabled:opacity-30"
          :disabled="index === 0"
          aria-label="Move up"
          @click="move(index, -1)"
        >
          <ChevronUp :size="13" :stroke-width="2" />
        </button>
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-[5px] text-muted transition-colors hover:bg-bg-tint hover:text-ink disabled:opacity-30"
          :disabled="index === modelValue.length - 1"
          aria-label="Move down"
          @click="move(index, 1)"
        >
          <ChevronDown :size="13" :stroke-width="2" />
        </button>
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-[5px] text-muted transition-colors hover:bg-bg-tint hover:text-rust"
          aria-label="Remove entry"
          @click="removeAt(index)"
        >
          <X :size="13" :stroke-width="2" />
        </button>
      </div>
    </div>

    <AppButton v-if="canAdd" size="sm" @click="add">
      <Plus :size="13" :stroke-width="2" aria-hidden="true" />
      Add entry
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown, ChevronUp, Plus, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    maxLength?: number
    maxItems?: number
    placeholder?: string
  }>(),
  { maxLength: undefined, maxItems: undefined, placeholder: '' },
)

const canAdd = computed(
  () => props.maxItems === undefined || props.modelValue.length < props.maxItems,
)
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

function replaceAt(index: number, value: string): void {
  const next = [...props.modelValue]
  next[index] = value
  emit('update:modelValue', next)
}

function removeAt(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, position) => position !== index),
  )
}

function move(index: number, step: number): void {
  const target = index + step
  if (target < 0 || target >= props.modelValue.length) return

  const next = [...props.modelValue]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  emit('update:modelValue', next)
}

function add(): void {
  emit('update:modelValue', [...props.modelValue, ''])
}
</script>
