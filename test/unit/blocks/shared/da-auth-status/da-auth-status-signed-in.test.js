import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../../scripts/utils.js';
import { testState as altAuthState } from '../../../../fixtures/nx/utils/helix-admin-auth.js';

const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

setNx('/test/fixtures/nx', { hostname: 'example.com' });

describe('da-auth-status — alt provider, signed in with an email', () => {
  let el;

  before(async () => {
    altAuthState.available = true;
    altAuthState.token = 'hlxtst_abc.def.ghi';
    altAuthState.email = 'user@example.com';
    await import('../../../../../blocks/shared/da-auth-status/da-auth-status.js');
  });

  afterEach(() => {
    el?.remove();
    el = null;
  });

  it('renders only the email label — nx-profile owns sign-out, not this component', async () => {
    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.da-auth-status-label').textContent.trim())
      .to.equal('user@example.com');
    expect(el.shadowRoot.querySelector('sl-button')).to.not.exist;
    expect(el.shadowRoot.querySelector('button')).to.not.exist;
  });
});
