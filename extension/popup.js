import { renderFramedIssueCanvas } from "./shared/frame-renderer.js";
import { createZipBlob } from "./shared/zip-builder.js";
import {
  startOperationLog,
  appendLogEvent,
  finishOperationLog,
  formatBrowserTimestamp,
  getBrowserTimezone,
} from "./shared/logger.js";

const DEFAULT_WALLPAPER_URL = "assets/backgrounds/macos-default.png";
const SKRIPTJOBS_LOGO_URL = "assets/brand/logo-three-triangles.svg";
const WORDMARK_DARK_URL = "assets/brand/wordmark-dark.svg";
const WORDMARK_LIGHT_URL = "assets/brand/wordmark-light.svg";

/**
 * Built-in wallpaper library presets so users have multiple options out of the box
 * and can also upload any number of custom wallpapers or restore defaults anytime.
 */
const BUILTIN_WALLPAPERS = [
  {
    id: "macos-default",
    name: "macOS Default",
    type: "image",
    src: "assets/backgrounds/macos-default.png",
    builtin: true,
  },
  {
    id: "skriptjobs-indigo",
    name: "Skriptjobs Indigo",
    type: "image",
    src: "assets/backgrounds/skriptjobs-indigo.png",
    builtin: true,
  },
  {
    id: "nordic-teal",
    name: "Nordic Teal",
    type: "image",
    src: "assets/backgrounds/nordic-teal.png",
    builtin: true,
  },
  {
    id: "midnight-slate",
    name: "Midnight Slate",
    type: "image",
    src: "assets/backgrounds/midnight-slate.png",
    builtin: true,
  },
];

function cloneBuiltinWallpapers() {
  return BUILTIN_WALLPAPERS.map((w) => ({ ...w }));
}

const previewCanvas = document.getElementById("previewCanvas");
const previewDragImage = document.getElementById("previewDragImage");
const dimensionsBadge = document.getElementById("dimensionsBadge");
const wallpaperGallery = document.getElementById("wallpaperGallery");
const multiWallpaperInput = document.getElementById("multiWallpaperInput");
const btnUploadWallpapers = document.getElementById("btnUploadWallpapers");
const btnRestoreWallpapers = document.getElementById("btnRestoreWallpapers");
const btnOpenFullTab = document.getElementById("btnOpenFullTab");
const btnOpenFullTabOps = document.getElementById("btnOpenFullTabOps");
const btnPinWindow = document.getElementById("btnPinWindow");
const urlInput = document.getElementById("urlInput");
const btnResetUrl = document.getElementById("btnResetUrl");
const titleInput = document.getElementById("titleInput");
const btnResetTitle = document.getElementById("btnResetTitle");
const faviconInput = document.getElementById("faviconInput");
const faviconFileInput = document.getElementById("faviconFileInput");
const btnUploadFavicon = document.getElementById("btnUploadFavicon");
const btnResetFavicon = document.getElementById("btnResetFavicon");
const faviconPreviewIcon = document.getElementById("faviconPreviewIcon");
const blobTokenInput = document.getElementById("blobTokenInput");
const btnToggleBlobToken = document.getElementById("btnToggleBlobToken");
const iconBlobEye = document.getElementById("iconBlobEye");
const iconBlobEyeOff = document.getElementById("iconBlobEyeOff");
const btnUploadBlob = document.getElementById("btnUploadBlob");
const btnCopyClipboard = document.getElementById("btnCopyClipboard");
const btnDownloadPng = document.getElementById("btnDownloadPng");
const btnDownloadThemeZip = document.getElementById("btnDownloadThemeZip");
const statusBox = document.getElementById("statusBox");
const statusText = document.getElementById("statusText");
const btnUndoStatus = document.getElementById("btnUndoStatus");
const btnCloseStatus = document.getElementById("btnCloseStatus");
const brandWordmark = document.getElementById("brandWordmark");
const themeSegmented = document.getElementById("themeSegmented");
const syncMockupSwitch = document.getElementById("syncMockupSwitch");
const mainAccordion = document.getElementById("mainAccordion");

const urlParams = new URLSearchParams(window.location.search);
const isPinnedWindow = urlParams.get("pinned") === "1";
const pinnedSourceWindowId = urlParams.get("sourceWindowId") ? Number(urlParams.get("sourceWindowId")) : null;

let pinnedSelfWindowId = null;
let stayOnTop = isPinnedWindow;
let rawScreenshotImage = null;
let lastCapturedDataUrl = null;
let lastCapturedTabUrl = "";
let skriptjobsLogoImage = null;
let wallpapersList = [];
let selectedWallpaperId = "macos-default";
let defaultWallpaperId = "macos-default";
let activeAccordionId = "wallpapers";
let themeMode = "system"; // "system" | "dark" | "light"
let syncMockupTheme = true;
let openMenuWallpaperId = null;
let renamingWallpaperId = null;
let initialTabUrl = "https://docs.skriptjobs.localhost:3050/getting-started/installation";
let initialTabTitle = "Installation - Skriptjobs";
let customUrlOverride = "";
let customTitleOverride = "";
let customFaviconDataUrl = null;
let currentUndoHandler = null;
let isDraggingPreview = false;
let currentPreviewDataUrl = "";
let currentPreviewFsUrl = "";
let currentPreviewFilename = "skriptjobs-screenshot-framed.png";
let currentPreviewBlob = null;

const imageCache = new Map();
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function setStatus(message, type = "info", options = {}) {
  statusText.textContent = message;
  statusBox.className = `u-status visible ${type}`;
  if (typeof options.onUndo === "function") {
    currentUndoHandler = options.onUndo;
    btnUndoStatus.textContent = options.undoLabel || "Undo";
    btnUndoStatus.classList.add("visible");
  } else {
    currentUndoHandler = null;
    btnUndoStatus.classList.remove("visible");
  }
}

function hideStatus() {
  statusBox.className = "u-status";
  statusText.textContent = "";
  currentUndoHandler = null;
  btnUndoStatus.classList.remove("visible");
}

