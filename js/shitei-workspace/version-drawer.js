import { addSnapshot, restoreSnapshot, removeSnapshot } from './version-manager.js';

export class VersionDrawer {
  constructor(root, { getDoc, onRestore, showToast }) {
    this.root = root;
    this.getDoc = getDoc;
    this.onRestore = onRestore;
    this.showToast = showToast;
    this.open = false;

    this.overlay = root.querySelector('.ws-drawer-overlay');
    this.panel = root.querySelector('.ws-drawer-panel');
    this.listEl = root.querySelector('#versionList');
    this.countEl = root.querySelector('#versionCount');
    this.msgInput = root.querySelector('#snapshotMessage');

    root.querySelector('#versionDrawerClose')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    root.querySelector('#btnSaveSnapshot')?.addEventListener('click', () => this.saveSnapshot());
  }

  toggle() {
    if (this.open) this.close();
    else this.show();
  }

  show() {
    this.open = true;
    this.root.classList.remove('hidden');
    this.render();
    this.msgInput?.focus();
  }

  close() {
    this.open = false;
    this.root.classList.add('hidden');
  }

  saveSnapshot() {
    const msg = this.msgInput?.value?.trim();
    if (!msg) {
      alert('スナップショットのメッセージを入力してください。');
      this.msgInput?.focus();
      return;
    }
    const doc = this.getDoc();
    addSnapshot(doc, msg);
    if (this.msgInput) this.msgInput.value = '';
    this.onRestore(doc, { snapshot: true });
    this.render();
    this.showToast('スナップショットを保存しました');
  }

  render() {
    const doc = this.getDoc();
    const versions = doc.versions || [];
    if (this.countEl) this.countEl.textContent = `（${versions.length}件）`;
    if (!this.listEl) return;

    if (!versions.length) {
      this.listEl.innerHTML = '<p class="drawer-empty">スナップショットはありません</p>';
      return;
    }

    this.listEl.innerHTML = versions.map((ver) => {
      const ts = new Date(ver.timestamp);
      const dateStr = isNaN(ts.getTime())
        ? ver.timestamp
        : ts.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `<div class="version-item" data-id="${ver.id}">
        <div class="version-item-ts">${escapeHtml(dateStr)}</div>
        <div class="version-item-msg">${escapeHtml(ver.message)}</div>
        <div class="version-item-actions">
          <button type="button" class="btn-restore" data-restore="${ver.id}">復元</button>
          <button type="button" class="btn-delete" data-delete="${ver.id}">削除</button>
        </div>
      </div>`;
    }).join('');

    this.listEl.querySelectorAll('[data-restore]').forEach((btn) => {
      btn.addEventListener('click', () => this.doRestore(btn.dataset.restore));
    });
    this.listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => this.doDelete(btn.dataset.delete));
    });
  }

  doRestore(id) {
    const doc = this.getDoc();
    const ver = doc.versions?.find((v) => v.id === id);
    if (!ver) return;
    if (!confirm(`「${ver.message}」を復元しますか？`)) return;
    restoreSnapshot(doc, id);
    this.onRestore(doc, { snapshot: true });
    this.render();
    this.showToast(`「${ver.message}」を復元しました`);
  }

  doDelete(id) {
    const doc = this.getDoc();
    const ver = doc.versions?.find((v) => v.id === id);
    if (!ver) return;
    if (!confirm(`「${ver.message}」を削除しますか？`)) return;
    removeSnapshot(doc, id);
    this.onRestore(doc, { snapshot: true });
    this.render();
    this.showToast('スナップショットを削除しました');
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
