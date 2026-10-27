<script setup lang="ts">
/**
 * Reusable macOS Chrome dark-plum issue screenshot mockup component for @skriptjobs/ui.
 * Renders the exact replica window (traffic lights, active tab with Skriptjobs three-triangles
 * favicon, clean pill URL bar starting with the Skriptjobs three-triangles badge, and no right-side
 * toolbar or Ask Gemini clutter) over the selected wallpaper.
 */
import { ref, watch, onMounted } from 'vue'
import {
  CHROME_MOCKUP_THEME,
  renderFramedScreenshotToCanvas,
} from '../../../../shared/frame-renderer.js'

const props = withDefaults(
  defineProps<{
    viewportSrc: string
    wallpaperSrc?: string
    url?: string
    title?: string
    marginMode?: 'reference' | 'symmetric'
    fitReferenceSize?: boolean
  }>(),
  {
    wallpaperSrc: '/assets/backgrounds/macos-default.png',
    url: 'https://docs.skriptjobs.localhost:3050/getting-started/installation',
    title: 'Installation - Skriptjobs',
    marginMode: 'reference',
    fitReferenceSize: true,
  }
)

const emit = defineEmits<{
  (e: 'rendered', canvas: HTMLCanvasElement): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function draw() {
  if (!canvasRef.value || !props.viewportSrc) return
  const [vpImg, bgImg] = await Promise.all([
    loadImg(props.viewportSrc),
    loadImg(props.wallpaperSrc),
  ])
  await renderFramedScreenshotToCanvas({
    canvas: canvasRef.value,
    viewportImage: vpImg,
    backgroundImage: bgImg,
    url: props.url,
    title: props.title,
    marginMode: props.marginMode,
    fitReferenceSize: props.fitReferenceSize,
  })
  emit('rendered', canvasRef.value)
}

watch(
  () => [props.viewportSrc, props.wallpaperSrc, props.url, props.title, props.marginMode],
  draw
)
onMounted(draw)

defineExpose({
  canvasRef,
  redraw: draw,
  theme: CHROME_MOCKUP_THEME,
})
</script>

<template>
  <div class="relative overflow-hidden rounded-lg border border-default bg-bg2 p-1.5">
    <canvas
      ref="canvasRef"
      width="1711"
      height="1076"
      class="block h-auto w-full rounded-md select-none"
    />
  </div>
</template>
