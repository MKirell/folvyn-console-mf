<template>
  <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
  <FileText v-if="failed" :size="18" :stroke-width="1.5" class="text-muted" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FileText } from '@lucide/vue'

const props = defineProps<{ src: string | undefined }>()

const REACH_MS = 20_000
const PATIENCE_MS = 1_200

const canvasRef = ref<HTMLCanvasElement | null>(null)
const failed = ref(false)

let drawn = false
let drawing = false
let seen = false
let inView: IntersectionObserver | null = null
let resized: ResizeObserver | null = null
let waking: ReturnType<typeof setTimeout> | null = null
let task: { cancel: () => void } | null = null
let loading: { destroy: () => Promise<void> } | null = null

function withinReach<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('the renderer never loaded')), REACH_MS),
    ),
  ])
}

function stopWatching(): void {
  inView?.disconnect()
  resized?.disconnect()
  inView = null
  resized = null

  if (waking) clearTimeout(waking)
  waking = null
}

async function draw(): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas || !props.src || drawn || drawing || !seen) return

  const width = canvas.parentElement?.clientWidth ?? 0
  if (width <= 0) return

  drawing = true

  try {
    const [pdfjs, worker] = await withinReach(
      Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]),
    )
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default

    const request = pdfjs.getDocument({ url: props.src })
    loading = request
    const document = await request.promise
    const page = await document.getPage(1)

    const unscaled = page.getViewport({ scale: 1 })
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const viewport = page.getViewport({ scale: (width / unscaled.width) * ratio })

    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    canvas.style.height = `${Math.ceil(viewport.height / ratio)}px`

    const context = canvas.getContext('2d')
    if (!context) {
      failed.value = true
      return
    }

    task = page.render({ canvas, canvasContext: context, viewport })
    await (task as unknown as { promise: Promise<void> }).promise

    drawn = true
    stopWatching()
    void request.destroy()
    loading = null
  } catch {
    failed.value = true
    stopWatching()
  } finally {
    drawing = false
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const host = canvas.parentElement

  if (typeof ResizeObserver !== 'undefined' && host) {
    resized = new ResizeObserver(() => void draw())
    resized.observe(host)
  }

  waking = setTimeout(() => {
    seen = true
    void draw()
  }, PATIENCE_MS)

  if (typeof IntersectionObserver === 'undefined') {
    seen = true
    void draw()
    return
  }

  inView = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      seen = true
      void draw()
    },
    { rootMargin: '300px' },
  )
  inView.observe(canvas)
})

watch(
  () => props.src,
  () => {
    drawn = false
    failed.value = false
    void draw()
  },
)

onBeforeUnmount(() => {
  stopWatching()
  task?.cancel()
  void loading?.destroy()
})
</script>
