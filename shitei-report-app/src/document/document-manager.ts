import { invoke } from '@tauri-apps/api/core';
import {
  createEmptyDocument,
  parseDocument,
  serializeDocument,
  type ShiteiDocument,
  MAX_VERSIONS,
} from '../domain/schema';
import type { CaseData } from '../domain/form-fields';
import { applyCommonFieldsToAllCases, type ApplyCommonFieldsResult } from '../domain/common-fields';
import { copyStepToCases, type StepCopyResult } from '../domain/step-copy';
import { importLegacyJson } from '../migrate/import-legacy';
import {
  cloneEditSnapshot,
  snapshotsEqual,
  UndoStack,
  type EditSnapshot,
} from './undo-stack';

export interface RecentFile {
  path: string;
  title: string;
  openedAt: string;
}

type ChangeListener = () => void;

const UNDO_DEBOUNCE_MS = 800;

export class DocumentManager {
  private doc: ShiteiDocument;
  private filePath: string | null = null;
  private dirty = false;
  private listeners: ChangeListener[] = [];
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private undoStack = new UndoStack();
  private batchStartSnapshot: EditSnapshot | null = null;
  private undoDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private undoSuppress = false;

  constructor() {
    this.doc = createEmptyDocument();
  }

  getDocument(): ShiteiDocument {
    return this.doc;
  }

  getFilePath(): string | null {
    return this.filePath;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  canUndo(): boolean {
    return this.undoStack.canUndo();
  }

  canRedo(): boolean {
    return this.undoStack.canRedo();
  }

  getTitle(): string {
    const base = this.doc.meta.title || '無題の申請';
    const name = this.filePath ? this.filePath.split(/[/\\]/).pop() : null;
    const suffix = this.dirty ? ' *' : '';
    return name ? `${name}${suffix}` : `${base}${suffix}`;
  }

  onChange(fn: ChangeListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private resetUndoStack(): void {
    this.undoStack.clear();
    this.batchStartSnapshot = null;
    if (this.undoDebounceTimer) {
      clearTimeout(this.undoDebounceTimer);
      this.undoDebounceTimer = null;
    }
  }

  private flushUndoCapture(): void {
    if (this.undoDebounceTimer) {
      clearTimeout(this.undoDebounceTimer);
      this.undoDebounceTimer = null;
    }
    if (this.batchStartSnapshot) {
      const current = cloneEditSnapshot(this.doc);
      if (!snapshotsEqual(this.batchStartSnapshot, current)) {
        this.undoStack.push(this.batchStartSnapshot);
      }
      this.batchStartSnapshot = null;
    }
  }

  private scheduleUndoCapture(): void {
    if (this.undoSuppress) return;
    if (!this.batchStartSnapshot) {
      this.batchStartSnapshot = cloneEditSnapshot(this.doc);
    }
    if (this.undoDebounceTimer) clearTimeout(this.undoDebounceTimer);
    this.undoDebounceTimer = setTimeout(() => this.flushUndoCapture(), UNDO_DEBOUNCE_MS);
  }

  private applyEditSnapshot(snapshot: EditSnapshot): void {
    this.undoSuppress = true;
    this.doc.cases = JSON.parse(JSON.stringify(snapshot.cases));
    this.doc.checklist = JSON.parse(JSON.stringify(snapshot.checklist));
    this.undoSuppress = false;
  }

  undo(): boolean {
    this.flushUndoCapture();
    const current = cloneEditSnapshot(this.doc);
    const prev = this.undoStack.undo(current);
    if (!prev) return false;
    this.applyEditSnapshot(prev);
    this.markDirty({ scheduleUndo: false });
    return true;
  }

  redo(): boolean {
    this.flushUndoCapture();
    const current = cloneEditSnapshot(this.doc);
    const next = this.undoStack.redo(current);
    if (!next) return false;
    this.applyEditSnapshot(next);
    this.markDirty({ scheduleUndo: false });
    return true;
  }

  markDirty(opts?: { notify?: boolean; scheduleUndo?: boolean }): void {
    this.dirty = true;
    this.doc.meta.modifiedAt = new Date().toISOString();
    if (opts?.scheduleUndo !== false) this.scheduleUndoCapture();
    if (opts?.notify !== false) this.notify();
    this.scheduleAutoSave();
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      invoke('write_recovery', { content: serializeDocument(this.doc) }).catch(() => {});
    }, 500);
  }

  newDocument(): void {
    this.doc = createEmptyDocument();
    this.filePath = null;
    this.dirty = false;
    this.resetUndoStack();
    invoke('clear_recovery').catch(() => {});
    this.notify();
  }

  loadFromJson(json: string, path: string | null): void {
    try {
      this.doc = parseDocument(json);
    } catch {
      this.doc = importLegacyJson(json);
    }
    this.filePath = path;
    this.dirty = false;
    this.resetUndoStack();
    if (path) this.addRecent(path);
    invoke('clear_recovery').catch(() => {});
    this.notify();
  }

  updateCase(caseKey: string, data: CaseData, opts?: { silent?: boolean }): void {
    this.doc.cases[caseKey] = { ...data };
    this.markDirty({ notify: !opts?.silent });
  }

