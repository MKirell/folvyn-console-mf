<template>
  <div class="dot-grid grid min-h-screen place-items-center px-5">
    <div class="w-full max-w-[400px]">
      <div class="mb-7 flex items-center gap-3">
        <span
          class="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-accent/12 text-accent-deep"
        >
          <Terminal :size="22" :stroke-width="1.9" aria-hidden="true" />
        </span>
        <div>
          <h1 class="font-disp text-[1.4rem] font-semibold tracking-tight">Folvyn Console</h1>
          <p class="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-muted">
            sign in · sign up
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-line/8 bg-surface p-5">
        <p
          v-if="auth.error"
          class="mb-4 rounded-[9px] border border-rust/35 bg-rust/8 px-3 py-2.5 text-[0.8rem] text-rust"
        >
          {{ auth.error }}
        </p>

        <p v-else class="mb-4 text-[0.84rem] text-ink-soft">
          Your provider proves who you are. A first sign-in creates your portfolio.
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
          Continue with {{ provider }}
        </AppButton>

        <p v-if="!AUTH_CONFIGURED" class="mt-3 text-[0.75rem] text-gold">
          This build has no Cognito client id. Set
          <span class="font-mono">VITE_COGNITO_CLIENT_ID</span> and
          <span class="font-mono">VITE_COGNITO_DOMAIN</span> before signing in.
        </p>

        <p class="mt-4 border-t border-line/8 pt-3 text-[0.72rem] text-muted">
          Authorization Code with PKCE. The access token stays in memory and the refresh token dies
          with this tab.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Terminal } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ProviderMark from '@/components/ui/ProviderMark.vue'
import { AUTH_CONFIGURED, AUTH_PROVIDERS } from '@/config/env'
import type { IdentityProvider } from '@/services/pkce'
import { useAuthStore } from '@/stores/auth'

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
