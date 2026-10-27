<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { renderFramedIssueCanvas } from '../../../../shared/frame-renderer.js'

const props = withDefaults(defineProps<{
  screenshotSrc: string
  wallpaperSrc?: string
  logoSrc?: string
  pageUrl?: string
  pageTitle?: string
  faviconDataUrl?: string | null
  mockupTheme?: 'dark' | 'light'
  margin?: number
}>(), {
  wallpaperSrc: '/assets/default-wallpaper.jpg',
  logoSrc: '/assets/brand/logo-color.svg',
  pageUrl: 'https://docs.skriptjobs.localhost:3050/getting-started/installation',
  pageTitle: 'Installation - Skriptjobs',
  faviconDataUrl: null,
  mockupTheme: 'dark',
  margin: 56
})

const emit = defineEmits<{
  (e: 'rendered', dimensions: { width: number; height: number }): void
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
  if (!canvasRef.value || !props.screenshotSrc) return
  const [shot, wp, logo] = await Promise.all([
    loadImg(props.screenshotSrc),
    props.wallpaperSrc ? loadImg(props.wallpaperSrc) : Promise.resolve(null),
    props.logoSrc ? loadImg(props.logoSrc) : Promise.resolve(null)
  ])
  const dims = await renderFramedIssueCanvas({
    canvas: canvasRef.value,
    screenshotImage: shot,
    wallpaperImage: wp,
    logoImage: logo,
    pageUrl: props.pageUrl,
    pageTitle: props.pageTitle,
    faviconDataUrl: props.faviconDataUrl,
    mockupTheme: props.mockupTheme,
    margin: props.margin
  })
  emit('rendered', dims)
}

async function openFullResolutionInNewTab() {
  if (!canvasRef.value) return
  canvasRef.value.toBlob((blob) => {
    if (!blob) return
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank', 'noopener')
  }, 'image/png')
}

onMounted(draw)
watch(
  () => [props.screenshotSrc, props.wallpaperSrc, props.logoSrc, props.pageUrl, props.pageTitle, props.faviconDataUrl, props.mockupTheme],
  draw
)

defineExpose({
  canvasRef,
  redraw: draw,
  openFullResolutionInNewTab
})
</script>

<template>
  <div class="group relative flex items-center justify-center rounded-b-[calc(var(--ui-radius)-1px)] bg-neutral-100 dark:bg-[#080808] p-1.5">
    <canvas
      ref="canvasRef"
      class="block max-h-[168px] max-w-full rounded-md"
    />
    <UTooltip text="Open full image in new tab">
      <UButton
        color="neutral"
        variant="outline"
        size="xs"
        square
        icon="i-ph-arrow-square-out-bold"
        aria-label="Open full image in new tab"
        class="absolute top-3 right-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto shadow-none transition-none"
        @click="openFullResolutionInNewTab"
      />
    </UTooltip>
  </div>
</template>
