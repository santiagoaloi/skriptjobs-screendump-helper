const logsOutput = document.getElementById('logsOutput');
const btnClearLogsPage = document.getElementById('btnClearLogsPage');

async function renderLogs() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get(['extensionLogs']);
    const logs = Array.isArray(data.extensionLogs) ? data.extensionLogs : [];
    logsOutput.textContent = JSON.stringify(logs, null, 2);
    return;
  }
  try {
    const raw = localStorage.getItem('sj_extensionLogs');
    const logs = raw ? JSON.parse(raw) : [];
    logsOutput.textContent = JSON.stringify(logs, null, 2);
  } catch {
    logsOutput.textContent = '[]';
  }
}

btnClearLogsPage?.addEventListener('click', async () => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ extensionLogs: [] });
  } else {
    localStorage.setItem('sj_extensionLogs', '[]');
  }
  await renderLogs();
});

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extensionLogs) {
      renderLogs();
    }
  });
}

renderLogs();