btnUndoStatus.addEventListener("click", async () => {
  if (typeof currentUndoHandler === "function") {
    const fn = currentUndoHandler;
    currentUndoHandler = null;
    btnUndoStatus.classList.remove("visible");
    await fn();
  }
});

btnCloseStatus.addEventListener("click", () => {
  hideStatus();
});

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

function resolveEffectiveTheme(mode) {
  if (mode === "light" || mode === "dark") {
    return mode;
  }
  return systemDarkQuery.matches ? "dark" : "light";
}

function resolveMockupTheme() {
  if (!syncMockupTheme) {
    return "dark";
  }
  return resolveEffectiveTheme(themeMode);
}

/**
 * Apply @nuxt/ui + @skriptjobs/ui color mode to root <html> and swap brand wordmark.
 */
function applyTheme(mode, shouldRedraw = true) {
  themeMode = mode;
  const effective = resolveEffectiveTheme(mode);
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(effective);

  // Wordmark-dark has light text for dark surfaces; wordmark-light has dark text for light surfaces
  brandWordmark.src = effective === "dark" ? WORDMARK_DARK_URL : WORDMARK_LIGHT_URL;

  const buttons = themeSegmented.querySelectorAll("[data-theme-value]");
  buttons.forEach((btn) => {
    const isSelected = btn.getAttribute("data-theme-value") === mode;
    btn.classList.toggle("active", isSelected);
    btn.setAttribute("aria-checked", isSelected ? "true" : "false");
  });

  if (shouldRedraw && rawScreenshotImage) {
    redrawPreview();
  }
}

function applySyncMockupSwitch(enabled, shouldRedraw = true) {
  syncMockupTheme = Boolean(enabled);
  syncMockupSwitch.setAttribute("aria-checked", syncMockupTheme ? "true" : "false");
  if (shouldRedraw && rawScreenshotImage) {
    redrawPreview();
  }
}

systemDarkQuery.addEventListener("change", () => {
  if (themeMode === "system") {
    applyTheme("system", true);
  }
});

/**
 * Single-open collapsible accordion controller (only 1 item open at a time)
 */
function setOpenAccordion(itemId, persist = true) {
  const items = mainAccordion.querySelectorAll("[data-accordion-item]");
  items.forEach((section) => {
    const id = section.getAttribute("data-accordion-item");
    if (id === itemId) {
      section.classList.toggle("open");
    } else {
      section.classList.remove("open");
    }
  });
  const currentlyOpen = mainAccordion.querySelector(".u-accordion-item.open");
  activeAccordionId = currentlyOpen ? currentlyOpen.getAttribute("data-accordion-item") : "";
  if (persist) {
    saveSettings();
  }
}

function forceOpenAccordion(itemId) {
  if (!itemId) return;
  const items = mainAccordion.querySelectorAll("[data-accordion-item]");
  items.forEach((section) => {
    const id = section.getAttribute("data-accordion-item");
    section.classList.toggle("open", id === itemId);
  });
  activeAccordionId = itemId;
}

mainAccordion.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-accordion-trigger]");
  if (!trigger) return;
  const targetId = trigger.getAttribute("data-accordion-trigger");
  setOpenAccordion(targetId, true);
});

function updatePinButtonUI() {
  if (!btnPinWindow) return;
  const isActive = Boolean(isPinnedWindow && stayOnTop);
  btnPinWindow.classList.toggle("active", isActive);
  btnPinWindow.classList.toggle("pinned", isActive);
  btnPinWindow.setAttribute("aria-pressed", isActive ? "true" : "false");
  btnPinWindow.setAttribute(
    "data-tooltip",
    isActive ? "Stay on top: ON (click to unpin)" : "Keep open on top"
  );
}

async function keepPinnedWindowOnTop() {
  if (!isPinnedWindow || !stayOnTop || isDraggingPreview) return;
  try {
    if (!pinnedSelfWindowId && typeof chrome !== "undefined" && chrome.windows?.getCurrent) {
      const win = await chrome.windows.getCurrent();
      pinnedSelfWindowId = win?.id ?? null;
    }
    if (pinnedSelfWindowId && typeof chrome !== "undefined" && chrome.windows?.update) {
      await chrome.windows.update(pinnedSelfWindowId, { focused: true });
    }
  } catch {
    // ignore if window is closing
  }
}

if (isPinnedWindow) {
  window.addEventListener("blur", () => {
    if (!stayOnTop) return;
    setTimeout(() => keepPinnedWindowOnTop(), 50);
    setTimeout(() => keepPinnedWindowOnTop(), 160);
  });
}

if (btnPinWindow) {
  updatePinButtonUI();
  btnPinWindow.addEventListener("click", async () => {
    if (isPinnedWindow) {
      stayOnTop = false;
      updatePinButtonUI();
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ stayOnTop: false, pinnedWindowId: null });
      }
      window.close();
      return;
    }
    await saveSettings();
    if (typeof chrome !== "undefined" && chrome.windows && chrome.windows.create) {
      let currentWin = null;
      try {
        currentWin = await chrome.windows.getCurrent();
      } catch {
        // ignore
      }
      const currentWinId = currentWin?.id ?? null;
      const left =
        typeof currentWin?.left === "number" && typeof currentWin?.width === "number"
          ? Math.max(0, currentWin.left + currentWin.width - 550)
          : undefined;
      const top = typeof currentWin?.top === "number" ? currentWin.top + 44 : undefined;
      const query = currentWinId ? `?pinned=1&sourceWindowId=${currentWinId}` : "?pinned=1";
      const popupUrl = chrome.runtime.getURL(`popup.html${query}`);
      const createData = {
        url: popupUrl,
        type: "popup",
        width: 536,
        height: 616,
        focused: true,
      };
      if (typeof left === "number") createData.left = left;
      if (typeof top === "number") createData.top = top;

      const createdWin = await chrome.windows.create(createData);
      if (chrome.storage?.local) {
        await chrome.storage.local.set({
          stayOnTop: true,
          pinnedWindowId: createdWin?.id ?? null,
          pinnedSourceWindowId: currentWinId,
        });
      }
      await appendLogEvent("window:pinStayOnTop", {
        sourceWindowId: currentWinId,
        pinnedWindowId: createdWin?.id ?? null,
      });
      window.close();
    }
  });
}

