chrome.storage.local.get(["lastFullPreviewDataUrl", "lastFullPreviewTitle"], (res) => {
  const img = document.getElementById("fullPreviewImg");
  if (res && res.lastFullPreviewDataUrl) {
    img.src = res.lastFullPreviewDataUrl;
  }
  if (res && res.lastFullPreviewTitle) {
    document.title = `${res.lastFullPreviewTitle} — Preview`;
  }
});
