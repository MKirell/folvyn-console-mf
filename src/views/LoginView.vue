<template>
  <div class="dot-grid grid min-h-screen place-items-center px-5">
    <div class="w-full max-w-[400px]">
      <div class="rounded-lg border border-line/8 bg-surface p-6">
        <div class="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            :src="logoMark"
            alt=""
            aria-hidden="true"
            class="h-14 w-14 shrink-0 rounded-[16px]"
          />
          <div>
            <h1 class="font-disp text-[1.4rem] font-semibold tracking-tight">
              {{ t('views.login.title') }}
            </h1>
            <p class="mt-0.5 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-muted">
              {{ t('views.login.signIn') }}
            </p>
          </div>
        </div>

        <p
          v-if="auth.error"
          class="mb-4 rounded-[9px] border border-rust/35 bg-rust/8 px-3 py-2.5 text-[0.8rem] text-rust"
        >
          {{ auth.error }}
        </p>

        <AppButton
          v-for="provider in AUTH_PROVIDERS"
          :key="provider"
          :variant="provider === AUTH_PROVIDERS[0] ? 'primary' : 'secondary'"
          class="mb-2 w-full last:mb-0"
          :busy="working === provider"
          :disabled="!AUTH_CONFIGURED || working !== null"
          @click="signIn(provider as IdentityProvider)"
        >
          <ProviderMark :name="provider" />
          {{ t('views.login.continueWith', { provider }) }}
        </AppButton>

        <p v-if="!AUTH_CONFIGURED" class="mt-3 text-[0.75rem] text-gold">
          {{ t('blurbs.loginMisconfigured') }}
          <span class="font-mono">VITE_COGNITO_CLIENT_ID</span> {{ t('common.and') }}
          <span class="font-mono">VITE_COGNITO_DOMAIN</span>
          {{ t('blurbs.loginMisconfiguredEnd') }}
        </p>

        <p class="mt-5 border-t border-line/8 pt-3.5 text-center text-[0.78rem] text-muted">
          {{ t('blurbs.login') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import logoMark from '@/assets/logo-mark.svg'
import AppButton from '@/components/ui/AppButton.vue'
import ProviderMark from '@/components/ui/ProviderMark.vue'
import { AUTH_CONFIGURED, AUTH_PROVIDERS } from '@/config/env'
import type { IdentityProvider } from '@/services/pkce'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const working = ref<string | null>(null)

async function signIn(provider: IdentityProvider): Promise<void> {
  working.value = provider
  const returnTo = typeof route.query.returnTo === 'string' ? route.query.returnTo : '/insights'
  await auth.login(returnTo, provider)
  working.value = null
}
</script>
