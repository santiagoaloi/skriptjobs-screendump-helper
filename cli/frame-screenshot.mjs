#!/usr/bin/env node
/**
 * Skriptjobs Issue Screenshot Framer & Wallpaper Manager CLI
 *
 * Supports:
 * - Multi-wallpaper upload/registration (--add-wallpapers <file1> <file2> ...)
 * - Setting any built-in or uploaded wallpaper as the Default (--set-default-bg <id>)
 * - Listing and removing custom wallpapers (--list-bgs, --remove-bg <id>)
 * - Framing raw viewport screenshots or live URLs inside the macOS Chrome dark-plum
 *   replica with the official Skriptjobs three-triangles mark in both the active tab
 *   and the URL bar start badge.
 */

import sharp from 'sharp';
import { put } from '@vercel/blob';
import { readFile, writeFile, copyFile, unlink, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHROME_MOCKUP_THEME,
  buildChromeHeaderSvg,
} from '../shared/frame-renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BG_DIR = path.join(ROOT_DIR, 'assets', 'backgrounds');
const MANIFEST_PATH = path.join(BG_DIR, 'wallpapers-manifest.json');

export async function loadWallpaperManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return {
      defaultId: 'macos-default',
      wallpapers: [
        { id: 'macos-default', name: 'macOS Default (Santiago)', file: 'macos-default.png', builtin: true },
        { id: 'skriptjobs-indigo', name: 'Skriptjobs Indigo', file: 'skriptjobs-indigo.png', builtin: true },
        { id: 'nordic-teal', name: 'Nordic Teal', file: 'nordic-teal.png', builtin: true },
        { id: 'midnight-slate', name: 'Midnight Slate', file: 'midnight-slate.png', builtin: true },
      ],
    };
  }
  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
}

