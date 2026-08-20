<template>
  <div class="dot-grid grid min-h-screen place-items-center px-5">
    <div class="w-full max-w-[440px]">
      <div class="rounded-lg border border-line/8 bg-surface p-6 text-center">
        <span class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gold/10">
          <ShieldAlert :size="22" :stroke-width="1.7" class="text-gold" aria-hidden="true" />
        </span>

        <h1 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('views.refused.title') }}
        </h1>

        <p class="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
          {{ auth.refused || t('views.refused.description') }}
        </p>

        <p class="mt-3 font-mono text-[0.72rem] text-muted">{{ auth.identity?.email }}</p>

        <AppButton variant="primary" class="mt-5 w-full" @click="signOut">
          {{ t('views.refused.signOut') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldAlert } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuthStore()

function signOut(): void {
  auth.logout()
}
</script>
