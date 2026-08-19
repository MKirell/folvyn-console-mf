<template>
  <FieldShell
    :field="field"
    :error="error"
    :length="length"
    :locale="locale"
    :translated="translated"
    :full="full"
  >
    <template #default="{ id }">
      <textarea
        v-if="field.type === 'textarea'"
        :id="id"
        v-autosize="field.maxLength"
        :value="asText"
        rows="1"
        :placeholder="placeholder"
        class="scroll-thin min-h-[38px] w-full resize-none overflow-hidden rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] leading-[1.55] outline-none placeholder:text-muted/70 focus:border-accent/50"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>

      <label
        v-else-if="field.type === 'boolean'"
        class="inline-flex cursor-pointer items-center gap-2.5"
      >
        <input
          :id="id"
          type="checkbox"
          class="peer sr-only"
          :checked="modelValue === true"
          @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <span
          class="relative h-[24px] w-[44px] shrink-0 rounded-full border border-line/15 bg-bg-tint transition-colors duration-200 peer-checked:border-accent/60 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent motion-reduce:transition-none after:absolute after:start-[3px] after:top-[2px] after:h-[17px] after:w-[17px] after:rounded-full after:bg-surface after:shadow-[0_1px_4px_rgba(0,0,0,0.35)] after:transition-transform after:duration-200 peer-checked:after:translate-x-[19px] peer-checked:after:bg-white motion-reduce:after:transition-none"
        ></span>
        <span
          class="text-[0.8rem] transition-colors"
          :class="modelValue ? 'font-medium text-ink' : 'text-muted'"
          >{{ modelValue ? t('common.on') : t('common.off') }}</span
        >
      </label>

      <div v-else-if="field.type === 'number' && bounded" class="flex items-center gap-3">
        <input
          :id="id"
          type="range"
          :value="asNumber"
          :min="field.min"
          :max="field.max"
          step="1"
          class="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-line/15 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          :style="{
            background: `linear-gradient(to right, var(--color-accent) ${filled}%, color-mix(in oklab, var(--color-line) 14%, transparent) ${filled}%)`,
          }"
          @input="onNumber($event)"
        />
        <output
          class="w-[52px] shrink-0 rounded-[7px] border border-line/10 bg-bg py-1 text-center font-mono text-[0.78rem] tabular-nums"
          >{{ asNumber }}</output
        >
      </div>

      <input
        v-else-if="field.type === 'number'"
        :id="id"
        type="number"
        :value="modelValue as number"
        :min="field.min"
        :max="field.max"
        class="w-[120px] h-[38px] rounded-[9px] border border-line/10 bg-bg px-3 py-2 font-mono text-[0.82rem] tabular-nums outline-none focus:border-accent/50"
        @input="onNumber($event)"
      />

      <TagsInput
        v-else-if="field.type === 'tags'"
        :id="id"
        :placeholder="placeholder"
        :max-items="field.maxItems"
        :model-value="asList"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <StringListInput
        v-else-if="field.type === 'string-list'"
        :model-value="asList"
        :placeholder="placeholder"
        :max-items="field.maxItems"
        :max-length="field.itemMaxLength"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <IconPicker
        v-else-if="field.type === 'icon'"
        :id="id"
        :model-value="asText"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <FlagField
        v-else-if="field.type === 'flag'"
        :id="id"
        :model-value="asText"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <LanguageField
        v-else-if="field.type === 'language'"
        :id="id"
        :model-value="asText"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <MonthField
        v-else-if="field.type === 'month'"
        :id="id"
        :model-value="asText"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <SelectField
        v-else-if="field.type === 'select'"
        :id="id"
        :model-value="asText"
        :options="field.options ?? []"
        :options-key="field.optionsKey"
        :placeholder="placeholder"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <CountryField
        v-else-if="field.type === 'country'"
        :id="id"
        :model-value="asText"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <AssetField
        v-else-if="field.type === 'asset'"
        :id="id"
        :model-value="asText"
        :accept="field.accept"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <AssetListField
        v-else-if="field.type === 'asset-list'"
        :model-value="asList"
        :accept="field.accept"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <AssetMapField
        v-else-if="field.type === 'asset-map'"
        :model-value="asMap"
        :accept="field.accept"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <input
        v-else
        :id="id"
        :type="inputType"
        :value="asText"
        :maxlength="field.maxLength"
        :placeholder="placeholder"
        class="w-full h-[38px] rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none placeholder:text-muted/70 focus:border-accent/50"
        :class="field.type === 'url' ? 'font-mono text-[0.78rem]' : ''"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </template>
  </FieldShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldShell from '@/components/ui/FieldShell.vue'
import TagsInput from '@/components/fields/TagsInput.vue'
import StringListInput from '@/components/fields/StringListInput.vue'
import CountryField from '@/components/fields/CountryField.vue'
import SelectField from '@/components/fields/SelectField.vue'
import MonthField from '@/components/fields/MonthField.vue'
import LanguageField from '@/components/fields/LanguageField.vue'
import IconPicker from '@/components/fields/IconPicker.vue'
import FlagField from '@/components/fields/FlagField.vue'
import AssetField from '@/components/fields/AssetField.vue'
import AssetListField from '@/components/fields/AssetListField.vue'
import AssetMapField from '@/components/fields/AssetMapField.vue'
import type { FieldDef } from '@/registry/collections'
import { useI18n } from 'vue-i18n'

const { t, te } = useI18n()

const props = withDefaults(
  defineProps<{
    field: FieldDef
    modelValue: unknown
    error?: string
    locale?: string
    translated?: boolean
    full?: boolean
  }>(),
  { error: '', locale: '', translated: false, full: false },
)

const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const bounded = computed(() => props.field.min !== undefined && props.field.max !== undefined)

const asNumber = computed(() =>
  typeof props.modelValue === 'number' ? props.modelValue : (props.field.min ?? 0),
)

const filled = computed(() => {
  const min = props.field.min ?? 0
  const max = props.field.max ?? 100
  if (max <= min) return 0
  return ((asNumber.value - min) / (max - min)) * 100
})

const asText = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''))

const placeholder = computed(() => {
  const key = `placeholders.${props.field.name}`
  return te(key) ? t(key) : (props.field.placeholder ?? '')
})

const inputType = computed(() => {
  if (props.field.type === 'email') return 'email'
  if (props.field.type === 'url') return 'url'
  return 'text'
})
const asList = computed(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as string[]) : [],
)
const asMap = computed(() =>
  props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue)
    ? (props.modelValue as Record<string, string>)
    : {},
)

const length = computed(() => (props.field.maxLength ? asText.value.length : undefined))

function onNumber(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  emit('update:modelValue', raw === '' ? null : Number(raw))
}
</script>
