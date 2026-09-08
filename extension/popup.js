// popup.js
const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Check if already logged in ─────────────────────────────────────────────
  const stored = await getStored();

  if (stored.parentId && stored.token) {
    await showMainPanel(stored);
  } else {
    showLoginPanel();
  }

  // ── Login button ───────────────────────────────────────────────────────────
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginErr');
    errEl.textContent = '';

    if (!email || !password) {
      errEl.textContent = 'Please enter email and password.'; return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.message || 'Login failed.'; return;
      }

      // Save token + parent_id to extension storage
      await chrome.storage.sync.set({
        token:    data.token,
        parentId: data.parent_id,
        email:    data.email
      });

      // Notify all tabs that parent_id is now available
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'PARENT_LOGGED_IN', parentId: data.parent_id })
            .catch(() => {});
        });
      });

      const stored = await getStored();
      await showMainPanel(stored);

    } catch (err) {
      errEl.textContent = 'Cannot reach server. Is Flask running?';
    }
  });

  // Allow Enter key to submit login
  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
});

// ── Show login panel ───────────────────────────────────────────────────────
function showLoginPanel() {
  document.getElementById('login-panel').style.display = 'block';
  document.getElementById('main-panel').style.display  = 'none';
  document.getElementById('master-toggle-wrap').style.display = 'none';
  document.getElementById('parentBadge').style.display = 'none';
}

// ── Show main panel ────────────────────────────────────────────────────────
async function showMainPanel(stored) {
  document.getElementById('login-panel').style.display = 'none';
  document.getElementById('main-panel').style.display  = 'block';
  document.getElementById('master-toggle-wrap').style.display = 'flex';
  document.getElementById('parentBadge').style.display = 'inline-block';

  // Show parent email in badge
  const email = stored.email || '';
  document.getElementById('parentBadge').textContent = email.split('@')[0] || 'Parent';

  // Load settings
  const res = await sendMsg({ type: 'GET_SETTINGS' });
  const s   = res.settings || {};
  const counts = (await sendMsg({ type: 'GET_BLOCKED_COUNT' })).count || { images: 0, texts: 0 };

  document.getElementById('masterToggle').checked  = s.enabled ?? true;
  document.getElementById('blurImages').checked    = s.blurImages ?? true;
  document.getElementById('blurText').checked      = s.blurText ?? true;
  document.getElementById('showWarning').checked   = s.showWarning ?? true;
  document.getElementById('blurLevel').value       = s.blurLevel ?? 10;
  document.getElementById('imageThreshold').value  = Math.round((s.imageThreshold ?? 0.7) * 100);
  document.getElementById('textThreshold').value   = Math.round((s.textThreshold  ?? 0.7) * 100);

  updateBlurVal(s.blurLevel ?? 10);
  updateImgThresh(Math.round((s.imageThreshold ?? 0.7) * 100));
  updateTxtThresh(Math.round((s.textThreshold  ?? 0.7) * 100));
  updateStatus(s.enabled ?? true);
  updateCounts(counts.images, counts.texts);

  // ── Live slider labels ───────────────────────────────────────────────────
  document.getElementById('blurLevel').addEventListener('input', e => updateBlurVal(e.target.value));
  document.getElementById('imageThreshold').addEventListener('input', e => updateImgThresh(e.target.value));
  document.getElementById('textThreshold').addEventListener('input', e => updateTxtThresh(e.target.value));
  document.getElementById('masterToggle').addEventListener('change', e => updateStatus(e.target.checked));

  // ── Save ─────────────────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const newSettings = {
      enabled:        document.getElementById('masterToggle').checked,
      blurImages:     document.getElementById('blurImages').checked,
      blurText:       document.getElementById('blurText').checked,
      showWarning:    document.getElementById('showWarning').checked,
      blurLevel:      parseInt(document.getElementById('blurLevel').value, 10),
      imageThreshold: parseInt(document.getElementById('imageThreshold').value, 10) / 100,
      textThreshold:  parseInt(document.getElementById('textThreshold').value, 10) / 100,
      logBlocked:     true
    };
    await sendMsg({ type: 'SAVE_SETTINGS', settings: newSettings });
    showToast();
  });

  // ── Reset stats ──────────────────────────────────────────────────────────
  document.getElementById('resetBtn').addEventListener('click', async () => {
    await sendMsg({ type: 'RESET_COUNT' });
    updateCounts(0, 0);
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await chrome.storage.sync.remove(['token', 'parentId', 'email']);
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'PARENT_LOGGED_OUT' }).catch(() => {});
      });
    });
    showLoginPanel();
  });

  // ── Open Dashboard ───────────────────────────────────────────────────────
  document.getElementById('dashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getStored() {
  return new Promise(resolve => chrome.storage.sync.get(['token', 'parentId', 'email'], resolve));
}
function updateBlurVal(v)    { document.getElementById('blurVal').textContent = v + 'px'; }
function updateImgThresh(v)  { document.getElementById('imgThreshVal').textContent = v + '%'; }
function updateTxtThresh(v)  { document.getElementById('txtThreshVal').textContent = v + '%'; }
function updateStatus(active) {
  document.getElementById('statusDot').className  = 'status-dot' + (active ? '' : ' off');
  document.getElementById('statusText').textContent = active ? 'Protection active' : 'Protection disabled';
}
function updateCounts(imgs, txts) {
  document.getElementById('imgCount').textContent  = imgs;
  document.getElementById('txtCount').textContent  = txts;
  document.getElementById('sessionCount').textContent = imgs + txts;
}
function showToast() {
  const t = document.getElementById('toast');
  t.className = 'saved-toast show';
  setTimeout(() => { t.className = 'saved-toast'; }, 2500);
}
function sendMsg(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}