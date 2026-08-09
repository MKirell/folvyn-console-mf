<template>
  <div>
    <ul
      v-if="modelValue.length"
      class="mb-2 grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2"
      role="list"
    >
      <li
        v-for="(key, index) in modelValue"
        :key="`${key}-${index}`"
        class="group relative overflow-hidden rounded-[9px] border border-line/10"
      >
        <span class="grid h-[68px] place-items-center bg-bg-tint">
          <img
            v-if="isImageKey(key)"
            :src="assetUrl(key)"
            :alt="key"
            class="h-full w-full object-cover"
            loading="lazy"
          />
          <FileText v-else :size="18" :stroke-width="1.5" class="text-muted" />
        </span>
        <span class="block truncate px-1.5 py-1 font-mono text-[0.62rem]">{{ key }}</span>
        <button
          type="button"
          class="absolute end-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-scrim/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          :aria-label="`Remove ${key}`"
          @click="removeAt(index)"
        >
          <X :size="11" :stroke-width="2.4" />
        </button>
      </li>
    </ul>

    <AppButton size="sm" @click="pickerOpen = true">
      <Plus :size="13" :stroke-width="2" aria-hidden="true" />
      Add image
    </AppButton>

    <AssetPicker :open="pickerOpen" :accept="accept" @close="pickerOpen = false" @select="append" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FileText, Plus, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AssetPicker from '@/components/fields/AssetPicker.vue'
import { assetUrl, isImageKey } from '@/utils/assets'
import type { AssetKind } from '@/registry/collections'

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
