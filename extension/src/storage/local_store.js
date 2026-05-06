/**
 * PromptVault Pro – local_store.js
 * Offline-first storage layer.
 *   • chrome.storage.local  → prompts + settings  (fast, large quota)
 *   • IndexedDB             → history + sync_queue (unbounded large data)
 */

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function generateId() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────
// chrome.storage.local – Prompts
// ─────────────────────────────────────────────

const PROMPTS_KEY = 'pv_prompts';

/**
 * Save a new prompt.
 * @param {Object} prompt - {id?, title, body, tags, category, is_favorite, variables, created_at?, updated_at?, use_count?, quality_score?}
 * @returns {Promise<Object>} saved prompt with generated id/timestamps
 */
export async function savePrompt(prompt) {
  const now = nowISO();
  const record = {
    id: prompt.id || generateId(),
    title: prompt.title || '',
    body: prompt.body || '',
    tags: Array.isArray(prompt.tags) ? prompt.tags : [],
    category: prompt.category || 'general',
    is_favorite: Boolean(prompt.is_favorite),
    variables: Array.isArray(prompt.variables) ? prompt.variables : [],
    created_at: prompt.created_at || now,
    updated_at: now,
    use_count: typeof prompt.use_count === 'number' ? prompt.use_count : 0,
    quality_score: typeof prompt.quality_score === 'number' ? prompt.quality_score : 0,
  };

  const existing = await _loadPromptsMap();
  existing[record.id] = record;
  await _savePromptsMap(existing);
  return record;
}

/**
 * Get all prompts sorted by updated_at descending.
 * @returns {Promise<Object[]>}
 */
export async function getPrompts() {
  const map = await _loadPromptsMap();
  return Object.values(map).sort((a, b) =>
    new Date(b.updated_at) - new Date(a.updated_at)
  );
}

/**
 * Get a single prompt by id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getPromptById(id) {
  const map = await _loadPromptsMap();
  return map[id] || null;
}

/**
 * Update an existing prompt with partial changes.
 * @param {string} id
 * @param {Object} changes
 * @returns {Promise<Object|null>} updated prompt or null if not found
 */
export async function updatePrompt(id, changes) {
  const map = await _loadPromptsMap();
  if (!map[id]) return null;
  const updated = {
    ...map[id],
    ...changes,
    id, // prevent id overwrite
    updated_at: nowISO(),
  };
  map[id] = updated;
  await _savePromptsMap(map);
  return updated;
}

/**
 * Hard-delete a prompt locally.
 * @param {string} id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
export async function deletePrompt(id) {
  const map = await _loadPromptsMap();
  if (!map[id]) return false;
  delete map[id];
  await _savePromptsMap(map);
  return true;
}

/**
 * Clear all prompts from local storage.
 */
export async function clearAllPrompts() {
  await _savePromptsMap({});
}

// Internal helpers for prompts map
async function _loadPromptsMap() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(PROMPTS_KEY, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[PROMPTS_KEY] || {});
      }
    });
  });
}

async function _savePromptsMap(map) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [PROMPTS_KEY]: map }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// ─────────────────────────────────────────────
// IndexedDB – Database Init
// ─────────────────────────────────────────────

const DB_NAME = 'promptvault';
const DB_VERSION = 1;
let _db = null;

/**
 * Open (or reuse) the IndexedDB database.
 * Stores: history (keyPath: id), sync_queue (keyPath: id)
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('used_at', 'used_at', { unique: false });
        historyStore.createIndex('prompt_id', 'prompt_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      _db.onclose = () => { _db = null; };
      resolve(_db);
    };

    request.onerror = (event) => {
      reject(new Error(`IndexedDB open error: ${event.target.errorCode}`));
    };
  });
}

// ─────────────────────────────────────────────
// IndexedDB – History
// ─────────────────────────────────────────────

/**
 * Log a usage history entry.
 * @param {Object} entry - {prompt_id, body_snapshot, platform, was_refined?}
 * @returns {Promise<Object>} saved entry with id and used_at
 */
export async function logHistory(entry) {
  const db = await initDB();
  const record = {
    id: generateId(),
    prompt_id: entry.prompt_id || null,
    body_snapshot: entry.body_snapshot || '',
    platform: entry.platform || 'unknown',
    used_at: entry.used_at || nowISO(),
    was_refined: Boolean(entry.was_refined),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(new Error('Failed to log history'));
  });
}

/**
 * Retrieve history entries, most recent first.
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Object[]>}
 */
export async function getHistory(limit = 50, offset = 0) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readonly');
    const store = tx.objectStore('history');
    const index = store.index('used_at');
    const results = [];
    let skipped = 0;
    let collected = 0;

    // Open cursor in descending order
    const req = index.openCursor(null, 'prev');
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor || collected >= limit) {
        resolve(results);
        return;
      }
      if (skipped < offset) {
        skipped++;
        cursor.continue();
        return;
      }
      results.push(cursor.value);
      collected++;
      cursor.continue();
    };
    req.onerror = () => reject(new Error('Failed to get history'));
  });
}

/**
 * Clear all history records.
 */
export async function clearHistory() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error('Failed to clear history'));
  });
}

// ─────────────────────────────────────────────
// IndexedDB – Sync Queue
// ─────────────────────────────────────────────

/**
 * Add an action to the sync queue.
 * @param {Object} action - {type: 'create'|'update'|'delete'|'history', payload}
 * @returns {Promise<Object>} saved action with id and created_at
 */
export async function addToSyncQueue(action) {
  const db = await initDB();
  const record = {
    id: generateId(),
    type: action.type,
    payload: action.payload || {},
    created_at: action.created_at || nowISO(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(new Error('Failed to add to sync queue'));
  });
}

/**
 * Get all pending sync queue items, oldest first.
 * @returns {Promise<Object[]>}
 */
export async function getSyncQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const index = store.index('created_at');
    const req = index.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error('Failed to get sync queue'));
  });
}

/**
 * Remove a processed item from the sync queue.
 * @param {string} id
 */
export async function removeSyncQueueItem(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error('Failed to remove sync queue item'));
  });
}

// ─────────────────────────────────────────────
// chrome.storage.local – Settings
// ─────────────────────────────────────────────

const SETTINGS_PREFIX = 'pv_setting_';

/**
 * Get a setting value, with optional default.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {Promise<*>}
 */
export async function getSetting(key, defaultValue = null) {
  const storageKey = SETTINGS_PREFIX + key;
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(storageKey, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        const value = result[storageKey];
        resolve(value !== undefined ? value : defaultValue);
      }
    });
  });
}

/**
 * Set a setting value.
 * @param {string} key
 * @param {*} value
 */
export async function setSetting(key, value) {
  const storageKey = SETTINGS_PREFIX + key;
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [storageKey]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}
