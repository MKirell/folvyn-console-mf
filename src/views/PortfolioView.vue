<template>
  <div class="mx-auto w-full max-w-[1180px] space-y-4">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('views.portfolio.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ t('views.portfolio.blurb') }}
        </p>
      </div>
    </header>

    <SkeletonGrid
      v-if="owner.loading"
      :tiles="0"
      :panels="[12, 12, 12, 12]"
      :rows="2"
      :label="t('views.portfolio.title')"
    />

    <EmptyState
      v-else-if="!owner.record"
      icon="Shield"
      :title="t('views.portfolio.errorTitle')"
      :description="owner.error ?? t('views.portfolio.errorDesc')"
    >
      <AppButton variant="primary" @click="owner.load(true)">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <template v-else>
      <PanelCard :title="t('views.portfolio.address')" :hint="t('views.portfolio.addressHint')">
        <div v-if="!renaming" class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 break-all font-mono text-[0.9rem] max-600:basis-full">
            {{ displayUrl }}
          </p>
          <AppButton @click="startRename">
            <Pencil :size="14" :stroke-width="1.9" aria-hidden="true" />
            {{ t('views.portfolio.change') }}
          </AppButton>
          <a
            :href="owner.publicUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-line/10 bg-surface px-3.5 py-[7px] text-[0.82rem] text-ink-soft transition-colors hover:border-accent/35 hover:text-ink"
          >
            <ExternalLink :size="14" :stroke-width="1.9" aria-hidden="true" />
            {{ t('views.portfolio.viewLive') }}
          </a>
        </div>

        <div v-else>
          <label class="block">
            <span class="text-[0.76rem] font-medium text-ink-soft">{{
              t('views.portfolio.newAddress')
            }}</span>
            <span
              class="mt-1.5 flex items-center gap-0 rounded-[9px] border bg-bg px-3 py-2 font-mono text-[0.84rem]"
              :class="check?.available === false ? 'border-rust/50' : 'border-line/10'"
            >
              <span class="shrink-0 text-muted">{{ addressPrefix }}</span>
              <input
                v-model="wanted"
                type="text"
                autocomplete="off"
                spellcheck="false"
                class="min-w-0 flex-1 bg-transparent outline-none"
                :placeholder="t('views.portfolio.slugPlaceholder')"
                @keydown.enter.prevent="commitRename"
                @keydown.esc="renaming = false"
              />
            </span>
          </label>

          <p
            v-if="checking"
            class="mt-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted"
          >
            {{ t('views.portfolio.checking') }}
          </p>
          <p v-else-if="check && !check.available" class="mt-1.5 text-[0.78rem] text-rust">
            {{ check.reason }}
          </p>
          <p v-else-if="check?.available && changed" class="mt-1.5 text-[0.78rem] text-sage">
            {{ t('views.portfolio.slugFree', { slug: check.slug }) }}
          </p>

          <p class="mt-2.5 text-[0.78rem] text-muted">
            {{ t('views.portfolio.renameWarning') }}
          </p>

          <div class="mt-3 flex items-center gap-2">
            <AppButton
              variant="primary"
              :busy="owner.busy"
              :disabled="!changed || checking || check?.available !== true"
              @click="commitRename"
              >{{ t('views.portfolio.commitRename') }}</AppButton
            >
            <AppButton variant="quiet" @click="renaming = false">{{
              t('common.cancel')
            }}</AppButton>
          </div>
        </div>

        <p v-if="!renaming" class="mt-2.5 text-[0.78rem] text-muted">
          {{ t('views.portfolio.addressNote') }}
        </p>
      </PanelCard>

      <PanelCard
        :title="t('views.portfolio.publishing')"
        :hint="t('views.portfolio.publishingHint')"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="shrink-0 rounded-[6px] px-2 py-[2px] font-mono text-[0.66rem] uppercase tracking-[0.1em]"
            :class="STATE_CLASS[owner.status]"
            >{{ statusLabel(owner.status) }}</span
          >
          <p class="min-w-0 flex-1 text-[0.82rem] text-ink-soft max-600:basis-full">
            {{ stateExplanation }}
          </p>

          <AppButton
            v-if="!owner.published"
            variant="primary"
            :busy="owner.busy"
            :disabled="owner.suspended"
            @click="publish"
          >
            <Rocket :size="14" :stroke-width="2" aria-hidden="true" />
            {{ t('views.portfolio.publish') }}
          </AppButton>
          <AppButton v-else :busy="owner.busy" @click="unpublish">{{
            t('views.portfolio.unpublish')
          }}</AppButton>
        </div>

        <div
          v-if="owner.missing.length > 0"
          class="mt-3 rounded-[10px] border border-gold/30 bg-gold/8 px-3.5 py-3"
        >
          <p class="text-[0.82rem] font-medium text-gold">{{ t('views.portfolio.notReady') }}</p>
          <ul class="mt-1.5 space-y-1" role="list">
            <li v-for="item in owner.missing" :key="item" class="text-[0.78rem] text-ink-soft">
              <RouterLink :to="MISSING_ROUTE[item] ?? '/insights'" class="underline">{{
                missingLabel(item)
              }}</RouterLink>
            </li>
          </ul>
        </div>

        <p v-if="owner.record.publishedAt" class="mt-3 font-mono text-[0.7rem] text-muted">
          {{ t('views.portfolio.firstPublished', { date: publishedOn }) }}
        </p>
      </PanelCard>

      <PanelCard
        :title="t('views.portfolio.measurement')"
        :hint="t('views.portfolio.measurementHint')"
      >
        <div class="space-y-2">
          <label
            v-for="mode in CONSENT_MODES"
            :key="mode.value"
            class="flex cursor-pointer items-start gap-3 rounded-[10px] border px-3.5 py-3 transition-colors"
            :class="
              owner.consentMode === mode.value
                ? 'border-accent/40 bg-accent/6'
                : 'border-line/10 hover:border-line/20'
            "
          >
            <input
              type="radio"
              name="consent-mode"
              class="mt-[3px] accent-accent"
              :value="mode.value"
              :checked="owner.consentMode === mode.value"
              :disabled="owner.busy"
              @change="chooseConsent(mode.value)"
            />
            <span class="min-w-0">
              <span class="block text-[0.84rem] font-medium">{{ mode.label }}</span>
              <span class="mt-0.5 block text-[0.78rem] text-muted">{{ mode.description }}</span>
            </span>
          </label>
        </div>
      </PanelCard>

      <PanelCard :title="t('views.portfolio.dangerZone')" :hint="t('views.portfolio.dangerHint')">
        <div class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 text-[0.82rem] text-ink-soft max-600:basis-full">
            {{ t('views.portfolio.exportBlurb') }}
          </p>
          <AppButton @click="exportEverything">
            <Download :size="14" :stroke-width="1.9" aria-hidden="true" />
            {{ t('views.portfolio.export') }}
          </AppButton>
        </div>

        <hr class="my-3.5 border-line/8" />

        <div class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 text-[0.82rem] text-ink-soft max-600:basis-full">
            {{ t('views.portfolio.deleteBlurb') }}
          </p>
          <AppButton variant="danger" :busy="owner.busy" @click="confirming = true">
            {{ t('views.portfolio.deleteCta') }}
          </AppButton>
        </div>
      </PanelCard>
    </template>

    <ConfirmDialog
      :open="confirming"
      :title="t('views.portfolio.deleteTitle')"
      :subject="owner.slug"
      :message="t('views.portfolio.deleteMessage')"
      :confirm-label="t('views.portfolio.deleteConfirm')"
      :confirm-word="owner.slug"
      @cancel="confirming = false"
      @confirm="erase"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Download, ExternalLink, Pencil, Rocket } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import { useAuthStore } from '@/stores/auth'
