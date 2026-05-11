/**
 * PromptVault Pro – ChatGPT platform injector
 * Handles both legacy <textarea> and current contenteditable <div> input.
 */
(function () {
  'use strict';

  const SELECTORS = [
    '#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea[data-id="root"]',
    'textarea[placeholder]',
    'textarea',
  ];

  function findInput() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  window.__pv_inject = function (text) {
    const el = findInput();
    if (!el) { console.warn('[PV] ChatGPT: no input found'); return false; }
    try {
      el.focus();
      if (el.contentEditable === 'true') {
        // ContentEditable path (current ChatGPT)
        document.execCommand('selectAll', false, null);
        const ok = document.execCommand('insertText', false, text);
        if (!ok) throw new Error('execCommand failed');
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      } else {
        // Textarea path (legacy)
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (setter && setter.set) setter.set.call(el, text); else el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.setSelectionRange(el.value.length, el.value.length);
      }
      return true;
    } catch {
      try {
        el.focus();
        el.innerHTML = '';
        el.innerText = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el); range.collapse(false);
        sel.removeAllRanges(); sel.addRange(range);
        return true;
      } catch { return false; }
    }
  };

  window.__pv_read_input = function () {
    const el = findInput();
    if (!el) return '';
    return el.contentEditable === 'true'
      ? (el.innerText || el.textContent || '')
      : (el.value || '');
  };

  window.__pv_submit = function () {
    const btns = [
      document.querySelector('button[data-testid="send-button"]'),
      document.querySelector('button[aria-label="Send prompt"]'),
      document.querySelector('button[aria-label*="send" i]'),
      document.querySelector('#prompt-textarea')?.closest('form')?.querySelector('button[type="submit"]'),
    ];
    for (const btn of btns) {
      if (btn && !btn.disabled) { btn.click(); return true; }
    }
    return false;
  };
})();
