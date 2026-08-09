<template>
  <div :class="field.wide ? 'col-span-full' : ''">
    <div class="mb-1.5 flex items-baseline gap-2">
      <label :for="id" class="text-[0.76rem] font-medium text-ink-soft">
        {{ label }}
        <span v-if="field.required" class="text-accent" aria-hidden="true">*</span>
      </label>
      <span
        v-if="counter"
        class="ms-auto shrink-0 font-mono text-[0.62rem] tabular-nums"
        :class="over ? 'text-rust' : 'text-muted'"
        >{{ counter }}</span
      >
    </div>

    <slot :id="id" />

    <p v-if="error" class="mt-1 text-[0.72rem] text-rust">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-[0.72rem] text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { fieldLabel, type FieldDef } from '@/registry/collections'

const props = withDefaults(
  defineProps<{ field: FieldDef; error?: string; length?: number; hint?: string }>(),
  { error: '', length: undefined, hint: '' },
)

const id = useId()

const label = computed(() => fieldLabel(props.field))

const counter = computed(() => {
  if (props.length === undefined || !props.field.maxLength) return ''
  return `${props.length}/${props.field.maxLength}`
})

const over = computed(
  () =>
    props.length !== undefined &&
    props.field.maxLength !== undefined &&
    props.length > props.field.maxLength,
)
</script>
