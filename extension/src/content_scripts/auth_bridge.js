/**
 * PromptVault Pro – auth_bridge.js
 * Runs on the web app (localhost:5173). Listens for PV_AUTH_SYNC events
 * fired by the web app after login/register and forwards the token to the
 * extension service worker automatically.
 */
(function () {
  'use strict';

  window.addEventListener('PV_AUTH_SYNC', (e) => {
    const token = e.detail?.token;
    if (!token) return;
    chrome.runtime.sendMessage(
      { type: 'SET_SETTING', payload: { key: 'auth_token', value: token } },
      () => { if (chrome.runtime.lastError) { /* extension not installed */ } }
    );
  });

  window.addEventListener('PV_AUTH_LOGOUT', () => {
    chrome.runtime.sendMessage(
      { type: 'SET_SETTING', payload: { key: 'auth_token', value: '' } },
      () => { if (chrome.runtime.lastError) { /* extension not installed */ } }
    );
  });
})();
