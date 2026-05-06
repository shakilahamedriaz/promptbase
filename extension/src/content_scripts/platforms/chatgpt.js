/**
 * PromptVault Pro – ChatGPT platform injector
 * Inlined as content script (no ES module imports).
 * Attaches window.__pv_inject for paste_engine.js to call.
 */
(function () {
  'use strict';

  function inject(text) {
    // Primary selector for ChatGPT's main prompt textarea
    const selectors = [
      '#prompt-textarea',
      'textarea[data-id="root"]',
      'textarea[placeholder]',
      'textarea',
    ];

    let el = null;
    for (const sel of selectors) {
      el = document.querySelector(sel);
      if (el) break;
    }

    if (!el) {
      console.warn('[PV] ChatGPT: no textarea found');
      return false;
    }

    try {
      // React controlled input – must use native setter to bypass React's synthetic event system
      const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      );
      if (nativeTextareaSetter && nativeTextareaSetter.set) {
        nativeTextareaSetter.set.call(el, text);
      } else {
        el.value = text;
      }

      // Dispatch events that React listens for
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      el.focus();
      // Move caret to end
      el.setSelectionRange(el.value.length, el.value.length);
      return true;
    } catch (err) {
      console.warn('[PV] ChatGPT inject error, trying fallback:', err);
      try {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        return true;
      } catch (fallbackErr) {
        console.error('[PV] ChatGPT fallback inject error:', fallbackErr);
        return false;
      }
    }
  }

  // Register on window so paste_engine.js can call it
  window.__pv_inject = inject;
})();
