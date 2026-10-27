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
const brandWordmark = document.getElementById('brandWordmark');
const urlInput = document.getElementById('urlInput');
const titleInput = document.getElementById('titleInput');
const blobTokenInput = document.getElementById('blobTokenInput');
const syncMockupSwitch = document.getElementById('syncMockupSwitch');
const wallpaperGallery = document.getElementById('wallpaperGallery');
const multiWallpaperInput = document.getElementById('multiWallpaperInput');
const btnUploadWallpapers = document.getElementById('btnUploadWallpapers');
const btnCopyClipboard = document.getElementById('btnCopyClipboard');
const btnDownloadPng = document.getElementById('btnDownloadPng');
const btnUploadBlob = document.getElementById('btnUploadBlob');
const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const btnCloseStatus = document.getElementById('btnCloseStatus');
const accordionItems = Array.from(document.querySelectorAll('.u-accordion-item'));
const themeButtons = Array.from(document.querySelectorAll('[data-theme-value]'));

const STAR_FILLED_SVG = `<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"/></svg>`;
const DOTS_THREE_SVG = `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM128,72a12,12,0,1,0-12-12A12,12,0,0,0,128,72Zm0,112a12,12,0,1,0,12,12A12,12,0,0,0,128,184Z"/></svg>`;
const ICON_PENCIL_SVG = `<svg viewBox="0 0 256 256" fill="currentColor"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/></svg>`;
const ICON_TRASH_SVG = `<svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>`;
const ICON_STAR_SVG = `<svg viewBox="0 0 256 256" fill="currentColor"><path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Z"/></svg>`;

let wallpapersList = [...BUILTIN_WALLPAPERS];
let defaultWallpaperId = 'macos-default';
let selectedWallpaperId = 'macos-default';
let themeMode = 'system'; // 'system' | 'dark' | 'light'
let syncMockupTheme = true;
let viewportImage = null;
let viewportCssWidth = null;
let openDropdownWpId = null;
let renamingWpId = null;
let currentLogs = [];

const imageCache = new Map();
const systemDarkMedia = window.matchMedia('(prefers-color-scheme: dark)');

function debounce(fn, delayMs = 280) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
}

function getResolvedDark() {
  return themeMode === 'dark' || (themeMode === 'system' && systemDarkMedia.matches);
}

function getEffectiveMockupTheme() {
  if (!syncMockupTheme) return 'dark';
  return getResolvedDark() ? 'dark' : 'light';
}

// Loom-style structured extension logs stored in chrome.storage.local (replaced on each new operation)
function createLogEntry(level, message, context = {}) {
  return {
    level,
    message,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
    },
  };
}

async function replaceOperationLogs(level, message, context = {}) {
  currentLogs = [createLogEntry(level, message, context)];
  await writeStorage({ extensionLogs: currentLogs });
}

async function appendOperationLog(level, message, context = {}) {
  currentLogs = [...currentLogs, createLogEntry(level, message, context)];
  await writeStorage({ extensionLogs: currentLogs });
}

function applyTheme(mode) {
  themeMode = ['system', 'dark', 'light'].includes(mode) ? mode : 'system';
  const resolvedDark = getResolvedDark();

  const root = document.documentElement;
  root.classList.toggle('dark', resolvedDark);
  root.classList.toggle('light', !resolvedDark);

  if (brandWordmark) {
    brandWordmark.src = resolvedDark
      ? 'assets/brand/wordmark-dark.svg'
      : 'assets/brand/wordmark-light.svg';
  }

  for (const btn of themeButtons) {
    const val = btn.getAttribute('data-theme-value');
    btn.classList.toggle('active', val === themeMode);
    btn.setAttribute('aria-checked', String(val === themeMode));
  }
}

function applySyncMockupSwitch(enabled) {
  syncMockupTheme = Boolean(enabled);
  if (syncMockupSwitch) {
    syncMockupSwitch.setAttribute('aria-checked', String(syncMockupTheme));
  }
}

