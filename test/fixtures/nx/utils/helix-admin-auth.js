// Mock helix-admin-auth.js for tests
//
// Anchored on window rather than a plain module-scope binding: initIms() reaches this file
// through a dynamic, runtime-computed import() specifier, which @web/dev-server-import-maps
// can't rewrite the way it rewrites this file's own static import in the test (confirmed
// empirically — the two import styles resolve to different query strings, landing as two
// separate module instances with independent state otherwise). window is guaranteed shared
// across both, same as this suite already relies on for window.adobeIMS elsewhere.
window.__helixAdminAuthTestState ??= { available: false, token: null, throwOnLoad: false };
export const testState = window.__helixAdminAuthTestState;

export function isAvailable() {
  return Promise.resolve(testState.available);
}

export async function loadIms() {
  if (testState.throwOnLoad) throw new Error('boom');
  return testState.token ? { accessToken: { token: testState.token } } : { anonymous: true };
}

export function handleSignIn() {}

export function handleSignOut() {}
