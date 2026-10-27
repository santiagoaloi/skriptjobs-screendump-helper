# Changelog

All notable changes to **Skriptjobs Screendump Helper** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - 2026-10-27

### Added
- **macOS Chrome Dark-Theme Mockup Frame (`1711 × 1076 px`)**:
  - Pixel-accurate replica of the macOS Chrome dark-plum window (`#231c2f` tab bar, `#3f384d` active tab & toolbar, `#292335` pill omnibox, `#585a5f` / `#393344` outer border rim, `12 px` border radius).
  - Authentic outer wallpaper margins (`left = 87 px`, `top = 34 px`, `right = 76 px`, `bottom = 86 px`) and soft downward window drop shadow (`dy = +20 px`, `blur = 34 px`, `alpha = 0.62`).
  - Official **Skriptjobs three-triangles mark** (`logo-three-triangles.svg`) rendered in both the active browser tab favicon and the circular badge at the start of the URL bar.
- **Hover-to-Inspect Fullscreen Preview Action**:
  - Live `<canvas>` preview inside the extension popup with a top-right **Open full image in new tab** button (`#btnOpenFullTab`) that stays hidden by default and appears on hover with a tooltip.
- **Multi-Wallpaper Gallery & Default Star Toggle**:
  - Built-in wallpaper presets: **macOS Default**, **Skriptjobs Indigo**, **Nordic Teal**, and **Midnight Slate**.
  - Multi-file custom wallpaper upload (`<input type="file" multiple accept="image/*">`) persisted in `chrome.storage.local` (and `wallpapers-manifest.json` for the CLI).
  - Top-right star icon on wallpaper cards: fixed filled star (`★`) on the default wallpaper, and hover-only outline star (`☆`) on non-default wallpapers to set as default.
- **Single-Open Collapsible Accordion & Compact Icon Actions (`@nuxt/ui` + `@skriptjobs/ui`)**:
  - Single-open collapsible accordion (`Wallpapers`, `Image Operations`, `Settings`) so only one section is expanded at a time.
  - Icon-only square action buttons with tooltips for **Upload Wallpapers**, **Upload to Vercel Blob & Copy Markdown**, **Copy Framed PNG to Clipboard**, and **Download Framed PNG**.
- **Vercel Blob Integration (`skriptjobs-issue-screenshots`)**:
  - Direct upload from both the Chrome extension popup and the headless CLI (`cli/frame-screenshot.mjs` and `cli/upload-issue-screenshot.mjs`), automatically copying the ready-to-paste GitHub Markdown snippet (`![Title](https://...)`).
- **Reusable Nuxt UI Component (`<ChromeIssueMockup />`)**:
  - Vue 3 / Nuxt 4 components (`ChromeIssueMockup.vue` and `IssueCaptureExtensionApp.vue`) built with `@nuxt/ui` v4 and `@skriptjobs/ui` design tokens.

### Changed
- Renamed header subtitle to **Screendump Helper** in plain harmonic text next to the official **Skriptjobs** wordmark (`wordmark-dark.svg`), removing redundant header and wallpaper count badges.
- Stripped browser navigation arrows (back/forward/refresh), right-side toolbar icons, and the "Ask Gemini" button from the Chrome mockup header for clean issue and documentation screenshots.
