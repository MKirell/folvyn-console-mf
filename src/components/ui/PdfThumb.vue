<template>
  <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
  <FileText v-if="failed" :size="18" :stroke-width="1.5" class="text-muted" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FileText } from '@lucide/vue'

const props = defineProps<{ src: string | undefined }>()

const REACH_MS = 20_000

function withinReach<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('the renderer never loaded')), REACH_MS),
    ),
  ])
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const drawn = ref(false)
const failed = ref(false)

let watcher: IntersectionObserver | null = null
let task: { cancel: () => void } | null = null
let loading: { destroy: () => Promise<void> } | null = null

async function draw(): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas || !props.src || drawn.value) return

  const host = canvas.parentElement
  const width = host?.clientWidth ?? canvas.clientWidth
  if (width <= 0) return

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

    drawn.value = true
    void request.destroy()
    loading = null
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  if (typeof IntersectionObserver === 'undefined') {
    void draw()
    return
  }

  watcher = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      watcher?.disconnect()
      void draw()
    },
    { rootMargin: '300px' },
  )
  watcher.observe(canvas)
})

watch(
  () => props.src,
  () => {
    drawn.value = false
    failed.value = false
    void draw()
  },
)

onBeforeUnmount(() => {
  watcher?.disconnect()
  task?.cancel()
  void loading?.destroy()
})
</script>
