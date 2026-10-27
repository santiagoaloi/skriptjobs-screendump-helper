# Skriptjobs | Screendump Helper

**Skriptjobs Screendump Helper** is a Chrome Extension (Manifest V3), reusable `@nuxt/ui` + `@skriptjobs/ui` component library, and Node.js CLI for capturing and framing browser screenshots inside a pixel-accurate macOS Chrome dark-theme mockup window (`1711 × 1076 px`).

Built for **Skriptjobs GitHub issues and documentation**, it frames any active tab or local screenshot over your selectable wallpaper background with matching outer margins, realistic macOS window drop shadow, official Skriptjobs three-triangles brand marks in the tab and omnibox, and one-click upload to **Vercel Blob** (`skriptjobs-issue-screenshots`).

![Framed Output — macOS Default Wallpaper](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-framed-output-macos-default)

---

## 📦 Download Latest Release

Grab the ready-to-install Chrome Extension package from [**GitHub Releases (`latest`)**](https://github.com/santiagoaloi/skriptjobs-screendump-helper/releases/latest):

- **Latest Release:** [`v1.0.0`](https://github.com/santiagoaloi/skriptjobs-screendump-helper/releases/tag/v1.0.0)
- **Downloadable Asset:** `skriptjobs-screendump-helper-v1.0.0.zip` / `skriptjobs-screendump-helper-extension.zip`
- **Release Notes:** Full changelog-style notes in [`CHANGELOG.md`](./CHANGELOG.md) (automatically published on every release via [`.github/workflows/release.yml`](./.github/workflows/release.yml)).

---

## ✨ Key Features

- **Authentic macOS Chrome Dark-Theme Replica (`1711 × 1076 px`)**
  - Exact proportions and outer wallpaper padding (`left = 87 px`, `top = 34 px`, `right = 76 px`, `bottom = 86 px`, `12 px` window radius).
  - Soft downward macOS window drop shadow (`dy = +20 px`, `blur = 34 px`, `alpha = 0.62`) and `#585a5f` / `#393344` outer border rim.
  - Clean minimal Chrome header (`82 px` total height):
    - **Top Tab Bar (`42 px`, `#231c2f`)**: macOS traffic lights (`#ff5f57`, `#febc2e`, `#28c840`), active tab (`#3f384d`) with the official **Skriptjobs three-triangles logo** (`logo-three-triangles.svg`), page title, close `×`, and new-tab `+` button (no "Ask Gemini" clutter).
    - **URL Bar Row (`40 px`, `#3f384d`)**: Pill omnibox (`#292335`) with the **Skriptjobs three-triangles mark** inside the circular site badge and the full URL (`https://...`), with all navigation arrows and right-side toolbar icons stripped out for clean documentation and issue visuals.
- **Hover-to-Inspect Live Preview**
  - The popup renders a live `<canvas>` preview of the framed screenshot.
  - Hovering over the preview reveals a top-right **Open full image in new tab** button (`1711 × 1076 px`) so you can inspect fine details before exporting.
- **Multi-Wallpaper Gallery & Default Star Toggle**
  - Ships with 4 built-in backgrounds: **macOS Default**, **Skriptjobs Indigo**, **Nordic Teal**, and **Midnight Slate**.
  - Upload multiple custom wallpapers at once via the compact upload icon button; custom wallpapers persist in `chrome.storage.local` (or `wallpapers-manifest.json` in the CLI).
  - Clean card layout with no redundant text badges: the default wallpaper displays a **fixed filled star (`★`)** in its top-right corner, while non-default wallpapers reveal an **outline star (`☆`) on hover** to set them as the new default.
- **Single-Open Collapsible Accordion & Compact Icon Actions**
  - Built with `@nuxt/ui` (`UAccordion` `type="single" collapsible`, `UTooltip`, `UButton`, `UInput`, `UFormField`) and `@skriptjobs/ui` dark theme tokens.
  - Only one accordion section (**Wallpapers**, **Image Operations**, or **Settings**) stays open at a time to keep the popup compact.
  - **Image Operations** provides three square icon-only buttons with tooltips:
    1. **Upload to Vercel Blob & Copy Markdown** (`![Title](https://...public.blob.vercel-storage.com/...)`)
    2. **Copy Framed PNG to Clipboard**
    3. **Download Framed PNG**

---

## 📸 Extension UI & Screendumps

### 1. Default vs. Hover State (Preview Fullscreen Icon & Wallpaper Star)

- **Left (Default state):** Clean preview with no overlay clutter; `macOS Default` shows its fixed top-right star (`★`).
- **Right (Hover state):** Hovering the preview reveals the top-right **Open full image in new tab** icon button + tooltip, and hovering another wallpaper card (`Skriptjobs Indigo`) reveals its top-right outline star (`☆`) to set it as default.

![Preview & Wallpaper Hover Comparison](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-preview-hover-comparison)

### 2. Collapsible Accordion Sections

| **Wallpapers Section** | **Image Operations Section** | **Settings Section** |
| :---: | :---: | :---: |
| ![Wallpapers Section](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-extension-wallpapers-hover) | ![Image Operations Section](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-extension-image-operations) | ![Settings Section](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-extension-settings) |

### 3. Framed Output Examples (`1711 × 1076 px`)

#### `macOS Default` Wallpaper
![Framed Output — macOS Default](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-framed-output-macos-default)

#### `Skriptjobs Indigo` Wallpaper
![Framed Output — Skriptjobs Indigo](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-framed-output-skriptjobs-indigo)

---

## 📁 Repository Structure

```text
skriptjobs-screendump-helper/
├── extension/                                # Chrome Extension (Manifest V3 — load unpacked)
│   ├── manifest.json                         # Extension manifest (activeTab, storage, clipboardWrite)
│   ├── popup.html                            # Popup UI styled with @nuxt/ui & @skriptjobs/ui tokens
│   ├── popup.js                              # Live canvas preview, wallpaper gallery, & Vercel Blob upload
│   ├── background.js                         # Background service worker for tab capture
│   ├── content.js                            # Page metadata helper
│   ├── shared/
│   │   └── frame-renderer.js                 # Universal Canvas/SVG macOS Chrome dark-plum renderer
│   └── assets/
│       ├── brand/                            # Official Skriptjobs wordmarks & three-triangles SVGs
│       ├── backgrounds/                      # Built-in wallpaper presets
│       └── sample-viewport.png               # Sample viewport for offline previewing
├── packages/
│   └── ui/                                   # Reusable @nuxt/ui v4 + @skriptjobs/ui package
│       ├── package.json
│       ├── nuxt.config.ts
│       └── app/
│           ├── assets/css/                   # @skriptjobs/ui theme tokens & variables
│           └── components/
│               ├── ChromeIssueMockup.vue     # Reusable macOS Chrome dark-theme frame component
│               └── IssueCaptureExtensionApp.vue # Full Nuxt UI extension popup component
├── cli/
│   ├── frame-screenshot.mjs                  # Node.js CLI for framing images/URLs & managing wallpapers
│   └── upload-issue-screenshot.mjs           # Standalone Vercel Blob uploader + Markdown generator
├── shared/
│   └── frame-renderer.js                     # Shared frame renderer module used by CLI & components
├── assets/
│   └── backgrounds/                          # CLI wallpaper store + wallpapers-manifest.json
└── docs/
    └── screenshots/                          # Screendumps referenced in this README
```

---

## 🚀 Getting Started

### 1. Install the Chrome Extension (Unpacked)

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner and select the [`extension/`](./extension) directory from this repository.
4. Pin **Skriptjobs Screendump Helper** in your Chrome extensions toolbar.
5. Open any tab you want to capture, click the extension icon, pick a wallpaper (or upload your own), and click **Upload to Vercel Blob**, **Copy PNG**, or **Download PNG**.

### 2. Configure Vercel Blob Upload (Optional)

To upload framed screenshots directly to the `skriptjobs-issue-screenshots` Vercel Blob store and copy the ready-to-paste GitHub Markdown image tag (`![Title](https://...)`):

1. Open the **Settings** accordion section in the extension popup.
2. Paste your `BLOB_READ_WRITE_TOKEN` into the **Vercel Blob Token** field (saved locally in `chrome.storage.local`).
3. Open **Image Operations** and click the first icon button (**Upload to Vercel Blob & Copy Markdown**).

---

## 🖥️ CLI Usage (`cli/frame-screenshot.mjs`)

You can also frame screenshots and manage wallpapers headlessly from the terminal:

```bash
# Install dependencies
npm install

# Frame a viewport PNG using the default macOS wallpaper
node cli/frame-screenshot.mjs \
  --input ./assets/sample-viewport.png \
  --output ./framed-issue.png \
  --url "https://docs.skriptjobs.localhost:3050/getting-started/installation" \
  --title "Installation - Skriptjobs"

# Frame using a specific wallpaper preset and upload directly to Vercel Blob
node cli/frame-screenshot.mjs \
  --input ./assets/sample-viewport.png \
  --output ./framed-indigo.png \
  --bg skriptjobs-indigo \
  --url "https://docs.skriptjobs.localhost:3050/getting-started/installation" \
  --title "Installation - Skriptjobs" \
  --upload

# Upload multiple custom wallpapers and set the first as default
node cli/frame-screenshot.mjs \
  --add-wallpapers ~/Pictures/wp-aurora.png ~/Pictures/wp-dark.jpg \
  --set-default

# List all registered wallpapers (built-in + custom)
node cli/frame-screenshot.mjs --list-bgs
```

---

## 🧩 Using the Nuxt UI Components (`@nuxt/ui` + `@skriptjobs/ui`)

Inside any Nuxt 4 app using `@nuxt/ui` and `@skriptjobs/ui`, you can render the framed browser mockup directly with `<ChromeIssueMockup />`:

```vue
<template>
  <ChromeIssueMockup
    viewport-src="/screenshots/hydration-mismatch.png"
    wallpaper-src="/backgrounds/macos-default.png"
    url="https://docs.skriptjobs.localhost:3050/getting-started/installation"
    title="Installation - Skriptjobs"
  />
</template>
```