themeSegmented.addEventListener("click", async (e) => {
  const optionBtn = e.target.closest("[data-theme-value]");
  if (!optionBtn) return;
  const nextMode = optionBtn.getAttribute("data-theme-value");
  applyTheme(nextMode, true);
  await saveSettings();
  await appendLogEvent("theme:change", { themeMode: nextMode, effectiveTheme: resolveEffectiveTheme(nextMode) });
});

syncMockupSwitch.addEventListener("click", async () => {
  applySyncMockupSwitch(!syncMockupTheme, true);
  await saveSettings();
  await appendLogEvent("settings:syncMockupTheme", { syncMockupTheme });
});

// Close 3-dots wallpaper dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (openMenuWallpaperId && !e.target.closest(".wp-menu-btn") && !e.target.closest(".wp-dropdown")) {
    openMenuWallpaperId = null;
    renderWallpaperGallery();
  }
});

function loadImage(src) {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function createGradientDataUrl(colors, width = 640, height = 400) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, width, height);
  colors.forEach((col, i) => {
    grad.addColorStop(i / Math.max(1, colors.length - 1), col);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return c.toDataURL("image/png");
}

async function resolveFaviconToDataUrl(rawValue) {
  const trimmed = (rawValue || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  try {
    const img = await loadImage(trimmed);
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, 64, 64);
    return c.toDataURL("image/png");
  } catch {
    return trimmed;
  }
}

function updateFaviconPreviewBadge() {
  if (!faviconPreviewIcon) return;
  faviconPreviewIcon.src = customFaviconDataUrl || SKRIPTJOBS_LOGO_URL;
}

async function resolveWallpaperImage(wp) {
  if (!wp) return null;
  if (wp.type === "gradient") {
    const dataUrl = createGradientDataUrl(wp.colors, 1920, 1200);
    return loadImage(dataUrl);
  }
  return loadImage(wp.src);
}

async function loadSettings() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          "blobReadWriteToken",
          "customWallpapers",
          "wallpapersState",
          "defaultWallpaperId",
          "selectedWallpaperId",
          "themeMode",
          "syncMockupTheme",
          "activeAccordionId",
          "customFaviconDataUrl",
          "customFaviconInput",
          "customUrlOverride",
          "customTitleOverride",
          "overrideUrl",
          "overrideTitle",
          "lastCapturedTabUrl",
          "lastCapturedTabTitle",
          "lastCapturedDataUrl",
          "stayOnTop",
          "pinnedWindowId",
          "timestamp",
          "timezone",
        ],
        (res) => resolve(res || {})
      );
    });
  }
  try {
    return JSON.parse(localStorage.getItem("skriptjobs_capture_settings") || "{}");
  } catch {
    return {};
  }
}

async function saveSettings(extra = {}) {
  const customWallpapers = wallpapersList.filter((w) => !w.builtin);
  const payload = {
    blobReadWriteToken: blobTokenInput.value.trim(),
    customWallpapers,
    wallpapersState: wallpapersList,
    defaultWallpaperId,
    selectedWallpaperId,
    themeMode,
    syncMockupTheme,
    activeAccordionId,
    customFaviconDataUrl,
    customFaviconInput: faviconInput ? faviconInput.value.trim() : "",
    customUrlOverride,
    customTitleOverride,
    overrideUrl: urlInput ? urlInput.value.trim() : "",
    overrideTitle: titleInput ? titleInput.value.trim() : "",
    lastCapturedTabUrl: initialTabUrl,
    lastCapturedTabTitle: initialTabTitle,
    lastCapturedDataUrl,
    timestamp: formatBrowserTimestamp(),
    timezone: getBrowserTimezone(),
    ...extra,
  };
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => chrome.storage.local.set(payload, resolve));
  }
  localStorage.setItem("skriptjobs_capture_settings", JSON.stringify(payload));
}

