<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { renderFramedIssueCanvas } from '../../../../shared/frame-renderer.js'
import { createZipBlob } from '../../../../shared/zip-builder.js'

export interface WallpaperOption {
  id: string
  name: string
  src: string
  builtin?: boolean
}

const BUILTIN_WALLPAPERS: WallpaperOption[] = [
  { id: 'macos-default', name: 'macOS Default', src: '/assets/default-wallpaper.jpg', builtin: true },
  { id: 'skriptjobs-indigo', name: 'Skriptjobs Indigo', src: '/assets/indigo-wallpaper.png', builtin: true },
  { id: 'nordic-teal', name: 'Nordic Teal', src: '/assets/nordic-teal.png', builtin: true },
  { id: 'midnight-slate', name: 'Midnight Slate', src: '/assets/midnight-slate.png', builtin: true }
]

const colorMode = useColorMode()

const themeOptions = [
  { value: 'system', label: 'System', icon: 'i-ph-desktop-bold' },
  { value: 'dark', label: 'Dark', icon: 'i-ph-moon-bold' },
  { value: 'light', label: 'Light', icon: 'i-ph-sun-bold' }
] as const

const syncMockupTheme = ref(true)

const effectiveTheme = computed<'dark' | 'light'>(() => {
  return colorMode.value === 'light' ? 'light' : 'dark'
})

const activeMockupTheme = computed<'dark' | 'light'>(() => {
  return syncMockupTheme.value ? effectiveTheme.value : 'dark'
})

const wordmarkSrc = computed(() =>
  effectiveTheme.value === 'dark'
    ? '/assets/brand/wordmark-dark.svg'
    : '/assets/brand/wordmark-light.svg'
)

const wallpapers = ref<WallpaperOption[]>(BUILTIN_WALLPAPERS.map(w => ({ ...w })))

const defaultWallpaperId = ref('macos-default')
const selectedWallpaperId = ref('macos-default')
const openMenuWallpaperId = ref<string | null>(null)
const renamingWallpaperId = ref<string | null>(null)
const renameDraft = ref('')

// Single-open collapsible accordion state (only 1 item open at a time)
const activeAccordionSection = ref<string>('wallpapers')

const accordionItems = [
  {
    label: 'Wallpapers',
    value: 'wallpapers',
    slot: 'wallpapers',
    icon: 'i-ph-image-bold'
  },
  {
    label: 'Image Operations',
    value: 'operations',
    slot: 'operations',
    icon: 'i-ph-export-bold'
  },
  {
    label: 'Output',
    value: 'output',
    slot: 'output',
    icon: 'i-ph-sliders-horizontal-bold'
  },
  {
    label: 'Settings',
    value: 'settings',
    slot: 'settings',
    icon: 'i-ph-gear-six-bold'
  }
]

const pageUrlInput = ref('https://docs.skriptjobs.localhost:3050/getting-started/installation')
const pageTitleInput = ref('Installation - Skriptjobs')
const debouncedPageUrl = ref(pageUrlInput.value)
const debouncedPageTitle = ref(pageTitleInput.value)

let urlDebounceTimer: ReturnType<typeof setTimeout> | null = null
let titleDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(pageUrlInput, (val) => {
  if (urlDebounceTimer) clearTimeout(urlDebounceTimer)
  urlDebounceTimer = setTimeout(() => {
    debouncedPageUrl.value = val
  }, 280)
})

watch(pageTitleInput, (val) => {
  if (titleDebounceTimer) clearTimeout(titleDebounceTimer)
  titleDebounceTimer = setTimeout(() => {
    debouncedPageTitle.value = val
  }, 280)
})

const blobToken = ref('')
const dimensions = ref({ width: 1711, height: 1076 })
const statusMessage = ref('')
const statusVisible = ref(false)
const undoAction = ref<(() => void) | null>(null)
const mockupRef = ref<{
  openFullResolutionInNewTab?: () => void
  canvasRef?: HTMLCanvasElement | null
} | null>(null)

