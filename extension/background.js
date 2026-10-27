/**
 * Background Service Worker for Skriptjobs - Screendump Helper
 * Handles:
 * 1. Action context menu items:
 *    - "Skriptjobs - Screendump Helper" (native top item via homepage_url -> opens GitHub repo)
 *    - "Get Extension Logs" -> opens chrome-extension://<id>/html/logs.html
 *    - "Clear Extension Logs" -> clears stored logs
 * 2. Capturing the visible tab viewport (`chrome.tabs.captureVisibleTab`)
 * 3. Uploading framed PNGs directly to Vercel Blob (`https://blob.vercel-storage.com/...`)
 */

const REPO_URL = 'https://github.com/santiagoaloi/skriptjobs-screendump-helper';

function setupContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'get-extension-logs',
      title: 'Get Extension Logs',
      contexts: ['action'],
    });
    chrome.contextMenus.create({
      id: 'clear-extension-logs',
      title: 'Clear Extension Logs',
      contexts: ['action'],
    });
    chrome.contextMenus.create({
      id: 'open-skriptjobs-repo',
      title: 'Skriptjobs - Screendump Helper',
      contexts: ['action'],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

if (chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === 'get-extension-logs') {
      const logsUrl = chrome.runtime.getURL('html/logs.html');
      await chrome.tabs.create({ url: logsUrl });
    } else if (info.menuItemId === 'clear-extension-logs') {
      await chrome.storage.local.set({ extensionLogs: [], skriptjobs_last_operation_log: null });
    } else if (info.menuItemId === 'open-skriptjobs-repo') {
      await chrome.tabs.create({ url: REPO_URL });
    }
  });
}

async function uploadToVercelBlob({ pngBlob, pathname, token }) {
  const endpoint = `https://blob.vercel-storage.com/${pathname.replace(/^\/+/, '')}`;
  const res = await fetch(endpoint, {
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
    throw new Error(`Vercel Blob upload failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'CAPTURE_VISIBLE_TAB') {
    const windowId = sender?.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({
        dataUrl,
        url: sender?.tab?.url || '',
        title: sender?.tab?.title || '',
        favIconUrl: sender?.tab?.favIconUrl || '',
      });
    });
    return true;
  }

  if (msg?.type === 'UPLOAD_VERCEL_BLOB') {
    (async () => {
      try {
        const { dataUrl, pathname, token } = msg;
        const stored = await chrome.storage.local.get(['blobReadWriteToken', 'blobToken']);
        const finalToken = token || stored.blobToken || stored.blobReadWriteToken;
        if (!finalToken) {
          throw new Error('Missing BLOB_READ_WRITE_TOKEN. Set it in the extension popup first.');
        }
        const fetchRes = await fetch(dataUrl);
        const pngBlob = await fetchRes.blob();
        const result = await uploadToVercelBlob({
          pngBlob,
          pathname: pathname || `issues/${new Date().toISOString().slice(0, 10)}/issue-${Date.now()}.png`,
          token: finalToken,
        });
        sendResponse({ ok: true, url: result.url, pathname: result.pathname });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }
});
