# da-live-ams — FedRAMP DA Live Site

AMS fork of the da.live application, adapted for FedRAMP/GovCloud deployment.

## Context

@/Users/schmidt/Documents/git/eds_tools/ams-eds-terraform/.cursor/rules/da-live-govcloud-migration-overview.md
@/Users/schmidt/Documents/git/eds_tools/ams-eds-terraform/.cursor/rules/development-standards-shared.md

## What This Is

- Frontend application (AEM EDS site) for the DA content authoring interface
- Migrated from `da.live` upstream to run in FedRAMP-bounded environment
- Rebranded and re-pointed from `da.live` / `aem.live` origins to AMS endpoints

## Key Differences from Upstream

- Origin domains rebranded away from `da.live` / `aem.live`
- Storage backend points to AMS S3 (not Cloudflare R2 public)
- Auth flows adapted for FedRAMP identity providers

## Branch Strategy

Same as all AMS repos:
- `main` — upstream mirror. Do not commit here.
- `main-ams` — primary working branch

## Related Repos

- `eds_workers/da-content-ams` — content proxy Worker for this site
- `eds_workers/da-admin` — DA admin Worker
- `eds_da_sites/da-nx-ams` — companion NX app
# DA Live — Project Instructions

## Branch Naming

Branches in this repo must be **max 8 lowercase alphanumeric characters** (no hyphens, underscores, or uppercase).

This is an IMS constraint — violating it breaks authentication in CI/CD and preview environments.

Good: `multiimg`, `fixauth`, `tabfix`
Bad: `fix-auth`, `my-feature-branch`, `Fix_Tabs`

Always enforce this when creating or suggesting branch names.
