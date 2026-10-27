const LOG_STORAGE_KEY = "skriptjobs_last_operation_log";
const EXTENSION_LOGS_KEY = "extensionLogs";
const MAX_LOG_HISTORY = 50;

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
}

export function formatBrowserTimestamp(date = new Date()) {
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const millis = pad(date.getMilliseconds(), 3);
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const offH = pad(Math.floor(absMin / 60));
  const offM = pad(absMin % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${sign}${offH}:${offM}`;
}

export async function startOperationLog(operationName, metadata = {}) {
  const now = new Date();
  const browserTs = formatBrowserTimestamp(now);
  const tz = getBrowserTimezone();
  const entry = {
    extension: "Skriptjobs - Screendump Helper",
    version: "1.0.0",
    operation: operationName,
    timestamp: browserTs,
    timezone: tz,
    startedAt: browserTs,
    startedAtUtc: now.toISOString(),
    status: "running",
    metadata,
    events: [
      {
        timestamp: browserTs,
        timezone: tz,
        level: "info",
        event: `${operationName}:start`,
        details: metadata,
      },
    ],
  };
  await writeLog(entry, true);
  return entry;
}

export async function appendLogEvent(eventName, details = {}, level = "info") {
  const now = new Date();
  const browserTs = formatBrowserTimestamp(now);
  const tz = getBrowserTimezone();
  const current = (await readLog()) || {
    extension: "Skriptjobs - Screendump Helper",
    version: "1.0.0",
    operation: "session",
    timestamp: browserTs,
    timezone: tz,
    startedAt: browserTs,
    startedAtUtc: now.toISOString(),
    status: "running",
    metadata: {},
    events: [],
  };
  current.timestamp = browserTs;
  current.timezone = tz;
  current.events.push({
    timestamp: browserTs,
    timezone: tz,
    level,
    event: eventName,
    details,
  });
  await writeLog(current, false);
  return current;
}

export async function finishOperationLog(status = "success", summary = {}) {
  const current = await readLog();
  if (!current) return null;
  const now = new Date();
  const browserTs = formatBrowserTimestamp(now);
  const tz = getBrowserTimezone();
  current.status = status;
  current.timestamp = browserTs;
  current.timezone = tz;
  current.completedAt = browserTs;
  current.completedAtUtc = now.toISOString();
  current.summary = summary;
  current.events.push({
    timestamp: browserTs,
    timezone: tz,
    level: status === "error" ? "error" : "info",
    event: `${current.operation}:${status}`,
    details: summary,
  });
  await writeLog(current, false);
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

export async function writeLog(entry, isNewOperation = false) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([EXTENSION_LOGS_KEY], (res) => {
        const list = Array.isArray(res?.[EXTENSION_LOGS_KEY]) ? res[EXTENSION_LOGS_KEY] : [];
        if (isNewOperation || list.length === 0) {
          list.unshift(entry);
        } else {
          list[0] = entry;
        }
        const trimmed = list.slice(0, MAX_LOG_HISTORY);
        chrome.storage.local.set(
          {
            [LOG_STORAGE_KEY]: entry,
            [EXTENSION_LOGS_KEY]: trimmed,
          },
          resolve
        );
      });
    });
  }
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}
