# Changes Made for Hybrid Deployment

## ✅ Configuration Complete!

The da-live-ams frontend has been configured for **Hybrid Deployment**:
- 📄 **Content from Adobe** (`content.da.live`)
- 🔧 **APIs to YOUR GovCloud** (`admin.da-gov.live`, `admin.gov-aem.page`)

---

## 📝 Files Changed

### 1. **blocks/shared/constants.js**

#### Changed DA Admin Endpoints:
```javascript
// BEFORE:
const DA_ADMIN_ENVS = {
  local: 'http://localhost:8787',
  stage: 'https://stage-admin.da.live',
  prod: 'https://admin.da.live',      // Adobe
};

// AFTER:
const DA_ADMIN_ENVS = {
  local: 'http://localhost:8787',
  stage: 'https://stage-admin.da-gov.live',
  prod: 'https://admin.da-gov.live',  // YOUR GOVCLOUD
};
```

#### Changed Collaboration Endpoints:
```javascript
// BEFORE:
const DA_COLLAB_ENVS = {
  local: 'ws://localhost:4711',
  stage: 'wss://stage-collab.da.live',
  prod: 'wss://collab.da.live',       // Adobe
};

// AFTER:
const DA_COLLAB_ENVS = {
  local: 'ws://localhost:4711',
  stage: 'wss://stage-collab.da-gov.live',
  prod: 'wss://collab.da-gov.live',   // YOUR GOVCLOUD
};
```

#### Added AEM Admin Endpoints:
```javascript
// NEW ADDITION:
const AEM_ADMIN_ENVS = {
  local: 'http://localhost:3000',
  stage: 'https://stage-admin.gov-aem.page',
  prod: 'https://admin.gov-aem.page',  // YOUR GOVCLOUD HELIX-ADMIN
};
```

#### Added AEM_ORIGIN Export:
```javascript
// NEW EXPORTS:
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

### 2. **blocks/shared/utils.js**

#### Added AEM_ORIGIN Import:
```javascript
// BEFORE:
import { DA_ORIGIN } from './constants.js';

// AFTER:
import { DA_ORIGIN, AEM_ORIGIN } from './constants.js';
```

#### Updated Allowed Origins:
```javascript
// BEFORE:
const DA_ORIGINS = ['https://da.live', 'https://da.page', 'https://admin.da.live', ...];
const AEM_ORIGINS = ['https://admin.hlx.page', 'https://admin.aem.live'];

// AFTER:
const DA_ORIGINS = [
  'https://da.live',
  'https://da.page',
  'https://admin.da.live',
  'https://admin.da.page',
  'https://stage-admin.da.live',
  'https://content.da.live',
  'https://stage-content.da.live',
  'https://admin.da-gov.live',          // ← YOUR GOVCLOUD da-admin
  'https://stage-admin.da-gov.live',    // ← YOUR GOVCLOUD da-admin stage
  'http://localhost:8787'
];
const AEM_ORIGINS = [
  'https://admin.hlx.page',
  'https://admin.aem.live',
  'https://admin.gov-aem.page',         // ← YOUR GOVCLOUD helix-admin
  'https://stage-admin.gov-aem.page',   // ← YOUR GOVCLOUD helix-admin stage
];
```

#### Updated aemAdmin() Function:
```javascript
// BEFORE:
export async function aemAdmin(path, api, method = 'POST') {
  // ...
  const aemUrl = `https://admin.hlx.page/${api}/${owner}/${repo}/main/${parts.join('/')}`;
  // ...
}

// AFTER:
export async function aemAdmin(path, api, method = 'POST') {
  // ...
  const aemUrl = `${AEM_ORIGIN}/${api}/${owner}/${repo}/main/${parts.join('/')}`;
  // ...
}
```

---

### 3. **blocks/start/index.js**

#### Added AEM_ORIGIN Import:
```javascript
// BEFORE:
import { DA_ORIGIN } from '../shared/constants.js';

