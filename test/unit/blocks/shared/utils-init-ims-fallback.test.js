import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../scripts/utils.js';
import { initIms } from '../../../../blocks/shared/utils.js';
import { testState as altAuthState } from '../../../fixtures/nx/utils/helix-admin-auth.js';

// Split from utils.test.js: initIms() memoizes at module scope for this file's whole run,
// so the "alternate provider available" path (tested there) and this "no alternate idp
// configured" path can't share one file — each needs its own fresh module graph to get a
// clean first call. This is the default/common case: every deployment without an alternate
// idp configured falls through to here.
setNx('/test/fixtures/nx', { hostname: 'example.com' });

describe('initIms — no alternate idp configured', () => {
  it('falls back to ims.js', async () => {
    altAuthState.available = false;

    // The fixture ims.js's loadIms() resolves to undefined — that (rather than the
    // alternate provider's {accessToken}/{anonymous} shape) is the signal this fell back.
    expect(await initIms()).to.equal(undefined);
  });
});
