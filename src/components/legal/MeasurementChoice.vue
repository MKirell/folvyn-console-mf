<template>
  <section
    class="rounded-lg border border-line/10 bg-surface p-4"
    aria-labelledby="measurement-choice"
  >
    <h2 id="measurement-choice" class="font-disp text-[1.02rem] font-semibold tracking-tight">
      Your measurement choice
    </h2>

    <p class="mt-1.5 text-[0.86rem] leading-relaxed text-ink-soft">
      {{ description }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <AppButton v-if="choice !== null" size="sm" variant="secondary" @click="withdraw"
        >Withdraw my choice</AppButton
      >
      <span v-else class="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-muted"
        >nothing stored on this device</span
      >
    </div>

    <p v-if="!sameOrigin" class="mt-3 text-[0.78rem] text-muted">
      In local development the console and the portfolios run on different ports, so this control
      only clears storage for this origin. In production they share one host and it clears the real
      choice.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { SITE_URL } from '@/config/env'
import { useUiStore } from '@/stores/ui'

const CONSENT_KEY = 'portfolio_consent'
const VISITOR_KEY = 'portfolio_visitor'

const ui = useUiStore()

function read(): string | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    return stored === 'accepted' || stored === 'refused' ? stored : null
  } catch {
    return null
  }
}

const choice = ref<string | null>(read())

const sameOrigin = computed(() => {
  try {
    return new URL(SITE_URL).origin === window.location.origin
  } catch {
    return true
  }
})

const description = computed(() => {
  if (choice.value === 'accepted') {
    return 'You agreed to be counted across visits, so one identifier is stored on this device for up to thirteen months. Withdrawing deletes it immediately and you will be asked again on your next visit.'
  }
  if (choice.value === 'refused') {
    return 'You declined to be counted across visits, so nothing that identifies you is stored. Withdrawing that answer lets you be asked again, in case you change your mind.'
  }
  return 'You have not been asked yet, or you already cleared your answer. Nothing that could identify you across days is stored on this device.'
})

function withdraw(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
    localStorage.removeItem(VISITOR_KEY)
  } catch {
    /* storage is unavailable; there was nothing to clear */
  }

  choice.value = null
  ui.notify('good', 'Your measurement choice was cleared')
}
</script>
