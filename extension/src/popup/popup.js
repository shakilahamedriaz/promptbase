/**
 * PromptVault Pro – popup.js
 * Full popup UI logic as an ES module.
 * Communicates with the background service worker via chrome.runtime.sendMessage.
 */

// ─────────────────────────────────────────────
// Messaging helpers
// ─────────────────────────────────────────────

function sendMsg(type, payload = null) {
  return new Promise((resolve, reject) => {
    const msg = payload !== null ? { type, payload } : { type };
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

let allPrompts = [];        // full list from storage
let filteredPrompts = [];   // currently displayed list
let favoritesOnly = false;
let editingPromptId = null; // null = new, string = editing
let pendingPasteText = '';  // text waiting to be pasted after variable fill
let toastTimer = null;

// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const dom = {
  platformBadge: $('platform-badge'),
  themeToggle: $('theme-toggle'),
  searchInput: $('search-input'),
  addBtn: $('add-btn'),
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  // Library
  categoryFilter: $('category-filter'),
  sortSelect: $('sort-select'),
  favFilter: $('fav-filter'),
  promptList: $('prompt-list'),
  emptyState: $('empty-state'),
  emptyAddBtn: $('empty-add-btn'),
  // History
  historyList: $('history-list'),
  historyEmpty: $('history-empty'),
  // Settings
  backendUrlInput: $('backend-url-input'),
  authTokenInput: $('auth-token-input'),
  autoSubmitToggle: $('auto-submit-toggle'),
  darkModeToggle: $('dark-mode-toggle'),
  saveSettingsBtn: $('save-settings-btn'),
  syncNowBtn: $('sync-now-btn'),
  settingsStatus: $('settings-status'),
  // Modal
  modal: $('modal'),
  modalTitle: $('modal-title'),
  modalClose: $('modal-close'),
  promptTitleInput: $('prompt-title'),
  promptBodyInput: $('prompt-body'),
  promptCategory: $('prompt-category'),
  promptTags: $('prompt-tags'),
  charCount: $('char-count'),
  modalCancel: $('modal-cancel'),
  modalSave: $('modal-save'),
  // Var modal
  varModal: $('var-modal'),
  varModalClose: $('var-modal-close'),
  varFields: $('var-fields'),
  varCancel: $('var-cancel'),
  varInsert: $('var-insert'),
  // Toast
  toast: $('toast'),
};

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  detectPlatform();
  await loadPrompts();
  bindEvents();
  listenForBackgroundMessages();
});

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────

async function loadTheme() {
  const res = await sendMsg('GET_SETTINGS').catch(() => ({ settings: { darkMode: true } }));
  const isDark = res?.settings?.darkMode !== false;
  applyTheme(isDark);
  dom.darkModeToggle.checked = isDark;
}

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  dom.themeToggle.textContent = isDark ? '☀' : '🌙';
}

async function toggleTheme() {
  const currentIsDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const newIsDark = !currentIsDark;
  applyTheme(newIsDark);
  dom.darkModeToggle.checked = newIsDark;
  await sendMsg('SET_SETTING', { key: 'dark_mode', value: newIsDark });
}

// ─────────────────────────────────────────────
// Platform Detection
// ─────────────────────────────────────────────

async function detectPlatform() {
  try {
    const tabs = await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tabs);
      });
    });

    const tab = tabs?.[0];
    if (!tab?.url) return;

    const url = tab.url;
    let platform = 'unknown';

    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) platform = 'ChatGPT';
    else if (url.includes('claude.ai')) platform = 'Claude';
    else if (url.includes('gemini.google.com')) platform = 'Gemini';
    else if (url.includes('perplexity.ai')) platform = 'Perplexity';
    else if (url.includes('grok.com') || url.includes('grok.x.com')) platform = 'Grok';
    else if (url.includes('copilot.microsoft.com')) platform = 'Copilot';

    if (platform !== 'unknown') {
      dom.platformBadge.textContent = platform;
    }
  } catch (err) {
    // Non-critical
    console.warn('[PV] Could not detect platform:', err.message);
  }
}

// ─────────────────────────────────────────────
// Prompts – Load & Render
// ─────────────────────────────────────────────

