<script setup lang="ts">
/**
 * Skriptjobs wordmark for headers — swaps SVG by color mode via Nuxt UI.
 *
 * @see https://ui.nuxt.com/docs/components/color-mode-image
 */
</script>

<template>
  <UColorModeImage
    light="/brand/wordmark-light.svg"
    dark="/brand/wordmark-dark.svg"
    alt="Skriptjobs"
    :width="156"
    :height="43"
    class="h-[2.7rem] w-auto shrink-0 select-none"
  />
</template>