function renderWallpaperGallery() {
  wallpaperGallery.innerHTML = "";
  for (const wp of wallpapersList) {
    const isSelected = wp.id === selectedWallpaperId;
    const isDefault = wp.id === defaultWallpaperId;
    const isMenuOpen = wp.id === openMenuWallpaperId;
    const isRenaming = wp.id === renamingWallpaperId;

    const item = document.createElement("div");
    item.className = `wp-item ${isSelected ? "active" : ""} ${isMenuOpen ? "menu-open" : ""}`.trim();
    item.dataset.wallpaperId = wp.id;

    const thumbSrc = wp.type === "gradient" ? createGradientDataUrl(wp.colors, 160, 100) : wp.src;
    const thumb = document.createElement("img");
    thumb.className = "wp-thumb";
    thumb.src = thumbSrc;
    thumb.alt = wp.name;

    const meta = document.createElement("div");
    meta.className = "wp-meta";

    if (isRenaming) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "wp-rename-input";
      input.value = wp.name;
      input.setAttribute("aria-label", "Wallpaper name");
      input.addEventListener("click", (ev) => ev.stopPropagation());
      const commitRename = async () => {
        const trimmed = input.value.trim();
        if (trimmed && trimmed !== wp.name) {
          const oldName = wp.name;
          wp.name = trimmed;
          await saveSettings();
          await appendLogEvent("wallpaper:rename", { id: wp.id, oldName, newName: trimmed });
        }
        renamingWallpaperId = null;
        renderWallpaperGallery();
      };
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          commitRename();
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          renamingWallpaperId = null;
          renderWallpaperGallery();
        }
      });
      input.addEventListener("blur", commitRename);
      meta.appendChild(input);
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    } else {
      const nameEl = document.createElement("div");
      nameEl.className = "wp-name";
      nameEl.textContent = wp.name;
      meta.appendChild(nameEl);
    }

    const actions = document.createElement("div");
    actions.className = "wp-corner-actions";

    // Subtle default star indicator when this card is the default wallpaper
    if (isDefault) {
      const starSpan = document.createElement("span");
      starSpan.className = "wp-default-indicator";
      starSpan.title = "Default wallpaper";
      starSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"/></svg>`;
      actions.appendChild(starSpan);
    }

    // 3-dots menu button
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = `wp-menu-btn ${isMenuOpen ? "active" : ""}`;
    menuBtn.setAttribute("aria-label", `Wallpaper options for ${wp.name}`);
    menuBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM128,72a12,12,0,1,0-12-12A12,12,0,0,0,128,72Zm0,112a12,12,0,1,0,12,12A12,12,0,0,0,128,184Z"/></svg>`;
    menuBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openMenuWallpaperId = isMenuOpen ? null : wp.id;
      renderWallpaperGallery();
    });
    actions.appendChild(menuBtn);

    // 3-dots dropdown menu appended directly to `.wp-item` so it matches the exact width of the image card
    const dropdown = document.createElement("div");
    dropdown.className = `wp-dropdown ${isMenuOpen ? "open" : ""}`;
    dropdown.addEventListener("click", (ev) => ev.stopPropagation());

    // 1. Change image name
    const renameOption = document.createElement("button");
    renameOption.type = "button";
    renameOption.className = "wp-dropdown-item";
    renameOption.innerHTML = `
      <svg viewBox="0 0 256 256" fill="currentColor">
        <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/>
      </svg>
      <span>Change image name</span>
    `;
    renameOption.addEventListener("click", () => {
      openMenuWallpaperId = null;
      renamingWallpaperId = wp.id;
      renderWallpaperGallery();
    });
    dropdown.appendChild(renameOption);

    // 2. Remove image (with Undo support in notification bar)
    const removeOption = document.createElement("button");
    removeOption.type = "button";
    removeOption.className = "wp-dropdown-item";
    removeOption.innerHTML = `
      <svg viewBox="0 0 256 256" fill="currentColor">
        <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
      </svg>
      <span>Remove image</span>
    `;
    removeOption.addEventListener("click", async () => {
      openMenuWallpaperId = null;
      if (wallpapersList.length <= 1) {
        setStatus("At least one wallpaper must remain in the gallery.", "error");
        renderWallpaperGallery();
        return;
      }
      const removedIndex = wallpapersList.findIndex((w) => w.id === wp.id);
      const removedWallpaper = { ...wp };
      const prevSelectedId = selectedWallpaperId;
      const prevDefaultId = defaultWallpaperId;

      wallpapersList = wallpapersList.filter((w) => w.id !== wp.id);
      if (defaultWallpaperId === wp.id) {
        defaultWallpaperId = wallpapersList[0].id;
      }
      if (selectedWallpaperId === wp.id) {
        selectedWallpaperId = defaultWallpaperId;
      }
      await saveSettings();
      renderWallpaperGallery();
      await redrawPreview();
      await appendLogEvent("wallpaper:remove", { id: wp.id, name: wp.name });

      setStatus(`Removed wallpaper "${removedWallpaper.name}".`, "info", {
        undoLabel: "Undo",
        onUndo: async () => {
          const insertAt = Math.min(Math.max(0, removedIndex), wallpapersList.length);
          wallpapersList.splice(insertAt, 0, removedWallpaper);
          selectedWallpaperId = prevSelectedId;
          defaultWallpaperId = prevDefaultId;
          await saveSettings();
          renderWallpaperGallery();
          await redrawPreview();
          await appendLogEvent("wallpaper:undoRemove", { id: removedWallpaper.id, name: removedWallpaper.name });
          hideStatus();
        },
      });
    });
    dropdown.appendChild(removeOption);

    // 3. Set as default
    const defaultOption = document.createElement("button");
    defaultOption.type = "button";
    defaultOption.className = "wp-dropdown-item";
    defaultOption.innerHTML = `
      <svg viewBox="0 0 256 256" fill="currentColor">
        <path d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z"/>
      </svg>
      <span>${isDefault ? "Default wallpaper" : "Set as default"}</span>
    `;
    defaultOption.addEventListener("click", async () => {
      openMenuWallpaperId = null;
      defaultWallpaperId = wp.id;
      selectedWallpaperId = wp.id;
      await saveSettings();
      renderWallpaperGallery();
      await redrawPreview();
      await appendLogEvent("wallpaper:setDefault", { id: wp.id, name: wp.name });
    });
    dropdown.appendChild(defaultOption);

    item.addEventListener("click", async () => {
      if (renamingWallpaperId === wp.id) return;
      openMenuWallpaperId = null;
      selectedWallpaperId = wp.id;
      await saveSettings();
      renderWallpaperGallery();
      await redrawPreview();
    });

    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(actions);
    item.appendChild(dropdown);
    wallpaperGallery.appendChild(item);
  }
}

/**
 * Restore only the default wallpapers (original list, names, and default selection),
 * leaving theme, syncMockupTheme, URL/title overrides, and token untouched.
 */
async function restoreDefaultWallpapers() {
  const prevSnapshot = {
    wallpapersList: wallpapersList.map((w) => ({ ...w })),
    selectedWallpaperId,
    defaultWallpaperId,
  };

  openMenuWallpaperId = null;
  renamingWallpaperId = null;
  wallpapersList = cloneBuiltinWallpapers();
  defaultWallpaperId = "macos-default";
  selectedWallpaperId = "macos-default";

  await saveSettings();
  renderWallpaperGallery();
  await redrawPreview();
  await appendLogEvent("wallpapers:restoreDefaults", {
    restoredWallpapersCount: wallpapersList.length,
    defaultWallpaperId,
  });

  setStatus("Restored default wallpapers.", "success", {
    undoLabel: "Undo",
    onUndo: async () => {
      wallpapersList = prevSnapshot.wallpapersList;
      selectedWallpaperId = prevSnapshot.selectedWallpaperId;
      defaultWallpaperId = prevSnapshot.defaultWallpaperId;
      await saveSettings();
      renderWallpaperGallery();
      await redrawPreview();
      await appendLogEvent("wallpapers:undoRestoreDefaults", {});
      hideStatus();
    },
  });
}

btnRestoreWallpapers.addEventListener("click", restoreDefaultWallpapers);

