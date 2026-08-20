<template>
  <div v-if="chrome" class="min-h-screen">
    <AppRail />
    <div
      class="flex min-h-screen flex-col transition-[padding] duration-300 ease-out motion-reduce:transition-none max-1000:!ps-0"
      :class="ui.railCollapsed ? 'ps-rail-tight' : 'ps-rail'"
    >
      <AppTopbar />
      <main class="dot-grid flex-1 px-pad py-7 max-700:py-5">
        <RouterView v-slot="{ Component }">
          <component
            :is="Component"
            v-if="Component"
            :key="route.fullPath"
            class="animate-fade-up"
          />
          <SkeletonPage v-else />
        </RouterView>
      </main>
    </div>
    <CommandPalette />
    <ToastStack />
  </div>

  <template v-else>
    <RouterView />
    <ToastStack />
  </template>

  <ConfirmDialog
    :open="ui.leaveOpen"
    :title="t('common.leaveTitle')"
    :message="t('common.leaveConfirm')"
    :confirm-label="t('common.leaveAnyway')"
    @cancel="ui.answerLeave(false)"
    @confirm="ui.answerLeave(true)"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppRail from '@/components/layout/AppRail.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import CommandPalette from '@/components/layout/CommandPalette.vue'
import ToastStack from '@/components/layout/ToastStack.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SkeletonPage from '@/components/ui/SkeletonPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useOwnerStore } from '@/stores/owner'
import { useUiStore } from '@/stores/ui'
import { syncUiLang } from '@/i18n'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const content = useContentStore()
const owner = useOwnerStore()
const ui = useUiStore()

syncUiLang()

const chrome = computed(() => route.meta.chrome !== false && auth.isAuthenticated)

function onBeforeUnload(event: BeforeUnloadEvent): void {
  if (!ui.dirty) return
  event.preventDefault()
  event.returnValue = ''
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    ui.paletteOpen = !ui.paletteOpen
  }
}

watch(
  () => auth.refused,
  (refused) => {
    if (refused && route.name !== 'refused') void router.replace({ name: 'refused' })
  },
)

watch(
  () => auth.isAuthenticated && !auth.isPlatform,
  (isOwner) => {
    if (!isOwner) return
    void content.loadAll()
    void owner.load()
  },
  { immediate: true },
)

watch(
  () => [content.loaded, content.locales.length, route.name] as const,
  () => {
    if (!auth.isAuthenticated || auth.isPlatform || route.meta.public || !content.loaded) return

    const fresh = content.locales.length === 0
    if (fresh && route.meta.onboarding !== true) void router.replace({ name: 'welcome' })
    if (!fresh && route.meta.onboarding === true) void router.replace({ name: 'insights' })
  },
)

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeydown)
})
</script>
