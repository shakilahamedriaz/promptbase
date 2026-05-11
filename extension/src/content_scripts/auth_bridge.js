/**
 * PromptVault Pro – auth_bridge.js
 * Runs on localhost:5173. Syncs auth token to the extension automatically.
 */
(function () {
  'use strict';

  function isExtensionAlive() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  function syncToken(token) {
    if (!token || !isExtensionAlive()) return;
    try {
      chrome.runtime.sendMessage(
        { type: 'SET_SETTING', payload: { key: 'auth_token', value: token } },
        () => { void chrome.runtime.lastError; }
      );
    } catch { /* context invalidated — user must reload the page */ }
  }

  function clearToken() {
    if (!isExtensionAlive()) return;
    try {
      chrome.runtime.sendMessage(
        { type: 'SET_SETTING', payload: { key: 'auth_token', value: '' } },
        () => { void chrome.runtime.lastError; }
      );
    } catch { }
  }

  // Read immediately from localStorage (works even if event already fired)
  const stored = localStorage.getItem('pv_ext_token');
  if (stored) syncToken(stored);

  window.addEventListener('PV_AUTH_SYNC', (e) => {
    const token = e.detail?.token;
    if (token) syncToken(token);
  });

  window.addEventListener('PV_AUTH_LOGOUT', clearToken);

  window.addEventListener('storage', (e) => {
    if (e.key === 'pv_ext_token') {
      if (e.newValue) syncToken(e.newValue);
      else clearToken();
    }
  });
})();
