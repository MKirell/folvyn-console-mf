<template>
  <div>
    <div ref="hostRef" class="flex justify-center overflow-hidden rounded-[12px] bg-bg">
      <div
        class="overflow-hidden"
        :style="
          measured ? { width: `${scaledWidth}px`, height: `${scaledHeight}px` } : { height: '0px' }
        "
      >
        <iframe
          ref="frameRef"
          :src="src"
          :width="width"
          :height="frameHeight"
          :title="t('ui.livePreview')"
          class="block origin-top-left border-0"
          :style="{ transform: `scale(${scale})` }"
          sandbox="allow-scripts allow-same-origin"
          @load="onLoad"
        ></iframe>
      </div>
    </div>
    <p v-if="!connected" class="mt-2 font-mono text-[0.66rem] text-muted">
      {{ t('ui.previewWaiting', { origin }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PORTFOLIO_URL, PREVIEW_PATH } from '@/config/env'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = withDefaults(
  defineProps<{
    width: number
    payload: Record<string, unknown>
    section: string
    scrollInside?: boolean
  }>(),
  { scrollInside: false },
)

const MESSAGE = 'folvyn:preview'
const MIN_HEIGHT = 120
const PHONE_HEIGHT = 844

const hostRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLIFrameElement | null>(null)
const available = ref(0)
const contentHeight = ref(MIN_HEIGHT)
const grownHeight = ref(0)
const connected = ref(false)

const src = computed(() => `${PORTFOLIO_URL}${PREVIEW_PATH}`)
const origin = computed(() => {
  try {
    return new URL(src.value).origin
  } catch {
    return PORTFOLIO_URL
  }
})

const scale = computed(() => (available.value > 0 ? Math.min(1, available.value / props.width) : 1))

const phoneBox = computed(() => Math.ceil(PHONE_HEIGHT * scale.value))

const boxHeight = computed(() =>
  props.scrollInside
    ? grownHeight.value || phoneBox.value
    : Math.ceil(contentHeight.value * scale.value),
)

const frameHeight = computed(() =>
  props.scrollInside ? Math.ceil(boxHeight.value / scale.value) : contentHeight.value,
)

const measured = computed(() => available.value > 0)
const scaledHeight = computed(() => boxHeight.value)
const scaledWidth = computed(() => Math.round(props.width * scale.value))

watch(
  [contentHeight, scale, () => props.scrollInside],
  ([height, factor, inside]) => {
    if (!inside) grownHeight.value = Math.ceil(height * factor)
  },
  { immediate: true },
)

let observer: ResizeObserver | null = null

function post(): void {
  const target = frameRef.value?.contentWindow
  if (!target) return

  target.postMessage(
    { type: MESSAGE, section: props.section, payload: JSON.parse(JSON.stringify(props.payload)) },
    origin.value,
  )
}

function onLoad(): void {
  post()
}

function onMessage(event: MessageEvent): void {
  if (event.origin !== origin.value) return

  const data = event.data as { type?: string; height?: number }
  if (data?.type === `${MESSAGE}:ready`) {
    connected.value = true
    post()
    return
  }
  if (data?.type === `${MESSAGE}:rendered`) {
    connected.value = true
    contentHeight.value = Math.max(MIN_HEIGHT, data.height ?? MIN_HEIGHT)
  }
}

function measure(): void {
  const host = hostRef.value
  if (!host) return

  const width = Math.round(host.getBoundingClientRect().width)
  if (width > 0) available.value = width
}

onMounted(() => {
  measure()
  requestAnimationFrame(measure)
  window.addEventListener('message', onMessage)
  if (typeof ResizeObserver !== 'undefined' && hostRef.value) {
    observer = new ResizeObserver(measure)
    observer.observe(hostRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  observer?.disconnect()
})

watch(() => [props.payload, props.section, props.width], post, { deep: true })
</script>
