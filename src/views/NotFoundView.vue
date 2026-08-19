<template>
  <EmptyState
    icon="Sparkles"
    :title="t('views.notFound.title')"
    :description="t('views.notFound.desc')"
  >
    <AppButton variant="primary" @click="router.push('/insights')">{{
      t('views.notFound.cta')
    }}</AppButton>
  </EmptyState>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
</script>
