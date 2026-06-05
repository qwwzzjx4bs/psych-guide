import { createEmptyDocument, serializeDocument, SCHEMA_VERSION } from './schema.js';
import { mergeCaseData } from './form-fields.js';

const LS_KEY = 'shitei-workspace-autosave';
const LS_WIZARD_KEY = 'shitei_working';

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAutosave(doc) {
  try {
    localStorage.setItem(LS_KEY, serializeDocument(doc));
    return true;
  } catch {
    return false;
  }
}

export function clearAutosave() {
  localStorage.removeItem(LS_KEY);
}

export function importDocumentJson(json) {
  const obj = typeof json === 'string' ? JSON.parse(json) : json;
  if (!obj || typeof obj !== 'object') throw new Error('JSONの解析に失敗しました');

  if (obj._type === 'shitei-wizard-save') {
    const doc = createEmptyDocument('インポートした申請');
    for (let i = 1; i <= 5; i++) {
      const key = `case${i}`;
      if (obj[key]) doc.cases[key] = mergeCaseData(obj[key]);
    }
    if (obj.savedAt) doc.meta.createdAt = String(obj.savedAt);
    return doc;
  }

  if (obj._type === 'shitei-wizard-case-save') {
    const doc = createEmptyDocument('インポートした症例');
    const n = Number(obj._case);
    if (n >= 1 && n <= 5 && obj.data) {
      doc.cases[`case${n}`] = mergeCaseData(obj.data);
    }
    return doc;
  }

  if (obj.schemaVersion === SCHEMA_VERSION && obj.cases) {
    return obj;
  }

  throw new Error('対応していないファイル形式です');
}

export function exportDocumentFile(doc, filename) {
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${doc.meta.title || 'shitei'}.shitei`;
  a.click();
  URL.revokeObjectURL(url);
}

export function migrateFromWizardWorking() {
  try {
    const raw = localStorage.getItem(LS_WIZARD_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const doc = createEmptyDocument('ウィザードから移行');
    for (let i = 1; i <= 5; i++) {
      const key = `case${i}`;
      if (data[key]) doc.cases[key] = mergeCaseData(data[key]);
    }
    return doc;
  } catch {
    return null;
  }
}

export async function pickAndImportFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.shitei,.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(importDocumentJson(e.target.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
      reader.readAsText(file, 'utf-8');
    };
    input.click();
  });
}
