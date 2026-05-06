/**
 * PromptVault Pro – Microsoft Copilot platform injector
 * Inlined as content script (no ES module imports).
 * Attaches window.__pv_inject for paste_engine.js to call.
 */
(function () {
  'use strict';

  function inject(text) {
    const selectors = [
      '#searchbox',
      'textarea[name="q"]',
      'textarea[placeholder]',
      'div[contenteditable="true"]',
      'textarea',
    ];

    let el = null;
    for (const sel of selectors) {
      const candidates = document.querySelectorAll(sel);
      for (const candidate of candidates) {
        if (candidate.offsetHeight > 20) {
          el = candidate;
          break;
        }
      }
      if (el) break;
    }

    if (!el) {
      console.warn('[PV] Copilot: no input found');
      return false;
    }

    try {
      el.focus();

      const tagName = el.tagName.toLowerCase();
      const isContentEditable = el.contentEditable === 'true';

      if (tagName === 'textarea' || tagName === 'input') {
        // Use native setter for React compatibility
        const proto = tagName === 'textarea'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value');
        if (nativeSetter && nativeSetter.set) {
          nativeSetter.set.call(el, text);
        } else {
          el.value = text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (el.setSelectionRange) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
      } else if (isContentEditable) {
        document.execCommand('selectAll', false, null);
        const inserted = document.execCommand('insertText', false, text);
        if (!inserted) {
          el.innerHTML = '';
          el.innerText = text;
        }
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }

      return true;
    } catch (err) {
      console.warn('[PV] Copilot inject error, trying fallback:', err);
      try {
        if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
          el.value = text;
        } else {
          el.innerText = text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        return true;
      } catch (fallbackErr) {
        console.error('[PV] Copilot fallback inject error:', fallbackErr);
        return false;
      }
    }
  }

  window.__pv_inject = inject;
})();
