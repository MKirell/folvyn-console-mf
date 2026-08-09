<template>
  <div class="mx-auto w-full max-w-[760px] px-pad py-10">
    <header class="mb-7">
      <button
        v-if="cameFromConsole"
        type="button"
        class="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
        @click="router.back()"
      >
        <span class="grid h-7 w-7 place-items-center rounded-[8px] bg-accent/12 text-accent-deep">
          <ArrowLeft :size="14" :stroke-width="2" aria-hidden="true" />
        </span>
        Back
      </button>

      <h1 class="mt-4 font-disp text-[1.7rem] font-semibold tracking-tight">
        {{ document.title }}
      </h1>
      <p class="mt-1.5 text-[0.86rem] text-ink-soft">{{ document.summary }}</p>

      <nav class="mt-4 flex gap-1.5" aria-label="Legal documents">
        <RouterLink
          v-for="entry in LEGAL_DOCUMENTS"
          :key="entry.slug"
          :to="`/legal/${entry.slug}`"
          class="rounded-[8px] px-2.5 py-[5px] text-[0.78rem] transition-colors"
          :class="
            entry.slug === document.slug
              ? 'bg-accent/14 text-accent-deep'
              : 'text-muted hover:text-ink'
          "
          >{{ entry.title }}</RouterLink
        >
      </nav>
    </header>

    <article class="space-y-6">
      <section v-for="section in document.sections" :key="section.heading">
        <h2 class="mb-2 font-disp text-[1.02rem] font-semibold tracking-tight">
          {{ section.heading }}
        </h2>

        <p
          v-for="paragraph in section.paragraphs ?? []"
          :key="paragraph"
          class="mb-2 text-[0.86rem] leading-[1.65] text-ink-soft last:mb-0"
        >
          {{ paragraph }}
        </p>

        <ul v-if="section.bullets" class="mt-2 space-y-1.5" role="list">
          <li
            v-for="bullet in section.bullets"
            :key="bullet"
            class="flex gap-2.5 text-[0.86rem] leading-[1.6] text-ink-soft"
          >
            <span
              class="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent"
              aria-hidden="true"
            ></span>
            <span>{{ bullet }}</span>
          </li>
        </ul>
      </section>

      <MeasurementChoice v-if="document.slug === 'privacy'" />
    </article>

    <footer class="mt-9 border-t border-line/8 pt-4">
      <p class="font-mono text-[0.68rem] text-muted">
        Questions to
        <a :href="`mailto:${OPERATOR_EMAIL}`" class="text-accent-deep underline">{{
          OPERATOR_EMAIL
        }}</a>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import MeasurementChoice from '@/components/legal/MeasurementChoice.vue'
import { ArrowLeft } from '@lucide/vue'
import { LEGAL, LEGAL_DOCUMENTS, OPERATOR_EMAIL } from '@/registry/legal'

const route = useRoute()
const router = useRouter()

const document = computed(() => LEGAL[route.params.slug === 'terms' ? 'terms' : 'privacy'])

const cameFromConsole = computed(() =>
  Boolean((router.options.history.state as { back?: unknown } | null)?.back),
)
</script>
