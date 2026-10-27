<script setup lang="ts">
/**
 * Reusable macOS Chrome issue screenshot mockup component for @skriptjobs/ui.
 * Supports both dark and light Chrome themes synced to the active theme.
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
    mockupTheme?: 'dark' | 'light'
  }>(),
  {
    wallpaperSrc: '/assets/backgrounds/macos-default.png',
    url: 'https://docs.skriptjobs.localhost:3050/getting-started/installation',
    title: 'Installation - Skriptjobs',
    marginMode: 'reference',
    fitReferenceSize: false,
    mockupTheme: 'dark',
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
    mockupTheme: props.mockupTheme,
  })
  emit('rendered', canvasRef.value)
}

watch(
  () => [
    props.viewportSrc,
    props.wallpaperSrc,
    props.url,
    props.title,
    props.marginMode,
    props.mockupTheme,
  ],
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
