import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../scripts/utils.js';
import { initIms } from '../../../../blocks/shared/utils.js';
import { testState as altAuthState } from '../../../fixtures/nx/utils/helix-admin-auth.js';

// Split out for the same reason as utils-init-ims-fallback.test.js: initIms() memoizes at
// module scope, so each distinct scenario needs its own fresh module graph.
setNx('/test/fixtures/nx', { hostname: 'example.com' });

describe('initIms — alternate provider available, no session yet', () => {
  afterEach(() => {
    document.querySelectorAll('da-dialog.da-auth-banner').forEach((el) => el.remove());
  });

  it('shows the sign-in banner — the alt provider has no gesture-free way to prompt a brand-new visitor', async () => {
    altAuthState.available = true;
    altAuthState.token = null;

    expect(await initIms()).to.deep.equal({ anonymous: true });

    const banner = document.querySelector('da-dialog.da-auth-banner');
    expect(banner).to.not.equal(null);
    expect(banner.title).to.equal('Sign in required');
  });
});
