<template>
  <div class="mx-auto grid min-h-screen w-full max-w-[560px] place-items-center px-pad py-10">
    <div class="w-full animate-fade-up">
      <span
        class="grid h-11 w-11 place-items-center rounded-[12px] bg-accent/12 text-accent-deep"
        aria-hidden="true"
      >
        <Terminal :size="22" :stroke-width="2" />
      </span>

      <h1 class="mt-4 font-disp text-[1.6rem] font-semibold tracking-tight">
        Welcome{{ firstName ? `, ${firstName}` : '' }}
      </h1>
      <p class="mt-1.5 text-[0.86rem] text-ink-soft">
        Your portfolio already has an address. Pick the language you want to write in first and it
        is yours to fill in.
      </p>

      <div class="mt-5 rounded-lg border border-line/8 bg-surface p-4">
        <p class="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">your address</p>
        <p class="mt-1 break-all font-mono text-[0.94rem]">{{ displayUrl }}</p>
        <p class="mt-2 text-[0.78rem] text-muted">
          Taken from your name. You can change it later on the Portfolio screen, and any link you
          have already shared will stop working when you do.
        </p>
      </div>

      <div class="mt-4 space-y-3.5">
        <FieldShell :field="fields.code">
          <template #default="{ id }">
            <LanguageField :id="id" v-model="code" />
          </template>
        </FieldShell>

        <FieldShell
          :field="fields.label"
          :length="label.length"
          hint="Shown on the language switcher"
        >
          <template #default="{ id }">
            <input
              :id="id"
              v-model="label"
              type="text"
              :maxlength="fields.label.maxLength"
              class="w-full rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
            />
          </template>
        </FieldShell>

        <FieldShell :field="fields.flagCode">
          <template #default="{ id }">
            <FlagField :id="id" v-model="flagCode" />
          </template>
        </FieldShell>
      </div>

      <div class="mt-5 flex items-center gap-2">
        <AppButton variant="primary" :busy="saving" :disabled="!ready" @click="begin">
          Create my portfolio
        </AppButton>
        <AppButton variant="quiet" @click="auth.logout()">Sign out</AppButton>
      </div>

      <p v-if="failure" class="mt-3 text-[0.8rem] text-rust">{{ failure }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Terminal } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import FieldShell from '@/components/ui/FieldShell.vue'
import FlagField from '@/components/fields/FlagField.vue'
import LanguageField from '@/components/fields/LanguageField.vue'
import { COLLECTIONS, type FieldDef } from '@/registry/collections'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useOwnerStore } from '@/stores/owner'
import { useUiStore } from '@/stores/ui'

const DEFAULT_FLAGS: Record<string, string> = {
  en: 'gb',
  fr: 'fr',
  ar: 'tn',
  es: 'es',
  de: 'de',
  it: 'it',
  pt: 'pt',
  nl: 'nl',
}

const router = useRouter()
const auth = useAuthStore()
const content = useContentStore()
const owner = useOwnerStore()
const ui = useUiStore()

const code = ref('en')
const label = ref('EN')
const flagCode = ref('gb')
const saving = ref(false)
const failure = ref('')

const fields = Object.fromEntries(
  COLLECTIONS.locale.fields.map((field) => [field.name, field]),
) as Record<'code' | 'label' | 'flagCode', FieldDef>

const firstName = computed(() => auth.displayName?.split(/\s+/)[0] ?? '')
const displayUrl = computed(() => owner.publicUrl.replace(/^https?:\/\//, ''))
const ready = computed(() => Boolean(code.value && label.value.trim() && flagCode.value))

watch(code, (next) => {
  label.value = next.toUpperCase()
  flagCode.value = DEFAULT_FLAGS[next] ?? next
})

async function begin(): Promise<void> {
  saving.value = true
  failure.value = ''

  try {
    await content.create(COLLECTIONS.locale, {
      id: 'new',
      code: code.value,
      label: label.value.trim(),
      flagCode: flagCode.value,
      enabled: true,
    })

    ui.setEditingLang(code.value)
    ui.notify('good', 'Your portfolio is ready', 'Start with who you are.')
    await router.replace('/person')
  } catch (cause) {
    failure.value = cause instanceof Error ? cause.message : 'That language could not be saved'
  } finally {
    saving.value = false
  }
}

onMounted(() => void owner.load())
</script>
