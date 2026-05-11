/**
 * PromptVault Pro – Grok platform injector
 */
(function () {
  'use strict';

  const SELECTORS = ['textarea[placeholder]', 'textarea[data-testid]', 'textarea'];

  function findInput() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  window.__pv_inject = function (text) {
    const el = findInput();
    if (!el) { console.warn('[PV] Grok: no textarea found'); return false; }
    try {
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (setter && setter.set) setter.set.call(el, text); else el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.setSelectionRange(el.value.length, el.value.length);
      return true;
    } catch {
      try { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); return true; }
      catch { return false; }
    }
  };

  window.__pv_read_input = function () {
    const el = findInput();
    return el ? (el.value || '') : '';
  };

  window.__pv_submit = function () {
    const btns = [
      document.querySelector('button[aria-label*="send" i]'),
      document.querySelector('button[type="submit"]'),
      document.querySelector('button[data-testid*="send" i]'),
    ];
    for (const btn of btns) {
      if (btn && !btn.disabled) { btn.click(); return true; }
    }
    return false;
  };
})();
