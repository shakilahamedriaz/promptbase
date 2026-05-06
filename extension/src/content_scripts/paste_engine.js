/**
 * PromptVault Pro – paste_engine.js
 * Listens for PASTE_PROMPT messages and injects text into the current platform's input.
 * Runs as a content script (non-module). All platform logic is inlined.
 * Platform-specific injectors register themselves as window.__pv_inject via their own scripts.
 */
(function () {
  'use strict';

  // ── Generic injection (fallback if no platform-specific injector) ──────────

  function injectText(el, text) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    const isContentEditable = el.contentEditable === 'true';

    if (tag === 'textarea' || tag === 'input') {
      try {
        const proto = tag === 'textarea'
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
        el.focus();
        return true;
      } catch (e) {
        console.warn('[PV] injectText textarea error:', e);
        return false;
      }
    } else if (isContentEditable) {
      try {
        el.focus();
        document.execCommand('selectAll', false, null);
        const ok = document.execCommand('insertText', false, text);
        if (!ok) throw new Error('execCommand failed');
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        return true;
      } catch (e) {
        try {
          el.innerHTML = '';
          el.innerText = text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true }));
          return true;
        } catch (e2) {
          console.warn('[PV] injectText contenteditable error:', e2);
          return false;
        }
      }
    }
    return false;
  }

  // ── Platform detection ─────────────────────────────────────────────────────

  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chat.openai.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('perplexity.ai')) return 'perplexity';
    if (hostname.includes('grok.x.com')) return 'grok';
    if (hostname.includes('copilot.microsoft.com')) return 'copilot';
    return 'unknown';
  }

  // ── Generic fallback selectors ─────────────────────────────────────────────

  function findBestInput() {
    const selectors = [
      'textarea:not([readonly]):not([disabled])',
      'div[contenteditable="true"]',
      'input[type="text"]:not([readonly]):not([disabled])',
    ];

    for (const sel of selectors) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        if (el.offsetWidth > 100 && el.offsetHeight > 20) {
          return el;
        }
      }
    }
    return null;
  }

  // ── Page toast notification ────────────────────────────────────────────────

  function showPageToast(message, isError) {
    const existing = document.getElementById('__pv_toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__pv_toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      zIndex: '999999',
      background: isError ? '#F85149' : '#3FB950',
      color: '#ffffff',
      padding: '10px 16px',
      borderRadius: '8px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease',
      opacity: '1',
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ── Core injection orchestrator ────────────────────────────────────────────

  async function detectAndInject(text) {
    // First try platform-specific injector (registered by platform scripts)
    if (typeof window.__pv_inject === 'function') {
      const ok = window.__pv_inject(text);
      if (ok) {
        showPageToast('✓ Prompt inserted');
        return true;
      }
    }

    // Fallback: generic injection
    const el = findBestInput();
    if (el) {
      const ok = injectText(el, text);
      if (ok) {
        showPageToast('✓ Prompt inserted');
        return true;
      }
    }

    // Last resort: clipboard
    try {
      await navigator.clipboard.writeText(text);
      showPageToast('📋 Copied to clipboard');
      return true;
    } catch (clipErr) {
      console.error('[PV] Clipboard fallback failed:', clipErr);
      showPageToast('⚠ Could not insert prompt', true);
      return false;
    }
  }

  // ── Message Listener ───────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PASTE_PROMPT') {
      const text = message.text || '';
      if (!text) {
        sendResponse({ ok: false, error: 'Empty text' });
        return false;
      }

      detectAndInject(text).then((ok) => {
        sendResponse({ ok });
      }).catch((err) => {
        console.error('[PV] paste_engine error:', err);
        sendResponse({ ok: false, error: err.message });
      });

      return true; // async response
    }
    return false;
  });

})();
