<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('views.media.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{
            t('views.media.summary', {
              files: media.assets.length,
              orphans: media.orphans.length,
              missing: media.missing.length,
            })
          }}
        </p>
      </div>

      <div
        class="flex min-w-0 items-center gap-1.5 rounded-[9px] border border-line/8 bg-surface px-2.5 max-480:basis-full"
      >
        <Search :size="14" :stroke-width="1.9" class="shrink-0 text-muted" aria-hidden="true" />
        <input
          v-model="query"
          type="text"
          class="w-[150px] min-w-0 shrink bg-transparent py-[7px] text-[0.8rem] outline-none placeholder:text-muted max-480:w-full"
          :placeholder="t('common.filter')"
          :aria-label="t('views.media.filterAria')"
        />
      </div>

      <select
        v-model="filter"
        class="rounded-[9px] border border-line/8 bg-surface px-2.5 py-[7px] text-[0.8rem] outline-none"
        :aria-label="t('views.media.kindAria')"
      >
        <option value="all">{{ t('views.media.all') }}</option>
        <option value="image">{{ t('views.media.images') }}</option>
        <option value="pdf">{{ t('views.media.documents') }}</option>
        <option value="orphan">{{ t('views.media.unreferenced') }}</option>
      </select>

      <AppButton
        variant="primary"
        :busy="media.uploading > 0"
        :disabled="readOnly"
        :title="readOnly ? t('views.media.repoTitle') : ''"
        @click="fileRef?.click()"
      >
        <Upload :size="14" :stroke-width="2" aria-hidden="true" />
        {{ t('views.media.upload') }}
      </AppButton>
      <input
        ref="fileRef"
        type="file"
        multiple
        class="hidden"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/svg+xml"
        @change="onFiles"
      />
    </header>

    <div
      v-if="media.source === 'repo'"
      class="mb-4 rounded-[10px] border border-line/12 bg-surface px-3.5 py-3"
    >
      <p class="text-[0.82rem] font-medium">{{ t('views.media.repoTitle') }}</p>
      <p class="mt-1 text-[0.78rem] text-muted">
        {{ media.writable ? t('views.media.repoWritableDesc') : t('views.media.repoDesc') }}
      </p>
    </div>

    <div
      v-else-if="media.error"
      class="mb-4 rounded-[10px] border border-gold/35 bg-gold/[0.06] px-3.5 py-3"
    >
      <p class="text-[0.82rem] font-medium text-gold">{{ t('views.media.notLive') }}</p>
      <p class="mt-1 text-[0.78rem] text-muted">{{ media.error }}</p>
    </div>

    <div
      v-if="!media.loading && media.missing.length"
      class="mb-4 rounded-[10px] border border-rust/30 bg-rust/[0.06] px-3.5 py-3"
    >
      <p class="text-[0.82rem] font-medium text-rust">
        {{ media.missing.length }} referenced file{{ media.missing.length === 1 ? '' : 's' }}
        {{
          readOnly || media.source === 'repo'
            ? t('views.media.missingRepo')
            : t('views.media.missingBucket')
        }}
      </p>
      <ul class="mt-1.5 flex flex-wrap gap-1.5" role="list">
        <li
          v-for="key in media.missing"
          :key="key"
          class="rounded-[6px] bg-surface px-2 py-[2px] font-mono text-[0.68rem]"
        >
          {{ key }}
        </li>
      </ul>
    </div>

    <div
      class="rounded-lg border border-dashed p-4 transition-colors motion-reduce:transition-none"
      :class="dropping ? 'border-accent/60 bg-accent/[0.05]' : 'border-line/12'"
      @dragover.prevent="dropping = true"
      @dragleave="dropping = false"
      @drop.prevent="onDrop"
    >
      <ul
        v-if="media.loading"
        class="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-2.5"
        role="status"
        :aria-label="t('views.media.title')"
      >
        <li
          v-for="card in 12"
          :key="card"
          class="overflow-hidden rounded-[9px] border border-line/10 bg-surface"
        >
          <SkeletonBar class="aspect-[16/9] w-full rounded-none" />
          <div class="px-1.5 py-1.5">
            <SkeletonBar class="h-[9px] w-[78%]" />
          </div>
        </li>
      </ul>

      <ul
        v-else-if="visible.length"
        class="grid grid-cols-[repeat(auto-fill,minmax(min(180px,100%),1fr))] gap-2.5"
        role="list"
      >
        <li
          v-for="asset in visible"
          :key="asset.key"
          class="group relative overflow-hidden rounded-[9px] border border-line/10 bg-surface"
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
            <PdfThumb v-else-if="isPdfKey(asset.key)" :src="assetUrl(asset.key)" />
            <FileText v-else :size="22" :stroke-width="1.5" class="text-muted" />

            <span
              v-if="!refsFor(asset.key).length"
              class="absolute start-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold group-hover:opacity-0"
              :title="t('views.media.unreferencedTag')"
            ></span>

            <span
              class="absolute inset-0 flex flex-col justify-between bg-scrim/70 p-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
              :class="{ 'opacity-100': revealed === asset.key }"
              @click="reveal(asset.key)"
            >
              <span class="flex items-baseline gap-2 text-[0.6rem] text-white/75">
                <span class="shrink-0 font-mono">{{ formatBytes(asset.size) }}</span>
                <span
                  v-if="refsFor(asset.key).length"
                  class="ms-auto truncate"
                  :title="
                    refsFor(asset.key)
                      .map((r) => `${r.collection}: ${r.label}`)
                      .join('\n')
                  "
                  >{{ refsFor(asset.key).length }} reference{{
                    refsFor(asset.key).length === 1 ? '' : 's'
                  }}</span
                >
                <span v-else class="ms-auto truncate text-gold">{{
                  t('views.media.unreferencedTag')
                }}</span>
              </span>

              <span class="flex items-center gap-1">
                <a
                  :href="openUrl(asset.key)"
                  target="_blank"
                  rel="noreferrer"
                  class="grid h-6 w-6 place-items-center rounded-[6px] text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  :aria-label="t('views.media.open')"
                  :title="t('views.media.open')"
                >
                  <ExternalLink :size="13" :stroke-width="1.9" />
                </a>
                <button
                  type="button"
                  class="grid h-6 w-6 place-items-center rounded-[6px] text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  :aria-label="t('views.media.copyKey')"
                  :title="t('views.media.copyKey')"
                  @click.stop="copyKey(asset.key)"
                >
                  <Copy :size="13" :stroke-width="1.9" />
                </button>
                <button
                  type="button"
                  class="ms-auto grid h-6 w-6 place-items-center rounded-[6px] text-white/80 transition-colors hover:bg-rust/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  :disabled="readOnly || refsFor(asset.key).length > 0"
                  :title="deleteTitle(asset.key)"
                  :aria-label="t('common.delete')"
                  @click.stop="pending = asset.key"
                >
                  <Trash2 :size="13" :stroke-width="1.9" />
                </button>
              </span>
            </span>
          </span>

          <span class="block truncate px-1.5 py-1.5 font-mono text-[0.62rem]" :title="asset.key">{{
            asset.key
          }}</span>
        </li>
      </ul>

      <EmptyState
        v-else
        icon="Image"
        :title="readOnly ? t('views.media.emptyRepoTitle') : t('views.media.emptyTitle')"
        :description="readOnly ? t('views.media.emptyRepoDesc') : t('views.media.emptyDesc')"
      />
    </div>

    <ConfirmDialog
      :open="pending !== null"
      :title="t('views.media.deleteTitle')"
      :subject="pending ?? ''"
      message="will be removed from your files. Nothing references it, so no page should change."
      confirm-word="delete"
      @cancel="pending = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { Copy, ExternalLink, FileText, Search, Trash2, Upload } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
