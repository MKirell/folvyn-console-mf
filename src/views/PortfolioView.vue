<template>
  <div class="mx-auto w-full max-w-[820px] space-y-4">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">Portfolio</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          Your address, whether it is live, and everything that only you can decide.
        </p>
      </div>
    </header>

    <div v-if="owner.loading" class="grid place-items-center py-20" role="status">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
    </div>

    <EmptyState
      v-else-if="!owner.record"
      icon="Shield"
      title="Your account could not be read"
      :description="owner.error ?? 'The API did not return an owner record.'"
    >
      <AppButton variant="primary" @click="owner.load(true)">Try again</AppButton>
    </EmptyState>

    <template v-else>
      <PanelCard title="Address">
        <div v-if="!renaming" class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 break-all font-mono text-[0.9rem] max-600:basis-full">
            {{ displayUrl }}
          </p>
          <AppButton @click="startRename">
            <Pencil :size="14" :stroke-width="1.9" aria-hidden="true" />
            Change
          </AppButton>
          <a
            :href="owner.publicUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-line/10 bg-surface px-3.5 py-[7px] text-[0.82rem] text-ink-soft transition-colors hover:border-accent/35 hover:text-ink"
          >
            <ExternalLink :size="14" :stroke-width="1.9" aria-hidden="true" />
            View live
          </a>
        </div>

        <div v-else>
          <label class="block">
            <span class="text-[0.76rem] font-medium text-ink-soft">New address</span>
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
                placeholder="your-name"
                @keydown.enter.prevent="commitRename"
                @keydown.esc="renaming = false"
              />
            </span>
          </label>

          <p
            v-if="checking"
            class="mt-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted"
          >
            checking…
          </p>
          <p v-else-if="check && !check.available" class="mt-1.5 text-[0.78rem] text-rust">
            {{ check.reason }}
          </p>
          <p v-else-if="check?.available && changed" class="mt-1.5 text-[0.78rem] text-sage">
            {{ check.slug }} is free
          </p>

          <p class="mt-2.5 text-[0.78rem] text-muted">
            Every link to the old address stops working the moment this changes, including anything
            already on a CV. Nobody else can take the address you leave behind while your account
            exists, but nothing forwards either.
          </p>

          <div class="mt-3 flex items-center gap-2">
            <AppButton
              variant="primary"
              :busy="owner.busy"
              :disabled="!changed || checking || check?.available !== true"
              @click="commitRename"
              >Change the address</AppButton
            >
            <AppButton variant="quiet" @click="renaming = false">Cancel</AppButton>
          </div>
        </div>

        <p v-if="!renaming" class="mt-2.5 text-[0.78rem] text-muted">
          Taken from your name when you first signed in. You can change it, but a link you have
          already shared will stop working.
        </p>
      </PanelCard>

      <PanelCard title="Publishing">
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="shrink-0 rounded-[6px] px-2 py-[2px] font-mono text-[0.66rem] uppercase tracking-[0.1em]"
            :class="STATE_CLASS[owner.status]"
            >{{ owner.status }}</span
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
            Publish
          </AppButton>
          <AppButton v-else :busy="owner.busy" @click="unpublish">Unpublish</AppButton>
        </div>

        <div
          v-if="owner.missing.length > 0"
          class="mt-3 rounded-[10px] border border-gold/30 bg-gold/8 px-3.5 py-3"
        >
          <p class="text-[0.82rem] font-medium text-gold">Not ready to publish yet</p>
          <ul class="mt-1.5 space-y-1" role="list">
            <li v-for="item in owner.missing" :key="item" class="text-[0.78rem] text-ink-soft">
              <RouterLink :to="MISSING_ROUTE[item] ?? '/insights'" class="underline">{{
                MISSING_LABEL[item] ?? item
              }}</RouterLink>
            </li>
          </ul>
        </div>

        <p v-if="owner.record.publishedAt" class="mt-3 font-mono text-[0.7rem] text-muted">
          first published {{ publishedOn }}
        </p>
      </PanelCard>

      <PanelCard title="Visitor measurement">
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

      <PanelCard title="Danger zone">
        <div class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 text-[0.82rem] text-ink-soft max-600:basis-full">
            Take a copy of everything you have written, as JSON.
          </p>
          <AppButton @click="exportEverything">
            <Download :size="14" :stroke-width="1.9" aria-hidden="true" />
            Export
          </AppButton>
        </div>

        <hr class="my-3.5 border-line/8" />

        <div class="flex flex-wrap items-center gap-3">
          <p class="min-w-0 flex-1 text-[0.82rem] text-ink-soft max-600:basis-full">
            Delete your account. Your content, your files, your visitor numbers and your sign-in are
            all removed. There is no undo and no support ticket that brings it back.
          </p>
          <AppButton variant="danger" :busy="owner.busy" @click="confirming = true">
            Delete my account
          </AppButton>
        </div>
      </PanelCard>
    </template>

    <ConfirmDialog
      :open="confirming"
      title="Delete your account?"
      :subject="owner.slug"
      message="and everything in it disappears — your content, your uploaded files, your visitor numbers and your sign-in. This cannot be undone."
      confirm-label="Delete for good"
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
import { useAuthStore } from '@/stores/auth'
import { useOwnerStore } from '@/stores/owner'
import { useUiStore } from '@/stores/ui'
import type { ConsentMode, OwnerStatus, SlugAvailability } from '@/types/admin'