import { useOwnerStore } from '@/stores/owner'
import { useUiStore } from '@/stores/ui'
import type { ConsentMode, OwnerStatus, SlugAvailability } from '@/types/admin'
import { useI18n } from 'vue-i18n'
import { statusLabel } from '@/i18n/labels'

const STATE_CLASS: Record<OwnerStatus, string> = {
  published: 'bg-sage/15 text-sage',
  draft: 'bg-gold/15 text-gold',
  suspended: 'bg-rust/15 text-rust',
}

const MISSING_ROUTE: Record<string, string> = {
  person: '/person',
  profile: '/profile',
  locale: '/locales',
  section: '/c/experience',
}

const { t, te } = useI18n()
const CONSENT_MODES = computed<{ value: ConsentMode; label: string; description: string }[]>(() => [
  {
    value: 'measurement',
    label: t('views.portfolio.consent.measurementLabel'),
    description: t('views.portfolio.consent.measurementDesc'),
  },
  {
    value: 'enhanced',
    label: t('views.portfolio.consent.enhancedLabel'),
    description: t('views.portfolio.consent.enhancedDesc'),
  },
])

const auth = useAuthStore()
const owner = useOwnerStore()
const ui = useUiStore()

const confirming = ref(false)
const renaming = ref(false)
const wanted = ref('')
const checking = ref(false)
const check = ref<SlugAvailability | null>(null)

