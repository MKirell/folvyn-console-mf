<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader :title="t('platform.config.title')" :description="t('platform.config.blurb')" />

    <SkeletonGrid v-if="loading" :panels="[8, 4, 6, 6]" :label="t('platform.config.title')" />

    <EmptyState v-else-if="error" icon="Shield" :title="t('errors.config')" :description="error">
      <AppButton variant="primary" @click="load">{{ t('common.retry') }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!config"
      icon="Settings"
      :title="t('platform.config.unavailable')"
      :description="t('common.unreachableDesc')"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.config.environment')"
        :value="config.environment.name ?? config.environment.nodeEnv"
        :hint="config.environment.database"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.health.image')"
        :value="image"
        :hint="t('platform.config.imageHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.config.reserved')"
        :value="String(config.reservedSlugs.length)"
        :hint="t('platform.config.reservedHint')"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        :label="t('platform.config.erasureDeadline')"
        :value="`${config.limits.erasureDeadlineDays}d`"
        :hint="t('platform.config.deadlineHint')"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.config.runtime')"
        :hint="t('platform.config.runtimeHint')"
      >
        <ConfigRows :rows="config.runtime" :empty="t('ui.nothingConfigured')" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.config.addressRules')"
        :hint="t('platform.config.addressHint')"
      >
        <ConfigRows :rows="addressRules" :empty="t('ui.nothingConfigured')" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.config.refuses')"
        :hint="t('platform.config.ingestHint')"
      >
        <ConfigRows :rows="config.ingest" :empty="t('ui.nothingConfigured')" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        :title="t('platform.config.privacy')"
        :hint="t('platform.config.privacyHint')"
      >
        <ConfigRows :rows="config.privacy" :empty="t('ui.nothingConfigured')" />
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import ConfigRows from '@/components/platform/ConfigRows.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { fetchPlatformConfig } from '@/services/admin.api'
import type { PlatformConfig } from '@/types/analytics'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const config = ref<PlatformConfig | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const image = computed(() => (config.value?.environment.image ?? 'local').slice(0, 12))

const addressRules = computed(() => {
  const found = config.value?.limits
  if (!found) return []

  return [
    {
      key: 'Length',
      value: `${found.slugMin}–${found.slugMax} characters`,
      detail: 'Anything outside this is refused at sign-up and on every change.',
    },
    {
      key: 'Shape',
      value: 'lowercase, digits, single hyphens',
      detail: 'No underscores, no leading or trailing hyphen, no double hyphen.',
    },
    {
      key: 'Reason length',
      value: `${found.reasonMax} characters`,
      detail: 'Every suspend and erasure reason is capped here before it reaches the audit log.',
    },
  ]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    config.value = await fetchPlatformConfig()
  } catch (e) {
    config.value = null
    error.value = e instanceof Error ? e.message : 'Config is not available'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>
