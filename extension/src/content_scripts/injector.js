/**
 * PromptVault Pro – injector.js
 * Injects a floating action button (FAB), a Refine button, and sidebar iframe into AI platform pages.
 */
(function () {
  'use strict';

  if (document.getElementById('promptvault-fab')) return;

  const POPUP_URL = chrome.runtime.getURL('src/popup/index.html');
  const FAB_ID = 'promptvault-fab';
  const REFINE_ID = 'promptvault-refine';
  const SIDEBAR_ID = 'promptvault-sidebar';
  const OVERLAY_ID = 'promptvault-overlay';
  const TOAST_ID = 'promptvault-toast';

  // ── Styles ──────────────────────────────────────────────────────────────────

  const style = document.createElement('style');
  style.id = 'promptvault-styles';
  style.textContent = `
    #${FAB_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #7C3AED;
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      font-family: Inter, system-ui, sans-serif;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5);
      transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, right 0.25s ease;
      user-select: none;
      line-height: 1;
    }
    #${FAB_ID}:hover { background: #6D28D9; transform: scale(1.05); box-shadow: 0 6px 20px rgba(124,58,237,0.65); }
    #${FAB_ID}:active { transform: scale(0.97); }
    #${FAB_ID} .pv-fab-icon { font-size: 16px; line-height: 1; }

    #${REFINE_ID} {
      position: fixed;
      bottom: 76px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #059669;
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 9px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      font-family: Inter, system-ui, sans-serif;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.45);
      transition: transform 0.15s ease, background 0.15s ease, right 0.25s ease, opacity 0.15s ease;
      user-select: none;
      line-height: 1;
    }
    #${REFINE_ID}:hover { background: #047857; transform: scale(1.05); }
    #${REFINE_ID}:active { transform: scale(0.97); }
    #${REFINE_ID}:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    #${REFINE_ID} .pv-spin {
      display: inline-block;
      animation: pv-spin 0.8s linear infinite;
    }
    @keyframes pv-spin { to { transform: rotate(360deg); } }

    #${OVERLAY_ID} {
      position: fixed; inset: 0; z-index: 2147483645; background: transparent; display: none;
    }
    #${OVERLAY_ID}.pv-visible { display: block; }

    #${SIDEBAR_ID} {
      position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
      z-index: 2147483646; border: none; border-left: 1px solid #30363D;
      box-shadow: -4px 0 24px rgba(0,0,0,0.4); background: #0D1117;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    #${SIDEBAR_ID}.pv-open { transform: translateX(0); }

    #${TOAST_ID} {
      position: fixed;
      bottom: 90px;
      right: 24px;
      z-index: 2147483647;
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #313244;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      font-family: Inter, system-ui, sans-serif;
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }
    #${TOAST_ID}.pv-toast-show {
      opacity: 1;
      transform: translateY(0);
    }
    #${TOAST_ID}.pv-toast-error { border-color: #f38ba8; background: #2a1a1e; }
    #${TOAST_ID}.pv-toast-success { border-color: #a6e3a1; }
    #${TOAST_ID} .pv-toast-score {
      font-weight: 700;
      color: #a6e3a1;
      margin-left: 4px;
    }
  `;
  document.head.appendChild(style);

  // ── FAB ─────────────────────────────────────────────────────────────────────

  const fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.setAttribute('aria-label', 'Open PromptVault Pro');
  fab.innerHTML = `<span class="pv-fab-icon">⬡</span><span>Prompts</span>`;

  // ── Refine Button ───────────────────────────────────────────────────────────

  const refineBtn = document.createElement('button');
  refineBtn.id = REFINE_ID;
  refineBtn.setAttribute('aria-label', 'Refine prompt with AI');
  refineBtn.innerHTML = `<span>✨</span><span>Refine</span>`;

  // ── Overlay ─────────────────────────────────────────────────────────────────

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // ── Sidebar ─────────────────────────────────────────────────────────────────

  const sidebar = document.createElement('iframe');
  sidebar.id = SIDEBAR_ID;
  sidebar.src = POPUP_URL;
  sidebar.setAttribute('allow', 'clipboard-write');
  sidebar.setAttribute('title', 'PromptVault Pro');

  // ── Toast ────────────────────────────────────────────────────────────────────

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  document.body && document.body.appendChild(toast);

  let toastTimer = null;
  function showToast(msg, type = 'success') {
    toast.textContent = '';
    toast.innerHTML = msg;
    toast.className = `pv-toast-${type}`;
    void toast.offsetWidth;
    toast.classList.add('pv-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('pv-toast-show'), 4000);
  }

  // ── Sidebar Toggle ──────────────────────────────────────────────────────────

  let isOpen = false;

  function openSidebar() {
    if (isOpen) return;
    isOpen = true;
    sidebar.classList.add('pv-open');
    overlay.classList.add('pv-visible');
    fab.style.right = '444px';
    refineBtn.style.right = '444px';
  }

  function closeSidebar() {
    if (!isOpen) return;
    isOpen = false;
    sidebar.classList.remove('pv-open');
    overlay.classList.remove('pv-visible');
    fab.style.right = '24px';
    refineBtn.style.right = '24px';
  }

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) closeSidebar(); else openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeSidebar(); });
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PV_CLOSE_SIDEBAR') closeSidebar();
  });

  // ── Refine Logic ────────────────────────────────────────────────────────────

  refineBtn.addEventListener('click', async (e) => {
    e.stopPropagation();

    const currentText = (typeof window.__pv_read_input === 'function')
      ? window.__pv_read_input()
      : '';

    if (!currentText || !currentText.trim()) {
      showToast('✏️ Type something in the AI input first, then click Refine.', 'error');
      return;
    }

    // Loading state
    refineBtn.disabled = true;
    refineBtn.innerHTML = `<span class="pv-spin">⟳</span><span>Refining…</span>`;

    // Guard against invalidated extension context (happens after extension reload)
    if (!chrome.runtime?.id) {
      showToast('⚠️ Page reload needed — extension was updated.', 'error');
      refineBtn.disabled = false;
      refineBtn.innerHTML = `<span>✨</span><span>Refine</span>`;
      return;
    }

    let result;
    try {
      result = await chrome.runtime.sendMessage({
        type: 'REFINE_PROMPT',
        payload: { text: currentText, style: 'professional' },
      });

      if (result && result.error) {
        showToast(`❌ ${result.error}`, 'error');
        return;
      }

      if (!result || !result.refined) {
        showToast('❌ No refined text returned from backend.', 'error');
        return;
      }

      // Inject refined text back into the AI input
      if (typeof window.__pv_inject === 'function') {
        window.__pv_inject(result.refined);
      }

      // Build score display
      let scoreHtml = '';
      if (result.score_before != null && result.score_after != null) {
        const diff = result.score_after - result.score_before;
        const sign = diff >= 0 ? '+' : '';
        scoreHtml = ` <span class="pv-toast-score">${sign}${diff} (${result.score_before}→${result.score_after})</span>`;
      }
      showToast(`✨ Prompt refined!${scoreHtml}`, 'success');

      // Auto-submit if enabled
      const settingsResp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (settingsResp?.settings?.autoSubmit) {
        setTimeout(() => {
          if (typeof window.__pv_submit === 'function') window.__pv_submit();
        }, 300);
      }

    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      refineBtn.disabled = false;
      refineBtn.innerHTML = `<span>✨</span><span>Refine</span>`;
    }
  });

  // ── Mount ───────────────────────────────────────────────────────────────────

  // Append to <html> to escape any CSS transform/overflow context on <body>
  function getRoot() {
    return document.documentElement || document.body;
  }

  function mount() {
    const root = getRoot();
    root.appendChild(style);
    root.appendChild(overlay);
    root.appendChild(sidebar);
    root.appendChild(refineBtn);
    root.appendChild(fab);
    root.appendChild(toast);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // SPA re-mount guard: ChatGPT/Claude/etc. wipe injected DOM on navigation
  setInterval(() => {
    if (!document.documentElement) return;
    if (!document.getElementById(FAB_ID)) {
      const root = getRoot();
      root.appendChild(overlay);
      root.appendChild(sidebar);
      root.appendChild(refineBtn);
      root.appendChild(fab);
      root.appendChild(toast);
    }
  }, 1000);

})();
