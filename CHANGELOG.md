# Changelog

All notable changes to **Skriptjobs Screendump Helper** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.1.0] - 2026-10-27

### Added
- **Drag-and-Drop Mockup Preview (`#previewDragImage`)**:
  - Drag the rendered mockup directly from the Preview card onto the macOS Desktop or any Finder folder to save the full-resolution PNG (`skriptjobs-<slug>-framed.png`), or drag it onto a browser tab to open and view/save the full image.
- **Stay-on-Top Floating Window (`#btnPinWindow`)**:
  - Header pin button (**Keep extension open on top**) opens a dedicated floating extension window anchored at the top-right of the browser and persists `stayOnTop` state in `chrome.storage.local`.
  - Automatic blur-recovery (`window.blur` and `chrome.windows.onFocusChanged`) immediately re-focuses the pinned window so it stays on top of the browser window when clicking into the page or opening the full-resolution preview in a new tab.
- **Output Accordion Section (`Override Favicon`, `Override Mockup URL`, `Override Tab Title`)**:
  - Dedicated **Output** section with **Override Favicon (Tab & URL Bar)** (accepts any image URL or uploaded icon, plus a square reset button to restore the default Skriptjobs three-triangles mark).
  - Square **Reset** buttons (`#btnResetUrl` and `#btnResetTitle`) next to **Override Mockup URL** and **Override Tab Title** to restore the active tab's live URL or title on demand.
  - Full persistence of `customFavicon`, `customUrlOverride`, `customTitleOverride`, selected wallpaper (`selectedWallpaperId`), and active accordion section (`activeAccordionSection`) across tab switches and popup openings.
- **Edge-Sampled Circular URL Bar Badge Fill**:
  - `normalizeFaviconForHeader` samples edge pixels of square favicons and fills the entire `24 × 24 px` (`r = 12`) circular omnibox badge (`clipPath id="omniBadgeClip"`) and `16 × 16 px` rounded tab slot with zero dark ring around custom icons.
- **Theme Selector, Browser Mockup Theme Sync & Dual Light/Dark ZIP Export**:
  - **Theme** selector (`System`, `Dark`, `Light`) in **Settings** synced with `@skriptjobs/ui` neutral tokens and matching `wordmark-dark.svg` / `wordmark-light.svg` header logos.
  - **Sync Browser Mockup Theme** switch to sync the rendered macOS Chrome frame between dark-plum (`#231c2f` / `#3f384d`) and light (`#dee1e6` / `#ffffff`) Chrome palettes.
  - **Download Light & Dark ZIP** (`#btnDownloadBoth`) in **Image Operations** using a dependency-free ZIP builder (`shared/zip-builder.js`) to export `-light.png` and `-dark.png` pairs ready for Nuxt UI `<UColorModeImage />`.
- **Wallpaper 3-Dots Context Menu, Undo & Wallpaper-Only Restore**:
  - Per-card 3-dots dropdown menu (**Change image name**, **Remove image**, **Set as default**) sized to the full wallpaper card width.
  - Quiet bottom notification bar shown only on errors or Undo-capable actions (**Remove image**, **Restore default wallpapers**) with a ghost-style **Undo** button (`#btnToastUndo`).
  - **Restore default wallpapers** (`#btnRestoreDefaults`) restores only the built-in wallpapers without touching theme or settings.
- **Bundled Geist & Geist Mono Variable Fonts**:
  - Bundled `Geist-Variable.woff2` and `GeistMono-Variable.woff2` locally in `extension/assets/fonts/` for offline-ready typography across the extension popup and log viewer.
- **Extension Context Menu Diagnostics & Browser-Timezone Timestamps**:
  - Right-click toolbar icon context menu item (**View Extension Logs & State**) opening `extension/html/logs.html` with live filterable logs, storage state inspector, Copy JSON, and Export `.json`.
  - Every log entry and stored state snapshot includes `timestamp` formatted in the browser's local timezone with UTC offset (`YYYY-MM-DDTHH:mm:ss.sss±HH:MM`) plus `timezone` (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

### Changed
- **Consistent Square Icon Buttons (`30 × 30 px`)**:
  - Unified the **Vercel Blob Token** reveal/hide eye button (`#btnToggleBlobToken`), **Override Favicon** upload/reset buttons, and **Override Mockup URL** / **Override Tab Title** reset buttons to use the same standalone square `u-btn u-btn-icon-sm u-btn-soft` styling.
- **Zero-Scroll Compact Popup Layout & Native Aspect Ratio**:
  - Preserved the captured tab's native aspect ratio when framing screenshots and eliminated vertical/horizontal scrollbars across all accordion sections (`< 600 px` height), with `user-select: none` on UI chrome and ellipsis truncation on wallpaper card titles.
- **Chrome Internal Page Fallback**:
  - Added automatic fallback to the bundled sample viewport when opened on restricted `chrome://` or `chrome-extension://` tabs.

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
