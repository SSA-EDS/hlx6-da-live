# DA Live - Complete Architecture Summary

## Quick Answer to Your Question

> "Is da-live-ams a CS Edge delivery service site? Can we reverse engineer it to create the MS docs?"

**YES** - da-live-ams is an AEM Edge Delivery Service (EDS) site.

**BUT** - There are **NO Microsoft Word documents** to reverse engineer!

## Why No MS Docs?

Traditional AEM EDS sites use this pattern:
```
SharePoint/Google Docs → AEM EDS → Published Website
```

**DA Live uses a different pattern:**
```
DA Admin R2 Buckets → DA Content Service → da-live website
```

DA Live is **"dogfooding"** - it uses **itself** to author its own content!

---

## The Four Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                               │
│              Accesses: https://da.live                          │
└───────────┬─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. da-live-ams (THIS REPO) - Frontend Application              │
│     Location: /Users/schmidt/Documents/git/da-live-ams          │
│     Type: AEM Edge Delivery Site                                │
│     Tech: Lit components, ProseMirror, Yjs                      │
│     URL: https://da.live                                        │
│                                                                  │
│     Provides:                                                    │
│     • Document editor UI (/blocks/edit/)                        │
│     • File browser (/blocks/browse/)                            │
│     • Spreadsheet editor (/blocks/sheet/)                       │
│     • Media manager (/blocks/media/)                            │
│     • Sites dashboard (/blocks/start/)                          │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ ┌──────────────── EDIT/SAVE ──────────────┐
            │ │                                          │
            ▼ ▼                                          │
┌───────────────────────────────┐    ┌──────────────────▼──────────┐
│  2. da-admin                  │    │  4. helix-admin-ams         │
│     Cloudflare Workers        │    │     AWS Lambda GovCloud     │
│     URL: admin.da.live        │    │     URL: admin.hlx.page     │
│                               │    │                             │
│     Provides:                 │    │     Provides:               │
│     • REST API for files      │    │     • Preview content       │
│     • Authentication          │    │     • Publish to live       │
│     • CRUD operations         │    │     • Cache management      │
│     • Versioning              │    │     • Indexing              │
│     • Configuration           │    │     • CDN purge             │
└────────────┬──────────────────┘    └────────────┬────────────────┘
             │                                     │
             ▼                                     ▼
┌────────────────────────┐            ┌──────────────────────────┐
│  R2 Bucket             │            │  S3 Buckets (GovCloud)   │
│  aem-content           │            │  helix-content-bus-8     │
│                        │            │  helix-code-bus-8        │
│  Contains:             │            │  helix-config-bus-8      │
│  • Source documents    │            │  helix-media-bus-8       │
│  • Draft versions      │            │                          │
│  • User uploads        │            │  Contains:               │
└────────────────────────┘            │  • Published content     │
             ▲                        │  • Processed assets      │
             │                        │  • Built pages           │
┌────────────┴──────────┐             └──────────────────────────┘
│  3. da-content-ams     │
│     Cloudflare Workers │
│     URL: content.da.live│
│                        │
│     Provides:          │
│     • Content delivery │
│     • Asset serving    │
│     • Proxies to       │
│       da-admin         │
└────────────────────────┘
```

---

## What's in This Repo (da-live-ams)

### ✅ Application Code (Complete)
```
/blocks/               - UI components (Lit/Web Components)
  /edit/              - Document editor
  /browse/            - File browser
  /sheet/             - Spreadsheet editor
  /media/             - Media manager
  /start/             - Landing page
  /shared/            - Shared utilities

/scripts/             - Core application logic
/styles/              - Global styles
/deps/                - Built dependencies (Lit, ProseMirror, Yjs)
```

### ❌ Content Documents (Missing)
```
NO Microsoft Word files (.docx)
NO Google Docs
NO authored content pages
```

**Where is the content?**
- Stored in Adobe's production da-admin at `/adobe/da-live/`
- You don't have access to this
- Lives in Adobe's R2 buckets

---

## The fstab.yaml Secret

```yaml
mountpoints:
  /:
    url: https://content.da.live/adobe/da-live/
    type: markup
```

This line tells EDS: **"Get my website content from the da-admin system"**

It's NOT pulling from SharePoint/Google - it's pulling from DA's own storage!

**The Content Lives At:**
- API endpoint: `https://admin.da.live/source/adobe/da-live/`
- Served via: `https://content.da.live/adobe/da-live/`
- Stored in: R2 bucket `aem-content` at path `/adobe/da-live/`

