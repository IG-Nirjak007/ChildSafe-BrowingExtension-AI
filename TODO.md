# Extension Fix Plan - "not working in site"
Status: [In Progress]

## Steps:
### 1. [x] Edit manifest.json (add CSS injection)
### 2. [x] Edit content.js (fix CSS class names: sb-* → safebrowse-*)
### 3. [x] Start backend server
   `cd backend && python app.py` → Running on http://127.0.0.1:5000
### 4. [ ] Reload Chrome extension (chrome://extensions/ → Reload)
### 5. [ ] Login as parent via popup
   - Email: `parent@example.com`
   - Password: `password123`
### 6. [ ] Test on sites with images/text (e.g. Unsplash, news sites)
### 7. [ ] Verify: Console shows 'Connected', blurs/overlays appear

**Current: Backend running ✅ → Next: Reload extension in Chrome**