function writeBlobToExtensionFileSystem(blob, filename) {
  return new Promise((resolve) => {
    const reqFs = window.webkitRequestFileSystem || window.requestFileSystem;
    if (typeof reqFs !== "function") {
      resolve("");
      return;
    }
    const writeNewEntry = (fsRoot) => {
      fsRoot.getFile(
        filename,
        { create: true },
        (fileEntry) => {
          fileEntry.createWriter(
            (writer) => {
              writer.onwriteend = () => resolve(fileEntry.toURL());
              writer.onerror = () => resolve("");
              writer.write(blob);
            },
            () => resolve("")
          );
        },
        () => resolve("")
      );
    };
    reqFs(
      window.TEMPORARY,
      32 * 1024 * 1024,
      (fs) => {
        fs.root.getFile(
          filename,
          { create: false },
          (existingEntry) => {
            existingEntry.remove(
              () => writeNewEntry(fs.root),
              () => writeNewEntry(fs.root)
            );
          },
          () => writeNewEntry(fs.root)
        );
      },
      () => resolve("")
    );
  });
}

async function syncDraggablePreviewImage() {
  try {
    const filename = `${getSlugBaseName()}-framed.png`;
    const dataUrl = previewCanvas.toDataURL("image/png");
    const blob = await getCanvasBlob(previewCanvas);
    const fsUrl = await writeBlobToExtensionFileSystem(blob, filename);

    currentPreviewFilename = filename;
    currentPreviewDataUrl = dataUrl;
    currentPreviewBlob = blob;
    currentPreviewFsUrl = fsUrl || "";

    if (previewDragImage) {
      previewDragImage.src = currentPreviewFsUrl || dataUrl;
      previewDragImage.dataset.filename = filename;
      previewDragImage.dataset.downloadUrl = currentPreviewFsUrl || dataUrl;
      previewDragImage.classList.add("ready");
      previewCanvas.classList.add("hidden-by-drag-img");
    }

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({
        lastFullPreviewDataUrl: dataUrl,
        lastFullPreviewFsUrl: currentPreviewFsUrl,
        lastFullPreviewFilename: filename,
        lastFullPreviewTitle: titleInput.value.trim() || "Skriptjobs - Screendump Preview",
        timestamp: formatBrowserTimestamp(),
        timezone: getBrowserTimezone(),
      });
    }
  } catch {
    // Fallback to visible canvas if image sync fails
  }
}

function handlePreviewDragStart(e) {
  if (!e.dataTransfer) return;
  isDraggingPreview = true;
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.set({ isDraggingPreview: true });
  }
  const filename = currentPreviewFilename || `${getSlugBaseName()}-framed.png`;
  const downloadTargetUrl =
    currentPreviewFsUrl || currentPreviewDataUrl || previewCanvas.toDataURL("image/png");

  e.dataTransfer.effectAllowed = "copyMove";
  e.dataTransfer.setData("DownloadURL", `image/png:${filename}:${downloadTargetUrl}`);
  e.dataTransfer.setData("text/uri-list", downloadTargetUrl);
  e.dataTransfer.setData("text/plain", downloadTargetUrl);

  appendLogEvent("preview:dragStart", {
    filename,
    hasFileSystemUrl: Boolean(currentPreviewFsUrl),
  });
}

function handlePreviewDragEnd() {
  setTimeout(() => {
    isDraggingPreview = false;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ isDraggingPreview: false });
    }
    if (isPinnedWindow && stayOnTop) {
      keepPinnedWindowOnTop();
    }
  }, 300);
  appendLogEvent("preview:dragEnd", { filename: currentPreviewFilename });
}

if (previewDragImage) {
  previewDragImage.addEventListener("dragstart", handlePreviewDragStart);
  previewDragImage.addEventListener("dragend", handlePreviewDragEnd);
}
if (previewCanvas) {
  previewCanvas.setAttribute("draggable", "true");
  previewCanvas.addEventListener("dragstart", handlePreviewDragStart);
  previewCanvas.addEventListener("dragend", handlePreviewDragEnd);
}

async function redrawPreview() {
  if (!rawScreenshotImage) return;
  const activeWp =
    wallpapersList.find((w) => w.id === selectedWallpaperId) ||
    wallpapersList.find((w) => w.id === defaultWallpaperId) ||
    wallpapersList[0];

  const wallpaperImg = await resolveWallpaperImage(activeWp);
  const mockupTheme = resolveMockupTheme();
  const dims = await renderFramedIssueCanvas({
    canvas: previewCanvas,
    screenshotImage: rawScreenshotImage,
    wallpaperImage: wallpaperImg,
    logoImage: skriptjobsLogoImage,
    pageUrl: urlInput.value.trim(),
    pageTitle: titleInput.value.trim(),
    faviconDataUrl: customFaviconDataUrl,
    mockupTheme,
  });
  dimensionsBadge.textContent = `${dims.width} × ${dims.height} px`;
  await syncDraggablePreviewImage();
}

function getCanvasBlob(canvas = previewCanvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}

function getSlugBaseName() {
  const slug =
    (titleInput.value || "issue")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "screenshot";
  return `skriptjobs-${slug}`;
}

/**
 * Open the full-resolution framed PNG in a new browser tab without losing any settings,
 * and keep the pinned window on top if Stay on Top is active.
 */
async function openFullResolutionInNewTab() {
  try {
    await saveSettings();
    await startOperationLog("openFullImageInNewTab", {
      url: urlInput.value.trim(),
      title: titleInput.value.trim(),
      wallpaperId: selectedWallpaperId,
    });
    const fullDataUrl = previewCanvas.toDataURL("image/png");
    const previewTitle = titleInput.value.trim() || "Skriptjobs - Screendump Preview";

    if (typeof chrome !== "undefined" && chrome.storage?.local && chrome.tabs?.create) {
      await chrome.storage.local.set({
        lastFullPreviewDataUrl: fullDataUrl,
        lastFullPreviewTitle: previewTitle,
        timestamp: formatBrowserTimestamp(),
        timezone: getBrowserTimezone(),
      });
      const previewPageUrl = chrome.runtime.getURL("html/preview.html");
      const createProps = { url: previewPageUrl };
      if (isPinnedWindow && pinnedSourceWindowId) {
        createProps.windowId = pinnedSourceWindowId;
      }
      await chrome.tabs.create(createProps);
      if (isPinnedWindow && stayOnTop) {
        setTimeout(() => keepPinnedWindowOnTop(), 60);
        setTimeout(() => keepPinnedWindowOnTop(), 180);
      }
    } else {
      const blob = await getCanvasBlob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener");
    }
    await finishOperationLog("success", { dimensions: dimensionsBadge.textContent });
  } catch (err) {
    await finishOperationLog("error", { message: err.message });
    setStatus(`Could not open preview tab: ${err.message}`, "error");
  }
}

