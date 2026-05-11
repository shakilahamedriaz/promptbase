/**
 * PromptVault Pro – Google Gemini platform injector
 */
(function () {
  'use strict';

  const SELECTORS = ['.ql-editor', 'rich-textarea .ql-editor', '[contenteditable="true"].ql-editor', 'div[contenteditable="true"]'];

  function findInput() {
    for (const sel of SELECTORS) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) { if (el.offsetHeight > 20) return el; }
    }
    return null;
  }

  window.__pv_inject = function (text) {
    const el = findInput();
    if (!el) { console.warn('[PV] Gemini: no editor found'); return false; }
    try {
      el.focus();
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const paragraphs = escaped.split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('');
      el.innerHTML = paragraphs;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new CustomEvent('text-change', { bubbles: true, detail: { delta: { ops: [{ insert: text }] }, source: 'user' } }));
      const range = document.createRange(); const sel = window.getSelection();
      range.selectNodeContents(el); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
      return true;
    } catch {
      try { el.focus(); el.innerText = text; el.dispatchEvent(new Event('input', { bubbles: true })); return true; }
      catch { return false; }
    }
  };

  window.__pv_read_input = function () {
    const el = findInput();
    return el ? (el.innerText || el.textContent || '') : '';
  };

  window.__pv_submit = function () {
    const btns = [
      document.querySelector('button.send-button'),
      document.querySelector('button[aria-label*="send" i]'),
      document.querySelector('button[mattooltip*="send" i]'),
      document.querySelector('button[type="submit"]'),
    ];
    for (const btn of btns) {
      if (btn && !btn.disabled) { btn.click(); return true; }
    }
    return false;
  };
})();
