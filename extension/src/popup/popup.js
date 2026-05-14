/** PromptVault Pro – popup.js */

// ─── Messaging ────────────────────────────────────────────────────────────────

function sendMsg(type, payload = null) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      payload !== null ? { type, payload } : { type },
      (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      }
    );
  });
}

// ─── State ────────────────────────────────────────────────────────────────────

let allPrompts     = [];
let favoritesOnly  = false;
let editingId      = null;
let pendingPaste   = '';
let toastTimer     = null;
let refineStyle    = 'professional';
let currentTab     = 'library';
let isDark         = false;

// ─── DOM ─────────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const dom = {
  // Header
  themeToggle:    $('theme-toggle'),
  themeIconLight: $('theme-icon-light'),
  themeIconDark:  $('theme-icon-dark'),
  platformChip:   $('platform-chip'),
  // Search
  searchRow:      $('search-row'),
  searchInput:    $('search-input'),
  addBtn:         $('add-btn'),
  // Tabs
  tabs:           document.querySelectorAll('.tab'),
  tabContents:    document.querySelectorAll('.tab-content'),
  // Library
  categoryFilter: $('category-filter'),
  sortSelect:     $('sort-select'),
  favFilter:      $('fav-filter'),
  promptList:     $('prompt-list'),
  emptyState:     $('empty-state'),
  templateGrid:   $('template-grid'),
  emptyAddBtn:    $('empty-add-btn'),
  // History
  historyList:    $('history-list'),
  historyEmpty:   $('history-empty'),
  // Refine
  refineInput:    $('refine-input'),
  refineGrabBtn:  $('refine-grab-btn'),
  btnRefine:      $('btn-refine'),
  styleChips:     document.querySelectorAll('.style-chip'),
  customWrap:     $('custom-instruction-wrap'),
  customInstr:    $('custom-instruction'),
  refineResult:   $('refine-result'),
  scoreBefore:    $('score-before'),
  scoreAfter:     $('score-after'),
  scoreDelta:     $('score-delta'),
  refineExp:      $('refine-explanation'),
  diffBefore:     $('diff-before'),
  diffAfter:      $('diff-after'),
  refineOutput:   $('refine-output'),
  refineCopyBtn:  $('refine-copy-btn'),
  refineInsertBtn:$('refine-insert-btn'),
  refineSaveBtn:  $('refine-save-btn'),
  // Settings
  userCard:       $('user-card'),
  userAvatar:     $('user-avatar'),
  userEmail:      $('user-email'),
  signOutBtn:     $('sign-out-btn'),
  signInCta:      $('sign-in-cta'),
  signInBtn:      $('sign-in-btn'),
  darkModeToggle: $('dark-mode-toggle'),
  autoSubmitToggle:$('auto-submit-toggle'),
  syncNowBtn:     $('sync-now-btn'),
  advancedToggle: $('advanced-toggle'),
  advancedBody:   $('advanced-body'),
  backendUrlInput:$('backend-url-input'),
  saveBackendBtn: $('save-backend-btn'),
  // Modal
  modal:          $('modal'),
  modalTitle:     $('modal-title'),
  modalClose:     $('modal-close'),
  promptTitle:    $('prompt-title'),
  promptBody:     $('prompt-body'),
  promptCategory: $('prompt-category'),
  promptTags:     $('prompt-tags'),
  charCount:      $('char-count'),
  modalCancel:    $('modal-cancel'),
  modalSave:      $('modal-save'),
  // Var modal
  varModal:       $('var-modal'),
  varModalClose:  $('var-modal-close'),
  varFields:      $('var-fields'),
  varCancel:      $('var-cancel'),
  varInsert:      $('var-insert'),
  // Toast
  toast:          $('toast'),
};

// ─── Templates (empty state) ──────────────────────────────────────────────────

