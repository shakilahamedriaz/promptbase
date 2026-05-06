/**
 * PromptVault Pro – Grok (grok.x.com) platform injector
 * Inlined as content script (no ES module imports).
 * Attaches window.__pv_inject for paste_engine.js to call.
 */
(function () {
  'use strict';

  function inject(text) {
    const selectors = [
      'textarea[placeholder]',
      'textarea[data-testid]',
      'textarea',
    ];

    let el = null;
    for (const sel of selectors) {
      el = document.querySelector(sel);
      if (el) break;
    }

    if (!el) {
      console.warn('[PV] Grok: no textarea found');
      return false;
    }

    try {
      el.focus();

      // Use native setter for React compatibility
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      );
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(el, text);
      } else {
        el.value = text;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.setSelectionRange(el.value.length, el.value.length);
      return true;
    } catch (err) {
      console.warn('[PV] Grok inject error, trying fallback:', err);
      try {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        return true;
      } catch (fallbackErr) {
        console.error('[PV] Grok fallback inject error:', fallbackErr);
        return false;
      }
    }
  }

  window.__pv_inject = inject;
})();
