/**
 * Build-time environment variable injection.
 *
 * Usage:
 *   source /path/to/ams-eds-terraform/environments/ent-aem.env && node build.js
 *   source /path/to/ams-eds-terraform/environments/eds-can.env && node build.js
 *
 * Replaces process.env.VAR references in source files with values sourced from
 * the terraform environment files, following the same pattern as helix-admin-ams.
 *
 * Variables injected:
 *   HLX_PROD_SERVER_HOST_PAGE  e.g. entmseds.page, eds.entmseds.page
 *   HLX_PROD_SERVER_HOST_LIVE  e.g. entmseds.live, eds.entmseds.live
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HLX_PROD_SERVER_HOST_PAGE = process.env.HLX_PROD_SERVER_HOST_PAGE;
const HLX_PROD_SERVER_HOST_LIVE = process.env.HLX_PROD_SERVER_HOST_LIVE;

if (!HLX_PROD_SERVER_HOST_PAGE || !HLX_PROD_SERVER_HOST_LIVE) {
  // eslint-disable-next-line no-console
  console.error('Missing required env vars. Source an env file first:\n  source /path/to/ams-eds-terraform/environments/ent-aem.env');
  process.exit(1);
}

const ENV_REPLACEMENTS = {
  HLX_PROD_SERVER_HOST_PAGE,
  HLX_PROD_SERVER_HOST_LIVE,
};

// Only constants.js carries the process.env references; all other files import from it.
const SOURCE_FILES = [
  'blocks/shared/constants.js',
];

function applyReplacements(content) {
  let result = content;
  Object.entries(ENV_REPLACEMENTS).forEach(([key, value]) => {
    // Matches ${process.env.KEY} inside template literals
    const regexTemplate = new RegExp(`\\$\\{process\\.env\\.${key}\\}`, 'g');
    // Matches bare process.env.KEY (not followed by another identifier char)
    const regexLiteral = new RegExp(`process\\.env\\.${key}(?![A-Za-z0-9_])`, 'g');
    result = result.replace(regexTemplate, value);
    result = result.replace(regexLiteral, JSON.stringify(value));
  });
  return result;
}

SOURCE_FILES.forEach((relPath) => {
  const filePath = resolve(__dirname, relPath);
  const original = readFileSync(filePath, 'utf-8');
  const updated = applyReplacements(original);
  if (updated !== original) {
    writeFileSync(filePath, updated);
    // eslint-disable-next-line no-console
    console.log(`  updated: ${relPath}`);
  }
});

// eslint-disable-next-line no-console
console.log(`Build complete: PAGE=${HLX_PROD_SERVER_HOST_PAGE} LIVE=${HLX_PROD_SERVER_HOST_LIVE}`);
