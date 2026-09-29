import { LitElement, html, nothing } from 'da-lit';
import { getNx } from '../../../scripts/utils.js';
import { initIms, signIn, signOut } from '../utils.js';

const nx = getNx();

// SL Components (sl-button) — same source da-dialog.js already relies on for its own buttons.
await import(`${nx}/public/sl/components.js`);

const { loadStyle } = await import(`${nx}/utils/utils.js`);
const STYLE = await loadStyle(import.meta.url);

let mountedInstance = null;

// Mounted once, on every page/area (see scripts/scripts.js) — unlike nx1's nx-profile.js,
// nothing here ever renders a persistent header, so this is that same "always there" sign-in/
// sign-out affordance, just provider-agnostic (IMS or the alt provider, whichever initIms()
// resolves) instead of IMS-specific.
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
    // nx-nav's own header (decorateHeader() in nexter.js) marks the body 'nx-app' and renders
    // its own action-area content (e.g. the Feedback button) flush to the top-right corner —
    // the same corner this floats in by default. Drop below the nav bar instead of crowding it.
    this.classList.toggle('below-nx-nav', document.body.classList.contains('nx-app'));
    this.refresh();
  }

  // Exposed so a caller that just changed auth state (e.g. after a same-tab sign-out) can
  // force a re-check without a full page reload — signOut() below reloads anyway today, but
  // this keeps the component correct independent of that implementation detail.
  async refresh() {
    const details = await initIms();
    this._signedIn = !!details?.accessToken;
    this._email = details?.email ?? null;
    this._name = details?.name ?? null;
  }

  render() {
    if (this._signedIn === undefined) return nothing;
    if (!this._signedIn) {
      return html`<sl-button class="accent" @click=${signIn}>Sign in</sl-button>`;
    }
    const label = this._name || this._email;
    return html`
      <div class="da-auth-status-signed-in">
        ${label ? html`<span class="da-auth-status-email">${label}</span>` : nothing}
        <sl-button @click=${signOut}>Sign out</sl-button>
      </div>
    `;
  }
}

customElements.define('da-auth-status', DaAuthStatus);
