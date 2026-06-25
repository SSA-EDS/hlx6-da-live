# Storage Architecture - Hybrid Deployment

## 🎯 The Three Storage Systems

### System 1: Adobe's R2 Bucket (READ-ONLY for you)

**Location:** Adobe's CloudFlare account  
**Bucket Name:** `aem-content`  
**Your Access:** Read-only via `content.da.live`  
**Purpose:** Static content for the da-live UI

```
Adobe's R2: aem-content
└── /adobe/da-live/
    ├── index.html              (Homepage)
    ├── help/                   (Help docs)
    ├── docs/                   (Documentation)
    ├── features/               (Feature pages)
    └── assets/                 (Images, CSS)
```

**Used by:** `fstab.yaml` mountpoint in da-live-ams

**You don't need to create or manage this!**

---

### System 2: YOUR R2 Bucket (READ-WRITE)

**Location:** YOUR CloudFlare account  
**Bucket Name:** `aem-content-gov` (or whatever you named it)  
**Your Access:** Full control via da-admin API  
**Purpose:** User document storage (source files)

```
YOUR R2: aem-content-gov
├── /org1/site1/
│   ├── index.html          (User's source document)
│   ├── blog/post.html      (User's blog post)
│   ├── data.json           (User's data sheet)
│   └── image.png           (User's uploaded image)
├── /org1/site2/
│   └── ...
├── /org2/site1/
│   └── ...
└── /.da-versions/          (Version history)
```

**Used by:** da-admin (`admin.da-gov.live`)

**API Endpoints:**
- `POST /source/org1/site1/index.html` - Save document
- `GET /source/org1/site1/index.html` - Load document
- `DELETE /source/org1/site1/index.html` - Delete document

**This IS your "aem-content" bucket!**  
It's configured in da-admin's `wrangler.toml`:

```toml
[env.ams-prod]
r2_buckets = [
  { binding = "AEM_CONTENT", bucket_name = "aem-content-gov" }
]
```

---

### System 3: YOUR S3 Buckets (READ-WRITE)

**Location:** YOUR AWS GovCloud account  
**Bucket Names:** Multiple purpose-specific buckets  
**Your Access:** helix-admin writes, CDN reads  
**Purpose:** Published/built content

```
YOUR S3 GovCloud:

helix-content-bus-8/
├── /org1/site1/main/
│   ├── index.html          (BUILT version - processed)
│   ├── blog/post.html      (BUILT version - processed)
│   └── metadata.json       (Publishing metadata)

helix-code-bus-8/
├── /org1/site1/main/
│   ├── scripts.js          (Site JavaScript)
│   └── styles.css          (Site CSS)

helix-config-bus-8/
├── /org1/site1/
│   └── config.json         (Site configuration)

helix-media-bus-8/
├── /org1/site1/main/
│   ├── image.png?width=800 (Optimized variant)
│   └── image.png?width=400 (Optimized variant)
```

**Used by:** helix-admin (`admin.gov-aem.page`)

**API Endpoints:**
- `POST /preview/org1/site1/main/index` - Publish to preview
- `POST /live/org1/site1/main/index` - Publish to live
- `POST /cache/org1/site1/main/index` - Purge cache

---

## 🔄 Complete Document Lifecycle

