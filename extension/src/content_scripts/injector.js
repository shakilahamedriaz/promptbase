/**
 * PromptVault Pro – injector.js
 * Injects a floating action button (FAB) and sidebar iframe into AI platform pages.
 * Runs as a content script (non-module, IIFE).
 */
(function () {
  'use strict';

  // Don't inject twice
  if (document.getElementById('promptvault-fab')) return;

  // ── Config ─────────────────────────────────────────────────────────────────

  const POPUP_URL = chrome.runtime.getURL('src/popup/index.html');
  const FAB_ID = 'promptvault-fab';
  const SIDEBAR_ID = 'promptvault-sidebar';
  const OVERLAY_ID = 'promptvault-overlay';

  // ── Styles ─────────────────────────────────────────────────────────────────

  const style = document.createElement('style');
  style.id = 'promptvault-styles';
  style.textContent = `
    #${FAB_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
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
      transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
      line-height: 1;
    }
    #${FAB_ID}:hover {
      background: #6D28D9;
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.65);
    }
    #${FAB_ID}:active {
      transform: scale(0.97);
    }
    #${FAB_ID} .pv-fab-icon {
      font-size: 16px;
      line-height: 1;
    }
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 99997;
      background: transparent;
      display: none;
    }
    #${OVERLAY_ID}.pv-visible {
      display: block;
    }
    #${SIDEBAR_ID} {
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      z-index: 99998;
      border: none;
      border-left: 1px solid #30363D;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
      background: #0D1117;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #${SIDEBAR_ID}.pv-open {
      transform: translateX(0);
    }
  `;
  document.head.appendChild(style);

  // ── FAB Element ────────────────────────────────────────────────────────────

  const fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.setAttribute('aria-label', 'Open PromptVault Pro');
  fab.innerHTML = `<span class="pv-fab-icon">⬡</span><span>Prompts</span>`;

  // ── Overlay (click outside to close) ──────────────────────────────────────

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // ── Sidebar iframe ─────────────────────────────────────────────────────────

  const sidebar = document.createElement('iframe');
  sidebar.id = SIDEBAR_ID;
  sidebar.src = POPUP_URL;
  sidebar.setAttribute('allow', 'clipboard-write');
  sidebar.setAttribute('title', 'PromptVault Pro');

  // ── Toggle logic ───────────────────────────────────────────────────────────

  let isOpen = false;

  function openSidebar() {
    if (isOpen) return;
    isOpen = true;
    sidebar.classList.add('pv-open');
    overlay.classList.add('pv-visible');
    fab.style.right = '444px'; // shift fab left of sidebar
  }

  function closeSidebar() {
    if (!isOpen) return;
    isOpen = false;
    sidebar.classList.remove('pv-open');
    overlay.classList.remove('pv-visible');
    fab.style.right = '24px';
  }

  function toggleSidebar() {
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });

  overlay.addEventListener('click', () => {
    closeSidebar();
  });

  // ── Keyboard shortcut (Escape to close) ───────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeSidebar();
    }
  });

  // ── Message from popup iframe (close request) ──────────────────────────────

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PV_CLOSE_SIDEBAR') {
      closeSidebar();
    }
  });

  // ── Mount elements ─────────────────────────────────────────────────────────

  // Use requestIdleCallback / setTimeout to not block page load
  function mount() {
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);
    document.body.appendChild(fab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

})();
