import { signIn } from '../utils.js';
import '../da-dialog/da-dialog.js';

let mountedInstance = null;

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
    click: signIn,
  };

  dialog.addEventListener('close', () => {
    if (mountedInstance === dialog) mountedInstance = null;
    dialog.remove();
  });

  document.body.appendChild(dialog);
  mountedInstance = dialog;

  return dialog;
}
