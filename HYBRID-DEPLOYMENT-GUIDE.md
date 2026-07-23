# Hybrid Deployment Strategy: Adobe Content + GovCloud APIs

## 🎯 The Strategy

**Use Adobe's content for the "shell"** (marketing, UI, help docs)  
**Use YOUR govCloud stack for the "data"** (user documents, APIs)

## How It Works

### The Separation of Concerns

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (da-live)                        │
│                 https://da-gov.live                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TWO SEPARATE DATA FLOWS:                                    │
│                                                              │
│  1. STATIC CONTENT (fstab.yaml)                             │
│     ↓                                                        │
│     Adobe's content.entmseds-da.live/adobe/da-live/                  │
│     • Marketing pages                                        │
│     • Help documentation                                     │
│     • UI text/images                                         │
│     • READ-ONLY                                              │
│                                                              │
│  2. API CALLS (DA_ORIGIN constant)                          │
│     ↓                                                        │
│     YOUR admin.da-gov.live                                  │
│     • User documents                                         │
│     • Save/load operations                                   │
│     • Authentication                                         │
│     • READ-WRITE                                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 📋 Configuration Split

### Part 1: Static Content (fstab.yaml) - KEEP AS-IS

```yaml
# fstab.yaml - UNCHANGED from Adobe
mountpoints:
  /:
    url: https://content.entmseds-da.live/adobe/da-live/
    type: markup

folders:
  /app/: /apps/custom/shell
```

**What this provides:**
- ✅ Marketing pages (homepage, features)
- ✅ Help documentation
- ✅ Onboarding content
- ✅ UI text and images
- ✅ Error pages (404, etc.)

**Served from:** Adobe's production content

---

### Part 2: API Endpoints (constants.js) - UPDATE TO YOUR STACK

```javascript
// blocks/shared/constants.js

// CURRENT (Adobe):
const DA_ADMIN_ENVS = {
  local: 'http://localhost:8787',
  stage: 'https://stage-admin.entmseds-da.live',
  prod: 'https://admin.entmseds-da.live',
};

// YOUR GOVCLOUD VERSION:
const DA_ADMIN_ENVS = {
  local: 'http://localhost:8787',
  stage: 'https://stage-admin.da-gov.live',
  prod: 'https://admin.da-gov.live',  // ← YOUR API
};

// CURRENT (Adobe):
export const AEM_ORIGIN = 'https://admin.entmseds.page';

// YOUR GOVCLOUD VERSION:
export const AEM_ORIGIN = 'https://admin.gov-entmseds.page';  // ← YOUR helix-admin
```

**What this provides:**
- ✅ Save user documents → YOUR R2 buckets
- ✅ Load user documents → YOUR R2 buckets
- ✅ Authentication → YOUR Okta
- ✅ Preview/Publish → YOUR helix-admin
- ✅ All user data → YOUR infrastructure

---

## 🔄 Data Flow Examples

### Example 1: User Visits Homepage

```
User → https://da-gov.live/
       ↓
    fstab.yaml routes to:
       ↓
    https://content.entmseds-da.live/adobe/da-live/index.html
       ↓
    Adobe's marketing homepage loads
       ✅ Shows Adobe's branding/content
       ✅ No API calls needed
       ✅ Pure static content
```

### Example 2: User Opens Document Editor

```
User → https://da-gov.live/edit#/myorg/mysite/doc.html
       ↓
    1. UI Shell loads from Adobe's content (via fstab)
       ├─ /blocks/edit/ code
       ├─ Editor UI components
       └─ Help text/tooltips
       
       ↓
       
    2. API call to load document:
       const resp = await daFetch(`${DA_ORIGIN}/source/myorg/mysite/doc.html`)
                                   ↓
                            https://admin.da-gov.live/source/...
                                   ↓
                            YOUR da-admin (GovCloud)
                                   ↓
                            YOUR R2 bucket (aem-content-gov)
                                   ↓
                            Returns user's document
       
       ✅ UI from Adobe
       ✅ Data from YOUR infrastructure
```

### Example 3: User Saves Document

```
User clicks "Save"
       ↓
    saveToDa() function in blocks/shared/utils.js
       ↓
    const daResp = await daFetch(`${DA_ORIGIN}/source${path}`, {
      method: 'PUT',
      body: formData
    });
       ↓
    DA_ORIGIN = 'https://admin.da-gov.live'  ← YOUR API
       ↓
    YOUR da-admin receives the save request
       ↓
    YOUR Okta validates the token
       ↓
    YOUR R2 bucket stores the document
       ↓
    Success!
       
    ✅ Document saved to YOUR infrastructure
    ✅ Never touches Adobe's systems
```