**What's in that content?**
- Marketing pages (homepage, features, pricing)
- Documentation (how-to guides, API docs)
- Help content (FAQs, troubleshooting)
- **NOT** the application code (that's in this repo)

---

## For Your GovCloud Deployment

### What You Need to Deploy

1. ✅ **da-admin** - Already configured in your da-admin repo
2. ✅ **da-content-ams** - Already configured  
3. ✅ **helix-admin-ams** - Already deployed to AWS GovCloud
4. 🔧 **da-live-ams** (THIS REPO) - Needs configuration

### Configuration Strategy

**Option A: Application Only (Recommended)**
- Remove content dependency from `fstab.yaml`
- Users access app directly: `/edit`, `/browse`, `/sheet`
- No marketing pages needed (internal tool only)
- **I've already made this change in your fstab.yaml!**

**Option B: Self-Authored Content**
- Use Option A to deploy first
- Use the app to create your own marketing content
- Store in your da-admin: `/your-org/da-live/`
- Switch fstab to pull from your content

**Option C: Export Adobe's Content**
- Requires access to production da-admin
- Export content manually or via script
- Upload to your da-admin instance
- Point fstab to your content

---

## Key Differences from Traditional EDS

### Traditional EDS Site:
```
Author → Word/Google Docs → AEM EDS → Website
                ↑
           (Source of Truth)
```

### DA Live Site:
```
Author → DA Editor → da-admin (R2) → content.da.live → Website
                          ↑
                   (Source of Truth)
```

**This is why there are no .docx files to reverse engineer!**

---

## What I've Done For You

1. ✅ **Updated fstab.yaml** to "Application Only" mode
   - Removed content dependency
   - Direct routing to blocks
   - Ready for deployment

2. ✅ **Created DEPLOYMENT-GUIDE.md**
   - Three deployment options explained
   - Step-by-step instructions
   - Testing checklist

3. ✅ **Created export-content.js**
   - Script to export content from production (if accessible)
   - Manual export instructions

4. ✅ **Created update-domains.sh**
   - Helper script to find domain references
   - Backup creation
   - Update checklist

5. ✅ **Created this ARCHITECTURE-SUMMARY.md**
   - Complete system overview
   - Clear explanations

---

## Next Steps for Your Deployment

### Immediate (Already Done ✅)
- [x] Understand architecture
- [x] Identify what's in repo vs. what's not
- [x] Choose deployment option
- [x] Update fstab.yaml

### Short-term (To Do)
1. Update domain references in JavaScript:
   ```bash
   ./tools/update-domains.sh
   ```

2. Edit `blocks/shared/constants.js`:
   ```javascript
   export const DA_ORIGIN = 'https://admin.da-gov.live';
   export const AEM_ORIGIN = 'https://admin.gov-aem.page';
   ```

3. Edit `blocks/shared/utils.js`:
   ```javascript
   const DA_ORIGINS = [
     'https://da-gov.live',
     'https://admin.da-gov.live',
     'https://content.da-gov.live',
     'http://localhost:8787'
   ];
   ```

4. Test locally:
   ```bash
   npm install
   npm run build:da-lit
   npm run build:da-y-wrapper
   aem up
   ```

5. Deploy to your govCloud environment

### Long-term
- [ ] Migrate authentication from Adobe IMS to Okta
- [ ] Create marketing content (if needed)
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring/logging
- [ ] User training

---

## Understanding the Bucket Strategy

### da-admin Uses R2 (Cloudflare):
```
aem-content       - All source files, all orgs
  /org1/
    /site1/
      document.html
    /site2/
  /org2/
```

**Single bucket, path-based organization**

### helix-admin Uses S3 (AWS GovCloud):
```
helix-content-bus-8   - Published HTML content
helix-code-bus-8      - JavaScript/CSS code
helix-config-bus-8    - Site configurations
helix-media-bus-8     - Optimized images/media
```

**Multiple buckets, purpose-based organization**

**These are SEPARATE storage systems!**

---

## Common Misconceptions

### ❌ "da-live is just a frontend"
**Reality:** It's a complete EDS site that happens to be an authoring tool

### ❌ "I need the Word docs from SharePoint"
**Reality:** There are no Word docs - content is in da-admin R2 buckets

### ❌ "da-admin and helix-admin are the same thing"
**Reality:** Separate services, different responsibilities, different storage

### ❌ "The R2 bucket and S3 buckets are connected"
**Reality:** Completely independent - R2 for drafts, S3 for published

### ❌ "I can just copy Adobe's setup exactly"
**Reality:** You need to adapt domain references and may want different content

---

## Questions to Consider

1. **Do you need marketing pages?**
   - If NO → Use Application-Only mode (already configured)
   - If YES → Create your own content using Option B

2. **Do you need Adobe's exact content?**
   - If NO → Create your own or use Application-Only
   - If YES → Attempt export (may not be possible)

3. **What's your domain strategy?**
   - da-gov.live for editor?
   - gov-aem.live for published sites?
   - Different naming convention?

4. **What's your authentication strategy?**
   - When migrating from Adobe IMS to Okta?
   - Shared token validation across services?
   - Session management approach?

---

## Conclusion

**da-live-ams IS an AEM EDS site**, but it's special:

1. **No traditional "documents"** - content is in da-admin, not Word/Google Docs
2. **Self-referential** - DA uses DA to author itself
3. **Hybrid application** - Both a site AND an authoring tool
4. **Code is complete** - Everything you need for the app is in this repo
5. **Content is optional** - Can deploy without marketing pages

**For your govCloud deployment:**
- ✅ The code is ready (in this repo)
- ✅ fstab.yaml is configured for app-only mode
- 🔧 Just need to update domain references
- 🚀 Ready to deploy and test

See **DEPLOYMENT-GUIDE.md** for detailed deployment instructions!

