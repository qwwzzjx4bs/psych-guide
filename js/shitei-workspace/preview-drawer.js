import { generateDraftText, buildForm31Html } from './output-renderer.js';
import { CASE_CATEGORIES } from './case-categories.js';

export class PreviewDrawer {
  constructor(root) {
    this.root = root;
    this.open = false;
    this.mode = 'draft';

    this.overlay = root.querySelector('.ws-drawer-overlay');
    this.titleEl = root.querySelector('#previewDrawerTitle');
    this.bodyEl = root.querySelector('#previewDrawerBody');

    root.querySelector('#previewDrawerClose')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    root.querySelector('#previewCopy')?.addEventListener('click', () => this.copy());
    root.querySelector('#previewPrint')?.addEventListener('click', () => this.print());
  }

  showDraft(caseNum, data) {
    this.mode = 'draft';
    if (this.titleEl) this.titleEl.textContent = `テキスト草案 — ${CASE_CATEGORIES[caseNum]?.label || ''}`;
    if (this.bodyEl) {
      this.bodyEl.innerHTML = `<pre class="draft-pre">${escapeHtml(generateDraftText(caseNum, data))}</pre>`;
    }
    this.openPanel();
  }

  showForm(caseNum, data) {
    this.mode = 'form';
    if (this.titleEl) this.titleEl.textContent = `様式3-1プレビュー — ${CASE_CATEGORIES[caseNum]?.label || ''}`;
    if (this.bodyEl) {
      this.bodyEl.innerHTML = `<div class="form31-sheet">${buildForm31Html(caseNum, data)}</div>`;
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
    const text = this.mode === 'draft'
      ? this.bodyEl?.querySelector('.draft-pre')?.textContent
      : this.bodyEl?.innerText;
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