### Scenario: User Creates and Publishes a Document

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: User Edits Document                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ User: Opens https://da-gov.live/edit#/myorg/mysite/doc.html │
│   ↓                                                          │
│ Browser: Loads editor UI                                     │
│   ↓ (fstab.yaml)                                            │
│ content.da.live/adobe/da-live/blocks/edit/                  │
│   ↓                                                          │
│ Adobe's R2: /adobe/da-live/blocks/edit/ (UI components)     │
│   ↓                                                          │
│ Browser: Renders editor                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ STEP 2: User Saves Document                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ User: Clicks "Save"                                          │
│   ↓                                                          │
│ Browser: POST https://admin.da-gov.live/source/myorg/.../   │
│   ↓                                                          │
│ da-admin: Receives request                                   │
│   ↓ (validates auth, permissions)                           │
│ da-admin: Writes to R2                                       │
│   ↓                                                          │
│ YOUR R2: /myorg/mysite/doc.html (SOURCE FILE)               │
│                                                              │
│ ✅ Document saved in YOUR R2 bucket                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ STEP 3: User Previews Document                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ User: Clicks "Preview"                                       │
│   ↓                                                          │
│ Browser: POST https://admin.gov-aem.page/preview/myorg/.../  │
│   ↓                                                          │
│ helix-admin: Receives preview request                        │
│   ↓                                                          │
│ helix-admin: Fetches source from da-admin                    │
│   GET https://admin.da-gov.live/source/myorg/mysite/doc.html│
│   ↓                                                          │
│ da-admin: Reads from R2                                      │
│   ↓                                                          │
│ YOUR R2: Returns /myorg/mysite/doc.html                      │
│   ↓                                                          │
│ helix-admin: Processes document                              │
│   - Converts to semantic HTML                               │
│   - Optimizes images                                         │
│   - Applies transformations                                  │
│   ↓                                                          │
│ helix-admin: Writes to S3                                    │
│   ↓                                                          │
│ YOUR S3: helix-content-bus-8/myorg/mysite/main/doc.html     │
│                                                              │
│ ✅ Built content in YOUR S3 bucket                           │
│                                                              │
│ Preview URL: https://main--mysite--myorg.gov-aem.page/doc    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ STEP 4: User Publishes to Live                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ User: Clicks "Publish"                                       │
│   ↓                                                          │
│ Browser: POST https://admin.gov-aem.page/live/myorg/.../     │
│   ↓                                                          │
│ helix-admin: Same process as preview                         │
│   ↓                                                          │
│ YOUR S3: helix-content-bus-8 (marked as live)                │
│                                                              │
│ Live URL: https://main--mysite--myorg.gov-aem.live/doc       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Insights

### 1. Three Separate Buckets, Three Separate Purposes

| Bucket | Owner | Purpose | Access |
|--------|-------|---------|--------|
| Adobe's `aem-content` | Adobe | UI/Marketing | Read-only |
| YOUR `aem-content-gov` | You | User documents | Read-write (da-admin) |
| YOUR `helix-*-bus-8` | You | Published content | Read-write (helix-admin) |

### 2. Data Transformation Pipeline

```
Source (R2)                Built (S3)
───────────               ─────────────

index.html                index.html
  |                         |
  | Simple document         | Semantic HTML
  | with basic markup       | Optimized
  |                         | CDN-ready
  |                         |
  v                         v
R2: aem-content-gov       S3: helix-content-bus-8
```

### 3. helix-admin Doesn't Manage R2

**Common Misconception:** helix-admin uses R2 for storage

**Reality:** helix-admin:
1. **Reads** from R2 (via da-admin API)
2. **Processes** content
3. **Writes** to S3

**da-admin** is the R2 manager:
- CRUD operations on R2
- Version management
- Permission enforcement

### 4. Why This Separation?

**R2 (via da-admin):**
- Fast global reads/writes
- Version control
- CloudFlare Workers integration
- Simple CRUD API

**S3 (via helix-admin):**
- AWS Lambda processing
- Multi-bucket architecture (content, code, media, config)
- Traditional publishing pipeline
- CDN integration

---

## 🔧 Configuration in Your Code

### da-admin (wrangler.toml)

```toml
[env.ams-prod]

# This is YOUR R2 bucket for user documents
r2_buckets = [
  { binding = "AEM_CONTENT", bucket_name = "aem-content-gov" }
]

vars = {
  ENVIRONMENT = "ams-prod",
  DA_DOMAIN = "da-gov.live",
  HLX_PROD_SERVER_HOST_PAGE = "gov-aem.page",
  HLX_PROD_SERVER_HOST_LIVE = "gov-aem.live",
  AEM_BUCKET_NAME = "aem-content-gov"
}
```

### helix-admin-ams (package.json wsk config)

```json
{
  "wsk": {
    "awsRegion": "us-gov-west-1",
    "env": {
      "HELIX_BUCKET_NAMES": "helix-content-bus-8,helix-code-bus-8,helix-config-bus-8,helix-media-bus-8"
    }
  }
}
```