systemDarkMedia.addEventListener('change', async () => {
  if (themeMode === 'system') {
    applyTheme('system');
    if (syncMockupTheme) {
      await redrawPreview();
    }
  }
});

for (const btn of themeButtons) {
  btn.addEventListener('click', async () => {
    const nextMode = btn.getAttribute('data-theme-value') || 'system';
    applyTheme(nextMode);
    await writeStorage({ themeMode: nextMode });
    await replaceOperationLogs(
      'info',
      { integration: 'screendump-helper', event: 'theme_changed' },
      { themeMode: nextMode, mockupTheme: getEffectiveMockupTheme() }
    );
    if (syncMockupTheme) {
      await redrawPreview();
    }
  });
}

syncMockupSwitch?.addEventListener('click', async () => {
  applySyncMockupSwitch(!syncMockupTheme);
  await writeStorage({ syncMockupTheme });
  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'mockup_theme_sync_toggled' },
    { syncMockupTheme, mockupTheme: getEffectiveMockupTheme() }
  );
  await redrawPreview();
});

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
  if (statusText) {
    statusText.textContent = msg;
  }
  statusBox.className = `u-status visible ${type}`;
}

btnCloseStatus?.addEventListener('click', () => {
  statusBox.classList.remove('visible');
});

function getAllWallpapers() {
  return wallpapersList;
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
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

// Close 3-dots dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (openDropdownWpId && !e.target.closest('.wp-corner-actions')) {
    openDropdownWpId = null;
    renderWallpaperGallery();
  }
});

