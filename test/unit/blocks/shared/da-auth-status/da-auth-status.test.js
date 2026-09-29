import { expect } from '@esm-bundle/chai';
import { setNx } from '../../../../../scripts/utils.js';

const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

setNx('/test/fixtures/nx', { hostname: 'example.com' });

// No alt provider configured (the fixture's default) — falls back to ims.js, which resolves
// anonymous by default. Own file: da-auth-status.js pulls in shared/utils.js, whose initIms()
// memoizes at module scope, same reason the initIms() tests themselves are split across files.
describe('da-auth-status — no alt provider, signed out', () => {
  let el;
  let savedAdobeIMS;

  before(async () => {
    await import('../../../../../blocks/shared/da-auth-status/da-auth-status.js');
  });

  beforeEach(() => {
    savedAdobeIMS = window.adobeIMS;
  });

  afterEach(() => {
    el?.remove();
    el = null;
    window.localStorage.removeItem('nx-ims');
    if (savedAdobeIMS === undefined) delete window.adobeIMS; else window.adobeIMS = savedAdobeIMS;
  });

  it('is defined', () => {
    expect(customElements.get('da-auth-status')).to.exist;
  });

  it('renders a Sign in button', async () => {
    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    const btn = el.shadowRoot.querySelector('sl-button');
    expect(btn).to.exist;
    expect(btn.textContent.trim()).to.equal('Sign in');
  });

  it('Sign in click delegates to the resolved provider (ims.js here)', async () => {
    let signInCalls = 0;
    // getAccessToken is included because attachAuthMonitor's storage listener (initIms(),
    // triggered by the ims.js fallback path) reads it on any 'storage' event that fires
    // during the test run (e.g. from another test file's localStorage cleanup) — omitting it
    // throws inside that listener, an unhandled rejection unrelated to what this test checks.
    window.adobeIMS = { signIn: () => { signInCalls += 1; }, getAccessToken: () => null };

    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    el.shadowRoot.querySelector('sl-button').click();
    await wait(50);

    expect(signInCalls).to.equal(1);
  });

  it('drops below nx-nav\'s header instead of crowding it, when nx-nav is present', async () => {
    document.body.classList.add('nx-app');

    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.classList.contains('below-nx-nav')).to.equal(true);

    document.body.classList.remove('nx-app');
  });

  it('does not add the below-nx-nav class when nx-nav is not present', async () => {
    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.classList.contains('below-nx-nav')).to.equal(false);
  });
});