const STATE_CLASS: Record<OwnerStatus, string> = {
  published: 'bg-sage/15 text-sage',
  draft: 'bg-gold/15 text-gold',
  suspended: 'bg-rust/15 text-rust',
}

const MISSING_LABEL: Record<string, string> = {
  person: 'Fill in who you are',
  profile: 'Write your hero and story',
  locale: 'Enable at least one language',
  section:
    'Add at least one section — experience, a project, a degree, a certification, skills, volunteering or an award',
}

const MISSING_ROUTE: Record<string, string> = {
  person: '/person',
  profile: '/profile',
  locale: '/locales',
  section: '/c/experience',
}

const CONSENT_MODES: { value: ConsentMode; label: string; description: string }[] = [
  {
    value: 'measurement',
    label: 'Measurement only — no banner',
    description:
      'Counts sessions, sections and clicks without anything that survives the tab. No cookie, no consent banner, and visitor numbers are approximate by design.',
  },
  {
    value: 'enhanced',
    label: 'Enhanced — needs a consent banner',
    description:
      'Adds returning visitors and true unique counts per document, which needs an identifier that lasts. Your visitors get a banner they can refuse, and the legal exposure is yours.',
  },
]

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
    ui.notify('good', 'Address changed', owner.publicUrl)
  } catch (cause) {
    ui.notify('bad', 'That did not work', cause instanceof Error ? cause.message : undefined)
  }
}

const displayUrl = computed(() => owner.publicUrl.replace(/^https?:\/\//, ''))

const publishedOn = computed(() => {
  const value = owner.record?.publishedAt
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
})

const stateExplanation = computed(() => {
  if (owner.suspended) return 'The platform took this offline. Get in touch to have it reviewed.'
  if (owner.published)
    return 'Anyone with the address can read it, and search engines can index it.'
  return 'Only you can see it. Publishing makes the address public.'
})

async function publish(): Promise<void> {
  try {
    await owner.publish()
    ui.notify('good', 'Your portfolio is live', owner.publicUrl)
  } catch (cause) {
    if (owner.missing.length > 0) {
      ui.notify('warn', 'Not ready to publish', 'Finish the items listed on this screen.')
      return
    }
    ui.notify('bad', 'Publishing failed', cause instanceof Error ? cause.message : undefined)
  }
}

async function unpublish(): Promise<void> {
  try {
    await owner.unpublish()
    ui.notify('good', 'Your portfolio is a draft again', 'The public address now returns nothing.')
  } catch (cause) {
    ui.notify('bad', 'That did not work', cause instanceof Error ? cause.message : undefined)
  }
}

async function chooseConsent(mode: ConsentMode): Promise<void> {
  if (mode === owner.consentMode) return

  try {
    await owner.setConsentMode(mode)
    ui.notify('good', 'Measurement updated')
  } catch (cause) {
    ui.notify('bad', 'That did not work', cause instanceof Error ? cause.message : undefined)
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
    ui.notify('bad', 'Export failed', cause instanceof Error ? cause.message : undefined)
  }
}

async function erase(): Promise<void> {
  confirming.value = false

  try {
    await owner.erase()
    auth.logout()
  } catch (cause) {
    ui.notify('bad', 'Deletion failed', cause instanceof Error ? cause.message : undefined)
  }
}

onMounted(() => void owner.load())
</script>