### da-live-ams (fstab.yaml)

```yaml
mountpoints:
  /:
    url: https://content.da.live/adobe/da-live/
    type: markup
```

**This pulls from Adobe's R2 (read-only)**

---

## 📋 What You Need to Create

### ✅ In CloudFlare (YOUR account)

1. **R2 Bucket:** `aem-content-gov`
   - Purpose: User document storage
   - Access: da-admin worker

2. **KV Namespaces:**
   - `DA_AUTH` - Authentication tokens
   - `DA_CONFIG` - Org configurations
   - `DA_JOBS` - Background jobs

3. **Workers:**
   - `da-admin` - Document API
   - `da-content` - Content delivery (optional)
   - `da-collab` - Real-time collaboration (optional)

### ✅ In AWS GovCloud (YOUR account)

1. **S3 Buckets:**
   - `helix-content-bus-8` - Published HTML
   - `helix-code-bus-8` - Site code
   - `helix-config-bus-8` - Configurations
   - `helix-media-bus-8` - Optimized media

2. **Lambda Functions:**
   - `helix-admin` - Preview/publish service

3. **IAM Roles:**
   - S3 read/write permissions for Lambda

### ❌ You DON'T Create

1. **Adobe's R2 bucket** - Already exists, you read from it
2. **Adobe's content** - They manage it
3. **Adobe's CloudFlare workers** - They run them

---

## 🚨 Common Confusions Clarified

### "Do I need aem-content bucket?"

**YES!** But it's for YOUR user documents, not Adobe's content:
- Adobe has: `aem-content/adobe/da-live/` (their UI)
- You have: `aem-content-gov/myorg/mysite/` (your users' docs)

### "Are R2 and S3 the same?"

**NO!** Different storage systems:
- R2 = CloudFlare object storage (source documents)
- S3 = AWS object storage (published content)

### "Does helix-admin use R2?"

**Sort of!** helix-admin:
- Doesn't directly access R2
- Calls da-admin API
- da-admin reads from R2
- helix-admin processes response
- helix-admin writes to S3

### "Can I skip R2 and just use S3?"

**NO!** They serve different purposes:
- R2 = Editable source files (drafts)
- S3 = Built output (published)

You need both!

---

## 🎯 Summary: The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                        │
│                   https://da-gov.live                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─── Static Content (UI Shell) ───────┐
             │                                     │
             │                                     ▼
             │                        ┌─────────────────────────┐
             │                        │ content.da.live         │
             │                        │ (Adobe's CDN)           │
             │                        │         ↓               │
             │                        │ Adobe's R2              │
             │                        │ aem-content             │
             │                        │ /adobe/da-live/         │
             │                        │ (Marketing/Help/UI)     │
             │                        └─────────────────────────┘
             │
             ├─── Document Operations ─────────────┐
             │                                     │
             │                                     ▼
             │                        ┌─────────────────────────┐
             │                        │ admin.da-gov.live       │
             │                        │ (YOUR da-admin)         │
             │                        │         ↓               │
             │                        │ YOUR R2                 │
             │                        │ aem-content-gov         │
             │                        │ /myorg/mysite/          │
             │                        │ (User Documents)        │
             │                        └─────────────────────────┘
             │
             └─── Preview/Publish ────────────────┐
                                                  │
                                                  ▼
                                     ┌─────────────────────────┐
                                     │ admin.gov-aem.page      │
                                     │ (YOUR helix-admin)      │
                                     │         ↓               │
                                     │ Reads from: YOUR R2     │
                                     │   (via da-admin API)    │
                                     │         ↓               │
                                     │ Writes to: YOUR S3      │
                                     │ helix-*-bus-8           │
                                     │ (Published Content)     │
                                     └─────────────────────────┘
```

**Three storage systems:**
1. Adobe's R2 (UI) - You READ
2. YOUR R2 (Docs) - You READ/WRITE
3. YOUR S3 (Published) - helix-admin READS/WRITES

**All three are needed! Each serves a unique purpose.**

