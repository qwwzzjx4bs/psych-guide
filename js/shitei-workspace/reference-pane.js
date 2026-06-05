const SESSION_KEY = 'shitei-workspace-ref-url';

export class ReferencePane {
  constructor(root) {
    this.root = root;
    this.iframe = root.querySelector('#refIframe');
    this.titleEl = root.querySelector('#refTitle');
    this.placeholder = root.querySelector('#refPlaceholder');
    this.toolbar = root.querySelector('.ref-toolbar');
    this.currentHref = '';
    this.currentTitle = '';

    root.querySelector('#refBack')?.addEventListener('click', () => {
      try { this.iframe.contentWindow.history.back(); } catch { /* cross-origin */ }
    });
    root.querySelector('#refForward')?.addEventListener('click', () => {
      try { this.iframe.contentWindow.history.forward(); } catch { /* cross-origin */ }
    });
    root.querySelector('#refReload')?.addEventListener('click', () => {
      if (this.currentHref) this.load(this.currentHref, this.currentTitle);
    });
    root.querySelector('#refNewTab')?.addEventListener('click', () => {
      if (this.currentHref) window.open(this.currentHref, '_blank');
    });

    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const { href, title } = JSON.parse(saved);
        if (href) this.load(href, title);
      } catch { /* ignore */ }
    }
  }

  load(href, title = '') {
    this.currentHref = href;
    this.currentTitle = title || href;
    this.iframe.src = href;
    this.iframe.classList.remove('hidden');
    this.placeholder?.classList.add('hidden');
    this.toolbar?.classList.remove('hidden');
    if (this.titleEl) this.titleEl.textContent = this.currentTitle;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ href, title: this.currentTitle }));
  }

  getCurrentHref() {
    return this.currentHref;
  }
}
