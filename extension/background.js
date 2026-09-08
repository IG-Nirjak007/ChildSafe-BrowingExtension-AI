// background.js - Service Worker for SafeBrowse Extension

const API_URL = "http://localhost:5000"; // Your Flask Backend

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  blurImages: true,
  blurText: true,
  blurLevel: 10,
  imageThreshold: 0.7,
  textThreshold: 0.7,
  showWarning: true,
  logBlocked: true
};

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ 
    settings: DEFAULT_SETTINGS,
    parentId: 1 
  });
  chrome.storage.local.set({ blockedCount: { images: 0, texts: 0 } });
  console.log('[SafeBrowse] Extension installed.');
});

// Main Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // --- Bridge to Python ---
  if (message.type === 'CHECK_HEALTH') {
    fetch(`${API_URL}/health`)
      .then(res => sendResponse({ ok: res.ok }))
      .catch(err => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'CLASSIFY_CONTENT') {
    chrome.storage.sync.get(['parentId'], async (data) => {
      const parentId = data.parentId || 1;

      try {
        const response = await fetch(`${API_URL}/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: message.url || "Unknown URL",
            content: message.content, 
            category: message.category, 
            parent_id: parentId
          })
        });

        const result = await response.json();
        sendResponse({ 
          score: result.harmful_score, 
          action: result.status 
        });
      } catch (error) {
        console.error('[SafeBrowse] Backend Error:', error);
        sendResponse({ action: 'Allow', error: 'Backend unreachable' });
      }
    });
    return true; 
  }

  // --- INTERNAL STORAGE HANDLERS ---
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('settings', (data) => {
      sendResponse({ settings: data.settings || DEFAULT_SETTINGS });
    });
    return true;
  }

  if (message.type === 'UPDATE_BLOCKED_COUNT') {
    chrome.storage.local.get('blockedCount', (data) => {
      const count = data.blockedCount || { images: 0, texts: 0 };
      if (message.category === 'image') count.images += 1;
      if (message.category === 'text') count.texts += 1;
      chrome.storage.local.set({ blockedCount: count });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_BLOCKED_COUNT') {
    chrome.storage.local.get('blockedCount', (data) => {
      sendResponse({ count: data.blockedCount || { images: 0, texts: 0 } });
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.sync.set({ settings: message.settings }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }).catch(() => {});
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'RESET_COUNT') {
    chrome.storage.local.set({ blockedCount: { images: 0, texts: 0 } }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});