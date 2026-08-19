<template>
  <div
    class="pointer-events-none fixed bottom-4 end-4 z-[130] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <div
      v-for="toast in ui.toasts"
      :key="toast.id"
      class="pointer-events-auto flex items-start gap-2.5 rounded-[11px] border bg-surface px-3.5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.24)] animate-fade-up"
      :class="TONES[toast.tone].border"
    >
      <component
        :is="TONES[toast.tone].icon"
        :size="16"
        :stroke-width="1.9"
        class="mt-[2px] shrink-0"
        :class="TONES[toast.tone].text"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <p class="text-[0.82rem] font-medium">{{ toast.message }}</p>
        <p v-if="toast.detail" class="mt-0.5 break-words text-[0.74rem] text-muted">
          {{ toast.detail }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 text-muted transition-colors hover:text-ink"
        :aria-label="t('ui.dismiss')"
        @click="ui.dismiss(toast.id)"
      >
        <X :size="14" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { CircleCheck, Info, TriangleAlert, X, CircleX } from '@lucide/vue'
import { useUiStore, type ToastTone } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const ui = useUiStore()

const TONES: Record<ToastTone, { icon: Component; text: string; border: string }> = {
  info: { icon: Info, text: 'text-ink-soft', border: 'border-line/12' },
  good: { icon: CircleCheck, text: 'text-sage', border: 'border-sage/35' },
  warn: { icon: TriangleAlert, text: 'text-gold', border: 'border-gold/35' },
  bad: { icon: CircleX, text: 'text-rust', border: 'border-rust/35' },
}
</script>
