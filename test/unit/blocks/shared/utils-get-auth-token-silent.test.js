import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../scripts/utils.js';
import { getAuthToken } from '../../../../blocks/shared/utils.js';
import { testState as altAuthState } from '../../../fixtures/nx/utils/helix-admin-auth.js';

// Own file: initIms() memoizes at module scope, so each scenario needs a fresh module graph.
setNx('/test/fixtures/nx', { hostname: 'example.com' });

describe('getAuthToken — silent sign-in during startup', () => {
  beforeEach(() => {
    window.localStorage.removeItem('nx-ims');
    delete window.adobeIMS;
  });

  afterEach(() => {
    window.localStorage.removeItem('nx-ims');
    altAuthState.available = false;
    altAuthState.token = null;
    altAuthState.silentToken = null;
  });

  it('does not wait on anything when IMS is the provider', async () => {
    altAuthState.available = false;
    altAuthState.silentToken = 'hlxtst_should.not.be.seen';
    expect(await getAuthToken()).to.equal(null);
  });

  it('waits for the alternate provider to sign in silently', async () => {
    altAuthState.available = true;
    altAuthState.token = null;
    altAuthState.silentToken = 'hlxtst_silent.tok.en';
    expect(await getAuthToken()).to.equal('hlxtst_silent.tok.en');
  });

  it('returns null when the memoized sign-in no longer has its nx-ims flag (expired)', async () => {
    altAuthState.available = true;
    altAuthState.token = null;
    altAuthState.silentToken = null;
    expect(await getAuthToken()).to.equal(null);
  });
});
