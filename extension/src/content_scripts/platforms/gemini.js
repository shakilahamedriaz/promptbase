/**
 * PromptVault Pro – Google Gemini platform injector
 * Inlined as content script (no ES module imports).
 * Attaches window.__pv_inject for paste_engine.js to call.
 */
(function () {
  'use strict';

  function inject(text) {
    // Gemini uses a Quill-based rich text editor
    const selectors = [
      '.ql-editor',
      'rich-textarea .ql-editor',
      '[contenteditable="true"].ql-editor',
      'div[contenteditable="true"]',
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
      console.warn('[PV] Gemini: no editor found');
      return false;
    }

    try {
      el.focus();

      // Build Quill-compatible HTML: each newline becomes a paragraph
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const paragraphs = escaped
        .split('\n')
        .map((line) => `<p>${line || '<br>'}</p>`)
        .join('');

      el.innerHTML = paragraphs;

      // Dispatch standard input event
      el.dispatchEvent(new Event('input', { bubbles: true }));

      // Dispatch Quill's custom text-change event (Quill listens for this internally)
      el.dispatchEvent(
        new CustomEvent('text-change', {
          bubbles: true,
          detail: { delta: { ops: [{ insert: text }] }, source: 'user' },
        })
      );

      // Move caret to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);

      return true;
    } catch (err) {
      console.warn('[PV] Gemini inject error, trying fallback:', err);
      try {
        el.focus();
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } catch (fallbackErr) {
        console.error('[PV] Gemini fallback inject error:', fallbackErr);
        return false;
      }
    }
  }

  window.__pv_inject = inject;
})();
