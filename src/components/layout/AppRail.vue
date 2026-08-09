<template>
  <div
    v-if="ui.mobileNavOpen"
    class="fixed inset-0 z-[95] hidden max-1000:block bg-scrim/40 backdrop-blur-[6px]"
    @click="ui.mobileNavOpen = false"
  ></div>

  <aside
    class="fixed inset-y-0 start-0 z-[96] flex flex-col border-e border-line/8 bg-surface transition-[width,transform] duration-300 ease-out motion-reduce:transition-none max-1000:!w-rail"
    :class="[
      ui.railCollapsed ? 'w-rail-tight' : 'w-rail',
      ui.mobileNavOpen ? 'max-1000:translate-x-0' : 'max-1000:-translate-x-full',
    ]"
    aria-label="Console navigation"
  >
    <div class="flex h-topbar shrink-0 items-center gap-2.5 border-b border-line/8 px-3.5">
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent/12 text-accent-deep"
      >
        <Terminal :size="17" :stroke-width="2" aria-hidden="true" />
      </span>
      <span v-if="!tight" class="min-w-0 flex-1 leading-tight">
        <span class="block truncate font-disp text-[0.98rem] font-semibold tracking-tight"
          >Console</span
        >
        <span class="block truncate font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted"
          >folvyn</span
        >
      </span>
      <button
        type="button"
        class="hidden max-1000:grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
        aria-label="Close navigation"
        @click="ui.mobileNavOpen = false"
      >
        <X :size="16" :stroke-width="2" />
      </button>
    </div>

    <nav ref="navRef" class="scroll-thin relative flex-1 overflow-y-auto px-2.5 py-3">
      <span
        class="pointer-events-none absolute start-0 top-0 w-[3px] rounded-e-full bg-accent transition-[top,height,opacity] duration-[320ms] ease-[cubic-bezier(0.34,1.4,0.5,1)] motion-reduce:transition-none"
        :class="spine.height > 0 ? 'opacity-100' : 'opacity-0'"
        :style="{ height: `${spine.height}px`, top: `${spine.top}px` }"
        aria-hidden="true"
      ></span>

      <template v-if="auth.isPlatform">
        <RailLink :item="platformOverview" :tight="tight" />

        <div v-for="group in platformGroups" :key="group.label" class="mt-4">
          <p
            v-if="!tight"
            class="px-2.5 pb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
          >
            {{ group.label }}
          </p>
          <span
            v-else
            class="mx-auto my-2.5 block h-px w-5 bg-line/12"
            role="separator"
            aria-hidden="true"
          ></span>
          <RailLink v-for="item in group.items" :key="item.key" :item="item" :tight="tight" />
        </div>
      </template>

      <template v-else>
        <RailLink :item="dashboard" :tight="tight" />
        <RailLink :item="portfolio" :tight="tight" />

        <div v-for="group in groups" :key="group.label" class="mt-4">
          <p
            v-if="!tight"
            class="px-2.5 pb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
          >
            {{ group.label }}
          </p>
          <span
            v-else
            class="mx-auto my-2.5 block h-px w-5 bg-line/12"
            role="separator"
            aria-hidden="true"
          ></span>
          <RailLink v-for="item in group.items" :key="item.key" :item="item" :tight="tight" />
        </div>

        <div class="mt-4">
          <p
            v-if="!tight"
            class="px-2.5 pb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
          >
            Workshop
          </p>
          <span
            v-else
            class="mx-auto my-2.5 block h-px w-5 bg-line/12"
            role="separator"
            aria-hidden="true"
          ></span>
          <RailLink v-for="item in workshop" :key="item.key" :item="item" :tight="tight" />
        </div>
      </template>
    </nav>

    <div class="shrink-0 border-t border-line/8 px-2.5 py-2.5">
      <component
        :is="auth.isPlatform ? 'div' : RouterLink"
        v-if="!tight"
        :to="auth.isPlatform ? undefined : { name: 'person' }"
        class="mb-2 flex items-center gap-2 rounded-[9px] px-2 py-1"
        :class="auth.isPlatform ? '' : 'transition-colors hover:bg-bg-tint'"
        :title="auth.isPlatform ? undefined : `Edit ${accountName}`"
      >
        <img
          v-if="auth.avatar && !avatarBroken"
          :src="auth.avatar"
          :alt="accountName"
          referrerpolicy="no-referrer"
          class="h-7 w-7 shrink-0 rounded-full object-cover"
          @error="avatarBroken = true"
        />
        <span
          v-else
          class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg-tint font-mono text-[0.66rem] text-ink-soft"
          >{{ initials }}</span
        >
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-1.5">
            <span class="min-w-0 truncate text-[0.76rem] font-medium">{{ accountName }}</span>
            <span
              v-if="auth.isPlatform"
              class="shrink-0 rounded-[4px] bg-accent/15 px-1.5 py-[1px] font-mono text-[0.56rem] uppercase tracking-[0.12em] text-accent-deep"
              >admin</span
            >
          </span>
          <span v-if="auth.email" class="block truncate font-mono text-[0.6rem] text-muted">{{
            auth.email
          }}</span>
          <span v-else class="block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sage"
            >signed in</span
          >
        </span>
      </component>

      <nav
        v-if="!tight"
        class="mb-2 flex items-center justify-center gap-2 px-2"
        aria-label="Legal"
      >
        <template v-for="(entry, index) in LEGAL_DOCUMENTS" :key="entry.slug">
          <span v-if="index > 0" class="text-[0.58rem] text-muted" aria-hidden="true">·</span>
          <RouterLink
            :to="`/legal/${entry.slug}`"
            class="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink"
            >{{ entry.title }}</RouterLink
          >
        </template>
      </nav>

      <div class="flex items-center gap-1" :class="tight ? 'flex-col' : ''">
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
          :aria-label="isLight ? 'Switch to dark theme' : 'Switch to light theme'"
          :title="isLight ? 'Dark theme' : 'Light theme'"
          @click="toggleTheme"
        >
          <component :is="isLight ? Moon : Sun" :size="16" :stroke-width="1.9" />
        </button>
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-bg-tint hover:text-rust"
          aria-label="Sign out"
          title="Sign out"
          @click="auth.logout()"
        >
          <LogOut :size="16" :stroke-width="1.9" />
        </button>
        <button
          type="button"
          class="ms-auto hidden max-1000:!hidden 1000:grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
          :class="tight ? '!ms-0' : ''"
          :aria-label="tight ? 'Expand navigation' : 'Collapse navigation'"
          @click="ui.toggleRail()"
        >
          <component :is="tight ? PanelLeftOpen : PanelLeftClose" :size="16" :stroke-width="1.9" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, useTemplateRef } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, Terminal, X } from '@lucide/vue'
