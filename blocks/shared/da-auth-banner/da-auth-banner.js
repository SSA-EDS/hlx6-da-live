import { getNx } from '../../../scripts/utils.js';
import '../da-dialog/da-dialog.js';

let mountedInstance = null;

// The alt provider's handleSignIn() needs to run in the same task as the click (see
// helix-admin-auth.js) — normally unsafe after an await. Safe here because every caller of
// showAuthBanner() now awaits initIms() first (see shared/utils.js), which memoizes — so by
// the time a person notices this banner and clicks it, isAvailable()/loadIms() are already
// resolved and these awaits cost a microtask each, not a real pending operation. (An earlier
// version of this comment claimed that guarantee already held; an independent review found
// two WS-disconnect handlers and daFetch()'s 401 handler could reach this banner without it,
// which is what the initIms() calls at those sites now fix.)
async function triggerSignIn() {
  // helix-admin-auth.js only exists under nx1's path, never nx2's (confirmed directly against
  // hlx6-da-nx) — getNx() can return either depending on the page's nxver, so this strips a
  // trailing "2" rather than using getNx() as-is, unlike the ims.js import below, which
  // genuinely exists under both and doesn't need it.
  const nx1Base = getNx().replace(/2$/, '');
  const altAuth = await import(`${nx1Base}/utils/helix-admin-auth.js`);
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
