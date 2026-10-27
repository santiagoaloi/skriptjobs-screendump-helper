import { renderFramedScreenshotToCanvas } from './shared/frame-renderer.js';

const BUILTIN_WALLPAPERS = [
  {
    id: 'macos-default',
    name: 'macOS Default',
    src: 'assets/backgrounds/macos-default.png',
    builtin: true,
  },
  {
    id: 'skriptjobs-indigo',
    name: 'Skriptjobs Indigo',
    src: 'assets/backgrounds/skriptjobs-indigo.png',
    builtin: true,
  },
  {
    id: 'nordic-teal',
    name: 'Nordic Teal',
    src: 'assets/backgrounds/nordic-teal.png',
    builtin: true,
  },
  {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    src: 'assets/backgrounds/midnight-slate.png',
    builtin: true,
  },
];

const previewCanvas = document.getElementById('previewCanvas');
const btnOpenFullTab = document.getElementById('btnOpenFullTab');
const urlInput = document.getElementById('urlInput');
const titleInput = document.getElementById('titleInput');
const blobTokenInput = document.getElementById('blobTokenInput');
const wallpaperGallery = document.getElementById('wallpaperGallery');
const multiWallpaperInput = document.getElementById('multiWallpaperInput');
const btnUploadWallpapers = document.getElementById('btnUploadWallpapers');
const btnCopyClipboard = document.getElementById('btnCopyClipboard');
const btnDownloadPng = document.getElementById('btnDownloadPng');
const btnUploadBlob = document.getElementById('btnUploadBlob');
const statusBox = document.getElementById('statusBox');
const accordionItems = Array.from(document.querySelectorAll('.u-accordion-item'));

const STAR_FILLED_SVG = `<svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor"><path d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"/></svg>`;
const STAR_OUTLINE_SVG = `<svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor"><path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.64-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z"/></svg>`;

let customWallpapers = [];
let defaultWallpaperId = 'macos-default';
let selectedWallpaperId = 'macos-default';
let viewportImage = null;

// Single-open collapsible accordion controller (only one open at a time)
function setActiveAccordionItem(targetKey, toggleIfSame = true) {
  for (const item of accordionItems) {
    const key = item.getAttribute('data-accordion-item');
    if (key === targetKey) {
      if (toggleIfSame && item.classList.contains('open')) {
        item.classList.remove('open');
      } else {
        item.classList.add('open');
      }
    } else {
      item.classList.remove('open');
    }
  }
}

for (const item of accordionItems) {
  const trigger = item.querySelector('.u-accordion-trigger');
  const key = item.getAttribute('data-accordion-item');
  trigger?.addEventListener('click', () => {
    setActiveAccordionItem(key, true);
  });
}

function setStatus(msg, type = 'info') {
  statusBox.textContent = msg;
  statusBox.className = `u-status visible ${type}`;
}

function getAllWallpapers() {
  return [...BUILTIN_WALLPAPERS, ...customWallpapers];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function readStorage(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return await chrome.storage.local.get(keys);
  }
  const out = {};
  for (const k of keys) {
    const raw = localStorage.getItem(`sj_${k}`);
    if (raw) {
      try {
        out[k] = JSON.parse(raw);
      } catch {
        out[k] = raw;
      }
    }
  }
  return out;
}

async function writeStorage(obj) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set(obj);
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    localStorage.setItem(`sj_${k}`, JSON.stringify(v));
  }
}

function renderWallpaperGallery() {
  const all = getAllWallpapers();
  wallpaperGallery.innerHTML = '';

  for (const wp of all) {
    const isSelected = wp.id === selectedWallpaperId;
    const isDefault = wp.id === defaultWallpaperId;

    const item = document.createElement('div');
    item.className = `wp-item ${isSelected ? 'active' : ''}`;
    item.setAttribute('data-wp-id', wp.id);
    item.addEventListener('click', async () => {
      selectedWallpaperId = wp.id;
      renderWallpaperGallery();
      await redrawPreview();
    });

    const thumb = document.createElement('img');
    thumb.className = 'wp-thumb';
    thumb.src = wp.src;
    thumb.alt = wp.name;

    const meta = document.createElement('div');
    meta.className = 'wp-meta';

    const nameEl = document.createElement('div');
    nameEl.className = 'wp-name';
    nameEl.textContent = wp.name;

    meta.appendChild(nameEl);

    // Top-right corner star (fixed when default, appears on hover otherwise)
    const cornerActions = document.createElement('div');
    cornerActions.className = 'wp-corner-actions';

    const btnStar = document.createElement('button');
    btnStar.type = 'button';
    btnStar.className = `wp-star-btn tooltip-right ${isDefault ? 'is-default' : ''}`;
    btnStar.setAttribute(
      'data-tooltip',
      isDefault ? 'Default wallpaper' : 'Set as default'
    );
    btnStar.setAttribute(
      'aria-label',
      isDefault ? 'Default wallpaper' : 'Set as default'
    );
    btnStar.innerHTML = isDefault ? STAR_FILLED_SVG : STAR_OUTLINE_SVG;
    btnStar.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (isDefault) return;
      defaultWallpaperId = wp.id;
      selectedWallpaperId = wp.id;
      await writeStorage({ defaultWallpaperId });
      renderWallpaperGallery();
      await redrawPreview();
      setStatus(`Set "${wp.name}" as default wallpaper.`, 'success');
    });
    cornerActions.appendChild(btnStar);

    if (!wp.builtin) {
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'wp-del-btn tooltip-right';
      btnDel.setAttribute('data-tooltip', 'Delete wallpaper');
      btnDel.setAttribute('aria-label', 'Delete wallpaper');
      btnDel.textContent = '✕';
      btnDel.addEventListener('click', async (e) => {
        e.stopPropagation();
        customWallpapers = customWallpapers.filter((c) => c.id !== wp.id);
        if (defaultWallpaperId === wp.id) {
          defaultWallpaperId = 'macos-default';
        }
        if (selectedWallpaperId === wp.id) {
          selectedWallpaperId = defaultWallpaperId;
        }
        await writeStorage({ customWallpapers, defaultWallpaperId });
        renderWallpaperGallery();
        await redrawPreview();
        setStatus(`Deleted custom wallpaper "${wp.name}".`, 'info');
      });
      cornerActions.appendChild(btnDel);
    }

    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(cornerActions);
    wallpaperGallery.appendChild(item);
  }
}