function renderWallpaperGallery() {
  const all = getAllWallpapers();
  wallpaperGallery.innerHTML = '';

  for (const wp of all) {
    const isSelected = wp.id === selectedWallpaperId;
    const isDefault = wp.id === defaultWallpaperId;
    const isMenuOpen = wp.id === openDropdownWpId;
    const isRenaming = wp.id === renamingWpId;

    const item = document.createElement('div');
    item.className = `wp-item ${isSelected ? 'active' : ''}`;
    item.setAttribute('data-wp-id', wp.id);
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.wp-corner-actions') || e.target.closest('.wp-rename-input')) {
        return;
      }
      selectedWallpaperId = wp.id;
      openDropdownWpId = null;
      renderWallpaperGallery();
      await redrawPreview();
    });

    const thumb = document.createElement('img');
    thumb.className = 'wp-thumb';
    thumb.src = wp.src;
    thumb.alt = wp.name;

    const meta = document.createElement('div');
    meta.className = 'wp-meta';

    if (isRenaming) {
      const renameInput = document.createElement('input');
      renameInput.type = 'text';
      renameInput.className = 'wp-rename-input';
      renameInput.value = wp.name;
      renameInput.setAttribute('aria-label', 'Change image name');

      const commitRename = async () => {
        if (renamingWpId !== wp.id) return;
        const nextName = renameInput.value.trim() || wp.name;
        const prevName = wp.name;
        wp.name = nextName;
        renamingWpId = null;
        await writeStorage({ wallpapersList });
        renderWallpaperGallery();
        if (nextName !== prevName) {
          setStatus(`Renamed wallpaper to "${nextName}".`, 'success');
          await replaceOperationLogs(
            'info',
            { integration: 'screendump-helper', event: 'wallpaper_renamed' },
            { id: wp.id, previousName: prevName, newName: nextName }
          );
        }
      };

      renameInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          await commitRename();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          renamingWpId = null;
          renderWallpaperGallery();
        }
      });
      renameInput.addEventListener('blur', commitRename);
      meta.appendChild(renameInput);
      setTimeout(() => {
        renameInput.focus();
        renameInput.select();
      }, 0);
    } else {
      const nameEl = document.createElement('div');
      nameEl.className = 'wp-name';
      nameEl.textContent = wp.name;
      meta.appendChild(nameEl);
    }

    // Right actions: Default star indicator (when default) + 3-dots menu button + dropdown
    const cornerActions = document.createElement('div');
    cornerActions.className = 'wp-corner-actions';

    if (isDefault) {
      const starBadge = document.createElement('span');
      starBadge.className = 'wp-default-indicator tooltip-right';
      starBadge.setAttribute('data-tooltip', 'Default wallpaper');
      starBadge.innerHTML = STAR_FILLED_SVG;
      cornerActions.appendChild(starBadge);
    }

    const btnMenu = document.createElement('button');
    btnMenu.type = 'button';
    btnMenu.className = `wp-menu-btn ${isMenuOpen ? 'active' : ''}`;
    btnMenu.setAttribute('aria-label', 'Wallpaper actions');
    btnMenu.setAttribute('aria-expanded', String(isMenuOpen));
    btnMenu.innerHTML = DOTS_THREE_SVG;
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      openDropdownWpId = isMenuOpen ? null : wp.id;
      renderWallpaperGallery();
    });
    cornerActions.appendChild(btnMenu);

    // Dropdown with 1-Change image name, 2-Remove image, 3-Set as default
    const dropdown = document.createElement('div');
    dropdown.className = `wp-dropdown ${isMenuOpen ? 'open' : ''}`;
    dropdown.setAttribute('role', 'menu');

    // 1. Change image name
    const btnRename = document.createElement('button');
    btnRename.type = 'button';
    btnRename.className = 'wp-dropdown-item';
    btnRename.setAttribute('role', 'menuitem');
    btnRename.innerHTML = `${ICON_PENCIL_SVG}<span>Change image name</span>`;
    btnRename.addEventListener('click', (e) => {
      e.stopPropagation();
      openDropdownWpId = null;
      renamingWpId = wp.id;
      renderWallpaperGallery();
    });
    dropdown.appendChild(btnRename);

    // 2. Remove image
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'wp-dropdown-item';
    btnRemove.setAttribute('role', 'menuitem');
    btnRemove.innerHTML = `${ICON_TRASH_SVG}<span>Remove image</span>`;
    btnRemove.addEventListener('click', async (e) => {
      e.stopPropagation();
      openDropdownWpId = null;
      if (wallpapersList.length <= 1) {
        setStatus('At least one wallpaper must remain.', 'error');
        await replaceOperationLogs(
          'warn',
          'Cannot remove the last remaining wallpaper',
          { id: wp.id, name: wp.name }
        );
        renderWallpaperGallery();
        return;
      }
      wallpapersList = wallpapersList.filter((itemWp) => itemWp.id !== wp.id);
      if (defaultWallpaperId === wp.id) {
        defaultWallpaperId = wallpapersList[0].id;
      }
      if (selectedWallpaperId === wp.id) {
        selectedWallpaperId = defaultWallpaperId;
      }
      await writeStorage({ wallpapersList, defaultWallpaperId });
      renderWallpaperGallery();
      await redrawPreview();
      setStatus(`Removed wallpaper "${wp.name}".`, 'info');
      await replaceOperationLogs(
        'info',
        { integration: 'screendump-helper', event: 'wallpaper_removed' },
        { id: wp.id, name: wp.name }
      );
    });
    dropdown.appendChild(btnRemove);

    // 3. Set as default
    const btnSetDefault = document.createElement('button');
    btnSetDefault.type = 'button';
    btnSetDefault.className = 'wp-dropdown-item';
    btnSetDefault.setAttribute('role', 'menuitem');
    btnSetDefault.innerHTML = `${ICON_STAR_SVG}<span>Set as default</span>`;
    btnSetDefault.addEventListener('click', async (e) => {
      e.stopPropagation();
      openDropdownWpId = null;
      defaultWallpaperId = wp.id;
      selectedWallpaperId = wp.id;
      await writeStorage({ defaultWallpaperId });
      renderWallpaperGallery();
      await redrawPreview();
      setStatus(`Set "${wp.name}" as default wallpaper.`, 'success');
      await replaceOperationLogs(
        'info',
        { integration: 'screendump-helper', event: 'wallpaper_set_default' },
        { id: wp.id, name: wp.name }
      );
    });
    dropdown.appendChild(btnSetDefault);

    cornerActions.appendChild(dropdown);

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
    fitReferenceSize: false,
    viewportCssWidth,
    mockupTheme: getEffectiveMockupTheme(),
  });
  const dimensionsBadge = document.getElementById('dimensionsBadge');
  if (dimensionsBadge) {
    dimensionsBadge.textContent = `${previewCanvas.width} × ${previewCanvas.height} px`;
  }
}

