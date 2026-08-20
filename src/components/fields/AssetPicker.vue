<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[124] grid place-items-center bg-scrim/40 px-4 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      :aria-label="t('assets.chooseFile')"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-lg border border-line/10 bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.32)] animate-fade-up"
      >
        <header class="flex flex-wrap items-center gap-2.5 border-b border-line/8 px-4 py-3">
          <h2
            class="min-w-0 flex-1 truncate font-disp text-[0.96rem] font-semibold tracking-tight max-480:basis-full"
          >
            {{ accept === 'pdf' ? t('assets.chooseDocument') : t('assets.chooseImage') }}
          </h2>
          <input
            v-model="query"
            type="text"
            class="w-[180px] min-w-0 shrink rounded-[8px] border border-line/10 bg-bg px-2.5 py-1.5 text-[0.78rem] outline-none focus:border-accent/50 max-480:flex-1"
            :placeholder="t('common.filter')"
            :aria-label="t('views.media.filterAria')"
          />
          <AppButton
            size="sm"
            variant="primary"
            :busy="media.uploading > 0"
            :disabled="!media.writable"
            :title="media.writable ? '' : t('assets.repoNote')"
            @click="fileRef?.click()"
          >
            <Upload :size="13" :stroke-width="2" aria-hidden="true" />
            {{ t('assets.upload') }}
          </AppButton>
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            :accept="acceptAttribute"
            @change="onFiles"
          />
        </header>

        <div class="scroll-thin flex-1 overflow-y-auto p-4">
          <p v-if="media.loading" class="py-8 text-center text-[0.82rem] text-muted">
            {{ t('assets.loading') }}
          </p>

          <div
            v-else-if="media.error && !candidates.length"
            class="rounded-[10px] border border-gold/35 bg-gold/8 p-4"
          >
            <p class="text-[0.82rem] font-medium text-gold">{{ t('assets.unreachable') }}</p>
            <p class="mt-1 text-[0.78rem] text-muted">
              {{ t('assets.unreachableDesc', { error: media.error }) }}
            </p>
          </div>

          <div
            v-else-if="media.source === 'repo'"
            class="mb-3 rounded-[10px] border border-line/12 bg-bg px-3.5 py-2.5"
          >
            <p class="text-[0.78rem] text-muted">
              {{ media.writable ? t('assets.repoWritableNote') : t('assets.repoNote') }}
            </p>
          </div>

          <ul
            v-if="!media.loading && candidates.length"
            class="grid grid-cols-[repeat(auto-fill,minmax(min(132px,100%),1fr))] gap-2.5"
            role="list"
          >
            <li v-for="asset in candidates" :key="asset.key">
              <button
                type="button"
                class="group w-full overflow-hidden rounded-[10px] border text-start transition-[border-color] motion-reduce:transition-none"
                :class="
                  asset.key === modelValue
                    ? 'border-accent/60 bg-accent/8'
                    : 'border-line/10 hover:border-accent/40'
                "
                @click="pick(asset.key)"
              >
                <span
                  class="relative grid aspect-[16/9] w-full place-items-center overflow-hidden bg-bg-tint"
                >
                  <img
                    v-if="isImageKey(asset.key)"
                    :src="assetUrl(asset.key)"
                    :alt="asset.key"
                    class="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <iframe
                    v-else-if="isPdfKey(asset.key)"
                    v-page-thumb
                    :src="pdfPreviewUrl(asset.key)"
                    :title="asset.key"
                    class="page-thumb pointer-events-none"
                    scrolling="no"
                    loading="lazy"
                    tabindex="-1"
                    aria-hidden="true"
                  ></iframe>
                  <FileText v-else :size="22" :stroke-width="1.5" class="text-muted" />
                </span>
                <span class="block truncate px-2 py-1.5 font-mono text-[0.66rem]">{{
                  asset.key
                }}</span>
              </button>
            </li>
          </ul>

          <EmptyState
            v-else-if="!media.loading && !media.error"
            icon="Image"
            :title="t('assets.noMatchTitle')"
            :description="t('assets.noMatchDesc')"
          />
        </div>

        <footer class="flex flex-wrap items-center gap-2 border-t border-line/8 px-4 py-3">
          <input
            v-model="manual"
            type="text"
            class="h-[38px] min-w-0 flex-1 rounded-[9px] border border-line/10 bg-bg px-3 py-2 font-mono text-[0.78rem] outline-none focus:border-accent/50 max-480:basis-full"
            placeholder="or type a key, for example degree-bachelor-2024.pdf"
            :aria-label="t('assets.fileKey')"
            @keydown.enter.prevent="pick(manual.trim())"
          />
          <AppButton size="sm" @click="emit('close')">{{ t('common.cancel') }}</AppButton>
          <AppButton
            size="sm"
            variant="primary"
            :disabled="!manual.trim()"
            @click="pick(manual.trim())"
          >
            {{ t('assets.useKey') }}
          </AppButton>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { FileText, Upload } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useMediaStore } from '@/stores/media'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'
import { assetUrl, isImageKey, isPdfKey, matchesKind, pdfPreviewUrl } from '@/utils/assets'
import type { AssetKind } from '@/registry/collections'

const props = withDefaults(
  defineProps<{ open: boolean; accept?: AssetKind; modelValue?: string }>(),
  { accept: undefined, modelValue: '' },
)

const emit = defineEmits<{ close: []; select: [string] }>()

const media = useMediaStore()
const { t } = useI18n()
const ui = useUiStore()

const fileRef = useTemplateRef<HTMLInputElement>('fileRef')
const query = ref('')
const manual = ref('')

const acceptAttribute = computed(() =>
  props.accept === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg,image/webp,image/svg+xml',
)

const candidates = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return media.assets
    .filter((asset) => matchesKind(asset.key, props.accept))
    .filter((asset) => !needle || asset.key.toLowerCase().includes(needle))
})

function pick(key: string): void {
  if (!key) return
  emit('select', key)
  emit('close')
}

async function onFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    pick(await media.upload(file))
    ui.notify('good', t('assets.uploaded'))
  } catch (error) {
    ui.notify('bad', t('assets.uploadFailed'), error instanceof Error ? error.message : undefined)
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    query.value = ''
    manual.value = props.modelValue ?? ''
    void media.load()
  },
  { immediate: true },
)
</script>
