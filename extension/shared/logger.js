const LOG_STORAGE_KEY = "skriptjobs_last_operation_log";

export async function startOperationLog(operationName, metadata = {}) {
  const entry = {
    extension: "Skriptjobs - Screendump Helper",
    version: "1.0.0",
    operation: operationName,
    startedAt: new Date().toISOString(),
    status: "running",
    metadata,
    events: [
      {
        timestamp: new Date().toISOString(),
        level: "info",
        event: `${operationName}:start`,
        details: metadata,
      },
    ],
  };
  await writeLog(entry);
  return entry;
}

export async function appendLogEvent(eventName, details = {}, level = "info") {
  const current = (await readLog()) || {
    extension: "Skriptjobs - Screendump Helper",
    version: "1.0.0",
    operation: "session",
    startedAt: new Date().toISOString(),
    status: "running",
    metadata: {},
    events: [],
  };
  current.events.push({
    timestamp: new Date().toISOString(),
    level,
    event: eventName,
    details,
  });
  await writeLog(current);
  return current;
}

export async function finishOperationLog(status = "success", summary = {}) {
  const current = await readLog();
  if (!current) return null;
  current.status = status;
  current.completedAt = new Date().toISOString();
  current.summary = summary;
  current.events.push({
    timestamp: current.completedAt,
    level: status === "error" ? "error" : "info",
    event: `${current.operation}:${status}`,
    details: summary,
  });
  await writeLog(current);
  return current;
}

export async function readLog() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([LOG_STORAGE_KEY], (res) => resolve(res?.[LOG_STORAGE_KEY] || null));
    });
  }
  try {
    return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export async function writeLog(entry) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [LOG_STORAGE_KEY]: entry }, resolve);
    });
  }
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}