const currentWallpaper = computed(() =>
  wallpapers.value.find(w => w.id === selectedWallpaperId.value) || wallpapers.value[0]
)

function showStatus(msg: string, onUndo?: () => void) {
  statusMessage.value = msg
  statusVisible.value = true
  undoAction.value = onUndo || null
}

function closeStatus() {
  statusVisible.value = false
  statusMessage.value = ''
  undoAction.value = null
}

function triggerUndo() {
  if (undoAction.value) {
    const fn = undoAction.value
    undoAction.value = null
    fn()
  }
}

function setAsDefault(id: string) {
  defaultWallpaperId.value = id
  selectedWallpaperId.value = id
  openMenuWallpaperId.value = null
  const wp = wallpapers.value.find(w => w.id === id)
  if (wp) showStatus(`"${wp.name}" set as default wallpaper.`)
}

function startRenameWallpaper(wp: WallpaperOption) {
  openMenuWallpaperId.value = null
  renamingWallpaperId.value = wp.id
  renameDraft.value = wp.name
}

function commitRenameWallpaper(wp: WallpaperOption) {
  const trimmed = renameDraft.value.trim()
  if (trimmed && trimmed !== wp.name) {
    wp.name = trimmed
    showStatus(`Renamed wallpaper to "${trimmed}".`)
  }
  renamingWallpaperId.value = null
}

function removeWallpaper(id: string) {
  openMenuWallpaperId.value = null
  if (wallpapers.value.length <= 1) {
    showStatus('At least one wallpaper must remain in the gallery.')
    return
  }
  const index = wallpapers.value.findIndex(w => w.id === id)
  const target = wallpapers.value[index]
  if (!target) return
  const removedCopy = { ...target }
  const prevDefault = defaultWallpaperId.value
  const prevSelected = selectedWallpaperId.value

  wallpapers.value = wallpapers.value.filter(w => w.id !== id)
  if (defaultWallpaperId.value === id) {
    defaultWallpaperId.value = wallpapers.value[0].id
  }
  if (selectedWallpaperId.value === id) {
    selectedWallpaperId.value = defaultWallpaperId.value
  }
  showStatus(`Removed wallpaper "${removedCopy.name}".`, () => {
    const insertAt = Math.min(Math.max(0, index), wallpapers.value.length)
    wallpapers.value.splice(insertAt, 0, removedCopy)
    defaultWallpaperId.value = prevDefault
    selectedWallpaperId.value = prevSelected
    showStatus(`Restored wallpaper "${removedCopy.name}".`)
  })
}

function restoreAllDefaults() {
  const prevWallpapers = wallpapers.value.map(w => ({ ...w }))
  const prevDefault = defaultWallpaperId.value
  const prevSelected = selectedWallpaperId.value
  const prevTheme = colorMode.preference
  const prevSync = syncMockupTheme.value

  openMenuWallpaperId.value = null
  renamingWallpaperId.value = null
  wallpapers.value = BUILTIN_WALLPAPERS.map(w => ({ ...w }))
  defaultWallpaperId.value = 'macos-default'
  selectedWallpaperId.value = 'macos-default'
  colorMode.preference = 'system'
  syncMockupTheme.value = true

  showStatus('Restored original defaults.', () => {
    wallpapers.value = prevWallpapers
    defaultWallpaperId.value = prevDefault
    selectedWallpaperId.value = prevSelected
    colorMode.preference = prevTheme
    syncMockupTheme.value = prevSync
    showStatus('Reverted to previous settings.')
  })
}

