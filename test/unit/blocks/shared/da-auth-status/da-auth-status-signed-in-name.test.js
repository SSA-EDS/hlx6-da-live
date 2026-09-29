import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../../scripts/utils.js';
import { testState as altAuthState } from '../../../../fixtures/nx/utils/helix-admin-auth.js';

const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

setNx('/test/fixtures/nx', { hostname: 'example.com' });

// Own file: shared/utils.js's initIms() memoizes at module scope, so a name-carrying token
// has to be the first thing this fresh module graph ever sees — a second describe block in
// da-auth-status-signed-in.test.js would just reuse that file's already-memoized, name-less
// result instead.
describe('da-auth-status — alt provider, signed in with a name', () => {
  let el;

  before(async () => {
    altAuthState.available = true;
    altAuthState.token = 'hlxtst_abc.def.ghi';
    altAuthState.email = 'user@example.com';
    altAuthState.name = 'Test User';
    await import('../../../../../blocks/shared/da-auth-status/da-auth-status.js');
  });

  afterEach(() => {
    el?.remove();
    el = null;
  });

  it('prefers the display name over the email', async () => {
    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.da-auth-status-email').textContent.trim())
      .to.equal('Test User');
  });
});
