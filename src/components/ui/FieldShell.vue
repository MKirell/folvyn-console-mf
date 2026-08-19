<template>
  <div :class="field.wide || full ? 'col-span-full' : ''">
    <div class="mb-1.5 flex items-baseline gap-2">
      <label :for="id" class="text-[0.76rem] font-medium text-ink-soft">
        {{ label }}
        <span v-if="field.required" class="text-accent" aria-hidden="true">*</span>
      </label>

      <span
        v-if="locale"
        class="shrink-0 rounded-[5px] border px-1.5 py-[1px] font-mono text-[0.58rem] uppercase tracking-[0.1em]"
        :class="
          translated
            ? 'border-accent/30 bg-accent/12 text-accent-deep'
            : 'border-dashed border-line/25 text-muted'
        "
        :title="
          translated
            ? t('fields.translated', { code: locale })
            : t('fields.untranslated', { code: locale })
        "
        >{{ locale }}</span
      >
      <span
        v-if="counter"
        class="ms-auto shrink-0 font-mono text-[0.62rem] tabular-nums"
        :class="over ? 'text-rust' : 'text-muted'"
        >{{ counter }}</span
      >
    </div>

    <slot :id="id" />

    <p v-if="error" class="mt-1 text-[0.72rem] text-rust">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FieldDef } from '@/registry/collections'
import { fieldLabel } from '@/i18n/labels'

const props = withDefaults(
  defineProps<{
    field: FieldDef
    error?: string
    length?: number
    locale?: string
    translated?: boolean
    full?: boolean
  }>(),
  { error: '', length: undefined, locale: '', translated: false, full: false },
)

const { t } = useI18n()

const id = useId()

const label = computed(() => fieldLabel(props.field))

const counter = computed(() => {
  if (props.field.type === 'month') return ''
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
