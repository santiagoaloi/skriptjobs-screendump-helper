# Skriptjobs | Screendump Helper

**Skriptjobs Screendump Helper** is a Chrome Extension (Manifest V3), reusable `@nuxt/ui` + `@skriptjobs/ui` component library, and Node.js CLI for capturing and framing browser screenshots inside a macOS Chrome dark-theme mockup window (`1711 × 1076 px`).

Built for **Skriptjobs GitHub issues and documentation**, it frames any active tab or local screenshot over a selectable wallpaper background with matching outer margins, a macOS window drop shadow, official Skriptjobs three-triangles brand marks in the tab and URL bar, and one-click upload to **Vercel Blob** (`skriptjobs-issue-screenshots`).

![Framed Output — macOS Default Wallpaper](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-framed-output-macos-default)

---

## 📦 Download Latest Release

Grab the ready-to-install Chrome Extension package from [**GitHub Releases (`latest`)**](https://github.com/santiagoaloi/skriptjobs-screendump-helper/releases/latest):

- **Latest Release:** [`v1.0.0`](https://github.com/santiagoaloi/skriptjobs-screendump-helper/releases/tag/v1.0.0)
- **Downloadable Asset:** `skriptjobs-screendump-helper-v1.0.0.zip`
- **Release Notes:** [`CHANGELOG.md`](./CHANGELOG.md) (published via `npm run release`)

---

## ✨ Key Features

- **macOS Chrome Dark-Theme Mockup (`1711 × 1076 px`):** Minimal Chrome frame showing only the traffic lights, active tab with the Skriptjobs three-triangles favicon, and pill URL bar with the Skriptjobs three-triangles badge over your selected wallpaper.
- **Hover-to-Inspect Live Preview:** Live `<canvas>` preview in the extension popup with a hover-only top-right button to open the full-resolution PNG in a new tab.
- **Multi-Wallpaper Gallery:** Ships with 4 built-in presets (**macOS Default**, **Skriptjobs Indigo**, **Nordic Teal**, **Midnight Slate**) plus custom multi-file wallpaper uploads and a top-right star toggle for the default background.
- **Single-Open Collapsible Accordion:** Built with `@nuxt/ui` and `@skriptjobs/ui` dark theme tokens (`Wallpapers`, `Image Operations`, and `Settings`), with icon-only actions for **Upload to Vercel Blob & Copy Markdown**, **Copy PNG**, and **Download PNG**.

---

## 📸 Framed Output Examples (`1711 × 1076 px`)

### `macOS Default` Wallpaper
![Framed Output — macOS Default](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-framed-output-macos-default)

### `Skriptjobs Indigo` Wallpaper
![Framed Output — Skriptjobs Indigo](https://ne1nanlb7kmikytf.public.blob.vercel-storage.com/readme-framed-output-skriptjobs-indigo)

---

## 🚀 Getting Started

### 1. Install the Chrome Extension (Unpacked)

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the [`extension/`](./extension) directory (or an unzipped release archive).
4. Pin **Skriptjobs Screendump Helper** to your Chrome toolbar.

### 2. Configure Vercel Blob Upload (Optional)

1. Open the **Settings** accordion section in the extension popup.
2. Paste your `BLOB_READ_WRITE_TOKEN` into the **Vercel Blob Token** field (stored locally in `chrome.storage.local`).
3. Open **Image Operations** and click **Upload to Vercel Blob & Copy Markdown**.

---

## 🖥️ CLI Usage (`cli/frame-screenshot.mjs`)

```bash
# Install dependencies
npm install

# Frame a viewport PNG using the default macOS wallpaper
node cli/frame-screenshot.mjs \
  --input ./assets/sample-viewport.png \
  --output ./framed-issue.png \
  --url "https://docs.skriptjobs.localhost:3050/getting-started/installation" \
  --title "Installation - Skriptjobs"

# Frame with a preset wallpaper and upload directly to Vercel Blob
node cli/frame-screenshot.mjs \
  --input ./assets/sample-viewport.png \
  --output ./framed-indigo.png \
  --bg skriptjobs-indigo \
  --url "https://docs.skriptjobs.localhost:3050/getting-started/installation" \
  --title "Installation - Skriptjobs" \
  --upload

# Add custom wallpapers and set the first as default
node cli/frame-screenshot.mjs \
  --add-wallpapers ~/Pictures/wp-aurora.png ~/Pictures/wp-dark.jpg \
  --set-default
```

---

## 📁 Repository Structure

```text
skriptjobs-screendump-helper/
├── extension/                  # Chrome Extension (Manifest V3 — load unpacked)
├── packages/ui/                # Reusable @nuxt/ui v4 + @skriptjobs/ui components
├── cli/
│   ├── frame-screenshot.mjs    # Headless CLI for framing images & managing wallpapers
│   ├── upload-issue-screenshot.mjs
│   └── release.mjs             # Release packager & publisher (npm run release)
├── shared/
│   └── frame-renderer.js       # Shared macOS Chrome dark-theme frame renderer
└── assets/backgrounds/         # CLI wallpaper presets & manifest
```
