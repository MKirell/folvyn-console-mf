<template>
  <div class="grid min-h-screen place-items-center px-5 text-center">
    <div v-if="error" class="max-w-[400px]">
      <h1 class="font-disp text-[1.1rem] font-semibold tracking-tight">
        {{ t('views.callback.failed') }}
      </h1>
      <p class="mt-2 text-[0.84rem] text-muted">{{ error }}</p>
      <AppButton class="mt-5" variant="primary" @click="router.replace('/login')">
        {{ t('ui.backToSignIn') }}
      </AppButton>
    </div>

    <div v-else role="status" aria-live="polite">
      <span
        class="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
      <p class="mt-4 text-[0.82rem] text-muted">{{ t('views.callback.working') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const error = ref('')

onMounted(async () => {
  const { code, state, error: authError, error_description: description } = route.query

  if (typeof authError === 'string') {
    error.value = typeof description === 'string' ? description : authError
    return
  }
  if (typeof code !== 'string' || typeof state !== 'string') {
    error.value = 'The identity provider did not return an authorization code.'
    return
  }

  try {
    const target = await auth.completeLogin(code, state)
    await router.replace(target)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'The authorization code could not be exchanged.'
  }
})
</script>
