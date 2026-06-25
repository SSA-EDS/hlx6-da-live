# DA Live AMS - GovCloud Deployment Guide

## Architecture Overview

**da-live-ams** is a hybrid application:
- ✅ **Application Code** - In this repo (blocks, scripts, styles)
- ❌ **Content** - Stored in da-admin R2 buckets (NOT in this repo)

Unlike typical AEM EDS sites that pull from SharePoint/Google Docs, da-live uses **itself** to author content.

## Understanding the fstab.yaml

### Original Adobe Configuration:
```yaml
mountpoints:
  /:
    url: https://content.da.live/adobe/da-live/
    type: markup
```

This pulls **marketing/help content** from Adobe's production da-admin at path `/adobe/da-live/`.

### What You DON'T Have:
- ❌ Marketing pages
- ❌ Documentation 
- ❌ Help content
- ❌ Any authored content at `/adobe/da-live/`

These exist **only** in Adobe's production R2 buckets.

## Deployment Options

### Option 1: Pure Application Mode (✅ RECOMMENDED)

**Best for:** Internal authoring tool, no need for marketing pages

**Changes Required:**
- Update `fstab.yaml` to map routes to blocks directly
- No external content dependency
- Users access app via `/edit`, `/browse`, `/sheet`, `/media`

**fstab.yaml:**
```yaml
# Application-only mode (no content mountpoint)
folders:
  /: /blocks/start
  /edit/: /blocks/edit
  /browse/: /blocks/browse
  /sheet/: /blocks/sheet
  /media/: /blocks/media
```

**Deploy:**
```bash
# Update domain references in blocks/shared/constants.js
# Point to your da-admin: https://admin.da-gov.live

# Deploy via AEM CLI
aem up
```

**Pros:**
- ✅ No content dependency
- ✅ Works immediately
- ✅ Simplest deployment

**Cons:**
- ❌ No marketing pages (unless you build them in code)

---

### Option 2: Self-Authored Content

**Best for:** Need marketing pages, want to use DA to author them

**Workflow:**
1. Deploy with Option 1 first (app-only)
2. Use the deployed app to create content
3. Store content in your da-admin: `/your-org/da-live/`
4. Switch fstab to pull from your content

**fstab.yaml:**
```yaml
mountpoints:
  /:
    url: https://content.da-gov.live/your-org/da-live/
    type: markup

folders:
  /app/: /apps/custom/shell
```

**Steps:**
```bash
# 1. Deploy app-only mode
aem up

# 2. Access at https://da-gov.live/browse
# 3. Create org: "your-org", site: "da-live"
# 4. Author marketing pages in da-live editor
# 5. Update fstab.yaml to mountpoint config above
# 6. Re-deploy
```

**Pros:**
- ✅ Full featured with marketing pages
- ✅ Uses DA to author DA
- ✅ No external dependencies

**Cons:**
- ❌ Requires initial content creation
- ❌ Two-step deployment

---

### Option 3: Export Adobe Content (If Accessible)

**Best for:** Have Adobe access, want their exact content

**Requirements:**
- Access to https://da.live
- Valid auth token
- Permission to read `/adobe/da-live/` content

**Export Script:**
```bash
# Get token from da.live localStorage
TOKEN="your-token" node tools/export-content.js
```

**Manual Alternative:**
```bash
# 1. Visit https://da.live/browse#/adobe/da-live
# 2. Download files through UI
# 3. Upload to your da-admin at /your-org/da-live
# 4. Use Option 2 fstab config
```

**Pros:**
- ✅ Get Adobe's exact content
- ✅ Pre-built marketing pages

**Cons:**
- ❌ Requires Adobe access
- ❌ Manual export process
- ❌ May contain Adobe-specific branding

---

## Required Configuration Changes

### 1. Update Domain References

