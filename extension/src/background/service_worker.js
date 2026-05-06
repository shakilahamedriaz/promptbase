/**
 * PromptVault Pro – service_worker.js
 * Handles badge, alarm-based sync, and message routing.
 * Type: module (declared in manifest.json)
 */

import {
  savePrompt,
  getPrompts,
  getPromptById,
  updatePrompt,
  deletePrompt,
  initDB,
  logHistory,
  getHistory,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  getSetting,
  setSetting,
} from '../storage/local_store.js';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ALARM_SYNC = 'sync-backend';
const ALARM_INTERVAL_MINUTES = 1;
const BADGE_COLOR = '#7C3AED';
const DEFAULT_BACKEND_URL = 'http://localhost:8000';

// ─────────────────────────────────────────────
// Install / Startup
// ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await initDB();
  await updateBadge();
  registerSyncAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await initDB();
  await updateBadge();
  registerSyncAlarm();
});

// ─────────────────────────────────────────────
// Badge Management
// ─────────────────────────────────────────────

async function updateBadge() {
  try {
    const prompts = await getPrompts();
    const count = prompts.length;
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  } catch (err) {
    console.error('[PV] updateBadge error:', err);
  }
}

// Re-count badge whenever storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['pv_prompts']) {
    updateBadge();
  }
});

// ─────────────────────────────────────────────
// Alarm – Periodic Sync
// ─────────────────────────────────────────────

function registerSyncAlarm() {
  chrome.alarms.get(ALARM_SYNC, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_SYNC, {
        periodInMinutes: ALARM_INTERVAL_MINUTES,
      });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_SYNC) {
    runSync();
  }
});

// ─────────────────────────────────────────────
// Sync Logic
// ─────────────────────────────────────────────

async function runSync() {
  try {
    const isOnline = await getSetting('is_online', true);
    if (!isOnline) return;

    const backendUrl = await getSetting('BACKEND_URL', DEFAULT_BACKEND_URL);
    const authToken = await getSetting('auth_token', null);

    if (!authToken) return; // No auth, skip sync

    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    for (const item of queue) {
      try {
        const endpoint = resolveEndpoint(backendUrl, item);
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers,
          body: JSON.stringify(item.payload),
        });

        if (response.ok) {
          await removeSyncQueueItem(item.id);
        } else if (response.status === 401) {
          // Auth failure – stop syncing
          await setSetting('is_online', false);
          broadcastSyncStatus('auth_error');
          break;
        } else {
          // Server error – keep in queue, try next time
          console.warn(`[PV] Sync item ${item.id} failed with status ${response.status}`);
        }
      } catch (fetchErr) {
        // Network error
        await setSetting('is_online', false);
        broadcastSyncStatus('offline');
        break;
      }
    }

    await setSetting('is_online', true);
    broadcastSyncStatus('success');
  } catch (err) {
    console.error('[PV] runSync error:', err);
  }
}

function resolveEndpoint(backendUrl, item) {
  const base = backendUrl.replace(/\/$/, '');
  switch (item.type) {
    case 'create':
      return { url: `${base}/v1/prompts`, method: 'POST' };
    case 'update':
      return { url: `${base}/v1/prompts/${item.payload.id}`, method: 'PUT' };
    case 'delete':
      return { url: `${base}/v1/prompts/${item.payload.id}`, method: 'DELETE' };
    case 'history':
      return { url: `${base}/v1/history`, method: 'POST' };
    default:
      return { url: `${base}/v1/sync`, method: 'POST' };
  }
}

function broadcastSyncStatus(status) {
  chrome.runtime.sendMessage({ type: 'SYNC_STATUS', status }).catch(() => {
    // Popup may not be open – ignore
  });
}

// ─────────────────────────────────────────────
// Message Listener
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => {
      console.error('[PV] Message handler error:', err);
      sendResponse({ error: err.message });
    });
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  const { type, payload } = message;

  switch (type) {

    case 'GET_PROMPTS': {
      const prompts = await getPrompts();
      return { prompts };
    }

    case 'SAVE_PROMPT': {
      const saved = await savePrompt(payload);
      await addToSyncQueue({ type: 'create', payload: saved });
      return { prompt: saved };
    }

    case 'UPDATE_PROMPT': {
      const { id, changes } = payload;
      const updated = await updatePrompt(id, changes);
      if (updated) {
        await addToSyncQueue({ type: 'update', payload: updated });
      }
      return { prompt: updated };
    }

    case 'DELETE_PROMPT': {
      const { id } = payload;
      const deleted = await deletePrompt(id);
      if (deleted) {
        await addToSyncQueue({ type: 'delete', payload: { id } });
      }
      return { deleted };
    }

    case 'GET_PROMPT_BY_ID': {
      const prompt = await getPromptById(payload.id);
      return { prompt };
    }

    case 'LOG_HISTORY': {
      const entry = await logHistory(payload);
      await addToSyncQueue({ type: 'history', payload: entry });
      return { entry };
    }

    case 'GET_HISTORY': {
      const limit = payload?.limit || 50;
      const offset = payload?.offset || 0;
      const history = await getHistory(limit, offset);
      return { history };
    }

    case 'GET_SETTINGS': {
      const [backendUrl, authToken, autoSubmit, darkMode] = await Promise.all([
        getSetting('BACKEND_URL', DEFAULT_BACKEND_URL),
        getSetting('auth_token', ''),
        getSetting('auto_submit', false),
        getSetting('dark_mode', true),
      ]);
      return { settings: { backendUrl, authToken, autoSubmit, darkMode } };
    }

    case 'SET_SETTING': {
      const { key, value } = payload;
      await setSetting(key, value);
      return { ok: true };
    }

    case 'TRIGGER_SYNC': {
      await runSync();
      return { ok: true };
    }

    case 'INCREMENT_USE_COUNT': {
      const { id } = payload;
      const prompt = await getPromptById(id);
      if (prompt) {
        const updated = await updatePrompt(id, { use_count: (prompt.use_count || 0) + 1 });
        return { prompt: updated };
      }
      return { prompt: null };
    }

    default:
      return { error: `Unknown message type: ${type}` };
  }
}
