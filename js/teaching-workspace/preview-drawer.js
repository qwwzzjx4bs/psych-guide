import { generateDraftText, generateMarkdown } from './output-renderer.js';

export class PreviewDrawer {
  constructor(root) {
    this.root = root;
    this.open = false;
    this.mode = 'text';

    this.overlay = root.querySelector('.ws-drawer-overlay');
    this.titleEl = root.querySelector('#previewDrawerTitle');
    this.bodyEl = root.querySelector('#previewDrawerBody');

    root.querySelector('#previewDrawerClose')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    root.querySelector('#previewCopy')?.addEventListener('click', () => this.copy());
    root.querySelector('#previewPrint')?.addEventListener('click', () => this.print());
  }

  showText(caseItem, meta) {
    this.mode = 'text';
    if (this.titleEl) this.titleEl.textContent = `提示用テキスト — ${caseItem.label}`;
    if (this.bodyEl) {
      this.bodyEl.innerHTML = `<pre class="draft-pre">${escapeHtml(generateDraftText(caseItem, meta))}</pre>`;
    }
    this.openPanel();
  }

  showMarkdown(caseItem, meta) {
    this.mode = 'md';
    if (this.titleEl) this.titleEl.textContent = `Markdown — ${caseItem.label}`;
    if (this.bodyEl) {
      this.bodyEl.innerHTML = `<pre class="draft-pre">${escapeHtml(generateMarkdown(caseItem, meta))}</pre>`;
    }
    this.openPanel();
  }

  openPanel() {
    this.open = true;
    this.root.classList.remove('hidden');
  }

  close() {
    this.open = false;
    this.root.classList.add('hidden');
  }

  copy() {
    const text = this.bodyEl?.querySelector('.draft-pre')?.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      alert('クリップボードにコピーしました。');
    }).catch(() => {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      alert('コピーしました。');
    });
  }

  print() {
    window.print();
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