import RailLink from '@/components/layout/RailLink.vue'
import { COLLECTIONS, NAV_GROUPS } from '@/registry/collections'
import { LEGAL_DOCUMENTS } from '@/registry/legal'
import type { RailItem } from '@/types/nav'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const auth = useAuthStore()
const content = useContentStore()
const ui = useUiStore()
const { theme, toggleTheme } = useTheme()

const navRef = useTemplateRef<HTMLElement>('navRef')
const spine = ref({ top: 0, height: 0 })
const wide = ref(true)

const isLight = computed(() => theme.value === 'light')
const tight = computed(() => ui.railCollapsed && wide.value)

const avatarBroken = ref(false)

const accountName = computed(() => auth.displayName || auth.email || auth.username)

const initials = computed(() => {
  const source = auth.displayName || auth.email || ''
  const words = source.split(/[\s.@_-]+/).filter(Boolean)
  const letters =
    words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0]?.slice(0, 2) ?? 'MK')
  return letters.replace(/[^a-zA-Z]/g, '').toUpperCase() || 'MK'
})

const dashboard: RailItem = { key: 'insights', label: 'Insights', icon: 'Gauge', to: '/insights' }
const portfolio: RailItem = {
  key: 'portfolio',
  label: 'Portfolio',
  icon: 'Rocket',
  to: '/portfolio',
}
const platformOverview: RailItem = {
  key: 'platform',
  label: 'Overview',
  icon: 'Gauge',
  to: '/platform',
  exact: true,
}

const platformGroups: { label: string; items: RailItem[] }[] = [
  {
    label: 'Accounts',
    items: [
      {
        key: 'platform-portfolios',
        label: 'Portfolios',
        icon: 'Users',
        to: '/platform/portfolios',
      },
      {
        key: 'platform-erasures',
        label: 'Erasure queue',
        icon: 'Trash2',
        to: '/platform/erasures',
      },
    ],
  },
  {
    label: 'Observability',
    items: [
      { key: 'platform-traffic', label: 'Traffic', icon: 'TrendingUp', to: '/platform/traffic' },
      { key: 'platform-health', label: 'Health', icon: 'Activity', to: '/platform/health' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { key: 'platform-audit', label: 'Audit', icon: 'History', to: '/platform/audit' },
      {
        key: 'platform-config',
        label: 'Platform config',
        icon: 'Settings',
        to: '/platform/config',
      },
    ],
  },
]

const workshop: RailItem[] = [
  { key: 'media', label: 'Media', icon: 'Image', to: '/media' },
  { key: 'history', label: 'History', icon: 'History', to: '/history' },
]

function routeFor(key: string): string {
  if (key === 'person') return '/person'
  if (key === 'profile') return '/profile'
  if (key === 'locale') return '/locales'
  return `/c/${key}`
}

const groups = computed(() =>
  NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.keys.map<RailItem>((key) => ({
      key,
      label: COLLECTIONS[key].label,
      icon: COLLECTIONS[key].icon,
      to: routeFor(key),
      count: content.counts[key],
    })),
  })),
)

async function measureSpine(): Promise<void> {
  await nextTick()

  const nav = navRef.value
  const active = nav?.querySelector<HTMLElement>('[data-active="true"]')
  if (!nav || !active) {
    spine.value = { top: spine.value.top, height: 0 }
    return
  }

  const bounds = active.getBoundingClientRect()
  const within = nav.getBoundingClientRect()

  spine.value = {
    top: bounds.top - within.top + nav.scrollTop + 5,
    height: Math.max(0, bounds.height - 10),
  }
}

function onResize(): void {
  wide.value = window.innerWidth > 1000
  if (wide.value) ui.mobileNavOpen = false
  void measureSpine()
}

watch(() => route.fullPath, measureSpine)
watch(() => [ui.railCollapsed, content.loaded], measureSpine)

let sizes: ResizeObserver | null = null
let rows: MutationObserver | null = null

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
  void measureSpine()

  const nav = navRef.value
  if (!nav) return

  if (typeof ResizeObserver !== 'undefined') {
    sizes = new ResizeObserver(() => void measureSpine())
    sizes.observe(nav)
    for (const row of nav.querySelectorAll('a')) sizes.observe(row)
  }

  if (typeof MutationObserver !== 'undefined') {
    rows = new MutationObserver(() => void measureSpine())
    rows.observe(nav, { childList: true, subtree: true, characterData: true })
  }

  void document.fonts?.ready.then(() => measureSpine())
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  sizes?.disconnect()
  rows?.disconnect()
})
</script>
