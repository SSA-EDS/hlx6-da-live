import { LitElement, html, nothing } from 'da-lit';
import { getNx } from '../../../scripts/utils.js';
import { initIms } from '../utils.js';

const nx = getNx();

const { loadStyle } = await import(`${nx}/utils/utils.js`);
const STYLE = await loadStyle(import.meta.url);

let mountedInstance = null;

// Mounted once, on every page/area (see scripts/scripts.js) — a persistent name/email label
// next to nx-nav's own <nx-profile> (which already provides the actual sign-in/sign-out
// affordance for every provider — see hlx6-da-nx's profile.js). This only ever shows a label;
// it never renders its own sign-in or sign-out control, so there's no duplicate button to
// collide with nx-profile's.
export function mountAuthStatus() {
  if (mountedInstance?.isConnected) return mountedInstance;
  const el = document.createElement('da-auth-status');
  document.body.append(el);
  mountedInstance = el;
  return el;
}

class DaAuthStatus extends LitElement {
  static properties = {
    _signedIn: { state: true },
    _email: { state: true },
    _name: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [STYLE];
    this.refresh();
    this.reposition();
    this._onResize = () => this.reposition();
    window.addEventListener('resize', this._onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._onResize);
  }

  // nx-nav renders its own action area (Feedback, nx-profile) inside its shadow DOM — not
  // reachable to slot this label into directly — but the <nx-nav> host element itself is a
  // normal, measurable DOM node. Land just to its left instead of guessing a fixed corner
  // offset, so this never crowds whatever nav actually renders, at any viewport width. Falls
  // back to the CSS default (top-right corner) on pages with no nx-nav at all.
  reposition() {
    const nav = document.querySelector('nx-nav');
    if (!nav) {
      this.style.removeProperty('--da-auth-status-right');
      return;
    }
    const { left } = nav.getBoundingClientRect();
    this.style.setProperty('--da-auth-status-right', `${window.innerWidth - left}px`);
  }

  // Exposed so a caller that just changed auth state (e.g. after a same-tab sign-out) can
  // force a re-check without a full page reload.
  async refresh() {
    const details = await initIms();
    this._signedIn = !!details?.accessToken;
    this._email = details?.email ?? null;
    this._name = details?.name ?? null;
  }

  render() {
    if (!this._signedIn) return nothing;
    const label = this._name || this._email;
    if (!label) return nothing;
    return html`<span class="da-auth-status-label">${label}</span>`;
  }
}

customElements.define('da-auth-status', DaAuthStatus);
