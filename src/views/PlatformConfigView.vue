<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <PlatformHeader
      title="Platform config"
      description="What this environment actually enforces at runtime. Read-only — every value is code, not a setting."
    />

    <div v-if="loading" class="grid place-items-center py-20" role="status">
      <span
        class="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40"
      ></span>
    </div>

    <EmptyState
      v-else-if="!config"
      icon="Settings"
      title="Config is unavailable"
      :description="error ?? 'The API did not answer.'"
    />

    <div v-else class="grid grid-cols-12 gap-3 max-1000:grid-cols-6 max-600:grid-cols-2">
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Environment"
        :value="config.environment.nodeEnv"
        :hint="config.environment.database"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Deployed image"
        :value="image"
        hint="what is serving requests"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Reserved addresses"
        :value="String(config.reservedSlugs.length)"
        hint="refused as a portfolio address"
      />
      <StatTile
        class="col-span-3 max-1000:col-span-3 max-600:col-span-1"
        label="Erasure deadline"
        :value="`${config.limits.erasureDeadlineDays}d`"
        hint="clock on every request"
      />

      <PanelCard
        class="col-span-8 max-1000:col-span-6 max-600:col-span-2"
        title="Runtime"
        hint="what this process is actually running"
      >
        <ConfigRows :rows="config.runtime" />
      </PanelCard>

      <PanelCard
        class="col-span-4 max-1000:col-span-6 max-600:col-span-2"
        title="Address rules"
        hint="enforced on every write"
      >
        <ConfigRows :rows="addressRules" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="What the collector refuses"
        hint="ingest rules, by construction"
      >
        <ConfigRows :rows="config.ingest" />
      </PanelCard>

      <PanelCard
        class="col-span-6 max-1000:col-span-6 max-600:col-span-2"
        title="Privacy posture"
        hint="what is kept, and for how long"
      >
        <ConfigRows :rows="config.privacy" />
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import PlatformHeader from '@/components/layout/PlatformHeader.vue'
import ConfigRows from '@/components/platform/ConfigRows.vue'
import StatTile from '@/components/charts/StatTile.vue'
import { fetchPlatformConfig } from '@/services/admin.api'
import type { PlatformConfig } from '@/types/analytics'

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

onMounted(async () => {
  try {
    config.value = await fetchPlatformConfig()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Config is not available'
  } finally {
    loading.value = false
  }
})
</script>
