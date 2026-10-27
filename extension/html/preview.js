chrome.storage.local.get(
  ["lastFullPreviewDataUrl", "lastFullPreviewFsUrl", "lastFullPreviewFilename", "lastFullPreviewTitle"],
  (res) => {
    const img = document.getElementById("fullPreviewImg");
    const targetUrl = (res && (res.lastFullPreviewFsUrl || res.lastFullPreviewDataUrl)) || "";
    const filename = (res && res.lastFullPreviewFilename) || "skriptjobs-screenshot-framed.png";
    if (img && targetUrl) {
      img.src = targetUrl;
      img.addEventListener("dragstart", (e) => {
        if (!e.dataTransfer) return;
        e.dataTransfer.effectAllowed = "copyMove";
        e.dataTransfer.setData("DownloadURL", `image/png:${filename}:${targetUrl}`);
        e.dataTransfer.setData("text/uri-list", targetUrl);
        e.dataTransfer.setData("text/plain", targetUrl);
      });
    }
    if (res && res.lastFullPreviewTitle) {
      document.title = `${res.lastFullPreviewTitle} — Preview`;
    }
  }
);