async function loadPrompts() {
  try {
    const res = await sendMsg('GET_PROMPTS');
    allPrompts = res?.prompts || [];
  } catch (err) {
    console.error('[PV] loadPrompts:', err);
    allPrompts = [];
  }
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  let list = [...allPrompts];

  // Search filter
  const query = dom.searchInput.value.trim().toLowerCase();
  if (query) {
    list = list.filter((p) => {
      const inTitle = p.title.toLowerCase().includes(query);
      const inBody = p.body.toLowerCase().includes(query);
      const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(query));
      return inTitle || inBody || inTags;
    });
  }

  // Category filter
  const cat = dom.categoryFilter.value;
  if (cat) {
    list = list.filter((p) => p.category === cat);
  }

  // Favorites filter
  if (favoritesOnly) {
    list = list.filter((p) => p.is_favorite);
  }

  // Sort
  const sort = dom.sortSelect.value;
  list = sortPrompts(list, sort);

  filteredPrompts = list;
  renderPrompts(list);
}

function sortPrompts(list, mode) {
  switch (mode) {
    case 'alpha':
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    case 'most_used':
      return [...list].sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
    case 'created':
      return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'updated':
    default:
      return [...list].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
}

function renderPrompts(prompts) {
  dom.promptList.innerHTML = '';

  if (prompts.length === 0) {
    dom.emptyState.classList.remove('hidden');
    return;
  }

  dom.emptyState.classList.add('hidden');

  for (const prompt of prompts) {
    const card = createPromptCard(prompt);
    dom.promptList.appendChild(card);
  }
}

function createPromptCard(prompt) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;

  const bodyPreview = (prompt.body || '').slice(0, 80) + ((prompt.body || '').length > 80 ? '…' : '');

  const tagsHtml = (prompt.tags || [])
    .slice(0, 3)
    .map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`)
    .join('');

  const favClass = prompt.is_favorite ? 'favorite active' : 'favorite';
  const favTitle = prompt.is_favorite ? 'Remove from favorites' : 'Add to favorites';

  card.innerHTML = `
    <div class="prompt-card-header">
      <span class="prompt-card-title" title="${escapeHtml(prompt.title)}">${escapeHtml(prompt.title || 'Untitled')}</span>
      <div class="prompt-card-actions">
        <button class="card-action-btn paste" title="Insert prompt" data-action="paste">↑</button>
        <button class="card-action-btn edit" title="Edit prompt" data-action="edit">✎</button>
        <button class="card-action-btn ${favClass}" title="${favTitle}" data-action="favorite">★</button>
        <button class="card-action-btn delete" title="Delete prompt" data-action="delete">✕</button>
      </div>
    </div>
    <div class="prompt-card-body">${escapeHtml(bodyPreview)}</div>
    <div class="prompt-card-footer">
      <div class="prompt-card-tags">${tagsHtml}</div>
      <span class="category-pill">${escapeHtml(prompt.category || 'general')}</span>
      <span class="use-count" title="Times used">${prompt.use_count || 0}×</span>
    </div>
  `;

  // Event delegation on buttons
  card.querySelectorAll('.card-action-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleCardAction(action, prompt);
    });
  });

  // Click card body to paste
  card.addEventListener('click', () => handleCardAction('paste', prompt));

  return card;
}

// ─────────────────────────────────────────────
// Card Actions
// ─────────────────────────────────────────────

async function handleCardAction(action, prompt) {
  switch (action) {
    case 'paste':
      await handlePaste(prompt);
      break;
    case 'edit':
      openEditModal(prompt);
      break;
    case 'favorite':
      await toggleFavorite(prompt);
      break;
    case 'delete':
      await handleDelete(prompt);
      break;
  }
}

async function handlePaste(prompt) {
  const variables = extractVariables(prompt.body);

  if (variables.length > 0) {
    openVarModal(prompt, variables);
  } else {
    await pasteToActiveTab(prompt, prompt.body);
  }
}

function extractVariables(text) {
  const regex = /\{\{([^}]+)\}\}/g;
  const found = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    found.add(match[1].trim());
  }
  return Array.from(found);
}

const AI_HOSTS = [
  'chat.openai.com', 'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'perplexity.ai',
  'grok.com', 'grok.x.com',
  'copilot.microsoft.com',
];

function isAiTab(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return AI_HOSTS.some((h) => host === h || host.endsWith('.' + h));
  } catch { return false; }
}

async function pasteToActiveTab(prompt, text) {
  // Get active tab
  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => resolve(t || []));
  });
  const tab = tabs?.[0];

  // If not on an AI page, skip injection and copy to clipboard silently
  if (!tab?.id || !isAiTab(tab.url)) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Open an AI site to paste directly.', 'info');
    } catch {
      showToast('Could not copy — open an AI site first.', 'error');
    }
    return;
  }

  // Try to inject into the AI page
  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'PASTE_PROMPT', text }, (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      });
    });

    await sendMsg('INCREMENT_USE_COUNT', { id: prompt.id });
    await sendMsg('LOG_HISTORY', {
      prompt_id: prompt.id,
      body_snapshot: text.slice(0, 500),
      platform: dom.platformBadge.textContent.toLowerCase() || 'unknown',
      was_refined: false,
    });
    await loadPrompts();
    showToast('Prompt inserted!', 'success');
  } catch {
    // Content script may not have loaded yet (page still loading) — fall back to clipboard
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Reload the AI page if the button is missing.', 'info');
    } catch {
      showToast('Could not insert prompt', 'error');
    }
  }
}

async function toggleFavorite(prompt) {
  const newFav = !prompt.is_favorite;
  try {
    await sendMsg('UPDATE_PROMPT', { id: prompt.id, changes: { is_favorite: newFav } });
    await loadPrompts();
    showToast(newFav ? 'Added to favorites' : 'Removed from favorites', 'success');
  } catch (err) {
    showToast('Failed to update favorite', 'error');
  }
}

async function handleDelete(prompt) {
  const confirmed = window.confirm(`Delete "${prompt.title || 'this prompt'}"?`);
  if (!confirmed) return;

  try {
    await sendMsg('DELETE_PROMPT', { id: prompt.id });
    await loadPrompts();
    showToast('Prompt deleted', 'success');
  } catch (err) {
    showToast('Failed to delete prompt', 'error');
  }
}

// ─────────────────────────────────────────────
// Add / Edit Modal
// ─────────────────────────────────────────────

function openAddModal() {
  editingPromptId = null;
  dom.modalTitle.textContent = 'New Prompt';
  dom.promptTitleInput.value = '';
  dom.promptBodyInput.value = '';
  dom.promptCategory.value = 'general';
  dom.promptTags.value = '';
  updateCharCount();
  dom.modal.classList.remove('hidden');
  dom.promptTitleInput.focus();
}

function openEditModal(prompt) {
  editingPromptId = prompt.id;
  dom.modalTitle.textContent = 'Edit Prompt';
  dom.promptTitleInput.value = prompt.title || '';
  dom.promptBodyInput.value = prompt.body || '';
  dom.promptCategory.value = prompt.category || 'general';
  dom.promptTags.value = (prompt.tags || []).join(', ');
  updateCharCount();
  dom.modal.classList.remove('hidden');
  dom.promptTitleInput.focus();
}

function closeModal() {
  dom.modal.classList.add('hidden');
  editingPromptId = null;
}

function updateCharCount() {
  const len = dom.promptBodyInput.value.length;
  dom.charCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
}

async function saveModal() {
  const title = dom.promptTitleInput.value.trim();
  const body = dom.promptBodyInput.value.trim();
  const category = dom.promptCategory.value;
  const tagsRaw = dom.promptTags.value;
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (!title) {
    showToast('Title is required', 'error');
    dom.promptTitleInput.focus();
    return;
  }
  if (!body) {
    showToast('Prompt body is required', 'error');
    dom.promptBodyInput.focus();
    return;
  }

  // Extract variable names from body
  const variables = extractVariables(body);

  try {
    if (editingPromptId) {
      await sendMsg('UPDATE_PROMPT', {
        id: editingPromptId,
        changes: { title, body, category, tags, variables },
      });
      showToast('Prompt updated', 'success');
    } else {
      await sendMsg('SAVE_PROMPT', { title, body, category, tags, variables });
      showToast('Prompt saved', 'success');
    }
    closeModal();
    await loadPrompts();
  } catch (err) {
    showToast('Failed to save prompt', 'error');
    console.error('[PV] saveModal:', err);
  }
}

// ─────────────────────────────────────────────
// Variable Modal
// ─────────────────────────────────────────────

function openVarModal(prompt, variables) {
  pendingPasteText = prompt.body;
  dom.varFields.innerHTML = '';

  for (const varName of variables) {
    const group = document.createElement('div');
    group.className = 'var-field-group';
    group.innerHTML = `
      <label for="var-input-${escapeHtml(varName)}">${escapeHtml(varName)}</label>
      <input
        type="text"
        id="var-input-${escapeHtml(varName)}"
        data-var="${escapeHtml(varName)}"
        placeholder="Enter ${escapeHtml(varName)}..."
        autocomplete="off"
      >
    `;
    dom.varFields.appendChild(group);
  }

  dom.varModal.classList.remove('hidden');
  const firstInput = dom.varFields.querySelector('input');
  if (firstInput) firstInput.focus();

  // Store prompt reference for logging after insert
  dom.varInsert.dataset.promptId = prompt.id;
}

function closeVarModal() {
  dom.varModal.classList.add('hidden');
  pendingPasteText = '';
  dom.varFields.innerHTML = '';
}

async function insertWithVariables() {
  const inputs = dom.varFields.querySelectorAll('input[data-var]');
  let text = pendingPasteText;

  for (const input of inputs) {
    const varName = input.dataset.var;
    const value = input.value; // Allow empty values
    const regex = new RegExp(`\\{\\{\\s*${escapeRegex(varName)}\\s*\\}\\}`, 'g');
    text = text.replace(regex, value);
  }

  const promptId = dom.varInsert.dataset.promptId || null;
  const mockPrompt = { id: promptId, body: text };

  closeVarModal();
  await pasteToActiveTab(mockPrompt, text);
}

// ─────────────────────────────────────────────
// History Tab
// ─────────────────────────────────────────────

async function loadHistory() {
  try {
    const res = await sendMsg('GET_HISTORY', { limit: 50, offset: 0 });
    const history = res?.history || [];
    renderHistory(history);
  } catch (err) {
    showToast('Failed to load history', 'error');
  }
}

function renderHistory(history) {
  dom.historyList.innerHTML = '';

  if (history.length === 0) {
    dom.historyEmpty.classList.remove('hidden');
    return;
  }

  dom.historyEmpty.classList.add('hidden');

  for (const entry of history) {
    const card = createHistoryCard(entry);
    dom.historyList.appendChild(card);
  }
}

function createHistoryCard(entry) {
  const card = document.createElement('div');
  card.className = 'history-card';

  const timeStr = formatRelativeTime(entry.used_at);
  const bodyPreview = (entry.body_snapshot || '').slice(0, 100) + ((entry.body_snapshot || '').length > 100 ? '…' : '');

  card.innerHTML = `
    <div class="history-card-meta">
      <span class="history-platform">${escapeHtml(entry.platform || 'unknown')}</span>
      <span class="history-time">${timeStr}</span>
    </div>
    <div class="history-body">${escapeHtml(bodyPreview)}</div>
    <button class="history-reuse-btn" title="Re-use this prompt">↑ Re-use</button>
  `;

  card.querySelector('.history-reuse-btn').addEventListener('click', async () => {
    const text = entry.body_snapshot || '';
    if (!text) return;
    const variables = extractVariables(text);
    const mockPrompt = { id: entry.prompt_id, body: text };
    if (variables.length > 0) {
      openVarModal(mockPrompt, variables);
    } else {
      await pasteToActiveTab(mockPrompt, text);
    }
  });

  return card;
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────

async function loadSettings() {
  try {
    const res = await sendMsg('GET_SETTINGS');
    const s = res?.settings || {};
    dom.backendUrlInput.value = s.backendUrl || 'http://localhost:8000';
    dom.authTokenInput.value = s.authToken || '';
    dom.autoSubmitToggle.checked = Boolean(s.autoSubmit);
    dom.darkModeToggle.checked = s.darkMode !== false;
  } catch (err) {
    console.warn('[PV] loadSettings error:', err);
  }
}

async function saveSettings() {
  try {
    const backendUrl = dom.backendUrlInput.value.trim() || 'http://localhost:8000';
    const authToken = dom.authTokenInput.value.trim();
    const autoSubmit = dom.autoSubmitToggle.checked;
    const darkMode = dom.darkModeToggle.checked;

    await Promise.all([
      sendMsg('SET_SETTING', { key: 'BACKEND_URL', value: backendUrl }),
      sendMsg('SET_SETTING', { key: 'auth_token', value: authToken }),
      sendMsg('SET_SETTING', { key: 'auto_submit', value: autoSubmit }),
      sendMsg('SET_SETTING', { key: 'dark_mode', value: darkMode }),
    ]);

    applyTheme(darkMode);
    setSettingsStatus('Settings saved!', 'success');
    showToast('Settings saved', 'success');
  } catch (err) {
    setSettingsStatus('Failed to save settings', 'error');
    showToast('Failed to save settings', 'error');
  }
}

function setSettingsStatus(msg, type) {
  dom.settingsStatus.textContent = msg;
  dom.settingsStatus.className = type;
  setTimeout(() => {
    dom.settingsStatus.textContent = '';
    dom.settingsStatus.className = '';
  }, 3000);
}

// ─────────────────────────────────────────────
// Search (debounced)
// ─────────────────────────────────────────────

let searchDebounceTimer = null;

function onSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    applyFiltersAndRender();
  }, 50);
}

// ─────────────────────────────────────────────
// Tab Switching
// ─────────────────────────────────────────────

function switchTab(tabName) {
  dom.tabs.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  dom.tabContents.forEach((content) => {
    const isActive = content.id === `tab-${tabName}`;
    content.classList.toggle('active', isActive);
    content.classList.toggle('hidden', !isActive);
  });

  if (tabName === 'history') loadHistory();
  if (tabName === 'settings') loadSettings();
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────

function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.className = `toast toast-${type}`;
  dom.toast.classList.remove('hidden', 'toast-fade-out');

  toastTimer = setTimeout(() => {
    dom.toast.classList.add('toast-fade-out');
    setTimeout(() => {
      dom.toast.classList.add('hidden');
      dom.toast.classList.remove('toast-fade-out');
    }, 300);
  }, 2500);
}

// ─────────────────────────────────────────────
// Background Message Listener
// ─────────────────────────────────────────────

function listenForBackgroundMessages() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_STATUS') {
      switch (message.status) {
        case 'success':
          showToast('Synced successfully', 'success');
          break;
        case 'offline':
          showToast('Offline – sync paused', 'info');
          break;
        case 'auth_error':
          showToast('Auth error – check token', 'error');
          break;
      }
    }
  });
}

// ─────────────────────────────────────────────
// Event Bindings
// ─────────────────────────────────────────────

function bindEvents() {
  // Theme
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Search
  dom.searchInput.addEventListener('input', onSearchInput);

  // Add button
  dom.addBtn.addEventListener('click', openAddModal);
  dom.emptyAddBtn?.addEventListener('click', openAddModal);

  // Tabs
  dom.tabs.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Category / sort filters
  dom.categoryFilter.addEventListener('change', applyFiltersAndRender);
  dom.sortSelect.addEventListener('change', applyFiltersAndRender);

  // Favorites filter toggle
  dom.favFilter.addEventListener('click', () => {
    favoritesOnly = !favoritesOnly;
    dom.favFilter.classList.toggle('active', favoritesOnly);
    applyFiltersAndRender();
  });

  // Modal
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSave.addEventListener('click', saveModal);
  dom.promptBodyInput.addEventListener('input', updateCharCount);

  // Close modal on overlay click
  dom.modal.addEventListener('click', (e) => {
    if (e.target === dom.modal) closeModal();
  });

  // Var modal
  dom.varModalClose.addEventListener('click', closeVarModal);
  dom.varCancel.addEventListener('click', closeVarModal);
  dom.varInsert.addEventListener('click', insertWithVariables);

  dom.varModal.addEventListener('click', (e) => {
    if (e.target === dom.varModal) closeVarModal();
  });

  // Keyboard shortcuts in var modal
  dom.varModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertWithVariables();
    }
    if (e.key === 'Escape') closeVarModal();
  });

  // Modal keyboard
  dom.modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.ctrlKey) saveModal();
  });

  // Settings
  dom.saveSettingsBtn.addEventListener('click', saveSettings);
  dom.syncNowBtn.addEventListener('click', async () => {
    dom.syncNowBtn.disabled = true;
    dom.syncNowBtn.textContent = 'Syncing…';
    try {
      await sendMsg('TRIGGER_SYNC');
      showToast('Sync triggered', 'info');
    } catch (err) {
      showToast('Sync failed', 'error');
    } finally {
      dom.syncNowBtn.disabled = false;
      dom.syncNowBtn.textContent = 'Sync Now';
    }
  });
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
