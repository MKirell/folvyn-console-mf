<template>
  <span
    class="relative row-span-full grid min-h-[132px] w-full place-items-center overflow-hidden rounded-[12px] border border-line/10 bg-bg-tint p-2 max-900:row-span-1"
    :class="modelValue ? '' : 'border-dashed'"
  >
    <img
      v-if="modelValue && isImageKey(modelValue)"
      :src="assetUrl(modelValue)"
      :alt="modelValue"
      class="max-h-full max-w-full object-contain max-900:max-h-[220px]"
    />
    <FileText v-else-if="modelValue" :size="26" :stroke-width="1.4" class="text-muted" />
    <ImageOff v-else :size="26" :stroke-width="1.4" class="text-muted" />
  </span>
</template>

<script setup lang="ts">
import { FileText, ImageOff } from '@lucide/vue'
import { assetUrl, isImageKey } from '@/utils/assets'

defineProps<{ modelValue: string }>()
</script>