btnOpenFullTab.addEventListener("click", openFullResolutionInNewTab);
btnOpenFullTabOps.addEventListener("click", openFullResolutionInNewTab);

/**
 * Capture the active browser tab (or restore last captured screen when in floating window / preview tab)
 */
async function captureActiveTab(saved = {}) {
  await startOperationLog("captureActiveTab", { isPinnedWindow });
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    try {
      const queryOpts =
        isPinnedWindow && pinnedSourceWindowId
          ? { active: true, windowId: pinnedSourceWindowId }
          : { active: true, currentWindow: true };
      const [tab] = await chrome.tabs.query(queryOpts);
      const isRestrictedUrl =
        !tab?.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("blob:");

      if (tab && !isRestrictedUrl) {
        initialTabUrl = tab.url;
        lastCapturedTabUrl = tab.url;
        if (tab.title) {
          initialTabTitle = tab.title;
        }
        urlInput.value = customUrlOverride || initialTabUrl;
        titleInput.value = customTitleOverride || initialTabTitle;

        await appendLogEvent("activeTab:detected", {
          url: urlInput.value,
          title: titleInput.value,
          hasUrlOverride: Boolean(customUrlOverride),
          hasTitleOverride: Boolean(customTitleOverride),
        });

        const captureWinId = isPinnedWindow && pinnedSourceWindowId ? pinnedSourceWindowId : null;
        const dataUrl = await chrome.tabs.captureVisibleTab(captureWinId, { format: "png" });
        lastCapturedDataUrl = dataUrl;
        rawScreenshotImage = await loadImage(dataUrl);
        await saveSettings();
        await finishOperationLog("success", {
          width: rawScreenshotImage.naturalWidth,
          height: rawScreenshotImage.naturalHeight,
        });
        return;
      }

      // If user opened popup while on html/preview.html, html/logs.html, or pinned window, reuse last captured screenshot & overrides
      if (saved.lastCapturedDataUrl) {
        lastCapturedDataUrl = saved.lastCapturedDataUrl;
        if (saved.lastCapturedTabUrl) initialTabUrl = saved.lastCapturedTabUrl;
        if (saved.lastCapturedTabTitle) initialTabTitle = saved.lastCapturedTabTitle;
        urlInput.value = customUrlOverride || initialTabUrl;
        titleInput.value = customTitleOverride || initialTabTitle;
        rawScreenshotImage = await loadImage(saved.lastCapturedDataUrl);
        await appendLogEvent("activeTab:restoredPreviousCapture", {
          tabUrl: tab?.url || "restricted",
          restoredUrl: urlInput.value,
        });
        await finishOperationLog("success", {
          width: rawScreenshotImage.naturalWidth,
          height: rawScreenshotImage.naturalHeight,
          restoredFromSession: true,
        });
        return;
      }

      await appendLogEvent("activeTab:restrictedUrlFallback", { tabUrl: tab?.url || "unknown" });
    } catch (captureErr) {
      await appendLogEvent("activeTab:captureFallback", { reason: captureErr?.message || String(captureErr) }, "warn");
      if (saved.lastCapturedDataUrl) {
        lastCapturedDataUrl = saved.lastCapturedDataUrl;
        if (saved.lastCapturedTabUrl) initialTabUrl = saved.lastCapturedTabUrl;
        if (saved.lastCapturedTabTitle) initialTabTitle = saved.lastCapturedTabTitle;
        urlInput.value = customUrlOverride || initialTabUrl;
        titleInput.value = customTitleOverride || initialTabTitle;
        rawScreenshotImage = await loadImage(saved.lastCapturedDataUrl);
        await finishOperationLog("success", { restoredFromSession: true });
        return;
      }
    }
  }

  // Fallback for restricted pages or standalone preview
  urlInput.value = customUrlOverride || initialTabUrl;
  titleInput.value = customTitleOverride || initialTabTitle;
  const sampleSrc = urlParams.get("sample") || "assets/sample-viewport.png";
  rawScreenshotImage = await loadImage(sampleSrc);
  await finishOperationLog("success", { sampleSrc, fallback: true });
}

// Multi-wallpaper file upload
btnUploadWallpapers.addEventListener("click", () => {
  multiWallpaperInput.click();
});

multiWallpaperInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  await startOperationLog("uploadWallpapers", { count: files.length });
  const newlyAddedIds = [];
  for (const file of files) {
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const cleanName = file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 28) || "Custom Wallpaper";
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    wallpapersList.push({
      id,
      name: cleanName,
      type: "image",
      src: dataUrl,
      builtin: false,
    });
    newlyAddedIds.push(id);
  }

  if (newlyAddedIds.length > 0) {
    selectedWallpaperId = newlyAddedIds[newlyAddedIds.length - 1];
    await saveSettings();
    renderWallpaperGallery();
    await redrawPreview();
    await finishOperationLog("success", { addedIds: newlyAddedIds });
  }
  multiWallpaperInput.value = "";
});

// Debounced live re-render + state persistence when Override Mockup URL or Override Tab Title changes
const debouncedUrlChange = debounce(async () => {
  const val = urlInput.value.trim();
  customUrlOverride = val && val !== initialTabUrl ? val : "";
  await saveSettings();
  await redrawPreview();
  await appendLogEvent("output:overrideUrl", { customUrlOverride });
}, 280);

