<template>
  <div class="flex flex-wrap items-center gap-2">
    <span
      class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-line/10 bg-bg-tint"
    >
      <img
        v-if="modelValue && isImageKey(modelValue)"
        :src="assetUrl(modelValue)"
        :alt="modelValue"
        class="h-full w-full object-cover"
      />
      <FileText v-else-if="modelValue" :size="15" :stroke-width="1.6" class="text-muted" />
      <ImageOff v-else :size="15" :stroke-width="1.6" class="text-muted" />
    </span>

    <input
      :id="id"
      :value="modelValue"
      type="text"
      class="min-w-0 flex-1 basis-[12ch] h-[38px] rounded-[9px] border border-line/10 bg-bg px-3 py-2 font-mono text-[0.78rem] outline-none focus:border-accent/50"
      :placeholder="accept === 'pdf' ? 'document.pdf' : 'image.jpg'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <AppButton size="sm" @click="pickerOpen = true">{{ t('assets.choose') }}</AppButton>
    <a
      v-if="modelValue"
      :href="assetUrl(modelValue)"
      target="_blank"
      rel="noreferrer"
      class="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
      :title="t('assets.openFile')"
      :aria-label="t('assets.openFile')"
    >
      <ExternalLink :size="14" :stroke-width="1.9" />
    </a>
    <button
      v-if="modelValue"
      type="button"
      class="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-rust"
      :title="t('assets.clear')"
      :aria-label="t('assets.clearFile')"
      @click="emit('update:modelValue', '')"
    >
      <X :size="14" :stroke-width="2" />
    </button>

    <AssetPicker
      :open="pickerOpen"
      :accept="accept"
      :model-value="modelValue"
      @close="pickerOpen = false"
      @select="emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink, FileText, ImageOff, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AssetPicker from '@/components/fields/AssetPicker.vue'
import { assetUrl, isImageKey } from '@/utils/assets'
import type { AssetKind } from '@/registry/collections'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{ modelValue: string; accept?: AssetKind; id?: string }>(), {
  accept: undefined,
  id: undefined,
})

const { t } = useI18n()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const pickerOpen = ref(false)
</script>
