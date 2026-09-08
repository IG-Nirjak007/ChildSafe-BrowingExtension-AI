// content.js — SafeBrowse | Robust version with URL fallback + logging

(function () {
  'use strict';

  const API_BASE = 'http://localhost:5000';

  let settings        = null;
  let parentId        = null;
  let serverAvailable = false;
  let observer        = null;
  let initialized     = false;

  const processedImages    = new WeakSet();
  const processedTextNodes = new WeakSet();

  // ─── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (initialized) return;
    try {
      settings = await getSettings();
      parentId = await getParentId();

      if (!settings.enabled) {
        console.log('[SafeBrowse] Extension is disabled in settings.');
        return;
      }

      console.log('[SafeBrowse] Connecting to backend...');
      serverAvailable = await checkServerWithRetry(5, 3000);

      if (!serverAvailable) {
        console.warn('[SafeBrowse] Flask not reachable at ' + API_BASE + '. Please ensure the backend is running.');
        return;
      }

      initialized = true;
      console.log(`[SafeBrowse] Connected ✅ | ParentID: ${parentId} | URL: ${location.hostname}`);
      
      await scanPage();
      startMutationObserver();

    } catch (err) {
      console.error('[SafeBrowse] Init error:', err);
    }
  }

  async function checkServerWithRetry(maxAttempts, delayMs) {
    for (let i = 0; i < maxAttempts; i++) {
      const ok = await checkServer();
      if (ok) return true;
      if (i < maxAttempts - 1) {
        console.log(`[SafeBrowse] Backend not ready, retrying (${i + 1}/${maxAttempts})...`);
        await sleep(delayMs);
      }
    }
    return false;
  }

  async function checkServer() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'CHECK_HEALTH' }, response => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(response?.ok ?? false);
      });
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── Storage Helpers ───────────────────────────────────────────────────────
  function getSettings() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, res => {
        if (chrome.runtime.lastError) {
          resolve({ enabled: true, blurImages: true, blurText: true, blurLevel: 10,
                    imageThreshold: 0.7, textThreshold: 0.7, showWarning: true, logBlocked: true });
          return;
        }
        resolve(res?.settings || {
          enabled: true, blurImages: true, blurText: true, blurLevel: 10,
          imageThreshold: 0.7, textThreshold: 0.7, showWarning: true, logBlocked: true
        });
      });
    });
  }

  function getParentId() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['parentId'], data => resolve(data.parentId ?? null));
    });
  }

  // ─── Scanning ──────────────────────────────────────────────────────────────
  async function scanPage() {
    console.log('[SafeBrowse] Scanning page for content...');
    const tasks = [];
    if (settings.blurImages) {
      const images = document.querySelectorAll('img, video');
      console.log(`[SafeBrowse] Checking ${images.length} images/videos...`);
      for (const el of images) tasks.push(checkAndBlurImage(el));
    }
    if (settings.blurText) {
      tasks.push(scanTextNodes(document.body));
    }
    await Promise.allSettled(tasks);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  async function checkAndBlurImage(element) {
    if (processedImages.has(element)) return;
    processedImages.add(element);

    const rect = element.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return; // Ignore tiny icons

    // Wait for image to load to get dimensions/content
    if (element.tagName === 'IMG' && !element.complete) {
      await new Promise(resolve => {
        element.addEventListener('load',  resolve, { once: true });
        element.addEventListener('error', resolve, { once: true });
      });
    }

    try {
      const score = await classifyImage(element);
      if (score >= settings.imageThreshold) {
        console.log(`[SafeBrowse] 🚩 Blocked harmful image (Score: ${Math.round(score*100)}%)`);
        applyImageBlur(element, score);
        reportBlocked('image');
      }
    } catch (err) {
      console.error('[SafeBrowse] Error processing image:', err);
    }
  }

  async function classifyImage(imageElement) {
    let contentToSend = "";
    
    // Try to get pixels via canvas
    const canvas = document.createElement('canvas');
    canvas.width = 224; canvas.height = 224;
    try {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, 224, 224);
      contentToSend = canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      // Tainted canvas or other issue -> Fallback to sending the SRC URL
      contentToSend = imageElement.src || imageElement.currentSrc;
      if (!contentToSend || contentToSend.startsWith('blob:')) {
        return 0; // Cannot process locally or via URL
      }
      console.log('[SafeBrowse] Cross-origin image detected, sending URL instead of pixels.');
    }

    return new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'CLASSIFY_CONTENT',
        category: 'image',
        content: contentToSend,
        url: location.href
      }, response => {
        if (chrome.runtime.lastError) { resolve(0); return; }
        resolve(response?.score ?? 0);
      });
    });
  }

  function applyImageBlur(element, score) {
    if (element.closest('.safebrowse-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'safebrowse-wrapper';
    wrapper.style.cssText = 'position:relative;display:inline-block;max-width:100%;line-height:0;';
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);

    element.style.filter = `blur(${settings.blurLevel}px)`;
    element.style.pointerEvents = 'none';
    element.dataset.safebrowseBlurred = '1';

    if (settings.showWarning) {
      const overlay = document.createElement('div');
      overlay.className = 'safebrowse-overlay';
      overlay.innerHTML = `
        <div class="sb-card">
          <span class="sb-icon">🛡️</span>
          <div class="sb-title">Content Blocked</div>
          <div class="sb-sub">Detected unsafe visual content.
            <span class="sb-score">${Math.round(score * 100)}% detection</span>
          </div>
          <button class="sb-btn" onclick="
            var w = this.closest('.safebrowse-wrapper');
            if(w) { var img = w.querySelector('[data-safebrowse-blurred]'); if(img) img.style.filter='none'; }
            this.closest('.safebrowse-overlay').remove();">Show Anyway</button>
        </div>`;
      wrapper.appendChild(overlay);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  async function scanTextNodes(root) {
    if (!root) return;
    const selectors = 'p, li, td, blockquote, h1, h2, h3, h4, h5, h6, span';
    const els = Array.from(root.querySelectorAll(selectors));
    
    // Filter out elements that are already processed or too short
    const validEls = els.filter(el => {
      if (processedTextNodes.has(el)) return false;
      const text = (el.innerText || el.textContent || '').trim();
      return text.length >= 30 && el.children.length <= 8;
    });

    const BATCH = 5;
    for (let i = 0; i < validEls.length; i += BATCH) {
      await Promise.allSettled(validEls.slice(i, i + BATCH).map(el => checkTextElement(el)));
    }
  }

  async function checkTextElement(el) {
    if (processedTextNodes.has(el)) return;
    processedTextNodes.add(el);

    const text = (el.innerText || el.textContent || '').trim();
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;

    try {
      const score = await classifyText(text);
      if (score >= settings.textThreshold) {
        console.log(`[SafeBrowse] 🚩 Blocked harmful text: "${text.substring(0, 30)}..."`);
        applyTextBlur(el, score);
        reportBlocked('text');
      }
    } catch (err) {
      console.error('[SafeBrowse] Error processing text:', err);
    }
  }

  async function classifyText(text) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'CLASSIFY_CONTENT',
        category: 'text',
        content: text.slice(0, 512),
        url: location.href
      }, response => {
        if (chrome.runtime.lastError) { resolve(0); return; }
        resolve(response?.score ?? 0);
      });
    });
  }

  function applyTextBlur(element, score) {
    element.dataset.safebrowseTextBlurred = '1';
    element.style.filter = `blur(${Math.min(settings.blurLevel, 6)}px)`;
    element.style.userSelect = 'none';
    element.style.pointerEvents = 'none';

    if (settings.showWarning) {
      const badge = document.createElement('div');
      badge.className = 'safebrowse-text-badge';
      badge.innerHTML = `🛡️ Harmful text hidden &nbsp;·&nbsp;
        <span class="sb-score">${Math.round(score * 100)}%</span>
        <button class="sb-text-reveal" onclick="
          var prev = this.parentElement.previousElementSibling;
          if(prev){ prev.style.filter=''; prev.style.userSelect=''; prev.style.pointerEvents=''; }
          this.parentElement.remove();">Show</button>`;
      element.parentNode.insertBefore(badge, element.nextSibling);
    }
  }

  // ─── MutationObserver ──────────────────────────────────────────────────────
  function startMutationObserver() {
    observer = new MutationObserver(async mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (settings.blurImages) {
            const imgs = node.matches?.('img,video') ? [node]
              : Array.from(node.querySelectorAll('img,video'));
            for (const img of imgs) checkAndBlurImage(img);
          }
          if (settings.blurText) await scanTextNodes(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function reportBlocked(category) {
    if (!settings?.logBlocked) return;
    chrome.runtime.sendMessage({ type: 'UPDATE_BLOCKED_COUNT', category }, () => {
      if (chrome.runtime.lastError) { /* ignore */ }
    });
  }

  function unblurAll() {
    document.querySelectorAll('[data-safebrowse-blurred]').forEach(el => {
      el.style.filter = ''; el.style.pointerEvents = '';
    });
    document.querySelectorAll('.safebrowse-overlay').forEach(el => el.remove());
    document.querySelectorAll('[data-safebrowse-text-blurred]').forEach(el => {
      el.style.filter = ''; el.style.userSelect = ''; el.style.pointerEvents = '';
    });
    document.querySelectorAll('.safebrowse-text-badge').forEach(el => el.remove());
  }

  // ─── Listeners ─────────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      getSettings().then(s => {
        settings = s;
        if (!s.enabled) {
          observer?.disconnect();
          unblurAll();
          initialized = false;
        } else if (s.enabled && serverAvailable) {
          scanPage();
        }
      });
    }

    if (message.type === 'PARENT_LOGGED_IN') {
      parentId = message.parentId;
      console.log('[SafeBrowse] Parent ID updated via login:', parentId);
      if (!initialized) {
        init();
      } else if (serverAvailable) {
        scanPage();
      }
    }

    if (message.type === 'PARENT_LOGGED_OUT') {
      parentId = null;
      console.log('[SafeBrowse] Parent logged out.');
      unblurAll();
      initialized = false;
    }
  });

  // ─── Run ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();