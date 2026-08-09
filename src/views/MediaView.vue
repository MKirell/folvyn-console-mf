<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">Media</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ media.assets.length }} files · {{ media.orphans.length }} unreferenced ·
          {{ media.missing.length }} referenced but absent
        </p>
      </div>

      <div class="flex items-center gap-1.5 rounded-[9px] border border-line/8 bg-surface px-2.5">
        <Search :size="14" :stroke-width="1.9" class="shrink-0 text-muted" aria-hidden="true" />
        <input
          v-model="query"
          type="text"
          class="w-[150px] bg-transparent py-[7px] text-[0.8rem] outline-none placeholder:text-muted"
          placeholder="Filter…"
          aria-label="Filter files"
        />
      </div>

      <select
        v-model="filter"
        class="rounded-[9px] border border-line/8 bg-surface px-2.5 py-[7px] text-[0.8rem] outline-none"
        aria-label="Filter by kind"
      >
        <option value="all">All files</option>
        <option value="image">Images</option>
        <option value="pdf">Documents</option>
        <option value="orphan">Unreferenced</option>
      </select>

      <AppButton variant="primary" :busy="media.uploading > 0" @click="fileRef?.click()">
        <Upload :size="14" :stroke-width="2" aria-hidden="true" />
        Upload
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
      v-if="!media.available"
      class="mb-4 rounded-[10px] border border-gold/35 bg-gold/[0.06] px-3.5 py-3"
    >
      <p class="text-[0.82rem] font-medium text-gold">The uploads endpoint is not live yet</p>
      <p class="mt-1 text-[0.78rem] text-muted">
        {{ media.error }} — until Phase 3 ships, asset fields accept a typed key and the portfolio
        keeps serving files from its repo.
      </p>
    </div>

    <div
      v-if="media.missing.length"
      class="mb-4 rounded-[10px] border border-rust/30 bg-rust/[0.06] px-3.5 py-3"
    >
      <p class="text-[0.82rem] font-medium text-rust">
        {{ media.missing.length }} referenced file{{ media.missing.length === 1 ? '' : 's' }} not in
        the bucket
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
        v-if="visible.length"
        class="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-2.5"
        role="list"
      >
        <li
          v-for="asset in visible"
          :key="asset.key"
          class="overflow-hidden rounded-[11px] border border-line/8 bg-surface"
        >
          <span class="grid h-[92px] place-items-center bg-bg-tint">
            <img
              v-if="isImageKey(asset.key)"
              :src="assetUrl(asset.key)"
              :alt="asset.key"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <FileText v-else :size="24" :stroke-width="1.4" class="text-muted" />
          </span>

          <div class="p-2.5">
            <p class="truncate font-mono text-[0.68rem]" :title="asset.key">{{ asset.key }}</p>
            <p class="mt-0.5 font-mono text-[0.62rem] text-muted">{{ formatBytes(asset.size) }}</p>

            <p
              v-if="refsFor(asset.key).length"
              class="mt-1.5 truncate text-[0.66rem] text-sage"
              :title="
                refsFor(asset.key)
                  .map((r) => `${r.collection}: ${r.label}`)
                  .join('\n')
              "
            >
              {{ refsFor(asset.key).length }} reference{{
                refsFor(asset.key).length === 1 ? '' : 's'
              }}
            </p>
            <p v-else class="mt-1.5 text-[0.66rem] text-gold">unreferenced</p>

            <div class="mt-2 flex items-center gap-1">
              <a
                :href="assetUrl(asset.key)"
                target="_blank"
                rel="noreferrer"
                class="grid h-6 w-6 place-items-center rounded-[6px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
                aria-label="Open"
                title="Open"
              >
                <ExternalLink :size="13" :stroke-width="1.9" />
              </a>
              <button
                type="button"
                class="grid h-6 w-6 place-items-center rounded-[6px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
                aria-label="Copy key"
                title="Copy key"
                @click="copyKey(asset.key)"
              >
                <Copy :size="13" :stroke-width="1.9" />
              </button>
              <button
                type="button"
                class="ms-auto grid h-6 w-6 place-items-center rounded-[6px] text-muted transition-colors hover:bg-bg-tint hover:text-rust disabled:opacity-25"
                :disabled="refsFor(asset.key).length > 0"
                :title="refsFor(asset.key).length ? 'Still referenced' : 'Delete'"
                aria-label="Delete"
                @click="pending = asset.key"
              >
                <Trash2 :size="13" :stroke-width="1.9" />
              </button>
            </div>
          </div>
        </li>
      </ul>

      <EmptyState
        v-else
        icon="Image"
        title="No files here"
        description="Drop files anywhere in this panel, or use the upload button."
      />
    </div>

    <ConfirmDialog
      :open="pending !== null"
      title="Delete this file?"
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
import { useMediaStore, type AssetReference } from '@/stores/media'
import { useUiStore } from '@/stores/ui'
import { assetUrl, extensionOf, formatBytes, isImageKey } from '@/utils/assets'

const media = useMediaStore()
const ui = useUiStore()

const fileRef = useTemplateRef<HTMLInputElement>('fileRef')
const query = ref('')
const filter = ref<'all' | 'image' | 'pdf' | 'orphan'>('all')
const dropping = ref(false)
const pending = ref<string | null>(null)

const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()

  return media.assets.filter((asset) => {
    if (needle && !asset.key.toLowerCase().includes(needle)) return false
    if (filter.value === 'image') return isImageKey(asset.key)
    if (filter.value === 'pdf') return extensionOf(asset.key) === 'pdf'
    if (filter.value === 'orphan') return refsFor(asset.key).length === 0
    return true
  })
})

function refsFor(key: string): AssetReference[] {
  return media.references[key] ?? []
}

async function uploadAll(files: FileList | null): Promise<void> {
  if (!files?.length) return

  for (const file of Array.from(files)) {
    try {
      await media.upload(file)
      ui.notify('good', `Uploaded ${file.name}`)
    } catch (error) {
      ui.notify(
        'bad',
        `Upload failed for ${file.name}`,
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
    ui.notify('info', 'Key copied')
  } catch {
    ui.notify('warn', 'The clipboard is not available')
  }
}

async function confirmDelete(): Promise<void> {
  const key = pending.value
  pending.value = null
  if (!key) return

  try {
    await media.remove(key)
    ui.notify('good', 'File deleted')
  } catch (error) {
    ui.notify('bad', 'Delete failed', error instanceof Error ? error.message : undefined)
  }
}

onMounted(() => void media.load())
</script>
