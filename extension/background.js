/**
 * Background Service Worker for Skriptjobs Issue Capture
 * Handles:
 * 1. Capturing the visible tab viewport (`chrome.tabs.captureVisibleTab`)
 * 2. Uploading framed PNGs directly to Vercel Blob (`https://blob.vercel-storage.com/...`)
 * 3. Responding to programmatic agent triggers from content.js
 */

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
        const stored = await chrome.storage.local.get(['blobReadWriteToken']);
        const finalToken = token || stored.blobReadWriteToken;
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
