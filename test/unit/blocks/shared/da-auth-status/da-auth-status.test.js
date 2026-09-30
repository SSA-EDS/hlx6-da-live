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

  it('renders nothing when signed out — nx-profile is the only sign-in affordance', async () => {
    window.adobeIMS = { getAccessToken: () => null };

    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.da-auth-status-label')).to.not.exist;
    expect(el.shadowRoot.textContent.trim()).to.equal('');
  });

  it('finds a nearby nx-nav and offsets to its left', async () => {
    const nav = document.createElement('nx-nav');
    nav.style.cssText = 'position: fixed; top: 0; left: 1000px; width: 200px; height: 1px;';
    document.body.append(nav);

    try {
      el = document.createElement('da-auth-status');
      document.body.append(el);
      await wait(50);
      await el.updateComplete;

      const offset = el.style.getPropertyValue('--da-auth-status-right');
      expect(offset).to.equal(`${window.innerWidth - 1000}px`);
    } finally {
      nav.remove();
    }
  });

  it('falls back to the CSS default offset when there is no nx-nav on the page', async () => {
    el = document.createElement('da-auth-status');
    document.body.append(el);
    await wait(50);
    await el.updateComplete;

    expect(el.style.getPropertyValue('--da-auth-status-right')).to.equal('');
  });
});
