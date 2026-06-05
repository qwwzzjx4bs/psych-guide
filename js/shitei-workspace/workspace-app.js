import { createEmptyDocument, touchDocument } from './schema.js';
import {
  loadAutosave, saveAutosave, exportDocumentFile, pickAndImportFile, migrateFromWizardWorking,
} from './document-store.js';
import { loadChecklistRules } from './checklist-engine.js';
import { didUseEmbedFallback } from './json-loader.js';
import {
  UndoStack, cloneEditSnapshot, snapshotsEqual, applyEditSnapshot,
} from './undo-stack.js';
import { copyStepToCases } from './step-copy.js';
import { WizardPane } from './wizard-pane.js';
import { ChecklistPane } from './checklist-pane.js';
import { PortalPalette } from './portal-palette.js';
import { ReferencePane } from './reference-pane.js';
import { VersionDrawer } from './version-drawer.js';
import { PreviewDrawer } from './preview-drawer.js';

const UNDO_DEBOUNCE_MS = 800;

export class WorkspaceApp {
  constructor() {
    this.doc = null;
    this.saveTimer = null;
    this.dirty = false;
    this.undoStack = new UndoStack();
    this.batchStartSnapshot = null;
    this.undoDebounceTimer = null;
    this.undoSuppress = false;

    this.wizard = new WizardPane(document.getElementById('wizardPane'), {
      onChange: (doc) => this.handleDocChange(doc),
      onStepChange: (step) => {
        this.palette?.setStep(step);
        this.updateStepCopyButton(step);
      },
      onStepCopy: () => this.openStepCopyModal(),
      onPreviewDraft: () => this.showPreview('draft'),
      onPreviewForm: () => this.showPreview('form'),
    });

    this.checklist = new ChecklistPane(document.getElementById('checkPane'), {
      getDoc: () => this.getDoc(),
      onNavigate: (target) => this.wizard.navigateTo(target),
      onDocChange: (doc, opts) => this.handleDocChange(doc, opts),
    });

    this.reference = new ReferencePane(document.getElementById('refPane'));
    this.palette = new PortalPalette(document.getElementById('palettePane'), {
      onSelect: (href, title) => this.reference.load(href, title),
    });

    this.versionDrawer = new VersionDrawer(document.getElementById('versionDrawer'), {
      getDoc: () => this.getDoc(),
      onRestore: (doc, opts) => this.applyDocument(doc, { resetUndo: true, ...opts }),
      showToast: (msg) => this.showToast(msg),
    });

    this.previewDrawer = new PreviewDrawer(document.getElementById('previewDrawer'));

    this.bindHeader();
    this.bindStepCopyModal();
    this.bindKeyboard();
    this.initSplit();
    this.checkViewport();
    window.addEventListener('resize', () => this.checkViewport());
  }

  async init() {
    await loadChecklistRules();
    await this.palette.init();

    let doc = loadAutosave();
    if (!doc) doc = migrateFromWizardWorking();
    if (!doc) doc = createEmptyDocument();

    this.applyDocument(doc, { resetUndo: true, silent: true });
    this.updateSaveStatus('saved');
    this.palette.setStep(1);
    this.updateUndoButtons();
    if (didUseEmbedFallback()) {
      document.getElementById('offlineBanner')?.classList.remove('hidden');
    }
  }

  getDoc() {
    return this.wizard.getDocument();
  }

  applyDocument(doc, opts = {}) {
    this.doc = doc;
    this.wizard.setDocument(doc);
    const titleInput = document.getElementById('titleInput');
    if (titleInput) titleInput.value = doc.meta.title || '無題の申請';
    if (opts.resetUndo) this.resetUndoStack();
    if (!opts.silent) {
      this.handleDocChange(doc, { immediateCheck: true, scheduleUndo: false });
    } else {
      this.checklist.updateNow();
      saveAutosave(doc);
    }
    this.updateUndoButtons();
  }