import PdfThumb from '@/components/ui/PdfThumb.vue'
import { useMediaStore, type AssetReference } from '@/stores/media'
import { useUiStore } from '@/stores/ui'
import { assetUrl, extensionOf, formatBytes, isImageKey, isPdfKey, openUrl } from '@/utils/assets'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const media = useMediaStore()
const ui = useUiStore()

const fileRef = useTemplateRef<HTMLInputElement>('fileRef')
const query = ref('')
const filter = ref<'all' | 'image' | 'pdf' | 'orphan'>('all')

const revealed = ref<string | null>(null)

function reveal(key: string): void {
  if (window.matchMedia?.('(hover: hover)').matches) return
  revealed.value = revealed.value === key ? null : key
}
const dropping = ref(false)
const pending = ref<string | null>(null)

const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()

  return media.assets
    .filter((asset) => {
      if (needle && !asset.key.toLowerCase().includes(needle)) return false
      if (filter.value === 'image') return isImageKey(asset.key)
      if (filter.value === 'pdf') return extensionOf(asset.key) === 'pdf'
      if (filter.value === 'orphan') return refsFor(asset.key).length === 0
      return true
    })
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
})

const readOnly = computed(() => !media.writable)

function refsFor(key: string): AssetReference[] {
  return media.references[key] ?? []
}

function deleteTitle(key: string): string {
  if (readOnly.value) return t('views.media.repoReadOnly')
  return refsFor(key).length ? t('views.media.stillReferenced') : t('common.delete')
}

async function uploadAll(files: FileList | null): Promise<void> {
  if (!files?.length) return

  for (const file of Array.from(files)) {
    try {
      await media.upload(file)
      ui.notify('good', t('views.media.uploaded', { name: file.name }))
    } catch (error) {
      ui.notify(
        'bad',
        t('views.media.uploadFailed', { name: file.name }),
        error instanceof Error ? error.message : undefined,
      )
    }
  }
}

async function onFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files
  input.value = ''
  await uploadAll(files)
}

async function onDrop(event: DragEvent): Promise<void> {
  dropping.value = false
  await uploadAll(event.dataTransfer?.files ?? null)
}

async function copyKey(key: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(key)
    ui.notify('info', t('views.media.keyCopied'))
  } catch {
    ui.notify('warn', t('views.media.noClipboard'))
  }
}

async function confirmDelete(): Promise<void> {
  const key = pending.value
  pending.value = null
  if (!key) return

  try {
    await media.remove(key)
    ui.notify('good', t('views.media.deleted'))
  } catch (error) {
    ui.notify(
      'bad',
      t('views.media.deleteFailed'),
      error instanceof Error ? error.message : undefined,
    )
  }
}

onMounted(() => void media.load())
</script>