### Example 4: User Previews Content

```
User clicks "Preview"
       ↓
    aemAdmin(path, 'preview', 'POST')
       ↓
    const aemUrl = `https://admin.entmseds.page/${api}/...`
                    ↓
    WAIT - this is still Adobe!
       ↓
    Need to change to:
    const aemUrl = `${AEM_ORIGIN}/${api}/...`
    where AEM_ORIGIN = 'https://admin.gov-entmseds.page'
       ↓
    YOUR helix-admin-ams (AWS Lambda GovCloud)
       ↓
    Publishes to YOUR helix-content-bus-8 (S3 GovCloud)
       ↓
    Preview available at:
    https://main--mysite--myorg.gov-entmseds.page
       
    ✅ Preview on YOUR infrastructure
```

---

## 🔧 Required Code Changes

### Change 1: Dynamic DA_ORIGIN (Already Working!)

The code already supports this via `getDaEnv()`:

```javascript
// blocks/shared/constants.js (lines 28-48)
function getDaEnv(location, key, envs) {
  const { href } = location;
  const query = new URL(href).searchParams.get(key);
  if (query && query === 'reset') {
    localStorage.removeItem(key);
  } else if (query) {
    localStorage.setItem(key, query);
  }
  const env = envs[localStorage.getItem(key) || 'prod'];
  return env;
}

export const DA_ORIGIN = (() => getDaEnv(window.location, 'da-admin', DA_ADMIN_ENVS))();
```

**How to use:**
```
# Default: uses 'prod' from DA_ADMIN_ENVS
https://da-gov.live/edit#/org/site/doc.html

# Override with URL param:
https://da-gov.live/edit?da-admin=stage#/org/site/doc.html

# Set in localStorage:
localStorage.setItem('da-admin', 'stage');
```

---

### Change 2: Update Environment Mappings

```javascript
// blocks/shared/constants.js

// BEFORE:
const DA_ADMIN_ENVS = {
  local: 'http://localhost:8787',
  stage: 'https://stage-admin.entmseds-da.live',
  prod: 'https://admin.entmseds-da.live',
};

// AFTER:
const DA_ADMIN_ENVS = {
  local: 'http://localhost:8787',
  stage: 'https://stage-admin.da-gov.live',
  prod: 'https://admin.da-gov.live',      // ← Point to YOUR stack
};
```

---

### Change 3: Fix Hardcoded AEM_ORIGIN

**Problem:** `aemAdmin()` has hardcoded URL

```javascript
// blocks/shared/utils.js (line 83) - BEFORE:
export async function aemAdmin(path, api, method = 'POST') {
  const [owner, repo, ...parts] = path.slice(1).split('/');
  const name = parts.pop() || repo || owner;
  parts.push(name.replace('.html', ''));
  const aemUrl = `https://admin.entmseds.page/${api}/${owner}/${repo}/main/${parts.join('/')}`;
  //                ^^^^^^^^^^^^^^^^^^^^^^^ HARDCODED!
  const resp = await daFetch(aemUrl, { method });
  // ...
}
```

**Solution:**

```javascript
// blocks/shared/utils.js - AFTER:
import { DA_ORIGIN, AEM_ORIGIN } from './constants.js';  // ← Add AEM_ORIGIN

export async function aemAdmin(path, api, method = 'POST') {
  const [owner, repo, ...parts] = path.slice(1).split('/');
  const name = parts.pop() || repo || owner;
  parts.push(name.replace('.html', ''));
  const aemUrl = `${AEM_ORIGIN}/${api}/${owner}/${repo}/main/${parts.join('/')}`;
  //               ^^^^^^^^^^^ USE CONSTANT!
  const resp = await daFetch(aemUrl, { method });
  // ...
}
```

**Add to constants.js:**

```javascript
// blocks/shared/constants.js - ADD THIS:

const AEM_ADMIN_ENVS = {
  local: 'http://localhost:3000',
  stage: 'https://stage-admin.gov-entmseds.page',
  prod: 'https://admin.gov-entmseds.page',        // ← YOUR helix-admin
};

export const getAemAdmin = (() => {
  let aemAdmin;
  return (location) => {
    if (!location && aemAdmin) return aemAdmin;
    aemAdmin = getDaEnv(location || window.location, 'aem-admin', AEM_ADMIN_ENVS);
    return aemAdmin;
  };
})();

export const AEM_ORIGIN = (() => getDaEnv(window.location, 'aem-admin', AEM_ADMIN_ENVS))();
```

---

### Change 4: Update ALLOWED_TOKEN Origins

```javascript
// blocks/shared/utils.js (lines 6-8) - BEFORE:
const DA_ORIGINS = ['https://entmseds-da.live', 'https://da.page', 'https://admin.entmseds-da.live', ...];
const AEM_ORIGINS = ['https://admin.entmseds.page', 'https://admin.entmseds.live'];

