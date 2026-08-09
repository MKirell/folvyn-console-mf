<template>
  <div
    class="flex flex-wrap items-center gap-1.5 rounded-[9px] border border-line/10 bg-bg px-2 py-1.5 focus-within:border-accent/50"
  >
    <span
      v-for="(tag, index) in modelValue"
      :key="`${tag}-${index}`"
      class="group inline-flex items-center gap-1 rounded-[6px] bg-surface-2/60 px-2 py-[3px] text-[0.74rem]"
    >
      <button
        type="button"
        class="text-muted opacity-0 transition-opacity group-hover:opacity-100 disabled:!opacity-0 hover:text-ink"
        :disabled="index === 0"
        :aria-label="`Move ${tag} earlier`"
        @click="move(index, -1)"
      >
        <ChevronLeft :size="12" :stroke-width="2.2" />
      </button>
      {{ tag }}
      <button
        type="button"
        class="text-muted opacity-0 transition-opacity group-hover:opacity-100 disabled:!opacity-0 hover:text-ink"
        :disabled="index === modelValue.length - 1"
        :aria-label="`Move ${tag} later`"
        @click="move(index, 1)"
      >
        <ChevronRight :size="12" :stroke-width="2.2" />
      </button>
      <button
        type="button"
        class="text-muted transition-colors hover:text-rust"
        :aria-label="`Remove ${tag}`"
        @click="removeAt(index)"
      >
        <X :size="12" :stroke-width="2.2" />
      </button>
    </span>

    <input
      v-if="canAdd"
      :id="id"
      v-model="draft"
      type="text"
      class="min-w-[8ch] flex-1 bg-transparent py-[3px] text-[0.82rem] outline-none placeholder:text-muted"
      :placeholder="modelValue.length ? '' : placeholder"
      @keydown.enter.prevent="commit()"
      @keydown="onKeydown"
      @blur="commit()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{ modelValue: string[]; id?: string; placeholder?: string; maxItems?: number }>(),
  { id: undefined, placeholder: 'Add and press Enter', maxItems: undefined },
)

const canAdd = computed(
  () => props.maxItems === undefined || props.modelValue.length < props.maxItems,
)

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const draft = ref('')

function commit(): void {
  const value = draft.value.trim()
  draft.value = ''
  if (!value || props.modelValue.includes(value) || !canAdd.value) return
  emit('update:modelValue', [...props.modelValue, value])
}

function removeAt(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, position) => position !== index),
  )
}

function move(index: number, delta: number): void {
  const target = index + delta
  if (target < 0 || target >= props.modelValue.length) return

  const next = [...props.modelValue]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  emit('update:modelValue', next)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === ',') {
    event.preventDefault()
    commit()
    return
  }
  if (event.key === 'Backspace' && draft.value === '' && props.modelValue.length > 0) {
    removeAt(props.modelValue.length - 1)
  }
}
</script>