const debouncedRedrawPreview = debounce(() => {
  redrawPreview();
}, 280);

async function init() {
  const saved = await readStorage([
    'wallpapersList',
    'customWallpapers',
    'defaultWallpaperId',
    'blobToken',
    'themeMode',
    'syncMockupTheme',
    'extensionLogs',
  ]);

  if (Array.isArray(saved.wallpapersList) && saved.wallpapersList.length > 0) {
    wallpapersList = saved.wallpapersList;
  } else if (Array.isArray(saved.customWallpapers) && saved.customWallpapers.length > 0) {
    wallpapersList = [...BUILTIN_WALLPAPERS, ...saved.customWallpapers];
    await writeStorage({ wallpapersList });
  } else {
    wallpapersList = [...BUILTIN_WALLPAPERS];
  }

  if (saved.defaultWallpaperId && wallpapersList.some((w) => w.id === saved.defaultWallpaperId)) {
    defaultWallpaperId = saved.defaultWallpaperId;
  } else {
    defaultWallpaperId = wallpapersList[0].id;
  }
  selectedWallpaperId = defaultWallpaperId;

  if (saved.blobToken) {
    blobTokenInput.value = saved.blobToken;
  }

  if (Array.isArray(saved.extensionLogs)) {
    currentLogs = saved.extensionLogs;
  }

  const initialSyncMockup =
    typeof saved.syncMockupTheme === 'boolean' ? saved.syncMockupTheme : true;
  applySyncMockupSwitch(initialSyncMockup);
  applyTheme(saved.themeMode || 'system');
  renderWallpaperGallery();

  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('file://')) {
        urlInput.value = tab.url;
        titleInput.value = tab.title || 'Skriptjobs';
        viewportCssWidth = tab.width || null;
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        viewportImage = await loadImage(dataUrl);
        await redrawPreview();
        await replaceOperationLogs(
          'info',
          { integration: 'screendump-helper', event: 'capture_visible_tab' },
          { tabId: tab.id, url: tab.url, dimensions: `${previewCanvas.width}x${previewCanvas.height}` }
        );
        return;
      }
    } catch (err) {
      await replaceOperationLogs(
        'warn',
        'Failed to capture active tab viewport, using sample viewport fallback',
        { error: { message: err?.message || String(err) } }
      );
    }
  }

  viewportImage = await loadImage('assets/sample-viewport.png');
  await redrawPreview();
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Open full-resolution framed PNG in a new browser tab
btnOpenFullTab.addEventListener('click', async () => {
  const blob = await canvasToBlob(previewCanvas);
  const url = URL.createObjectURL(blob);
  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'open_preview_in_new_tab' },
    { width: previewCanvas.width, height: previewCanvas.height }
  );
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

  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'upload_wallpapers_start' },
    { count: files.length }
  );

  for (const file of files) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const cleanName = file.name.replace(/\.[^.]+$/, '');
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    wallpapersList.push({
      id,
      name: cleanName,
      src: dataUrl,
      builtin: false,
    });
    selectedWallpaperId = id;
  }

  await writeStorage({ wallpapersList });
  renderWallpaperGallery();
  await redrawPreview();
  setStatus(`Uploaded ${files.length} custom wallpaper(s).`, 'success');
  await appendOperationLog(
    'info',
    { integration: 'screendump-helper', event: 'upload_wallpapers_success' },
    { count: files.length, selectedWallpaperId }
  );
  multiWallpaperInput.value = '';
});