const debouncedTitleChange = debounce(async () => {
  const val = titleInput.value.trim();
  customTitleOverride = val && val !== initialTabTitle ? val : "";
  await saveSettings();
  await redrawPreview();
  await appendLogEvent("output:overrideTitle", { customTitleOverride });
}, 280);

urlInput.addEventListener("input", debouncedUrlChange);
titleInput.addEventListener("input", debouncedTitleChange);
blobTokenInput.addEventListener("change", () => saveSettings());

if (btnResetUrl) {
  btnResetUrl.addEventListener("click", async () => {
    customUrlOverride = "";
    urlInput.value = initialTabUrl;
    await saveSettings();
    await redrawPreview();
    await appendLogEvent("output:resetUrl", { restoredUrl: initialTabUrl });
  });
}

if (btnResetTitle) {
  btnResetTitle.addEventListener("click", async () => {
    customTitleOverride = "";
    titleInput.value = initialTabTitle;
    await saveSettings();
    await redrawPreview();
    await appendLogEvent("output:resetTitle", { restoredTitle: initialTabTitle });
  });
}

if (btnToggleBlobToken && blobTokenInput) {
  btnToggleBlobToken.addEventListener("click", () => {
    const isPassword = blobTokenInput.type === "password";
    blobTokenInput.type = isPassword ? "text" : "password";
    if (iconBlobEye && iconBlobEyeOff) {
      iconBlobEye.style.display = isPassword ? "none" : "";
      iconBlobEyeOff.style.display = isPassword ? "" : "none";
    }
    btnToggleBlobToken.setAttribute("data-tooltip", isPassword ? "Hide token" : "Reveal token");
    btnToggleBlobToken.setAttribute("aria-label", isPassword ? "Hide token" : "Reveal token");
  });
}

const debouncedFaviconChange = debounce(async () => {
  const raw = faviconInput.value.trim();
  if (!raw) {
    customFaviconDataUrl = null;
  } else {
    customFaviconDataUrl = await resolveFaviconToDataUrl(raw);
  }
  updateFaviconPreviewBadge();
  await saveSettings();
  await redrawPreview();
  await appendLogEvent("output:overrideFavicon", { hasCustomFavicon: Boolean(customFaviconDataUrl) });
}, 280);

if (faviconInput) {
  faviconInput.addEventListener("input", debouncedFaviconChange);
}

if (btnUploadFavicon && faviconFileInput) {
  btnUploadFavicon.addEventListener("click", () => {
    faviconFileInput.click();
  });

  faviconFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    customFaviconDataUrl = await resolveFaviconToDataUrl(String(dataUrl));
    faviconInput.value = file.name;
    updateFaviconPreviewBadge();
    await saveSettings();
    await redrawPreview();
    await appendLogEvent("output:uploadFavicon", { fileName: file.name });
    faviconFileInput.value = "";
  });
}

if (btnResetFavicon) {
  btnResetFavicon.addEventListener("click", async () => {
    customFaviconDataUrl = null;
    if (faviconInput) faviconInput.value = "";
    updateFaviconPreviewBadge();
    await saveSettings();
    await redrawPreview();
    await appendLogEvent("output:resetFavicon", {});
  });
}

// Copy framed PNG to clipboard
btnCopyClipboard.addEventListener("click", async () => {
  try {
    await startOperationLog("copyPngToClipboard", {
      url: urlInput.value.trim(),
      title: titleInput.value.trim(),
      wallpaperId: selectedWallpaperId,
      mockupTheme: resolveMockupTheme(),
    });
    const blob = await getCanvasBlob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    await finishOperationLog("success", { sizeBytes: blob.size });
  } catch (err) {
    await finishOperationLog("error", { message: err.message });
    setStatus(`Clipboard error: ${err.message}`, "error");
  }
});

// Download single PNG
btnDownloadPng.addEventListener("click", async () => {
  await startOperationLog("downloadPng", {
    url: urlInput.value.trim(),
    title: titleInput.value.trim(),
    wallpaperId: selectedWallpaperId,
    mockupTheme: resolveMockupTheme(),
  });
  const blob = await getCanvasBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = `${getSlugBaseName()}-framed.png`;
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  await finishOperationLog("success", { filename, sizeBytes: blob.size });
});

// Download Light & Dark ZIP for Nuxt UI <UColorModeImage />
btnDownloadThemeZip.addEventListener("click", async () => {
  try {
    const baseName = getSlugBaseName();
    await startOperationLog("downloadLightDarkZip", {
      baseName,
      url: urlInput.value.trim(),
      title: titleInput.value.trim(),
      wallpaperId: selectedWallpaperId,
    });

    const activeWp =
      wallpapersList.find((w) => w.id === selectedWallpaperId) ||
      wallpapersList.find((w) => w.id === defaultWallpaperId) ||
      wallpapersList[0];
    const wallpaperImg = await resolveWallpaperImage(activeWp);

    const offscreenLight = document.createElement("canvas");
    await renderFramedIssueCanvas({
      canvas: offscreenLight,
      screenshotImage: rawScreenshotImage,
      wallpaperImage: wallpaperImg,
      logoImage: skriptjobsLogoImage,
      pageUrl: urlInput.value.trim(),
      pageTitle: titleInput.value.trim(),
      faviconDataUrl: customFaviconDataUrl,
      mockupTheme: "light",
    });
    const lightBlob = await getCanvasBlob(offscreenLight);
    const lightBytes = new Uint8Array(await lightBlob.arrayBuffer());

    const offscreenDark = document.createElement("canvas");
    await renderFramedIssueCanvas({
      canvas: offscreenDark,
      screenshotImage: rawScreenshotImage,
      wallpaperImage: wallpaperImg,
      logoImage: skriptjobsLogoImage,
      pageUrl: urlInput.value.trim(),
      pageTitle: titleInput.value.trim(),
      faviconDataUrl: customFaviconDataUrl,
      mockupTheme: "dark",
    });
    const darkBlob = await getCanvasBlob(offscreenDark);
    const darkBytes = new Uint8Array(await darkBlob.arrayBuffer());

    const lightFilename = `${baseName}-light.png`;
    const darkFilename = `${baseName}-dark.png`;
    const zipFilename = `${baseName}-light-dark.zip`;

    const zipBlob = createZipBlob([
      { name: lightFilename, data: lightBytes },
      { name: darkFilename, data: darkBytes },
    ]);

    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = zipFilename;
    a.click();
    URL.revokeObjectURL(zipUrl);

    await finishOperationLog("success", {
      zipFilename,
      files: [lightFilename, darkFilename],
      sizeBytes: zipBlob.size,
    });
  } catch (err) {
    await finishOperationLog("error", { message: err.message });
    setStatus(`ZIP export failed: ${err.message}`, "error");
  }
});

