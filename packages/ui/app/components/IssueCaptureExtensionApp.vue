<script setup lang="ts">
/**
 * Nuxt UI v4 + @skriptjobs/ui Screendump Helper Extension Popup Component
 * Uses @nuxt/ui UAccordion (single-open collapsible), UTooltip, UButton (icon-only square),
 * UInput, and UFormField with @skriptjobs/ui design tokens.
 */
import { ref, computed } from 'vue'

export interface WallpaperOption {
  id: string
  name: string
  src: string
  builtin: boolean
}

export type ThemePreference = 'system' | 'dark' | 'light'

const props = defineProps<{
  initialWallpapers: WallpaperOption[]
  initialDefaultId?: string
  initialViewportSrc: string
  initialUrl?: string
  initialTitle?: string
  initialTheme?: ThemePreference
}>()

const wallpapers = ref<WallpaperOption[]>([...props.initialWallpapers])
const defaultWallpaperId = ref<string>(props.initialDefaultId || 'macos-default')
const selectedWallpaperId = ref<string>(defaultWallpaperId.value)
const displayedUrl = ref<string>(
  props.initialUrl || 'https://docs.skriptjobs.localhost:3050/getting-started/installation'
)
const displayedTitle = ref<string>(props.initialTitle || 'Installation - Skriptjobs')
const themeMode = ref<ThemePreference>(props.initialTheme || 'system')
const blobToken = ref<string>('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const statusMessage = ref<string>('')

// Single-open accordion state (only one section open at a time)
const openSection = ref<string>('wallpapers')

const accordionItems = [
  {
    label: 'Wallpapers',
    icon: 'i-ph-image-duotone',
    value: 'wallpapers',
    slot: 'wallpapers' as const,
  },
  {
    label: 'Image Operations',
    icon: 'i-ph-export-duotone',
    value: 'operations',
    slot: 'operations' as const,
  },
  {
    label: 'Output',
    icon: 'i-ph-sliders-horizontal-duotone',
    value: 'output',
    slot: 'output' as const,
  },
  {
    label: 'Settings',
    icon: 'i-ph-gear-six-duotone',
    value: 'settings',
    slot: 'settings' as const,
  },
]

const themeOptions: { label: string; value: ThemePreference; icon: string }[] = [
  { label: 'System', value: 'system', icon: 'i-ph-desktop' },
  { label: 'Dark', value: 'dark', icon: 'i-ph-moon' },
  { label: 'Light', value: 'light', icon: 'i-ph-sun' },
]

const activeWallpaper = computed(
  () =>
    wallpapers.value.find((w) => w.id === selectedWallpaperId.value) ||
    wallpapers.value[0]
)

function triggerMultiUpload() {
  fileInputRef.value?.click()
}

function openFullImageInTab() {
  window.open(props.initialViewportSrc, '_blank')
}

function onFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = () => {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const name = file.name.replace(/\.[^.]+$/, '')
      wallpapers.value.push({
        id,
        name,
        src: String(reader.result),
        builtin: false,
      })
      selectedWallpaperId.value = id
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function setAsDefault(id: string) {
  defaultWallpaperId.value = id
  selectedWallpaperId.value = id
  statusMessage.value = 'Updated default wallpaper'
}

function removeWallpaper(id: string) {
  wallpapers.value = wallpapers.value.filter((w) => w.id !== id)
  if (defaultWallpaperId.value === id) {
    defaultWallpaperId.value = 'macos-default'
  }
  if (selectedWallpaperId.value === id) {
    selectedWallpaperId.value = defaultWallpaperId.value
  }
}
</script>

<template>
  <div
    :class="themeMode === 'light' ? 'light' : 'dark'"
    class="bg-bg1 text-text-default p-3.5 flex flex-col gap-2.5"
  >
    <!-- Header Row: Skriptjobs wordmark + harmonic "Screendump Helper" plain text -->
    <div class="flex items-center border-b border-default pb-2.5">
      <div class="flex items-center gap-2">
        <SkriptjobsLogo class="h-7 w-auto -ml-1" />
        <span class="h-4 w-px bg-border-muted mr-1" />
        <span class="text-[15px] font-medium tracking-tight text-muted leading-none">
          Screendump Helper
        </span>
      </div>
    </div>

    <!-- Live Framed Screenshot Preview with top-right Open in New Tab icon -->
    <div class="relative group rounded-lg overflow-hidden border border-default bg-bg2">
      <ChromeIssueMockup
        :viewport-src="initialViewportSrc"
        :wallpaper-src="activeWallpaper?.src"
        :url="displayedUrl"
        :title="displayedTitle"
      />
      <div class="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
        <UTooltip text="Open full image in new tab">
          <UButton
            size="xs"
            color="neutral"
            variant="solid"
            icon="i-ph-arrow-square-out-bold"
            square
            aria-label="Open full image in new tab"
            class="bg-black/70 hover:bg-black/90 text-white border border-white/15 backdrop-blur-sm"
            @click="openFullImageInTab"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Single-open Collapsible Accordion (Wallpapers | Image Operations | Output | Settings) -->
    <UAccordion
      v-model="openSection"
      type="single"
      collapsible
      :items="accordionItems"
      class="bg-bg2 border border-default rounded-lg divide-y divide-default"
    >
      <!-- Section 1: Wallpapers -->
      <template #wallpapers>
        <div class="p-3 pt-1 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">Select background or set default</span>
            <div>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept="image/*"
                class="hidden"
                @change="onFilesSelected"
              />
              <UTooltip text="Upload wallpapers">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-ph-upload-simple-bold"
                  square
                  aria-label="Upload wallpapers"
                  @click="triggerMultiUpload"
                />
              </UTooltip>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5">
            <div
              v-for="wp in wallpapers"
              :key="wp.id"
              class="group relative flex items-center gap-2 rounded-md border p-1.5 pr-6 transition cursor-pointer"
              :class="
                selectedWallpaperId === wp.id
                  ? 'border-[var(--ui-primary)] bg-bg-card-hover'
                  : 'border-default bg-bg1 hover:bg-bg-card-hover'
              "
              @click="selectedWallpaperId = wp.id"
            >
              <img
                :src="wp.src"
                :alt="wp.name"
                class="h-7 w-11 shrink-0 rounded object-cover border border-default"
              />
              <div class="min-w-0 flex-1">
                <div class="truncate text-xs font-medium text-highlighted">{{ wp.name }}</div>
              </div>

              <!-- Top-right star icon: fixed when default, visible on hover otherwise -->
              <div
                class="absolute top-1.5 right-1.5 flex items-center gap-0.5 transition-opacity"
                :class="
                  defaultWallpaperId === wp.id
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                "
              >
                <UTooltip
                  :text="
                    defaultWallpaperId === wp.id
                      ? 'Default wallpaper'
                      : 'Set as default wallpaper'
                  "
                >
                  <UButton
                    size="2xs"
                    :color="defaultWallpaperId === wp.id ? 'primary' : 'neutral'"
                    variant="ghost"
                    :icon="defaultWallpaperId === wp.id ? 'i-ph-star-fill' : 'i-ph-star'"
                    square
                    :aria-label="
                      defaultWallpaperId === wp.id
                        ? 'Default wallpaper'
                        : 'Set as default wallpaper'
                    "
                    @click.stop="setAsDefault(wp.id)"
                  />
                </UTooltip>
                <UTooltip v-if="!wp.builtin" text="Delete wallpaper">
                  <UButton
                    size="2xs"
                    color="error"
                    variant="ghost"
                    icon="i-ph-trash"
                    square
                    aria-label="Delete wallpaper"
                    @click.stop="removeWallpaper(wp.id)"
                  />
                </UTooltip>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Section 2: Image Operations (Copy, Download, Upload to Vercel Blob) -->
      <template #operations>
        <div class="p-3 pt-1 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <UTooltip text="Copy PNG to clipboard">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-ph-copy-bold"
                size="md"
                square
                aria-label="Copy PNG to clipboard"
              />
            </UTooltip>
            <UTooltip text="Download PNG">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-ph-download-simple-bold"
                size="md"
                square
                aria-label="Download PNG"
              />
            </UTooltip>
          </div>

          <UTooltip text="Upload framed PNG to Vercel Blob & copy Markdown">
            <UButton
              color="primary"
              variant="solid"
              icon="i-ph-cloud-arrow-up-bold"
              class="flex-1 !bg-[var(--skript-primary-solid-bg)] hover:!bg-[var(--skript-primary-solid-bg-hover)] !text-[var(--skript-primary-solid-fg)] font-semibold"
            >
              Upload to Vercel Blob
            </UButton>
          </UTooltip>
        </div>
      </template>

      <!-- Section 3: Output (Override Mockup URL & Override Tab Title) -->
      <template #output>
        <div class="p-3 pt-1 flex flex-col gap-2">
          <UFormField label="Override Mockup URL" hint="auto-detected" size="xs">
            <UInput
              v-model="displayedUrl"
              icon="i-ph-link-simple"
              size="sm"
              class="w-full font-mono"
            />
          </UFormField>

          <UFormField label="Override Tab Title" hint="auto-detected" size="xs">
            <UInput v-model="displayedTitle" icon="i-ph-app-window" size="sm" class="w-full" />
          </UFormField>
        </div>
      </template>

      <!-- Section 4: Settings (Theme Sync & Vercel Blob Token) -->
      <template #settings>
        <div class="p-3 pt-1 flex flex-col gap-2.5">
          <UFormField label="Theme" size="xs">
            <div class="grid grid-cols-3 gap-1 rounded-md border border-default bg-bg1 p-0.5">
              <UButton
                v-for="opt in themeOptions"
                :key="opt.value"
                size="xs"
                :color="themeMode === opt.value ? 'neutral' : 'neutral'"
                :variant="themeMode === opt.value ? 'soft' : 'ghost'"
                :icon="opt.icon"
                class="justify-center"
                @click="themeMode = opt.value"
              >
                {{ opt.label }}
              </UButton>
            </div>
          </UFormField>

          <UFormField label="Vercel Blob Token" size="xs">
            <UInput
              v-model="blobToken"
              type="password"
              icon="i-ph-key"
              placeholder="BLOB_READ_WRITE_TOKEN"
              size="sm"
              class="w-full font-mono"
            />
          </UFormField>
        </div>
      </template>
    </UAccordion>
  </div>
</template>
