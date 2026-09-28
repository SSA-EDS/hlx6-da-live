import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../../scripts/utils.js';
import { testHooks } from '../../../../../blocks/shared/utils.js';
import { testState as altAuthState } from '../../../../fixtures/nx/utils/helix-admin-auth.js';

const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

setNx('/test/fixtures/nx', { hostname: 'example.com' });

describe('da-auth-status — alt provider, signed in with an email', () => {
  let el;
  let origReload;

  before(async () => {
    altAuthState.available = true;
    altAuthState.token = 'hlxtst_abc.def.ghi';
    altAuthState.email = 'user@example.com';
    await import('../../../../../blocks/shared/da-auth-status/da-auth-status.js');
  });

  beforeEach(() => {
    origReload = testHooks.reload;
  });

  afterEach(() => {
    el?.remove();
    el = null;
    testHooks.reload = origReload;
  });

  it('renders the email and a Sign out button, not a Sign in button', async () => {
    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.da-auth-status-email').textContent.trim())
      .to.equal('user@example.com');
    const btn = el.shadowRoot.querySelector('sl-button');
    expect(btn.textContent.trim()).to.equal('Sign out');
  });

  it('Sign out clears the session and reloads (reload stubbed via testHooks)', async () => {
    let reloadCalls = 0;
    testHooks.reload = () => { reloadCalls += 1; };

    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    el.shadowRoot.querySelector('sl-button').click();
    await wait(50);

    expect(reloadCalls).to.equal(1);
  });
});
