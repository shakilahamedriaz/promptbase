/**
 * PromptVault Pro – Claude.ai platform injector
 */
(function () {
  'use strict';

  const SELECTORS = [
    'div.ProseMirror[contenteditable="true"]',
    '[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
  ];

  function findInput() {
    for (const sel of SELECTORS) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        if (el.offsetHeight > 20) return el;
      }
    }
    return null;
  }

  window.__pv_inject = function (text) {
    const el = findInput();
    if (!el) { console.warn('[PV] Claude: no editor found'); return false; }
    try {
      el.focus();
      document.execCommand('selectAll', false, null);
      const ok = document.execCommand('insertText', false, text);
      if (!ok) throw new Error('execCommand failed');
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      return true;
    } catch {
      try {
        el.focus(); el.innerHTML = ''; el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
        const range = document.createRange(); const sel = window.getSelection();
        range.selectNodeContents(el); range.collapse(false);
        sel.removeAllRanges(); sel.addRange(range);
        return true;
      } catch { return false; }
    }
  };

  window.__pv_read_input = function () {
    const el = findInput();
    return el ? (el.innerText || el.textContent || '') : '';
  };

  window.__pv_submit = function () {
    const btns = [
      document.querySelector('button[aria-label="Send Message"]'),
      document.querySelector('button[aria-label*="send" i]'),
      document.querySelector('button[type="submit"]'),
    ];
    for (const btn of btns) {
      if (btn && !btn.disabled) { btn.click(); return true; }
    }
    return false;
  };
})();