const STARTER_TEMPLATES = [
  {
    icon: '✍️',
    name: 'Blog outline',
    body: 'Write a detailed outline for a blog post about {{topic}} targeting {{audience}}. Include an introduction, 5 main sections with subpoints, and a conclusion.',
    category: 'writing',
    tags: ['writing', 'blog'],
  },
  {
    icon: '🐛',
    name: 'Debug code',
    body: 'You are a senior {{language}} developer. Review the following code, identify all bugs and issues, explain each problem clearly, and provide a corrected version:\n\n{{code}}',
    category: 'coding',
    tags: ['coding', 'debug'],
  },
  {
    icon: '📧',
    name: 'Professional email',
    body: 'Write a professional email to {{recipient}} about {{subject}}. Tone: {{tone}}. Keep it under 150 words with a clear call to action.',
    category: 'writing',
    tags: ['email', 'professional'],
  },
  {
    icon: '🔍',
    name: 'Explain concept',
    body: 'Explain {{concept}} to a {{audience}} using simple language and 2–3 relatable analogies. Avoid jargon. End with a one-sentence summary.',
    category: 'general',
    tags: ['explain', 'education'],
  },
];

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  detectPlatform();
  renderTemplateCards();
  await loadPrompts();
  bindEvents();
  listenForBackgroundMessages();
});

// ─── Theme / Dark Mode ────────────────────────────────────────────────────────

async function loadTheme() {
  try {
    const res = await sendMsg('GET_SETTINGS');
    isDark = res?.settings?.darkMode === true;
  } catch {
    isDark = false;
  }
  applyTheme(isDark);
}

function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  dom.themeIconLight.classList.toggle('hidden', dark);
  dom.themeIconDark.classList.toggle('hidden', !dark);
  if (dom.darkModeToggle) dom.darkModeToggle.checked = dark;
}

async function toggleTheme() {
  applyTheme(!isDark);
  await sendMsg('SET_SETTING', { key: 'dark_mode', value: isDark }).catch(() => {});
}

// ─── Platform Detection ───────────────────────────────────────────────────────

async function detectPlatform() {
  try {
    const tabs = await new Promise((res, rej) =>
      chrome.tabs.query({ active: true, currentWindow: true }, (t) =>
        chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res(t)
      )
    );
    const url = tabs?.[0]?.url || '';
    const map = [
      [['chat.openai.com', 'chatgpt.com'], 'ChatGPT'],
      [['claude.ai'], 'Claude'],
      [['gemini.google.com'], 'Gemini'],
      [['perplexity.ai'], 'Perplexity'],
      [['grok.com', 'grok.x.com'], 'Grok'],
      [['copilot.microsoft.com'], 'Copilot'],
    ];
    for (const [hosts, name] of map) {
      if (hosts.some((h) => url.includes(h))) {
        dom.platformChip.textContent = name;
        dom.platformChip.classList.remove('hidden');
        break;
      }
    }
  } catch { /* non-critical */ }
}

// ─── Library ──────────────────────────────────────────────────────────────────