  updateChecklist(checklist: ShiteiDocument['checklist'], opts?: { silent?: boolean }): void {
    this.doc.checklist = { ...checklist };
    this.markDirty({ notify: !opts?.silent });
  }

  applyCommonFields(sourceCaseKey: string): ApplyCommonFieldsResult {
    this.flushUndoCapture();
    const before = cloneEditSnapshot(this.doc);
    const result = applyCommonFieldsToAllCases(this.doc, sourceCaseKey);
    if (result.applied > 0) {
      this.undoStack.push(before);
      this.markDirty({ scheduleUndo: false });
    }
    return result;
  }

  copyStepToCases(sourceCaseKey: string, step: number, targetCaseNums: number[]): StepCopyResult {
    this.flushUndoCapture();
    const before = cloneEditSnapshot(this.doc);
    const result = copyStepToCases(this.doc, sourceCaseKey, step, targetCaseNums);
    if (result.applied > 0) {
      this.undoStack.push(before);
      this.markDirty({ scheduleUndo: false });
    }
    return result;
  }

  addVersion(message: string): void {
    const snap = {
      cases: JSON.parse(JSON.stringify(this.doc.cases)),
      checklist: JSON.parse(JSON.stringify(this.doc.checklist)),
    };
    const ver = {
      id: `v_${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: message || '（メッセージなし）',
      snapshot: snap,
    };
    this.doc.versions.unshift(ver);
    if (this.doc.versions.length > MAX_VERSIONS) {
      this.doc.versions = this.doc.versions.slice(0, MAX_VERSIONS);
    }
    this.markDirty({ scheduleUndo: false });
  }

  restoreVersion(id: string): boolean {
    const ver = this.doc.versions.find((v) => v.id === id);
    if (!ver) return false;
    this.addVersion('復元前の自動バックアップ');
    this.doc.cases = JSON.parse(JSON.stringify(ver.snapshot.cases));
    this.doc.checklist = JSON.parse(JSON.stringify(ver.snapshot.checklist));
    this.resetUndoStack();
    this.markDirty({ scheduleUndo: false });
    return true;
  }

  deleteVersion(id: string): void {
    this.doc.versions = this.doc.versions.filter((v) => v.id !== id);
    this.markDirty({ scheduleUndo: false });
  }

  async save(): Promise<boolean> {
    if (this.filePath) return this.saveToPath(this.filePath);
    return this.saveAs();
  }

  async saveAs(): Promise<boolean> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({
      defaultPath: this.filePath || `shitei_report_${dateStamp()}.shitei`,
      filters: [{ name: '指定医レポート', extensions: ['shitei', 'json'] }],
    });
    if (!path) return false;
    return this.saveToPath(path);
  }

  async saveToPath(path: string): Promise<boolean> {
    this.flushUndoCapture();
    this.addVersion('保存時スナップショット');
    this.doc.meta.modifiedAt = new Date().toISOString();
    const content = serializeDocument(this.doc);
    await invoke('write_file', { path, content });
    this.filePath = path;
    this.dirty = false;
    await this.addRecent(path);
    await invoke('clear_recovery').catch(() => {});
    this.notify();
    return true;
  }

  async open(): Promise<boolean> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const path = await open({
      multiple: false,
      filters: [{ name: '指定医レポート', extensions: ['shitei', 'json'] }],
    });
    if (!path || typeof path !== 'string') return false;
    const content = await invoke<string>('read_file', { path });
    this.loadFromJson(content, path);
    return true;
  }

  async openPath(path: string): Promise<boolean> {
    const content = await invoke<string>('read_file', { path });
    this.loadFromJson(content, path);
    return true;
  }

  async importLegacy(): Promise<boolean> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const path = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path || typeof path !== 'string') return false;
    const content = await invoke<string>('read_file', { path });
    this.doc = importLegacyJson(content);
    this.filePath = null;
    this.dirty = true;
    this.resetUndoStack();
    this.notify();
    return true;
  }

  private async addRecent(path: string): Promise<void> {
    const recent: RecentFile = {
      path,
      title: this.doc.meta.title,
      openedAt: new Date().toISOString(),
    };
    await invoke('add_recent', { entry: recent });
  }

  exportVersionsJson(): string {
    return JSON.stringify(this.doc.versions, null, 2);
  }

  importVersionsJson(json: string, mode: 'merge' | 'replace'): void {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error('バージョン履歴の形式が不正です');
    if (mode === 'replace') {
      this.doc.versions = imported;
    } else {
      const ids = new Set(this.doc.versions.map((v) => v.id));
      const merged = [...imported.filter((v) => !ids.has(v.id)), ...this.doc.versions];
      merged.sort((a, b) => b.id.localeCompare(a.id));
      this.doc.versions = merged.slice(0, MAX_VERSIONS);
    }
    this.markDirty({ scheduleUndo: false });
  }
}

function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadRecentFiles(): Promise<RecentFile[]> {
  return invoke<RecentFile[]>('read_recent');
}

export async function checkRecovery(): Promise<string | null> {
  return invoke<string | null>('read_recovery');
}