async function redrawPreview() {
  if (!viewportImage) return;
  const all = getAllWallpapers();
  const activeWp =
    all.find((w) => w.id === selectedWallpaperId) ||
    all.find((w) => w.id === defaultWallpaperId) ||
    BUILTIN_WALLPAPERS[0];

  const bgImg = await loadImage(activeWp.src);
  await renderFramedScreenshotToCanvas({
    canvas: previewCanvas,
    viewportImage,
    backgroundImage: bgImg,
    url: urlInput.value,
    title: titleInput.value,
    marginMode: 'reference',
    fitReferenceSize: true,
  });
}

async function init() {
  const saved = await readStorage([
    'customWallpapers',
    'defaultWallpaperId',
    'blobToken',
  ]);
  if (Array.isArray(saved.customWallpapers)) {
    customWallpapers = saved.customWallpapers;
  }
  if (saved.defaultWallpaperId) {
    defaultWallpaperId = saved.defaultWallpaperId;
  }
  selectedWallpaperId = defaultWallpaperId;

  if (saved.blobToken) {
    blobTokenInput.value = saved.blobToken;
  }

  renderWallpaperGallery();

  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('file://')) {
        urlInput.value = tab.url;
        titleInput.value = tab.title || 'Skriptjobs';
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        viewportImage = await loadImage(dataUrl);
        await redrawPreview();
        return;
      }
    } catch {
      // Fallback to sample viewport below
    }
  }

  viewportImage = await loadImage('assets/sample-viewport.png');
  await redrawPreview();
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Open full-resolution framed PNG (1711 x 1076) in a new browser tab
btnOpenFullTab.addEventListener('click', async () => {
  const blob = await canvasToBlob(previewCanvas);
  const url = URL.createObjectURL(blob);
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    await chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
});

btnUploadWallpapers.addEventListener('click', () => {
  multiWallpaperInput.click();
});

multiWallpaperInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const cleanName = file.name.replace(/\.[^.]+$/, '');
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    customWallpapers.push({
      id,
      name: cleanName,
      src: dataUrl,
      builtin: false,
    });
    selectedWallpaperId = id;
  }

  await writeStorage({ customWallpapers });
  renderWallpaperGallery();
  await redrawPreview();
  setStatus(`Uploaded ${files.length} custom wallpaper(s).`, 'success');
  multiWallpaperInput.value = '';
});

urlInput.addEventListener('input', redrawPreview);
titleInput.addEventListener('input', redrawPreview);
blobTokenInput.addEventListener('change', async () => {
  await writeStorage({ blobToken: blobTokenInput.value.trim() });
});

btnCopyClipboard.addEventListener('click', async () => {
  try {
    const blob = await canvasToBlob(previewCanvas);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    setStatus('Copied framed PNG (1711×1076) to clipboard!', 'success');
  } catch (err) {
    setStatus(`Clipboard error: ${err.message}`, 'error');
  }
});

btnDownloadPng.addEventListener('click', async () => {
  const blob = await canvasToBlob(previewCanvas);
  const url = URL.createObjectURL(blob);
  const slug =
    (titleInput.value || 'screendump')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'screendump';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-framed.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  setStatus(`Downloaded ${slug}-framed.png`, 'success');
});

btnUploadBlob.addEventListener('click', async () => {
  try {
    const token = blobTokenInput.value.trim();
    if (!token) {
      setStatus('Enter your BLOB_READ_WRITE_TOKEN in Settings first.', 'error');
      setActiveAccordionItem('settings', false);
      return;
    }
    await writeStorage({ blobToken: token });
    setStatus('Uploading framed PNG to Vercel Blob...', 'info');

    const pngBlob = await canvasToBlob(previewCanvas);
    const slug =
      (titleInput.value || 'screendump')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'screendump';
    const pathname = `screendumps/${new Date().toISOString().slice(0, 10)}/${slug}-${Date.now()}.png`;

    const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': '7',
        'x-content-type': 'image/png',
      },
      body: pngBlob,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Vercel Blob HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const md = `![${titleInput.value || 'Screenshot'}](${data.url})`;
    await navigator.clipboard.writeText(md);
    setStatus(`Copied Markdown: ${md}`, 'success');
  } catch (err) {
    setStatus(`Upload failed: ${err.message}`, 'error');
  }
});

init().then(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('section')) {
    setActiveAccordionItem(params.get('section'), false);
  }
  if (params.get('tooltip')) {
    document.getElementById(params.get('tooltip'))?.classList.add('force-tooltip');
  }
  if (params.get('hoverWp')) {
    const wpEl = document.querySelector(`[data-wp-id="${params.get('hoverWp')}"]`);
    wpEl?.classList.add('force-hover');
    wpEl?.querySelector('.wp-star-btn')?.classList.add('force-tooltip');
  }
  if (params.get('hoverPreview')) {
    document.querySelector('.mockup-preview-wrap')?.classList.add('force-hover');
  }
});