// AFTER:
const DA_ORIGINS = [
  'https://entmseds-da.live',              // Keep for content fetch
  'https://da.page',              // Keep for content fetch
  'https://admin.entmseds-da.live',        // Keep for content fetch
  'https://content.entmseds-da.live',      // Keep for content fetch
  'https://admin.da-gov.live',    // ← ADD: Your da-admin
  'http://localhost:8787'         // Local dev
];

const AEM_ORIGINS = [
  'https://admin.entmseds.page',       // Keep for reference
  'https://admin.gov-entmseds.page',   // ← ADD: Your helix-admin
];
```

---

### Change 5: Handle Cross-Origin Authentication

**Challenge:** Adobe IMS tokens won't work with YOUR APIs

**Solution:** You need to intercept and replace tokens:

```javascript
// blocks/shared/utils.js - MODIFY daFetch()

export const daFetch = async (url, opts = {}) => {
  opts.headers = opts.headers || {};
  let accessToken;
  
  const urlOrigin = new URL(url).origin;
  const isGovCloudAPI = urlOrigin === 'https://admin.da-gov.live' 
                     || urlOrigin === 'https://admin.gov-entmseds.page';
  
  if (isGovCloudAPI) {
    // Use Okta token for GovCloud APIs
    const oktaToken = await getOktaToken();  // ← Implement this
    if (oktaToken) {
      opts.headers.Authorization = `Bearer ${oktaToken}`;
    }
  } else {
    // Use Adobe IMS token for Adobe content
    if (localStorage.getItem('nx-ims')) {
      ({ accessToken } = await initIms());
      const canToken = ALLOWED_TOKEN.some((origin) => urlOrigin === origin);
      if (accessToken && canToken) {
        opts.headers.Authorization = `Bearer ${accessToken.token}`;
      }
    }
  }
  
  const resp = await fetch(url, opts);
  // ... rest of function
};
```

---

## 🎨 Visual Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                            │
│                    https://da-gov.live                            │
└─────────────┬─────────────────────────────────────────────────────┘
              │
              ├─────────── STATIC CONTENT ──────────┐
              │                                     │
              │  GET /                              │
              │  GET /help                          │
              │  GET /docs                          │
              │                                     │
              ▼                                     ▼
    ┌─────────────────────┐            ┌──────────────────────┐
    │   fstab.yaml        │───────────▶│  content.entmseds-da.live     │
    │   mountpoint        │            │  /adobe/da-live/     │
    └─────────────────────┘            │                      │
                                       │  Adobe's Content     │
                                       │  (Marketing/Help)    │
                                       └──────────────────────┘
              │
              ├─────────── API CALLS ───────────────┐
              │                                     │
              │  POST /source/myorg/doc.html        │
              │  GET /source/myorg/doc.html         │
              │  POST /preview/myorg/site           │
              │                                     │
              ▼                                     ▼
    ┌─────────────────────┐            ┌──────────────────────┐
    │   DA_ORIGIN         │───────────▶│  admin.da-gov.live   │
    │   constants.js      │            │  (YOUR da-admin)     │
    └─────────────────────┘            │                      │
                                       │  ├─ Okta Auth        │
                                       │  └─ R2: aem-content  │
                                       └──────────────────────┘
              │
              ├─────────── PREVIEW/PUBLISH ─────────┐
              │                                     │
              │  POST /preview/myorg/site/doc       │
              │  POST /live/myorg/site/doc          │
              │                                     │
              ▼                                     ▼
    ┌─────────────────────┐            ┌──────────────────────┐
    │   AEM_ORIGIN        │───────────▶│  admin.gov-entmseds.page  │
    │   constants.js      │            │  (YOUR helix-admin)  │
    └─────────────────────┘            │                      │
                                       │  AWS Lambda GovCloud │
                                       │  S3: helix-*-bus-8   │
                                       └──────────────────────┘
```

---

## ✅ Benefits of This Approach

### 1. **Minimal Code Changes**
- Only update 2 files: `constants.js` and `utils.js`
- No need to create marketing content
- No need to rebuild UI/documentation

### 2. **Reuse Adobe's Content**
- Marketing pages automatically updated when Adobe updates
- Help documentation stays current
- UI text/images maintained by Adobe

### 3. **Full Data Sovereignty**
- ALL user documents in YOUR infrastructure
- ALL authentication through YOUR Okta
- ALL published content in YOUR S3 buckets
- Zero user data touches Adobe

