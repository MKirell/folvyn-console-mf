<template>
  <EmptyState
    icon="Sparkles"
    title="There is nothing at this address"
    description="The console has a small, fixed set of screens — the sidebar lists all of them."
  >
    <AppButton variant="primary" @click="router.push('/insights')">Go to insights</AppButton>
  </EmptyState>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
</script>
