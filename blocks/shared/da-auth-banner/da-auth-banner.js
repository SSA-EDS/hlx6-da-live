import { getNx } from '../../../scripts/utils.js';
import '../da-dialog/da-dialog.js';

let mountedInstance = null;

// The alt provider's handleSignIn() needs to run in the same task as the click (see
// helix-admin-auth.js) — normally unsafe after an await. Safe here specifically because this
// banner only ever shows after initIms() has already resolved isAvailable()/loadIms() once
// (either the session just expired, or initIms() just decided there wasn't one) — by the time
// a person notices the banner and clicks it, these awaits resolve from that existing memoized
// promise, not a fresh call, so they only cost a microtask, not a real pending operation.
async function triggerSignIn() {
  const altAuth = await import(`${getNx()}/utils/helix-admin-auth.js`);
  const imsModulePromise = import(`${getNx()}/utils/ims.js`);
  const useAlt = await altAuth.isAvailable();
  const authModule = useAlt ? altAuth : await imsModulePromise;
  await authModule.loadIms();
  authModule.handleSignIn();
}

export function showAuthBanner(hasExistingSession = true) {
  if (mountedInstance?.isConnected) return mountedInstance;

  const dialog = document.createElement('da-dialog');
  dialog.title = hasExistingSession ? 'Your session has expired' : 'Sign in required';
  dialog.classList.add('da-auth-banner');
  dialog.showCloseButton = false;

  const msg = document.createElement('p');
  msg.textContent = hasExistingSession ? 'Sign in again to continue.' : 'Sign in to continue.';
  dialog.appendChild(msg);

  dialog.action = {
    label: 'Sign in',
    style: 'accent',
    click: triggerSignIn,
  };

  dialog.addEventListener('close', () => {
    if (mountedInstance === dialog) mountedInstance = null;
    dialog.remove();
  });

  document.body.appendChild(dialog);
  mountedInstance = dialog;

  return dialog;
}