async function loadPrompts() {
  try {
    const res = await sendMsg('GET_PROMPTS');
    allPrompts = res?.prompts || [];
  } catch { allPrompts = []; }
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  let list = [...allPrompts];
  const q = dom.searchInput.value.trim().toLowerCase();
  if (q) {
    list = list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }
  const cat = dom.categoryFilter.value;
  if (cat) list = list.filter((p) => p.category === cat);
  if (favoritesOnly) list = list.filter((p) => p.is_favorite);

  const sort = dom.sortSelect.value;
  list = list.slice().sort((a, b) => {
    if (sort === 'alpha')     return a.title.localeCompare(b.title);
    if (sort === 'most_used') return (b.use_count || 0) - (a.use_count || 0);
    if (sort === 'created')   return new Date(b.created_at) - new Date(a.created_at);
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  renderPrompts(list);
}

function renderPrompts(prompts) {
  dom.promptList.innerHTML = '';
  if (prompts.length === 0) {
    dom.emptyState.classList.remove('hidden');
    return;
  }
  dom.emptyState.classList.add('hidden');
  for (const p of prompts) dom.promptList.appendChild(createPromptCard(p));
}

function renderTemplateCards() {
  dom.templateGrid.innerHTML = '';
  for (const t of STARTER_TEMPLATES) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-card-icon">${t.icon}</div>
      <div class="template-card-name">${escHtml(t.name)}</div>
      <div class="template-card-preview">${escHtml(t.body.replace(/\{\{[^}]+\}\}/g, '…'))}</div>
      <div class="template-card-tag">${escHtml(t.category)}</div>
    `;
    card.addEventListener('click', () => addTemplatePrompt(t));
    dom.templateGrid.appendChild(card);
  }
}

async function addTemplatePrompt(template) {
  try {
    await sendMsg('SAVE_PROMPT', {
      title: template.name,
      body: template.body,
      category: template.category,
      tags: template.tags,
      variables: extractVariables(template.body),
    });
    await loadPrompts();
    showToast(`"${template.name}" added to Library`, 'success');
  } catch {
    showToast('Failed to add template', 'error');
  }
}

function createPromptCard(prompt) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;

  const preview = (prompt.body || '').slice(0, 80) + ((prompt.body || '').length > 80 ? '…' : '');
  const tagsHtml = (prompt.tags || []).slice(0, 3)
    .map((t) => `<span class="tag-pill">${escHtml(t)}</span>`).join('');
  const isFav = prompt.is_favorite;

  card.innerHTML = `
    <div class="prompt-card-header">
      <span class="prompt-card-title" title="${escHtml(prompt.title)}">${escHtml(prompt.title || 'Untitled')}</span>
      <div class="prompt-card-actions">
        <button class="card-action-btn paste" title="Insert (↵)" data-action="paste">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M3 10h14M10 3l7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="card-action-btn edit" title="Edit" data-action="edit">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M13 3l4 4L7 17H3v-4L13 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
        <button class="card-action-btn favorite ${isFav ? 'active' : ''}" title="${isFav ? 'Unfavorite' : 'Favorite'}" data-action="favorite">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="${isFav ? 'currentColor' : 'none'}"><path d="M10 2l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 14.27l-4.77 2.51.91-5.32L2.27 7.62l5.34-.78L10 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        </button>
        <button class="card-action-btn delete" title="Delete" data-action="delete">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M4 7h12M8 7V5h4v2M9 10v5M11 10v5M6 7l1 10h6l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
    <div class="prompt-card-body">${escHtml(preview)}</div>
    <div class="prompt-card-footer">
      <div class="prompt-card-tags">${tagsHtml}</div>
      <span class="category-pill">${escHtml(prompt.category || 'general')}</span>
      <span class="use-count">${prompt.use_count || 0}×</span>
    </div>`;

  card.querySelectorAll('.card-action-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); handleCardAction(btn.dataset.action, prompt); });
  });
  card.addEventListener('click', () => handleCardAction('paste', prompt));
  return card;
}

// ─── Card Actions ─────────────────────────────────────────────────────────────

async function handleCardAction(action, prompt) {
  if (action === 'paste')    await handlePaste(prompt);
  if (action === 'edit')     openEditModal(prompt);
  if (action === 'favorite') await toggleFavorite(prompt);
  if (action === 'delete')   await handleDelete(prompt);
}

async function handlePaste(prompt) {
  const vars = extractVariables(prompt.body);
  vars.length ? openVarModal(prompt, vars) : await pasteToTab(prompt, prompt.body);
}

const AI_HOSTS = ['chat.openai.com','chatgpt.com','claude.ai','gemini.google.com','perplexity.ai','grok.com','grok.x.com','copilot.microsoft.com'];

function isAiTab(url) {
  try { const h = new URL(url).hostname; return AI_HOSTS.some((a) => h === a || h.endsWith('.' + a)); }
  catch { return false; }
}

async function pasteToTab(prompt, text) {
  const tabs = await new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, (t) => r(t || [])));
  const tab = tabs?.[0];

  if (!tab?.id || !isAiTab(tab.url)) {
    try { await navigator.clipboard.writeText(text); showToast('Copied! Open an AI site to paste.', 'info'); }
    catch { showToast('Open an AI site first.', 'error'); }
    return;
  }
  try {
    await new Promise((res, rej) =>
      chrome.tabs.sendMessage(tab.id, { type: 'PASTE_PROMPT', text }, (r) =>
        chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res(r)
      )
    );
    await sendMsg('INCREMENT_USE_COUNT', { id: prompt.id });
    await sendMsg('LOG_HISTORY', {
      prompt_id: prompt.id,
      body_snapshot: text.slice(0, 500),
      platform: dom.platformChip.textContent.toLowerCase() || 'unknown',
      was_refined: false,
    });
    await loadPrompts();
    showToast('Prompt inserted!', 'success');
  } catch {
    try { await navigator.clipboard.writeText(text); showToast('Copied! Reload the AI page if needed.', 'info'); }
    catch { showToast('Could not insert prompt.', 'error'); }
  }
}

async function toggleFavorite(prompt) {
  try {
    await sendMsg('UPDATE_PROMPT', { id: prompt.id, changes: { is_favorite: !prompt.is_favorite } });
    await loadPrompts();
    showToast(prompt.is_favorite ? 'Removed from favorites' : 'Added to favorites', 'success');
  } catch { showToast('Failed to update', 'error'); }
}

async function handleDelete(prompt) {
  if (!window.confirm(`Delete "${prompt.title || 'this prompt'}"?`)) return;
  try {
    await sendMsg('DELETE_PROMPT', { id: prompt.id });
    await loadPrompts();
    showToast('Deleted', 'success');
  } catch { showToast('Failed to delete', 'error'); }
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function openAddModal() {
  editingId = null;
  dom.modalTitle.textContent = 'New Prompt';
  dom.promptTitle.value = '';
  dom.promptBody.value = '';
  dom.promptCategory.value = 'general';
  dom.promptTags.value = '';
  updateCharCount();
  dom.modal.classList.remove('hidden');
  dom.promptTitle.focus();
}

function openEditModal(prompt) {
  editingId = prompt.id;
  dom.modalTitle.textContent = 'Edit Prompt';
  dom.promptTitle.value = prompt.title || '';
  dom.promptBody.value = prompt.body || '';
  dom.promptCategory.value = prompt.category || 'general';
  dom.promptTags.value = (prompt.tags || []).join(', ');
  updateCharCount();
  dom.modal.classList.remove('hidden');
  dom.promptTitle.focus();
}

function closeModal() { dom.modal.classList.add('hidden'); editingId = null; }

function updateCharCount() {
  const len = dom.promptBody.value.length;
  dom.charCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
}

async function saveModal() {
  const title = dom.promptTitle.value.trim();
  const body  = dom.promptBody.value.trim();
  const category = dom.promptCategory.value;
  const tags  = dom.promptTags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

  if (!title) { showToast('Title required', 'error'); dom.promptTitle.focus(); return; }
  if (!body)  { showToast('Prompt body required', 'error'); dom.promptBody.focus(); return; }

  try {
    if (editingId) {
      await sendMsg('UPDATE_PROMPT', { id: editingId, changes: { title, body, category, tags, variables: extractVariables(body) } });
      showToast('Prompt updated', 'success');
    } else {
      await sendMsg('SAVE_PROMPT', { title, body, category, tags, variables: extractVariables(body) });
      showToast('Prompt saved', 'success');
    }
    closeModal();
    await loadPrompts();
  } catch { showToast('Failed to save', 'error'); }
}

// ─── Variable Modal ───────────────────────────────────────────────────────────

function openVarModal(prompt, variables) {
  pendingPaste = prompt.body;
  dom.varFields.innerHTML = '';
  for (const v of variables) {
    const g = document.createElement('div');
    g.className = 'var-field-group';
    g.innerHTML = `
      <label for="vi-${escHtml(v)}">${escHtml(v)}</label>
      <input type="text" id="vi-${escHtml(v)}" data-var="${escHtml(v)}" placeholder="${escHtml(v)}…" autocomplete="off">`;
    dom.varFields.appendChild(g);
  }
  dom.varInsert.dataset.promptId = prompt.id;
  dom.varModal.classList.remove('hidden');
  dom.varFields.querySelector('input')?.focus();
}

function closeVarModal() {
  dom.varModal.classList.add('hidden');
  pendingPaste = '';
  dom.varFields.innerHTML = '';
}

async function insertWithVariables() {
  let text = pendingPaste;
  for (const input of dom.varFields.querySelectorAll('input[data-var]')) {
    text = text.replace(new RegExp(`\\{\\{\\s*${escReg(input.dataset.var)}\\s*\\}\\}`, 'g'), input.value);
  }
  closeVarModal();
  await pasteToTab({ id: dom.varInsert.dataset.promptId || null, body: text }, text);
}

// ─── Refine Tab ───────────────────────────────────────────────────────────────

async function grabFromPage() {
  const tabs = await new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, (t) => r(t || [])));
  const tab = tabs?.[0];
  if (!tab?.id || !isAiTab(tab.url)) { showToast('Navigate to an AI page first', 'info'); return; }
  try {
    const res = await new Promise((res, rej) =>
      chrome.tabs.sendMessage(tab.id, { type: 'GET_INPUT_TEXT' }, (r) =>
        chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res(r)
      )
    );
    const text = res?.text?.trim();
    if (text) { dom.refineInput.value = text; showToast('Grabbed from page!', 'success'); }
    else showToast('No text found in the AI input', 'info');
  } catch { showToast('Could not grab — reload the AI page', 'error'); }
}

async function handleRefine() {
  const text = dom.refineInput.value.trim();
  if (!text) { showToast('Enter a prompt to refine', 'error'); dom.refineInput.focus(); return; }

  setRefineLoading(true);
  dom.refineResult.classList.remove('visible');

  try {
    const payload = { text, style: refineStyle === 'custom' ? 'professional' : refineStyle };
    if (refineStyle === 'custom' && dom.customInstr.value.trim()) {
      payload.custom_instruction = dom.customInstr.value.trim();
    }
    const res = await sendMsg('REFINE_PROMPT', payload);

    if (res?.error) { showToast(res.error, 'error'); return; }

    // Scores
    const before = res.score_before ?? null;
    const after  = res.score_after  ?? null;
    dom.scoreBefore.textContent = before !== null ? String(before) : '—';
    dom.scoreAfter.textContent  = after  !== null ? String(after)  : '—';
    if (before !== null && after !== null) {
      const d = after - before;
      dom.scoreDelta.textContent = (d >= 0 ? '+' : '') + d + ' pts';
      dom.scoreDelta.className = `score-delta ${d > 0 ? 'positive' : d < 0 ? 'negative' : 'neutral'}`;
    } else { dom.scoreDelta.textContent = ''; }

    // Explanation
    dom.refineExp.textContent = res.explanation || '';
    dom.refineExp.style.display = res.explanation ? '' : 'none';

    // Diff
    renderDiff(text, res.refined || '');

    // Full output
    dom.refineOutput.textContent = res.refined || '';
    dom.refineResult.classList.add('visible');
  } catch { showToast('Refinement failed. Check connection.', 'error'); }
  finally { setRefineLoading(false); }
}

function setRefineLoading(on) {
  dom.btnRefine.disabled = on;
  dom.btnRefine.querySelector('.btn-label').textContent = on ? 'Refining…' : 'Refine with AI';
  dom.btnRefine.querySelector('.spinner').classList.toggle('hidden', !on);
  dom.btnRefine.querySelector('.btn-icon').classList.toggle('hidden', on);
}

// Word-level diff using LCS
function computeWordDiff(a, b) {
  const tokA = a.match(/\S+|\s+/g) || [];
  const tokB = b.match(/\S+|\s+/g) || [];
  const m = tokA.length, n = tokB.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = tokA[i-1] === tokB[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokA[i-1] === tokB[j-1]) {
      ops.unshift({ t: tokA[i-1], op: '=' }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.unshift({ t: tokB[j-1], op: '+' }); j--;
    } else {
      ops.unshift({ t: tokA[i-1], op: '-' }); i--;
    }
  }
  return ops;
}

function renderDiff(before, after) {
  const ops = computeWordDiff(before, after);
  let leftHtml = '', rightHtml = '';
  for (const { t, op } of ops) {
    const safe = escHtml(t);
    if (op === '=') { leftHtml += safe; rightHtml += safe; }
    else if (op === '-') leftHtml += `<span class="diff-del">${safe}</span>`;
    else rightHtml += `<span class="diff-add">${safe}</span>`;
  }
  dom.diffBefore.innerHTML = leftHtml;
  dom.diffAfter.innerHTML  = rightHtml;
}

async function refineInsert() {
  const text = dom.refineOutput.textContent;
  if (!text) return;
  await pasteToTab({ id: null, body: text }, text);
}

async function refineSave() {
  const text = dom.refineOutput.textContent;
  if (!text) return;
  try {
    await sendMsg('SAVE_PROMPT', {
      title: `Refined: ${dom.refineInput.value.trim().slice(0, 55)}`,
      body: text,
      category: 'general',
      tags: ['refined', refineStyle],
    });
    showToast('Saved to Library!', 'success');
  } catch { showToast('Failed to save', 'error'); }
}

// ─── History ──────────────────────────────────────────────────────────────────

async function loadHistory() {
  try {
    const res = await sendMsg('GET_HISTORY', { limit: 50, offset: 0 });
    renderHistory(res?.history || []);
  } catch { showToast('Failed to load history', 'error'); }
}

function renderHistory(history) {
  dom.historyList.innerHTML = '';
  if (!history.length) { dom.historyEmpty.classList.remove('hidden'); return; }
  dom.historyEmpty.classList.add('hidden');
  for (const e of history) dom.historyList.appendChild(createHistoryCard(e));
}

function createHistoryCard(entry) {
  const card = document.createElement('div');
  card.className = 'history-card';
  const preview = (entry.body_snapshot || '').slice(0, 100) + ((entry.body_snapshot || '').length > 100 ? '…' : '');
  card.innerHTML = `
    <div class="history-card-meta">
      <span class="history-platform">${escHtml(entry.platform || 'unknown')}</span>
      ${entry.was_refined ? '<span class="refined-badge">✦ Refined</span>' : ''}
      <span class="history-time">${relativeTime(entry.used_at)}</span>
    </div>
    <div class="history-body">${escHtml(preview)}</div>
    <button class="history-reuse-btn">Re-use</button>`;
  card.querySelector('.history-reuse-btn').addEventListener('click', async () => {
    const text = entry.body_snapshot || '';
    const vars = extractVariables(text);
    const mock = { id: entry.prompt_id, body: text };
    vars.length ? openVarModal(mock, vars) : await pasteToTab(mock, text);
  });
  return card;
}

function relativeTime(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  try {
    const res = await sendMsg('GET_SETTINGS');
    const s = res?.settings || {};
    dom.backendUrlInput.value   = s.backendUrl || 'http://localhost:8000';
    dom.autoSubmitToggle.checked = Boolean(s.autoSubmit);
    dom.darkModeToggle.checked   = Boolean(s.darkMode);
    await checkAuthStatus(s);
  } catch { /* ignore */ }
}

async function checkAuthStatus(settings) {
  const token = settings?.authToken;
  if (!token) { showSignedOut(); return; }
  try {
    const backendUrl = settings?.backendUrl || 'http://localhost:8000';
    const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      const user = await resp.json();
      showSignedIn(user.email || user.full_name || 'User');
    } else {
      showSignedOut();
    }
  } catch { showSignedOut(); }
}

function showSignedIn(email) {
  dom.userCard.classList.remove('hidden');
  dom.signInCta.classList.add('hidden');
  dom.userEmail.textContent = email;
  const initials = email.split('@')[0].slice(0, 2).toUpperCase();
  dom.userAvatar.textContent = initials;
}

function showSignedOut() {
  dom.userCard.classList.add('hidden');
  dom.signInCta.classList.remove('hidden');
}

async function handleSignOut() {
  await sendMsg('SET_SETTING', { key: 'auth_token', value: '' }).catch(() => {});
  showSignedOut();
  showToast('Signed out', 'info');
}

function handleSignIn() {
  chrome.tabs.create({ url: 'http://localhost:5173' });
}

async function autoSaveSetting(key, value) {
  await sendMsg('SET_SETTING', { key, value }).catch(() => {});
}

// ─── Tab Switching ────────────────────────────────────────────────────────────

const SEARCH_TABS = new Set(['library', 'history']);

function switchTab(name) {
  currentTab = name;
  dom.tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  dom.tabContents.forEach((c) => {
    const active = c.id === `tab-${name}`;
    c.classList.toggle('active', active);
    c.classList.toggle('hidden', !active);
  });
  dom.searchRow.classList.toggle('hidden-row', !SEARCH_TABS.has(name));
  if (name === 'history') loadHistory();
  if (name === 'settings') loadSettings();
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Ctrl+1–4 → switch tab
    if (e.ctrlKey && !e.shiftKey && !e.altKey && ['1','2','3','4'].includes(e.key)) {
      e.preventDefault();
      const tabs = ['library','refine','history','settings'];
      switchTab(tabs[Number(e.key) - 1]);
      return;
    }

    // Ctrl+Enter → refine
    if (e.ctrlKey && e.key === 'Enter' && currentTab === 'refine') {
      e.preventDefault();
      if (!dom.btnRefine.disabled) handleRefine();
      return;
    }

    // Escape → close modals
    if (e.key === 'Escape') {
      if (!dom.modal.classList.contains('hidden'))    { closeModal(); return; }
      if (!dom.varModal.classList.contains('hidden')) { closeVarModal(); return; }
    }

    if (inInput) return;

    // / → focus search
    if (e.key === '/' && SEARCH_TABS.has(currentTab)) {
      e.preventDefault();
      dom.searchInput.focus();
      dom.searchInput.select();
      return;
    }

    // N → new prompt
    if ((e.key === 'n' || e.key === 'N') && currentTab === 'library') {
      e.preventDefault();
      openAddModal();
    }
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  dom.toast.textContent = msg;
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

// ─── Background Messages ──────────────────────────────────────────────────────

function listenForBackgroundMessages() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SYNC_STATUS') {
      if (msg.status === 'success')    showToast('Synced', 'success');
      if (msg.status === 'offline')    showToast('Offline – sync paused', 'info');
      if (msg.status === 'auth_error') showToast('Session expired – please re-login', 'error');
    }
  });
}

// ─── Event Bindings ───────────────────────────────────────────────────────────

let searchTimer = null;

function bindEvents() {
  // Header
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Search
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFiltersAndRender, 50);
  });

  // Add
  dom.addBtn.addEventListener('click', openAddModal);
  dom.emptyAddBtn.addEventListener('click', openAddModal);

  // Tabs
  dom.tabs.forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // Filters
  dom.categoryFilter.addEventListener('change', applyFiltersAndRender);
  dom.sortSelect.addEventListener('change', applyFiltersAndRender);
  dom.favFilter.addEventListener('click', () => {
    favoritesOnly = !favoritesOnly;
    dom.favFilter.classList.toggle('active', favoritesOnly);
    applyFiltersAndRender();
  });

  // Refine
  dom.styleChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      dom.styleChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      refineStyle = chip.dataset.style;
      dom.customWrap.classList.toggle('visible', refineStyle === 'custom');
    });
  });
  dom.refineGrabBtn.addEventListener('click', grabFromPage);
  dom.btnRefine.addEventListener('click', handleRefine);
  dom.refineCopyBtn.addEventListener('click', () => {
    const text = dom.refineOutput.textContent;
    if (text) navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
  });
  dom.refineInsertBtn.addEventListener('click', refineInsert);
  dom.refineSaveBtn.addEventListener('click', refineSave);

  // Settings auto-save
  dom.darkModeToggle.addEventListener('change', async () => {
    applyTheme(dom.darkModeToggle.checked);
    await autoSaveSetting('dark_mode', dom.darkModeToggle.checked);
  });
  dom.autoSubmitToggle.addEventListener('change', async () => {
    await autoSaveSetting('auto_submit', dom.autoSubmitToggle.checked);
  });

  // Settings actions
  dom.signInBtn.addEventListener('click', handleSignIn);
  dom.signOutBtn.addEventListener('click', handleSignOut);

  dom.advancedToggle.addEventListener('click', () => {
    const open = dom.advancedBody.classList.toggle('visible');
    dom.advancedToggle.classList.toggle('open', open);
  });

  dom.saveBackendBtn.addEventListener('click', async () => {
    const url = dom.backendUrlInput.value.trim() || 'http://localhost:8000';
    await autoSaveSetting('BACKEND_URL', url);
    showToast('Backend URL saved', 'success');
  });

  dom.syncNowBtn.addEventListener('click', async () => {
    dom.syncNowBtn.disabled = true;
    dom.syncNowBtn.textContent = 'Syncing…';
    try { await sendMsg('TRIGGER_SYNC'); showToast('Sync triggered', 'info'); }
    catch { showToast('Sync failed', 'error'); }
    finally { dom.syncNowBtn.disabled = false; dom.syncNowBtn.textContent = 'Sync now'; }
  });

  // Modal
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalCancel.addEventListener('click', closeModal);
  dom.modalSave.addEventListener('click', saveModal);
  dom.promptBody.addEventListener('input', updateCharCount);
  dom.modal.addEventListener('click', (e) => { if (e.target === dom.modal) closeModal(); });
  dom.modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.ctrlKey) saveModal();
  });

  // Var modal
  dom.varModalClose.addEventListener('click', closeVarModal);
  dom.varCancel.addEventListener('click', closeVarModal);
  dom.varInsert.addEventListener('click', insertWithVariables);
  dom.varModal.addEventListener('click', (e) => { if (e.target === dom.varModal) closeVarModal(); });
  dom.varModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); insertWithVariables(); }
    if (e.key === 'Escape') closeVarModal();
  });

  // Global shortcuts
  bindKeyboardShortcuts();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function extractVariables(text) {
  const found = new Set();
  let m;
  const re = /\{\{([^}]+)\}\}/g;
  while ((m = re.exec(text)) !== null) found.add(m[1].trim());
  return [...found];
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
