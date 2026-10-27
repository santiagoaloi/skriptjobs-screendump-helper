/**
 * Programmatic Automation Hook for Cursor Cloud Agents / Playwright / Puppeteer
 *
 * Page scripts or automated agents can trigger a framed screenshot by running:
 *   window.postMessage({
 *     type: 'SKRIPTJOBS_CAPTURE_ISSUE_SCREENSHOT',
 *     options: {
 *       bg: 'macos-default', // or 'skriptjobs-indigo', 'nordic-teal', 'midnight-slate', or data/http URL
 *       url: window.location.href,
 *       title: document.title,
 *       upload: false,
 *       blobToken: ''
 *     }
 *   }, '*');
 *
 * Listen for `{ type: 'SKRIPTJOBS_CAPTURE_ISSUE_SCREENSHOT_RESULT', dataUrl, blobUrl, markdown }`.
 */

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'SKRIPTJOBS_CAPTURE_ISSUE_SCREENSHOT') return;

  const opts = event.data.options || {};
  try {
    const cap = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' });
    if (cap?.error) throw new Error(cap.error);

    const rendererUrl = chrome.runtime.getURL('shared/frame-renderer.js');
    const { renderFramedScreenshotToCanvas } = await import(rendererUrl);

    const loadImg = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const presetName = opts.bg || 'macos-default';
    const bgSrc =
      presetName.startsWith('data:') || presetName.startsWith('http')
        ? presetName
        : chrome.runtime.getURL(`assets/backgrounds/${presetName}.png`);

    const [vpImg, bgImg] = await Promise.all([
      loadImg(cap.dataUrl),
      loadImg(bgSrc),
    ]);

    const canvas = document.createElement('canvas');
    const displayUrl = opts.url || cap.url || window.location.href;
    const displayTitle = opts.title || cap.title || document.title;

    await renderFramedScreenshotToCanvas({
      canvas,
      viewportImage: vpImg,
      backgroundImage: bgImg,
      url: displayUrl,
      title: displayTitle,
      marginMode: opts.marginMode || 'reference',
      fitReferenceSize: opts.fitReferenceSize !== false,
    });

    const framedDataUrl = canvas.toDataURL('image/png');
    let blobUrl = null;
    let markdown = null;

    if (opts.upload) {
      const up = await chrome.runtime.sendMessage({
        type: 'UPLOAD_VERCEL_BLOB',
        dataUrl: framedDataUrl,
        token: opts.blobToken,
      });
      if (!up?.ok) throw new Error(up?.error || 'Upload failed');
      blobUrl = up.url;
      markdown = `![${displayTitle}](${blobUrl})`;
    }

    document.documentElement.dataset.skriptjobsLastCapture = blobUrl || 'ready';
    window.postMessage(
      {
        type: 'SKRIPTJOBS_CAPTURE_ISSUE_SCREENSHOT_RESULT',
        ok: true,
        dataUrl: framedDataUrl,
        blobUrl,
        markdown,
      },
      '*'
    );
  } catch (err) {
    window.postMessage(
      {
        type: 'SKRIPTJOBS_CAPTURE_ISSUE_SCREENSHOT_RESULT',
        ok: false,
        error: err.message,
      },
      '*'
    );
  }
});
