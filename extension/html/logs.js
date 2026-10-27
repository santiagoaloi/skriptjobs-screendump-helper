const logsOutput = document.getElementById('logsOutput');
const btnClearLogsPage = document.getElementById('btnClearLogsPage');

async function renderLogs() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get(['extensionLogs', 'skriptjobs_last_operation_log']);
    let logs = Array.isArray(data.extensionLogs) ? data.extensionLogs : [];
    if (logs.length === 0 && data.skriptjobs_last_operation_log) {
      logs = [data.skriptjobs_last_operation_log];
    }
    logsOutput.textContent = JSON.stringify(logs, null, 2);
    return;
  }
  try {
    const raw = localStorage.getItem('sj_extensionLogs') || localStorage.getItem('skriptjobs_last_operation_log');
    const parsed = raw ? JSON.parse(raw) : [];
    const logs = Array.isArray(parsed) ? parsed : [parsed];
    logsOutput.textContent = JSON.stringify(logs, null, 2);
  } catch {
    logsOutput.textContent = '[]';
  }
}

btnClearLogsPage?.addEventListener('click', async () => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ extensionLogs: [], skriptjobs_last_operation_log: null });
  } else {
    localStorage.setItem('sj_extensionLogs', '[]');
    localStorage.removeItem('skriptjobs_last_operation_log');
  }
  await renderLogs();
});

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.extensionLogs || changes.skriptjobs_last_operation_log)) {
      renderLogs();
    }
  });
}

renderLogs();