// Upload to Vercel Blob & copy GitHub Issue Markdown
btnUploadBlob.addEventListener("click", async () => {
  try {
    await saveSettings();
    const token = blobTokenInput.value.trim();
    if (!token) {
      setOpenAccordion("settings");
      setStatus("Enter your Vercel Blob token in Settings first.", "error");
      return;
    }

    setStatus("Uploading framed PNG to Vercel Blob...", "info");
    await startOperationLog("uploadVercelBlob", {
      url: urlInput.value.trim(),
      title: titleInput.value.trim(),
      wallpaperId: selectedWallpaperId,
      mockupTheme: resolveMockupTheme(),
    });
    const blob = await getCanvasBlob();
    const slug =
      (titleInput.value || "issue")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "screenshot";
    const pathname = `issues/${Date.now()}-${slug}.png`;

    const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-version": "7",
        "x-content-type": "image/png",
      },
      body: blob,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const markdown = `![${titleInput.value || "Screenshot"}](${result.url})`;
    await navigator.clipboard.writeText(markdown);
    await finishOperationLog("success", { blobUrl: result.url, markdown });
    setStatus(`Uploaded & copied Markdown: ${result.url}`, "success");
  } catch (err) {
    await finishOperationLog("error", { message: err.message });
    setStatus(`Upload failed: ${err.message}`, "error");
  }
});

// Initialize extension popup
(async () => {
  try {
    const saved = await loadSettings();

    // If a pinned floating window is already open and the user clicked the toolbar icon, focus the existing pinned window
    if (!isPinnedWindow && saved.stayOnTop && saved.pinnedWindowId && typeof chrome !== "undefined" && chrome.windows?.get) {
      try {
        const existingWin = await chrome.windows.get(Number(saved.pinnedWindowId));
        if (existingWin && existingWin.id) {
          await chrome.windows.update(existingWin.id, { focused: true });
          window.close();
          return;
        }
      } catch {
        // Pinned window was closed; clear stale ID
        await chrome.storage.local.set({ stayOnTop: false, pinnedWindowId: null });
      }
    }

    if (isPinnedWindow && typeof chrome !== "undefined" && chrome.windows?.getCurrent) {
      try {
        const myWin = await chrome.windows.getCurrent();
        pinnedSelfWindowId = myWin?.id ?? null;
        stayOnTop = true;
        updatePinButtonUI();
        if (pinnedSelfWindowId && chrome.storage?.local) {
          await chrome.storage.local.set({ stayOnTop: true, pinnedWindowId: pinnedSelfWindowId });
        }
      } catch {
        // ignore
      }
    }

    if (saved.blobReadWriteToken) {
      blobTokenInput.value = saved.blobReadWriteToken;
    }

    // Load saved wallpaper list (healing any legacy built-in paths) or fall back to built-ins + customWallpapers
    const builtinMap = new Map(BUILTIN_WALLPAPERS.map((b) => [b.id, b]));
    if (Array.isArray(saved.wallpapersState) && saved.wallpapersState.length > 0) {
      wallpapersList = saved.wallpapersState.map((w) => {
        if (w.builtin && builtinMap.has(w.id)) {
          const ref = builtinMap.get(w.id);
          return { ...ref, name: w.name || ref.name };
        }
        return w;
      });
    } else {
      const custom = Array.isArray(saved.customWallpapers) ? saved.customWallpapers : [];
      wallpapersList = [...cloneBuiltinWallpapers(), ...custom];
    }

    if (saved.defaultWallpaperId && wallpapersList.some((w) => w.id === saved.defaultWallpaperId)) {
      defaultWallpaperId = saved.defaultWallpaperId;
    }
    if (saved.selectedWallpaperId && wallpapersList.some((w) => w.id === saved.selectedWallpaperId)) {
      selectedWallpaperId = saved.selectedWallpaperId;
    } else {
      selectedWallpaperId = defaultWallpaperId;
    }

    // Restore saved URL, Title, and Favicon overrides
    if (typeof saved.customUrlOverride === "string" && saved.customUrlOverride) {
      customUrlOverride = saved.customUrlOverride;
    }
    if (typeof saved.customTitleOverride === "string" && saved.customTitleOverride) {
      customTitleOverride = saved.customTitleOverride;
    }
    if (saved.customFaviconDataUrl) {
      customFaviconDataUrl = saved.customFaviconDataUrl;
      if (faviconInput && saved.customFaviconInput) {
        faviconInput.value = saved.customFaviconInput;
      }
      updateFaviconPreviewBadge();
    }

    // Restore last open accordion section
    if (saved.activeAccordionId && ["wallpapers", "operations", "output", "settings"].includes(saved.activeAccordionId)) {
      forceOpenAccordion(saved.activeAccordionId);
    }

    // Apply saved Sync Browser Mockup Theme preference (defaults to true)
    const initialSyncMockup = typeof saved.syncMockupTheme === "boolean" ? saved.syncMockupTheme : true;
    applySyncMockupSwitch(initialSyncMockup, false);

    // Apply saved theme (System by default) before first render
    const initialThemeMode = ["system", "dark", "light"].includes(saved.themeMode) ? saved.themeMode : "system";
    applyTheme(initialThemeMode, false);

    renderWallpaperGallery();
    skriptjobsLogoImage = await loadImage(SKRIPTJOBS_LOGO_URL);
    await captureActiveTab(saved);
    await redrawPreview();
  } catch (err) {
    setStatus(`Init error: ${err.message}`, "error");
  }
})();