let debounce = 0

const addressPrefix = computed(() => `${displayUrl.value.split('/')[0]}/`)
const changed = computed(() => wanted.value.trim().length > 0 && wanted.value !== owner.slug)

function startRename(): void {
  wanted.value = owner.slug
  check.value = null
  renaming.value = true
}

watch(wanted, (value) => {
  window.clearTimeout(debounce)
  check.value = null

  const candidate = value.trim()
  if (!candidate || candidate === owner.slug) {
    checking.value = false
    return
  }

  checking.value = true
  debounce = window.setTimeout(async () => {
    try {
      check.value = await owner.availability(candidate)
    } catch (cause) {
      check.value = {
        slug: candidate,
        available: false,
        reason: cause instanceof Error ? cause.message : 'That address could not be checked',
      }
    } finally {
      checking.value = false
    }
  }, 350)
})

async function commitRename(): Promise<void> {
  if (!changed.value || check.value?.available !== true) return

  try {
    await owner.setSlug(wanted.value.trim())
    renaming.value = false
    ui.notify('good', t('views.portfolio.addressChanged'), owner.publicUrl)
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.failed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

const displayUrl = computed(() => owner.publicUrl.replace(/^https?:\/\//, ''))

const publishedOn = computed(() => {
  const value = owner.record?.publishedAt
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
})

const stateExplanation = computed(() => {
  if (owner.suspended) return t('views.portfolio.suspended')
  if (owner.published) return t('views.portfolio.liveState')
  return t('views.portfolio.draftState')
})

function missingLabel(item: string): string {
  return te(`views.portfolio.missing.${item}`) ? t(`views.portfolio.missing.${item}`) : item
}

async function publish(): Promise<void> {
  try {
    await owner.publish()
    ui.notify('good', t('views.portfolio.live'), owner.publicUrl)
  } catch (cause) {
    if (owner.missing.length > 0) {
      ui.notify('warn', t('views.portfolio.notReadyToast'), t('views.portfolio.notReadyDetail'))
      return
    }
    ui.notify(
      'bad',
      t('views.portfolio.publishFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

async function unpublish(): Promise<void> {
  try {
    await owner.unpublish()
    ui.notify('good', t('views.portfolio.draftAgain'), t('views.portfolio.draftAgainDetail'))
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.failed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

async function chooseConsent(mode: ConsentMode): Promise<void> {
  if (mode === owner.consentMode) return

  try {
    await owner.setConsentMode(mode)
    ui.notify('good', t('views.portfolio.measurementUpdated'))
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.failed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

async function exportEverything(): Promise<void> {
  try {
    const data = await owner.exportEverything()
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `${owner.slug || 'portfolio'}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.exportFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

async function erase(): Promise<void> {
  confirming.value = false

  try {
    await owner.erase()
    auth.logout()
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.portfolio.deletionFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

onMounted(() => void owner.load())
</script>