export async function saveWallpaperManifest(manifest) {
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

export async function addCustomWallpapers(filePaths, { setDefault = false } = {}) {
  const manifest = await loadWallpaperManifest();
  const added = [];
  for (const rawPath of filePaths) {
    const abs = path.resolve(rawPath);
    if (!existsSync(abs)) {
      throw new Error(`Wallpaper file not found: ${abs}`);
    }
    const ext = path.extname(abs).toLowerCase() || '.png';
    const base = path.basename(abs, ext);
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `custom-${Date.now()}`;
    const id = manifest.wallpapers.some((w) => w.id === slug) ? `${slug}-${Date.now()}` : slug;
    const destFile = `${id}${ext}`;
    await copyFile(abs, path.join(BG_DIR, destFile));
    const entry = {
      id,
      name: base,
      file: destFile,
      builtin: false,
      addedAt: new Date().toISOString(),
    };
    manifest.wallpapers.push(entry);
    added.push(entry);
  }
  if (setDefault && added.length > 0) {
    manifest.defaultId = added[0].id;
  }
  await saveWallpaperManifest(manifest);
  return { added, defaultId: manifest.defaultId };
}

export async function setDefaultWallpaper(id) {
  const manifest = await loadWallpaperManifest();
  const found = manifest.wallpapers.find((w) => w.id === id);
  if (!found) {
    throw new Error(
      `Wallpaper "${id}" not found. Available: ${manifest.wallpapers.map((w) => w.id).join(', ')}`
    );
  }
  manifest.defaultId = id;
  await saveWallpaperManifest(manifest);
  return found;
}

export async function removeCustomWallpaper(id) {
  const manifest = await loadWallpaperManifest();
  const idx = manifest.wallpapers.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error(`Wallpaper "${id}" not found.`);
  const target = manifest.wallpapers[idx];
  if (target.builtin) throw new Error(`Cannot remove built-in wallpaper "${id}".`);
  manifest.wallpapers.splice(idx, 1);
  if (manifest.defaultId === id) {
    manifest.defaultId = 'macos-default';
  }
  const filePath = path.join(BG_DIR, target.file);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
  await saveWallpaperManifest(manifest);
  return manifest;
}

export async function resolveBackgroundPath(bgOption = null) {
  const manifest = await loadWallpaperManifest();
  const targetId = !bgOption || bgOption === 'default' ? manifest.defaultId : bgOption;
  const entry = manifest.wallpapers.find((w) => w.id === targetId);
  if (entry) {
    return path.join(BG_DIR, entry.file);
  }
  const candidate = path.resolve(targetId);
  if (existsSync(candidate)) {
    return candidate;
  }
  throw new Error(
    `Unknown background "${bgOption}". Available IDs: ${manifest.wallpapers.map((w) => w.id).join(', ')} or pass a valid image path.`
  );
}

/**
 * Capture a raw viewport screenshot of a live URL using headless Google Chrome.
 */
export async function captureLiveUrlViewport(
  liveUrl,
  { width = 1561, height = 888 } = {}
) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'sj-capture-'));
  const rawPath = path.join(tmpDir, 'viewport.png');
  try {
    execFileSync(
      '/usr/bin/google-chrome',
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        `--window-size=${width},${height}`,
        `--screenshot=${rawPath}`,
        liveUrl,
      ],
      { stdio: 'pipe', timeout: 30000 }
    );
    return await readFile(rawPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Frame a viewport PNG buffer/path inside the macOS Chrome dark-plum replica.
 */
export async function frameScreenshot({
  input,
  url = 'https://docs.skriptjobs.localhost:3050/getting-started/installation',
  title = 'Installation - Skriptjobs',
  bg = null, // null uses manifest.defaultId
  marginMode = 'reference',
  fitReferenceSize = false,
  outputPath = null,
}) {
  const T = CHROME_MOCKUP_THEME;
  const margins = T.margins[marginMode] || T.margins.reference;

  const vpMeta = await sharp(input).metadata();
  const innerW = fitReferenceSize
    ? T.referenceWindow.width - 4
    : vpMeta.width;
  const innerVpH = fitReferenceSize
    ? Math.round(vpMeta.height * (innerW / vpMeta.width))
    : vpMeta.height;

  const winW = innerW + 4; // 1565
  const winH = innerVpH + T.header.totalHeight + 4; // 978
  const totalW = winW + margins.left + margins.right; // 1711
  const totalH = winH + margins.top + margins.bottom; // 1076

  const winX = margins.left; // 60
  const winY = margins.top; // 36
  const r = T.windowRadius; // 12

  // 1. Prepare background wallpaper resized to totalW x totalH
  const bgPath = await resolveBackgroundPath(bg);
  const bgBuffer = await sharp(bgPath)
    .resize(totalW, totalH, { fit: 'cover' })
    .png()
    .toBuffer();

  // 2. Render Drop Shadow SVG (exact fitted model: dy=20, sigma=16, alpha=0.62)
  const shadowSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
      <defs>
        <filter id="macShadow" x="-15%" y="-15%" width="130%" height="140%" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="${T.shadow.sigma}" result="blur1" />
          <feOffset in="blur1" dx="${T.shadow.offsetX}" dy="${T.shadow.offsetY}" result="offset1" />
          <feComponentTransfer in="offset1" result="shadow1">
            <feFuncA type="linear" slope="${T.shadow.alpha}" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="${r}" ry="${r}" fill="#000000" filter="url(#macShadow)" />
    </svg>`
  );

  // 3. Render Window Outer/Inner Rim SVG (winW x winH)
  const rimSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${winW}" height="${winH}" viewBox="0 0 ${winW} ${winH}">
      <rect x="0" y="0" width="${winW}" height="${winH}" rx="${r}" ry="${r}" fill="${T.borderOuter}" />
      <rect x="1" y="1" width="${winW - 2}" height="${winH - 2}" rx="${r - 1}" ry="${r - 1}" fill="${T.borderInner}" />
    </svg>`
  );

  // 4. Render Simplified Chrome Header SVG (innerW x 86) with Skriptjobs three-triangles mark in tab & URL bar
  const headerSvgStr = buildChromeHeaderSvg({
    windowWidth: innerW,
    title,
    url,
  });
  const headerPng = await sharp(Buffer.from(headerSvgStr)).png().toBuffer();

  // 5. Resize viewport to innerW x innerVpH
  const resizedVp = await sharp(input)
    .resize(innerW, innerVpH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // 6. Combine Header + Viewport into inner surface and mask with rounded rect (rx = r - 2 = 10)
  const innerH = T.header.totalHeight + innerVpH;
  const innerMaskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${innerW}" height="${innerH}" viewBox="0 0 ${innerW} ${innerH}">
      <rect x="0" y="0" width="${innerW}" height="${innerH}" rx="${r - 2}" ry="${r - 2}" fill="#ffffff" />
    </svg>`
  );

  const innerSurface = await sharp({
    create: {
      width: innerW,
      height: innerH,
      channels: 4,
      background: { r: 63, g: 56, b: 77, alpha: 1 },
    },
  })
    .composite([
      { input: headerPng, top: 0, left: 0 },
      { input: resizedVp, top: T.header.totalHeight, left: 0 },
      { input: innerMaskSvg, top: 0, left: 0, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  // 7. Final composite: Background + Shadow + Rim + Inner Rounded Window
  const finalBuffer = await sharp(bgBuffer)
    .composite([
      { input: shadowSvg, top: 0, left: 0 },
      { input: rimSvg, top: winY, left: winX },
      { input: innerSurface, top: winY + 2, left: winX + 2 },
    ])
    .png()
    .toBuffer();

  if (outputPath) {
    await sharp(finalBuffer).toFile(outputPath);
  }
  return finalBuffer;
}

// CLI Entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const getArg = (flag, fallback = null) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
  };
  const hasFlag = (flag) => args.includes(flag);

  if (hasFlag('--list-bgs')) {
    const manifest = await loadWallpaperManifest();
    for (const w of manifest.wallpapers) {
      const def = w.id === manifest.defaultId ? ' [DEFAULT]' : '';
      const kind = w.builtin ? 'built-in' : 'custom';
      console.log(`- ${w.id} (${w.name}) [${kind}]${def}`);
    }
    process.exit(0);
  }

  if (hasFlag('--set-default-bg')) {
    const id = getArg('--set-default-bg');
    const updated = await setDefaultWallpaper(id);
    console.log(`Default wallpaper set to: ${updated.id} (${updated.name})`);
    process.exit(0);
  }

  if (hasFlag('--remove-bg')) {
    const id = getArg('--remove-bg');
    const manifest = await removeCustomWallpaper(id);
    console.log(`Removed wallpaper "${id}". Current default: ${manifest.defaultId}`);
    process.exit(0);
  }

  if (hasFlag('--add-wallpapers')) {
    const idx = args.indexOf('--add-wallpapers');
    const files = [];
    for (let i = idx + 1; i < args.length && !args[i].startsWith('--'); i++) {
      files.push(args[i]);
    }
    const setDefault = hasFlag('--make-default');
    const res = await addCustomWallpapers(files, { setDefault });
    console.log(
      `Added ${res.added.length} wallpaper(s): ${res.added.map((a) => a.id).join(', ')} (default: ${res.defaultId})`
    );
    process.exit(0);
  }

  if (hasFlag('--help') || hasFlag('-h') || args.length === 0) {
    console.log(
      `Usage:
  node ${path.basename(__filename)} [options]

Wallpaper Management:
  --list-bgs                        List all built-in and uploaded wallpapers (marks [DEFAULT])
  --add-wallpapers <f1> [f2 ...]    Upload/register one or more custom wallpapers (add --make-default to set first as default)
  --set-default-bg <id>             Set any built-in or uploaded wallpaper ID as the default
  --remove-bg <id>                  Delete a custom uploaded wallpaper

Screenshot Framing & Upload:
  --input <path>                    Path to raw viewport screenshot PNG/JPG
  --live-url <url>                  Capture a live webpage in headless Chrome and frame it
  --url <url>                       URL to display in the Chrome omnibox (defaults to --live-url)
  --title <title>                   Tab title to display in the active Chrome tab
  --bg <id|path>                    Wallpaper ID or file path (defaults to current default wallpaper)
  --margin-mode <mode>              reference (exact 1711x1076 margins, default) or symmetric
  --keep-viewport-size              Preserve raw input dimensions instead of fitting 1561x888 reference viewport
  --output <path>                   Output framed PNG path (default: ./framed-issue-screenshot.png)
  --upload                          Upload framed PNG to Vercel Blob store (requires BLOB_READ_WRITE_TOKEN)
  --markdown                        Print GitHub Markdown ![title](url) when uploading`
    );
    process.exit(0);
  }

  const inputPath = getArg('--input');
  const liveUrl = getArg('--live-url');
  const displayUrl =
    getArg('--url') ||
    liveUrl ||
    'https://docs.skriptjobs.localhost:3050/getting-started/installation';
  const title = getArg('--title', 'Installation - Skriptjobs');
  const bg = getArg('--bg', null);
  const marginMode = getArg('--margin-mode', 'reference');
  const fitReferenceSize = !hasFlag('--keep-viewport-size');
  const outputPath = path.resolve(
    getArg('--output', './framed-issue-screenshot.png')
  );
  const shouldUpload = hasFlag('--upload');
  const asMarkdown = hasFlag('--markdown') || hasFlag('-m');

  let inputSource = inputPath ? path.resolve(inputPath) : null;
  if (!inputSource && liveUrl) {
    inputSource = await captureLiveUrlViewport(liveUrl);
  }
  if (!inputSource) {
    console.error('Error: Provide either --input <path> or --live-url <url>.');
    process.exit(1);
  }

  const framedBuf = await frameScreenshot({
    input: inputSource,
    url: displayUrl,
    title,
    bg,
    marginMode,
    fitReferenceSize,
    outputPath,
  });

  if (shouldUpload) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error(
        'Error: BLOB_READ_WRITE_TOKEN environment variable is required for --upload.'
      );
      process.exit(1);
    }
    const baseName = path.basename(outputPath);
    const blobPath = `issues/${new Date().toISOString().slice(0, 10)}/${baseName}`;
    const blob = await put(blobPath, framedBuf, {
      access: 'public',
      token,
      contentType: 'image/png',
    });
    if (asMarkdown) {
      console.log(`![${title}](${blob.url})`);
    } else {
      console.log(blob.url);
    }
  } else {
    console.log(outputPath);
  }
}