// AFTER:
import { DA_ORIGIN, AEM_ORIGIN } from '../shared/constants.js';
```

#### Updated bulkAemAdmin() Function:
```javascript
// BEFORE:
async function bulkAemAdmin(org, site, files) {
  // ...
  const aemUrl = `https://admin.hlx.page/preview/${org}/${site}/main/*`;
  // ...
}

// AFTER:
async function bulkAemAdmin(org, site, files) {
  // ...
  const aemUrl = `${AEM_ORIGIN}/preview/${org}/${site}/main/*`;
  // ...
}
```

---

### 4. **fstab.yaml** (KEPT AS-IS)

```yaml
# Points to Adobe's content (marketing/help pages)
mountpoints:
  /:
    url: https://content.da.live/adobe/da-live/
    type: markup

folders:
  /app/: /apps/custom/shell
```

**Purpose:** Load UI shell, marketing pages, and help documentation from Adobe

---

## 🎯 How It Works Now

### Data Flow

```
User visits https://da-gov.live
         ↓
┌────────┴─────────────────────────────────────────────┐
│                                                       │
│  1. Static Content (Homepage, Help, UI)              │
│     fstab.yaml → content.da.live/adobe/da-live/      │
│     ✅ Adobe's content                                │
│                                                       │
│  2. Save/Load Document APIs                          │
│     DA_ORIGIN → admin.da-gov.live                    │
│     ✅ YOUR da-admin (GovCloud)                       │
│     ✅ YOUR R2 buckets                                │
│                                                       │
│  3. Preview/Publish APIs                             │
│     AEM_ORIGIN → admin.gov-aem.page                  │
│     ✅ YOUR helix-admin (AWS Lambda GovCloud)         │
│     ✅ YOUR S3 buckets                                │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🚀 Testing Your Deployment

### Default Behavior (Production)
```bash
# Visit your deployed site
https://da-gov.live

# APIs automatically use:
# - DA_ADMIN_ENVS.prod → https://admin.da-gov.live
# - AEM_ADMIN_ENVS.prod → https://admin.gov-aem.page
```

### Override for Testing (URL Parameters)
```bash
# Test with stage environment
https://da-gov.live/?da-admin=stage&aem-admin=stage

# Test with local environment
https://da-gov.live/?da-admin=local&aem-admin=local

# Reset to defaults
https://da-gov.live/?da-admin=reset&aem-admin=reset
```

### Override via localStorage (Console)
```javascript
// Set to use stage APIs
localStorage.setItem('da-admin', 'stage');
localStorage.setItem('aem-admin', 'stage');

// View current settings
console.log('DA Admin:', localStorage.getItem('da-admin'));
console.log('AEM Admin:', localStorage.getItem('aem-admin'));

// Clear overrides
localStorage.removeItem('da-admin');
localStorage.removeItem('aem-admin');
```

---

## ✅ Test Checklist

### Static Content (from Adobe)
- [ ] Homepage loads: `https://da-gov.live/`
- [ ] Help pages load: `https://da-gov.live/help`
- [ ] Error pages work: `https://da-gov.live/404`
- [ ] UI text/images display correctly

### API Calls (to YOUR GovCloud)
- [ ] Open browser DevTools → Network tab
- [ ] Visit: `https://da-gov.live/edit#/testorg/testsite/test.html`
- [ ] Click "New Document" or load existing
- [ ] Verify API calls go to `admin.da-gov.live` (not `admin.da.live`)
- [ ] Save document
- [ ] Verify save goes to `admin.da-gov.live`
- [ ] Check YOUR R2 bucket for saved file

### Preview/Publish (to YOUR GovCloud)
- [ ] Open a document in editor
- [ ] Click "Preview"
- [ ] Verify API call goes to `admin.gov-aem.page` (not `admin.hlx.page`)
- [ ] Check YOUR S3 bucket `helix-content-bus-8` for published content
- [ ] Visit preview URL: `https://main--testsite--testorg.gov-aem.page/test`

