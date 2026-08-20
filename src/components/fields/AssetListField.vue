<template>
  <div>
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(132px,100%),1fr))] gap-2.5" role="list">
      <li
        v-for="(key, index) in modelValue"
        :key="`${key}-${index}`"
        class="group relative overflow-hidden rounded-[9px] border border-line/10"
      >
        <span
          class="relative grid aspect-[16/9] w-full place-items-center overflow-hidden bg-bg-tint"
        >
          <img
            v-if="isImageKey(key)"
            :src="assetUrl(key)"
            :alt="key"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <PdfThumb v-else-if="isPdfKey(key)" :src="assetUrl(key)" />
          <FileText v-else :size="18" :stroke-width="1.5" class="text-muted" />
        </span>
        <span class="block truncate px-1.5 py-1.5 font-mono text-[0.62rem]">{{ key }}</span>
        <button
          type="button"
          class="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-scrim/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-700:opacity-100"
          :aria-label="`Remove ${key}`"
          @click="removeAt(index)"
        >
          <X :size="11" :stroke-width="2.4" />
        </button>
      </li>

      <li>
        <button
          type="button"
          class="flex w-full flex-col overflow-hidden rounded-[9px] border border-dashed border-line/20 text-muted transition-colors motion-reduce:transition-none hover:border-accent/50 hover:text-ink"
          @click="pickerOpen = true"
        >
          <span class="grid aspect-[16/9] w-full place-items-center bg-bg-tint/50">
            <Plus :size="18" :stroke-width="2" aria-hidden="true" />
          </span>
          <span class="block w-full truncate px-1.5 py-1.5 text-[0.62rem]">{{
            t('ui.addImage')
          }}</span>
        </button>
      </li>
    </ul>

    <AssetPicker :open="pickerOpen" :accept="accept" @close="pickerOpen = false" @select="append" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PdfThumb from '@/components/ui/PdfThumb.vue'
import { FileText, Plus, X } from '@lucide/vue'
import AssetPicker from '@/components/fields/AssetPicker.vue'
import { assetUrl, isImageKey, isPdfKey } from '@/utils/assets'
import type { AssetKind } from '@/registry/collections'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = withDefaults(defineProps<{ modelValue: string[]; accept?: AssetKind }>(), {
  accept: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const pickerOpen = ref(false)

function append(key: string): void {
  if (props.modelValue.includes(key)) return
  emit('update:modelValue', [...props.modelValue, key])
}

function removeAt(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, position) => position !== index),
  )
}
</script>