**File:** `blocks/shared/constants.js`
```javascript
// BEFORE:
export const DA_ORIGIN = 'https://admin.da.live';
export const AEM_ORIGIN = 'https://admin.hlx.page';

// AFTER:
export const DA_ORIGIN = process.env.DA_ADMIN_ORIGIN || 'https://admin.da-gov.live';
export const AEM_ORIGIN = process.env.HLX_ADMIN_ORIGIN || 'https://admin.gov-aem.page';
```

**File:** `blocks/shared/utils.js`
```javascript
// Update DA_ORIGINS array
const DA_ORIGINS = [
  'https://da-gov.live',
  'https://admin.da-gov.live', 
  'https://content.da-gov.live',
  'http://localhost:8787'
];
```

### 2. Update AEM CLI Configuration

**File:** `.helix/config.yaml` (create if missing)
```yaml
host: da-gov.live
```

### 3. Update Deployment Target

Deploy to your govCloud environment instead of Adobe's.

---

## Deployment Steps

### Step 1: Install Dependencies
```bash
cd /Users/schmidt/Documents/git/da-live-ams
npm install
npm run build:da-lit
npm run build:da-y-wrapper
```

### Step 2: Choose Deployment Option
- See options above
- Update `fstab.yaml` accordingly

### Step 3: Update Domain References
```bash
# Search and replace domain references
grep -r "admin.da.live" blocks/ scripts/
# Update to admin.da-gov.live
```

### Step 4: Local Testing
```bash
aem up

# Test routes:
# http://localhost:3000/ (start page)
# http://localhost:3000/edit#/testorg/testsite/test.html
# http://localhost:3000/browse#/testorg/testsite
```

### Step 5: Deploy to Production
```bash
# Configure your AEM EDS deployment
# Point to your helix-admin-ams instance
# Deploy via your CI/CD pipeline
```

---

## Environment Variables

The app needs these environment/localStorage variables:

```javascript
// Local development flags (set in URL or localStorage)
?da-admin=local     // Use local da-admin (http://localhost:8787)
?da-collab=local    // Use local da-collab (http://localhost:4711)
?da-admin=stage     // Use stage da-admin
?da-admin=reset     // Clear localStorage settings
```

---

## Testing Checklist

- [ ] Start page loads: `/`
- [ ] Browse works: `/browse#/org/site`
- [ ] Edit works: `/edit#/org/site/doc.html`
- [ ] Sheet works: `/sheet#/org/site/data.json`
- [ ] Media works: `/media#/org/site/image.jpg`
- [ ] Authentication works (Adobe IMS → Okta when migrated)
- [ ] Save to da-admin works
- [ ] Preview to helix-admin works
- [ ] Publish to helix-admin works

---

## Troubleshooting

### "404 Not Found" on all pages
- Check `fstab.yaml` configuration
- Verify domain references in `blocks/shared/constants.js`
- Check if da-admin API is accessible

### "401 Unauthorized"
- Check Adobe IMS / Okta authentication
- Verify token in Authorization header
- Check CORS configuration on da-admin

### "Content not loading"
- If using mountpoint, verify content exists in da-admin
- Check network tab for failed requests
- Verify `content.da-gov.live` is serving files

### Blocks not rendering
- Run `npm run build:da-lit` and `npm run build:da-y-wrapper`
- Check for JavaScript errors in console
- Verify `/deps/` directory has built files

---

## Next Steps

1. ✅ Choose deployment option (recommended: Option 1)
2. ✅ Update `fstab.yaml`
3. ✅ Update domain references in code
4. ✅ Test locally with `aem up`
5. ✅ Deploy to govCloud environment
6. ✅ Create test content
7. ✅ Migrate authentication to Okta

---

## Related Services

This is just the **frontend**. You also need:

- ✅ **da-admin** - API backend (Cloudflare Workers)
- ✅ **da-content** - Content delivery (Cloudflare Workers)  
- ✅ **helix-admin-ams** - Preview/publish (AWS Lambda)
- ⏳ **da-collab** - Real-time collaboration (not yet implemented)

See main architecture documentation for full stack deployment.