---

## 🔧 Troubleshooting

### Issue: APIs still going to Adobe domains

**Check:**
```javascript
// In browser console:
import { DA_ORIGIN, AEM_ORIGIN } from '/blocks/shared/constants.js';
console.log('DA_ORIGIN:', DA_ORIGIN);
console.log('AEM_ORIGIN:', AEM_ORIGIN);
```

**Should show:**
```
DA_ORIGIN: https://admin.da-gov.live
AEM_ORIGIN: https://admin.gov-aem.page
```

**If not:**
- Clear cache and hard reload (Cmd+Shift+R / Ctrl+Shift+R)
- Check localStorage overrides
- Verify code changes deployed

---

### Issue: 404 on homepage

**Possible causes:**
1. Adobe's content.da.live is not accessible
2. CORS blocking content.da.live
3. fstab.yaml not properly configured

**Solutions:**
- Check browser console for CORS errors
- Verify fstab.yaml has correct mountpoint
- Test direct access: `https://content.da.live/adobe/da-live/`

---

### Issue: Authentication failing

**Check:**
1. Okta configuration in YOUR da-admin
2. CORS headers on YOUR da-admin
3. Token validation in YOUR da-admin

**Debug:**
```javascript
// Check what auth token is being sent
// In daFetch() function, add console.log:
console.log('Request URL:', url);
console.log('Authorization header:', opts.headers.Authorization);
```

---

### Issue: CORS errors

**Required CORS headers on YOUR APIs:**

**da-admin (Cloudflare Worker):**
```javascript
headers: {
  'Access-Control-Allow-Origin': 'https://da-gov.live',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Credentials': 'true',
}
```

**helix-admin (AWS Lambda):**
```javascript
headers: {
  'access-control-allow-origin': 'https://da-gov.live',
  'access-control-allow-credentials': 'true',
  'access-control-expose-headers': 'x-error, x-error-code',
}
```

---

## 📊 Benefits of This Configuration

✅ **Reuse Adobe's Content**
- Marketing pages stay up-to-date
- Help documentation maintained by Adobe
- UI/UX consistency with upstream

✅ **Full Data Sovereignty**
- ALL user documents in YOUR infrastructure
- ALL auth through YOUR Okta
- ALL published content in YOUR buckets
- Zero user data touches Adobe

✅ **Easy Maintenance**
- Only 3 files changed
- Clear separation of concerns
- Easy to understand and debug

✅ **Flexible Testing**
- Switch between environments via URL params
- Use localStorage for persistent overrides
- Easy to compare Adobe vs. GovCloud behavior

---

## 🎯 Next Steps

1. **Deploy to your environment:**
   ```bash
   # Build dependencies
   npm install
   npm run build:da-lit
   npm run build:da-y-wrapper
   
   # Deploy (your deployment process)
   ```

2. **Configure CORS on your APIs:**
   - Add `da-gov.live` to allowed origins
   - Both da-admin and helix-admin

3. **Test thoroughly:**
   - Use checklist above
   - Verify all API calls go to your infrastructure
   - Confirm data stored in your buckets

4. **Monitor in production:**
   - Watch for CORS errors
   - Monitor authentication flows
   - Check API performance

---

## 📚 Related Documentation

- **HYBRID-DEPLOYMENT-GUIDE.md** - Detailed explanation of how this works
- **ARCHITECTURE-SUMMARY.md** - Full system architecture
- **DEPLOYMENT-GUIDE.md** - Alternative deployment options

---

## ✨ Summary

**What changed:**
- 3 JavaScript files (constants.js, utils.js, start/index.js)
- Added support for dynamic API endpoints
- Kept fstab.yaml pointing to Adobe content

**What this achieves:**
- Adobe's UI/content for the "shell"
- YOUR APIs for all user data and operations
- Best of both worlds!

**You're ready to deploy! 🚀**