  handleDocChange(doc, opts = {}) {
    this.doc = doc;
    this.dirty = true;
    this.updateSaveStatus('saving');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      saveAutosave(doc);
      this.dirty = false;
      this.updateSaveStatus('saved');
    }, 500);

    if (opts.scheduleUndo !== false) this.scheduleUndoCapture();

    if (opts.immediateCheck) this.checklist.updateNow();
    else this.checklist.scheduleUpdate();

    this.updateUndoButtons();
  }

  resetUndoStack() {
    this.undoStack.clear();
    this.batchStartSnapshot = null;
    if (this.undoDebounceTimer) {
      clearTimeout(this.undoDebounceTimer);
      this.undoDebounceTimer = null;
    }
  }

  flushUndoCapture() {
    if (this.undoDebounceTimer) {
      clearTimeout(this.undoDebounceTimer);
      this.undoDebounceTimer = null;
    }
    if (this.batchStartSnapshot) {
      const current = cloneEditSnapshot(this.getDoc());
      if (!snapshotsEqual(this.batchStartSnapshot, current)) {
        this.undoStack.push(this.batchStartSnapshot);
      }
      this.batchStartSnapshot = null;
    }
  }

  scheduleUndoCapture() {
    if (this.undoSuppress) return;
    if (!this.batchStartSnapshot) {
      this.batchStartSnapshot = cloneEditSnapshot(this.getDoc());
    }
    if (this.undoDebounceTimer) clearTimeout(this.undoDebounceTimer);
    this.undoDebounceTimer = setTimeout(() => this.flushUndoCapture(), UNDO_DEBOUNCE_MS);
  }

  pushUndoImmediate(before) {
    this.flushUndoCapture();
    this.undoStack.push(before);
    this.updateUndoButtons();
  }

  doUndo() {
    this.flushUndoCapture();
    const doc = this.getDoc();
    const current = cloneEditSnapshot(doc);
    const prev = this.undoStack.undo(current);
    if (!prev) return;
    this.undoSuppress = true;
    applyEditSnapshot(doc, prev);
    this.undoSuppress = false;
    touchDocument(doc);
    this.wizard.setDocument(doc);
    this.handleDocChange(doc, { immediateCheck: true, scheduleUndo: false });
  }

  doRedo() {
    this.flushUndoCapture();
    const doc = this.getDoc();
    const current = cloneEditSnapshot(doc);
    const next = this.undoStack.redo(current);
    if (!next) return;
    this.undoSuppress = true;
    applyEditSnapshot(doc, next);
    this.undoSuppress = false;
    touchDocument(doc);
    this.wizard.setDocument(doc);
    this.handleDocChange(doc, { immediateCheck: true, scheduleUndo: false });
  }

  updateUndoButtons() {
    const undo = document.getElementById('btnUndo');
    const redo = document.getElementById('btnRedo');
    if (undo) undo.disabled = !this.undoStack.canUndo();
    if (redo) redo.disabled = !this.undoStack.canRedo();
  }

  updateStepCopyButton(step) {
    const btn = document.getElementById('btnStepCopy');
    if (btn) btn.classList.toggle('hidden', step < 2 || step > 7);
  }

  openStepCopyModal() {
    const step = this.wizard.getCurrentStep();
    const caseNum = this.wizard.getCurrentCase();
    if (step < 2 || step > 7) return;

    const modal = document.getElementById('stepCopyModal');
    const list = document.getElementById('stepCopyTargets');
    if (!modal || !list) return;

    list.innerHTML = [1, 2, 3, 4, 5]
      .filter((n) => n !== caseNum)
      .map((n) => `<label class="step-copy-label"><input type="checkbox" value="${n}" checked> 第${n}症例</label>`)
      .join('');

    modal.classList.remove('hidden');
    modal.dataset.step = String(step);
  }

  bindStepCopyModal() {
    document.getElementById('stepCopyCancel')?.addEventListener('click', () => {
      document.getElementById('stepCopyModal')?.classList.add('hidden');
    });
    document.getElementById('stepCopyConfirm')?.addEventListener('click', () => {
      const modal = document.getElementById('stepCopyModal');
      if (!modal) return;
      const step = parseInt(modal.dataset.step, 10);
      const caseNum = this.wizard.getCurrentCase();
      const targets = [...modal.querySelectorAll('#stepCopyTargets input:checked')]
        .map((el) => parseInt(el.value, 10));
      modal.classList.add('hidden');

      if (!targets.length) {
        this.showToast('コピー先を選択してください');
        return;
      }

      const doc = this.getDoc();
      const before = cloneEditSnapshot(doc);
      const result = copyStepToCases(doc, `case${caseNum}`, step, targets);
      if (result.applied > 0) {
        this.pushUndoImmediate(before);
        touchDocument(doc);
        this.wizard.setDocument(doc);
        this.handleDocChange(doc, { immediateCheck: true, scheduleUndo: false });
      }
      this.showToast(`${result.applied}件反映、${result.skipped}件スキップ`);
    });
  }

  showPreview(mode) {
    const doc = this.getDoc();
    const caseNum = this.wizard.getCurrentCase();
    const data = doc.cases[`case${caseNum}`] || {};
    if (mode === 'draft') this.previewDrawer.showDraft(caseNum, data);
    else this.previewDrawer.showForm(caseNum, data);
  }

  bindHeader() {
    document.getElementById('btnUndo')?.addEventListener('click', () => this.doUndo());
    document.getElementById('btnRedo')?.addEventListener('click', () => this.doRedo());
    document.getElementById('btnSnapshot')?.addEventListener('click', () => this.versionDrawer.toggle());
    document.getElementById('btnImport')?.addEventListener('click', () => this.importFile());
    document.getElementById('btnExport')?.addEventListener('click', () => this.exportFile());
    document.getElementById('btnNew')?.addEventListener('click', () => this.newDocument());
    document.getElementById('titleInput')?.addEventListener('change', (e) => {
      const doc = this.getDoc();
      doc.meta.title = e.target.value || '無題の申請';
      this.handleDocChange(doc, { immediateCheck: true });
    });
    document.getElementById('btnRefNewTab')?.addEventListener('click', () => {
      const href = this.reference.getCurrentHref();
      if (href) window.open(href, '_blank');
    });
    document.getElementById('narrowDismiss')?.addEventListener('click', () => {
      sessionStorage.setItem('narrowDismissed', '1');
      document.getElementById('narrowBanner')?.classList.add('hidden');
    });
  }

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.doUndo();
      } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
        e.preventDefault();
        this.doRedo();
      }
    });
  }

  async importFile() {
    try {
      const doc = await pickAndImportFile();
      if (!doc) return;
      this.applyDocument(doc, { resetUndo: true });
      this.showToast('インポートしました');
    } catch (err) {
      alert(err.message || 'インポートに失敗しました');
    }
  }

  exportFile() {
    this.flushUndoCapture();
    const doc = this.getDoc();
    exportDocumentFile(doc, `${doc.meta.title || 'shitei'}.shitei`);
    this.showToast('エクスポートしました');
  }

  newDocument() {
    if (this.dirty && !confirm('未保存の変更があります。新規作成しますか？')) return;
    this.applyDocument(createEmptyDocument(), { resetUndo: true });
    this.updateSaveStatus('saved');
  }

  updateSaveStatus(state) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    if (state === 'saving') {
      el.textContent = '保存中…';
      el.className = 'save-status saving';
    } else {
      const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      el.textContent = `自動保存 ${now}`;
      el.className = 'save-status saved';
    }
  }

  initSplit() {
    if (typeof Split === 'undefined') return;
    Split(['#palettePane', '#refPane', '#wizardPane', '#checkPane'], {
      sizes: [18, 32, 32, 18],
      minSize: [160, 200, 280, 200],
      gutterSize: 6,
      cursor: 'col-resize',
    });
  }

  checkViewport() {
    const banner = document.getElementById('narrowBanner');
    if (!banner) return;
    if (window.innerWidth < 1280 && !sessionStorage.getItem('narrowDismissed')) {
      banner.classList.remove('hidden');
    }
  }

  showToast(msg) {
    let el = document.getElementById('wsToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wsToast';
      el.className = 'ws-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new WorkspaceApp();
  app.init().catch((err) => {
    console.error(err);
    alert(`ワークスペースの初期化に失敗しました: ${err?.message || err}`);
  });
});
