/**
 * PromptVault Pro – Perplexity.ai platform injector
 * Inlined as content script (no ES module imports).
 * Attaches window.__pv_inject for paste_engine.js to call.
 */
(function () {
  'use strict';

  function inject(text) {
    const selectors = [
      'textarea.overflow-auto',
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="search"]',
      'textarea[placeholder*="Follow"]',
      'textarea',
    ];

    let el = null;
    for (const sel of selectors) {
      el = document.querySelector(sel);
      if (el) break;
    }

    if (!el) {
      console.warn('[PV] Perplexity: no textarea found');
      return false;
    }

    try {
      el.focus();

      // Perplexity uses React; use native setter
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
      console.warn('[PV] Perplexity inject error, trying fallback:', err);
      try {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        return true;
      } catch (fallbackErr) {
        console.error('[PV] Perplexity fallback inject error:', fallbackErr);
        return false;
      }
    }
  }

  window.__pv_inject = inject;
})();