function openFullImageInNewTab() {
  mockupRef.value?.openFullResolutionInNewTab?.()
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

async function downloadLightDarkZip() {
  const slug = (debouncedPageTitle.value || 'issue')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'screenshot'
  const baseName = `skriptjobs-${slug}`

  const [shot, wp, logo] = await Promise.all([
    loadImg('/assets/sample-screen.png'),
    loadImg(currentWallpaper.value.src),
    loadImg('/assets/brand/logo-color.svg')
  ])

  const lightCanvas = document.createElement('canvas')
  await renderFramedIssueCanvas({
    canvas: lightCanvas,
    screenshotImage: shot,
    wallpaperImage: wp,
    logoImage: logo,
    pageUrl: debouncedPageUrl.value,
    pageTitle: debouncedPageTitle.value,
    mockupTheme: 'light'
  })
  const lightBytes = new Uint8Array(await (await canvasToBlob(lightCanvas)).arrayBuffer())

  const darkCanvas = document.createElement('canvas')
  await renderFramedIssueCanvas({
    canvas: darkCanvas,
    screenshotImage: shot,
    wallpaperImage: wp,
    logoImage: logo,
    pageUrl: debouncedPageUrl.value,
    pageTitle: debouncedPageTitle.value,
    mockupTheme: 'dark'
  })
  const darkBytes = new Uint8Array(await (await canvasToBlob(darkCanvas)).arrayBuffer())

  const zipBlob = createZipBlob([
    { name: `${baseName}-light.png`, data: lightBytes },
    { name: `${baseName}-dark.png`, data: darkBytes }
  ])
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}-light-dark.zip`
  a.click()
  URL.revokeObjectURL(url)
  showStatus(`Downloaded ${baseName}-light-dark.zip`)
}

function onUploadWallpapers(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = () => {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      wallpapers.value.push({
        id,
        name: file.name.replace(/\.[a-z0-9]+$/i, ''),
        src: String(reader.result),
        builtin: false
      })
      selectedWallpaperId.value = id
    }
    reader.readAsDataURL(file)
  }
}
</script>

<template>
  <UApp>
    <div class="w-[460px] bg-default text-default p-3.5 flex flex-col gap-2 font-sans">
      <!-- Header: Official Skriptjobs Brand Logo + Baseline-Aligned Plain Text Title -->
      <header class="flex items-center justify-between pb-2 border-b border-default">
        <div class="flex items-center gap-2.5">
          <img :src="wordmarkSrc" alt="Skriptjobs" class="h-7 w-auto -mx-1" />
          <USeparator orientation="vertical" class="h-3.5 " />
          <span class="text-[14.5px] font-medium tracking-tight text-muted leading-none -translate-y-[0.5px]">
            Screendump Helper
          </span>
        </div>
      </header>

      <!-- Live Mockup Preview Card (with top-right Open in New Tab hover action, no shadow or transition) -->
      <UCard :ui="{ body: 'p-0', header: 'px-2.5 py-1.5 flex items-center justify-between' }">
        <template #header>
          <div class="flex items-center gap-2 text-xs font-semibold text-highlighted">
            <UIcon name="i-ph-browser-duotone" class="size-3.5 text-muted" />
            <span>Preview</span>
          </div>
          <span class="font-mono text-[10px] text-dimmed">
            {{ dimensions.width }} × {{ dimensions.height }} px
          </span>
        </template>

        <ChromeIssueMockup
          ref="mockupRef"
          screenshot-src="/assets/sample-screen.png"
          :wallpaper-src="currentWallpaper.src"
          logo-src="/assets/brand/logo-color.svg"
          :page-url="debouncedPageUrl"
          :page-title="debouncedPageTitle"
          :mockup-theme="activeMockupTheme"
          @rendered="(d) => (dimensions = d)"
        />
      </UCard>

      <!-- Single-Open Collapsible Accordion (type="single" collapsible, no chevron transitions) -->
      <UAccordion
        v-model="activeAccordionSection"
        type="single"
        collapsible
        :items="accordionItems"
        :ui="{ trailingIcon: 'transition-none' }"
        class="bg-elevated border border-default rounded-lg overflow-visible"
      >
        <!-- 1. Wallpapers Section -->
        <template #wallpapers>
          <div class="px-3 pb-2.5 pt-0.5 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-muted">Select background or open menu</span>
              <div class="flex items-center gap-1.5">
                <UTooltip text="Restore to defaults">
                  <UButton
                    color="neutral"
                    variant="soft"
                    size="xs"
                    square
                    icon="i-ph-arrow-counter-clockwise-bold"
                    aria-label="Restore to defaults"
                    @click="restoreAllDefaults"
                  />
                </UTooltip>
                <UTooltip text="Upload wallpapers">
                  <label class="cursor-pointer">
                    <input type="file" multiple accept="image/*" class="hidden" @change="onUploadWallpapers" />
                    <UButton
                      color="neutral"
                      variant="soft"
                      size="xs"
                      square
                      icon="i-ph-upload-simple-bold"
                      aria-label="Upload wallpapers"
                      as="span"
                    />
                  </label>
                </UTooltip>
              </div>
            </div>

            <!-- Wallpaper Grid with Card-Width 3-Dots Dropdown Menu -->
            <div class="grid grid-cols-2 gap-1.5 overflow-visible">
              <div
                v-for="wp in wallpapers"
                :key="wp.id"
                class="group relative flex items-center gap-2 p-1.5 pr-11 rounded-md border text-left cursor-pointer"
                :class="[
                  selectedWallpaperId === wp.id ? 'border-accented bg-muted' : 'border-default bg-default hover:bg-elevated',
                  openMenuWallpaperId === wp.id ? 'z-[100]' : 'z-[1]'
                ]"
                @click="selectedWallpaperId = wp.id"
              >
                <img :src="wp.src" :alt="wp.name" class="w-11 h-7 rounded object-cover border border-muted shrink-0" />
                <div class="min-w-0 flex-1">
                  <input
                    v-if="renamingWallpaperId === wp.id"
                    v-model="renameDraft"
                    type="text"
                    class="w-full rounded border border-accented bg-elevated px-1.5 py-0.5 text-[11px] text-highlighted outline-none"
                    @click.stop
                    @keydown.enter.prevent="commitRenameWallpaper(wp)"
                    @blur="commitRenameWallpaper(wp)"
                  />
                  <div v-else class="text-xs font-medium text-highlighted truncate">
                    {{ wp.name }}
                  </div>
                </div>

                <!-- Default Star Indicator + 3-Dots Menu Trigger -->
                <div class="absolute top-1/2 right-1.5 -translate-y-1/2 flex items-center gap-0.5">
                  <UIcon
                    v-if="defaultWallpaperId === wp.id"
                    name="i-ph-star-fill"
                    class="size-3 text-highlighted opacity-85"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="2xs"
                    square
                    icon="i-ph-dots-three-vertical-bold"
                    :aria-label="`Wallpaper options for ${wp.name}`"
                    @click.stop="openMenuWallpaperId = openMenuWallpaperId === wp.id ? null : wp.id"
                  />
                </div>

                <!-- Card-Width Dropdown Menu -->
                <div
                  v-if="openMenuWallpaperId === wp.id"
                  class="absolute top-[calc(100%+4px)] -left-px -right-px w-[calc(100%+2px)] rounded-md border border-muted bg-elevated p-1 shadow-lg z-[120] flex flex-col gap-0.5"
                  @click.stop
                >
                  <button
                    type="button"
                    class="flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium text-default hover:bg-muted hover:text-highlighted rounded text-left whitespace-nowrap"
                    @click="startRenameWallpaper(wp)"
                  >
                    <UIcon name="i-ph-pencil-simple-bold" class="size-3.5 text-muted shrink-0" />
                    <span>Change image name</span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium text-default hover:bg-muted hover:text-highlighted rounded text-left whitespace-nowrap"
                    @click="removeWallpaper(wp.id)"
                  >
                    <UIcon name="i-ph-trash-bold" class="size-3.5 text-muted shrink-0" />
                    <span>Remove image</span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium text-default hover:bg-muted hover:text-highlighted rounded text-left whitespace-nowrap"
                    @click="setAsDefault(wp.id)"
                  >
                    <UIcon name="i-ph-star-fill" class="size-3.5 text-muted shrink-0" />
                    <span>{{ defaultWallpaperId === wp.id ? 'Default wallpaper' : 'Set as default' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 2. Image Operations Section (All Matching Square Icon Buttons) -->
        <template #operations>
          <div class="px-3 pb-2.5 pt-1 flex items-center gap-2">
            <UTooltip text="Copy PNG to clipboard">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                square
                icon="i-ph-copy-bold"
                aria-label="Copy PNG to clipboard"
              />
            </UTooltip>

            <UTooltip text="Download PNG">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                square
                icon="i-ph-download-simple-bold"
                aria-label="Download PNG"
              />
            </UTooltip>

            <UTooltip text="Download Light & Dark ZIP">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                square
                icon="i-ph-circle-half-fill"
                aria-label="Download Light & Dark ZIP"
                @click="downloadLightDarkZip"
              />
            </UTooltip>

            <UTooltip text="Open full image in new tab">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                square
                icon="i-ph-arrow-square-out-bold"
                aria-label="Open full image in new tab"
                @click="openFullImageInNewTab"
              />
            </UTooltip>

            <UTooltip text="Upload to Vercel Blob & copy Markdown">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                square
                icon="i-ph-cloud-arrow-up-bold"
                aria-label="Upload to Vercel Blob & copy Markdown"
              />
            </UTooltip>
          </div>
        </template>

        <!-- 3. Output Section (Override Mockup URL & Override Tab Title) -->
        <template #output>
          <div class="px-3 pb-2.5 pt-1 flex flex-col gap-2">
            <UFormField label="Override Mockup URL">
              <UInput v-model="pageUrlInput" color="neutral" icon="i-ph-link-bold" size="xs" class="font-mono w-full" />
            </UFormField>

            <UFormField label="Override Tab Title">
              <UInput v-model="pageTitleInput" color="neutral" icon="i-ph-browser-bold" size="xs" class="w-full" />
            </UFormField>
          </div>
        </template>

        <!-- 4. Settings Section (Theme, Sync Browser Mockup Theme, Vercel Blob Token, Restore to defaults) -->
        <template #settings>
          <div class="px-3 pb-2.5 pt-1 flex flex-col gap-2">
            <UFormField label="Theme">
              <div class="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-default border border-muted">
                <UButton
                  v-for="opt in themeOptions"
                  :key="opt.value"
                  :icon="opt.icon"
                  :label="opt.label"
                  size="xs"
                  color="neutral"
                  :variant="colorMode.preference === opt.value ? 'soft' : 'ghost'"
                  class="justify-center"
                  @click="colorMode.preference = opt.value"
                />
              </div>
            </UFormField>

            <div class="flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-md bg-default border border-muted">
              <div class="flex flex-col">
                <span class="text-[11px] font-medium text-highlighted">Sync Browser Mockup Theme</span>
                <span class="text-[10px] text-muted">Match Chrome mockup frame to active theme</span>
              </div>
              <USwitch v-model="syncMockupTheme" color="neutral" size="sm" />
            </div>

            <UFormField label="Vercel Blob Token">
              <UInput
                v-model="blobToken"
                color="neutral"
                type="password"
                icon="i-ph-key-bold"
                size="xs"
                placeholder="BLOB_READ_WRITE_TOKEN"
                class="font-mono w-full"
              />
            </UFormField>

            <div class="flex justify-end pt-0.5">
              <UButton
                color="neutral"
                variant="soft"
                size="xs"
                icon="i-ph-arrow-counter-clockwise-bold"
                label="Restore to defaults"
                @click="restoreAllDefaults"
              />
            </div>
          </div>
        </template>
      </UAccordion>

      <!-- Notification Toast with Undo + Closing Icon -->
      <div
        v-if="statusVisible"
        class="flex items-center justify-between gap-2 rounded-md border border-muted bg-muted px-2.5 py-1.5 text-[11px] text-default"
        role="status"
      >
        <span>{{ statusMessage }}</span>
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            v-if="undoAction"
            color="neutral"
            variant="outline"
            size="2xs"
            label="Undo"
            @click="triggerUndo"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="2xs"
            square
            icon="i-ph-x-bold"
            aria-label="Close notification"
            @click="closeStatus"
          />
        </div>
      </div>
    </div>
  </UApp>
</template>