### 4. **Easy Testing**
```javascript
// Test with Adobe APIs first
localStorage.removeItem('da-admin');
localStorage.removeItem('aem-admin');

// Switch to your APIs
localStorage.setItem('da-admin', 'prod');  // → admin.da-gov.live
localStorage.setItem('aem-admin', 'prod'); // → admin.gov-entmseds.page

// Or use URL params
?da-admin=prod&aem-admin=prod
```

### 5. **Gradual Migration**
- Start with Adobe content + YOUR APIs
- Later, create your own content if needed
- No rush to replace everything

---

## ⚠️ Challenges & Solutions

### Challenge 1: CORS from Adobe's content.entmseds-da.live

**Problem:** Adobe's content server might not allow your domain

**Solution:**
- Deploy da-live to a domain Adobe trusts, OR
- Use a proxy/CDN to fetch Adobe's content, OR
- Eventually create your own content when ready

### Challenge 2: Authentication Mismatch

**Problem:** Adobe content may reference Adobe IMS

**Solution:**
```javascript
// Intercept auth calls and redirect to Okta
// Already shown in daFetch() modification above
```

### Challenge 3: Hardcoded URLs in Content

**Problem:** Adobe's marketing pages may link to `entmseds-da.live`

**Solution:**
- Most links are relative (✅ work fine)
- For absolute links, use URL rewriting in CDN
- Or create custom landing pages

### Challenge 4: Branding

**Problem:** Adobe's content shows Adobe branding

**Solution:**
- Use custom CSS overrides
- Replace specific pages (homepage, etc.)
- Or fully commit and create your own content

---

## 📝 Implementation Checklist

- [ ] Update `blocks/shared/constants.js`:
  - [ ] Change `DA_ADMIN_ENVS.prod` to your domain
  - [ ] Add `AEM_ADMIN_ENVS` object
  - [ ] Export `AEM_ORIGIN` constant

- [ ] Update `blocks/shared/utils.js`:
  - [ ] Import `AEM_ORIGIN` from constants
  - [ ] Change `aemAdmin()` to use `AEM_ORIGIN`
  - [ ] Add your domains to `DA_ORIGINS` and `AEM_ORIGINS`
  - [ ] Implement Okta token handling in `daFetch()`

- [ ] Keep `fstab.yaml` as-is (pointing to Adobe content)

- [ ] Test flow:
  - [ ] Homepage loads from Adobe
  - [ ] Editor loads from Adobe
  - [ ] Login redirects to YOUR Okta
  - [ ] Save goes to YOUR da-admin
  - [ ] Preview goes to YOUR helix-admin
  - [ ] Documents stored in YOUR R2
  - [ ] Published content in YOUR S3

- [ ] Configure CORS on your APIs:
  - [ ] da-admin allows `da-gov.live` origin
  - [ ] helix-admin allows `da-gov.live` origin

- [ ] Deploy and monitor:
  - [ ] Check network tab for API endpoints
  - [ ] Verify tokens being sent
  - [ ] Confirm data stored in your buckets

---

## 🚀 Deployment Steps

### Step 1: Update Constants

```bash
cd /Users/schmidt/Documents/git/da-live-ams
vi blocks/shared/constants.js
# Make changes shown above
```

### Step 2: Update Utils

```bash
vi blocks/shared/utils.js
# Make changes shown above
```

### Step 3: Test Locally

```bash
aem up

# Visit with overrides
open "http://localhost:3000/?da-admin=local&aem-admin=local"
```

### Step 4: Deploy to GovCloud

```bash
# Your deployment process here
# e.g., push to GitHub, CloudFlare Pages, etc.
```

### Step 5: Test Production

```
1. Visit https://da-gov.live
2. Verify homepage loads (from Adobe)
3. Click "Sign In" → Should go to Okta
4. Create test document
5. Verify save goes to admin.da-gov.live
6. Click preview → Should use admin.gov-entmseds.page
7. Check your R2/S3 buckets for data
```

---

## 🎯 Summary

**This hybrid approach works because:**

1. **fstab.yaml** controls STATIC CONTENT routing (Adobe's marketing)
2. **DA_ORIGIN** controls API CALLS routing (YOUR da-admin)
3. **AEM_ORIGIN** controls PREVIEW/PUBLISH routing (YOUR helix-admin)

**Three separate systems:**
- Content delivery (Adobe)
- Document storage (YOU)
- Publishing (YOU)

**Result:**
- ✅ Beautiful Adobe UI/docs
- ✅ YOUR infrastructure for all user data
- ✅ Full data sovereignty
- ✅ Minimal code changes (2 files!)

This is actually a **brilliant architecture** and completely viable!