// Debounced Output fields to prevent flashing mockup preview
urlInput.addEventListener('input', debouncedRedrawPreview);
titleInput.addEventListener('input', debouncedRedrawPreview);

blobTokenInput.addEventListener('change', async () => {
  await writeStorage({ blobToken: blobTokenInput.value.trim() });
  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'blob_token_updated' },
    { configured: Boolean(blobTokenInput.value.trim()) }
  );
});

btnCopyClipboard.addEventListener('click', async () => {
  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'copy_clipboard_start' },
    { width: previewCanvas.width, height: previewCanvas.height }
  );
  try {
    const blob = await canvasToBlob(previewCanvas);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    setStatus(`Copied framed PNG (${previewCanvas.width}×${previewCanvas.height}) to clipboard!`, 'success');
    await appendOperationLog(
      'info',
      { integration: 'screendump-helper', event: 'copy_clipboard_success' },
      { width: previewCanvas.width, height: previewCanvas.height }
    );
  } catch (err) {
    setStatus(`Clipboard error: ${err.message}`, 'error');
    await appendOperationLog(
      'error',
      'Failed to copy framed PNG to clipboard',
      { error: { message: err?.message || String(err) } }
    );
  }
});

btnDownloadPng.addEventListener('click', async () => {
  const slug =
    (titleInput.value || 'screendump')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'screendump';
  const filename = `${slug}-framed.png`;

  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'download_png' },
    { filename, width: previewCanvas.width, height: previewCanvas.height }
  );

  const blob = await canvasToBlob(previewCanvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  setStatus(`Downloaded ${filename}`, 'success');
});

btnUploadBlob.addEventListener('click', async () => {
  await replaceOperationLogs(
    'info',
    { integration: 'screendump-helper', event: 'vercel_blob_upload_start' },
    { width: previewCanvas.width, height: previewCanvas.height }
  );
  try {
    const token = blobTokenInput.value.trim();
    if (!token) {
      setStatus('Enter your BLOB_READ_WRITE_TOKEN in Settings first.', 'error');
      await appendOperationLog(
        'error',
        'Missing BLOB_READ_WRITE_TOKEN when attempting Vercel Blob upload',
        { error: { code: 'MISSING_BLOB_TOKEN' } }
      );
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
    await appendOperationLog(
      'info',
      { integration: 'screendump-helper', event: 'vercel_blob_upload_success' },
      { url: data.url, pathname, markdownCopied: true }
    );
  } catch (err) {
    setStatus(`Upload failed: ${err.message}`, 'error');
    await appendOperationLog(
      'error',
      'Failed to upload framed screenshot to Vercel Blob',
      { error: { message: err?.message || String(err) } }
    );
  }
});

init().then(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('section')) {
    setActiveAccordionItem(params.get('section'), false);
  }
  if (params.get('theme')) {
    applyTheme(params.get('theme'));
    redrawPreview();
  }
  if (params.get('tooltip')) {
    document.getElementById(params.get('tooltip'))?.classList.add('force-tooltip');
  }
  if (params.get('hoverWp')) {
    const wpEl = document.querySelector(`[data-wp-id="${params.get('hoverWp')}"]`);
    wpEl?.classList.add('force-hover');
  }
  if (params.get('openMenuWp')) {
    openDropdownWpId = params.get('openMenuWp');
    renderWallpaperGallery();
  }
  if (params.get('hoverPreview')) {
    document.querySelector('.mockup-preview-wrap')?.classList.add('force-hover');
  }
});
