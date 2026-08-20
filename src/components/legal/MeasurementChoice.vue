<template>
  <section
    class="rounded-lg border border-line/10 bg-surface p-4"
    aria-labelledby="measurement-choice"
  >
    <h2 id="measurement-choice" class="font-disp text-[1.02rem] font-semibold tracking-tight">
      {{ t('measurement.title') }}
    </h2>

    <p class="mt-1.5 text-[0.86rem] leading-relaxed text-ink-soft">
      {{ description }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <AppButton v-if="choice !== null" size="sm" variant="secondary" @click="withdraw">{{
        t('measurement.withdraw')
      }}</AppButton>
      <span v-else class="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-muted">{{
        t('measurement.nothingStored')
      }}</span>
    </div>

    <p v-if="!sameOrigin" class="mt-3 text-[0.78rem] text-muted">
      {{ t('measurement.differentOrigin') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { PORTFOLIO_URL } from '@/config/env'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const CONSENT_KEY = 'portfolio_consent'
const VISITOR_KEY = 'portfolio_visitor'

const { t } = useI18n()
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
    return new URL(PORTFOLIO_URL).origin === window.location.origin
  } catch {
    return true
  }
})

const description = computed(() => {
  if (choice.value === 'accepted') {
    return t('measurement.accepted')
  }
  if (choice.value === 'refused') {
    return t('measurement.refused')
  }
  return t('measurement.none')
})

function withdraw(): void {
  try {
    localStorage.removeItem(CONSENT_KEY)
    localStorage.removeItem(VISITOR_KEY)
  } catch {
    void 0
  }

  choice.value = null
  ui.notify('good', t('measurement.cleared'))
}
</script>
