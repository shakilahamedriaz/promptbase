/**
 * PromptVault Pro – Claude.ai platform injector
 * Inlined as content script (no ES module imports).
 * Attaches window.__pv_inject for paste_engine.js to call.
 */
(function () {
  'use strict';

  function inject(text) {
    // Claude uses a ProseMirror contenteditable div
    const selectors = [
      'div.ProseMirror[contenteditable="true"]',
      '[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
    ];

    let el = null;
    for (const sel of selectors) {
      // Prefer the one inside the main input area
      const candidates = document.querySelectorAll(sel);
      for (const candidate of candidates) {
        // Skip tiny elements (buttons etc.)
        if (candidate.offsetHeight > 20) {
          el = candidate;
          break;
        }
      }
      if (el) break;
    }

    if (!el) {
      console.warn('[PV] Claude: no contenteditable found');
      return false;
    }

    try {
      el.focus();

      // Select all existing content and replace
      document.execCommand('selectAll', false, null);
      const inserted = document.execCommand('insertText', false, text);

      if (!inserted) {
        throw new Error('execCommand insertText returned false');
      }

      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      return true;
    } catch (err) {
      console.warn('[PV] Claude inject error, trying fallback:', err);
      try {
        el.focus();
        // Clear existing content
        el.innerHTML = '';
        // Use innerText which triggers layout
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
        // Move caret to end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      } catch (fallbackErr) {
        console.error('[PV] Claude fallback inject error:', fallbackErr);
        return false;
      }
    }
  }

  window.__pv_inject = inject;
})();
