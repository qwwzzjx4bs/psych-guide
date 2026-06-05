import { createEmptyDocument, serializeDocument, SCHEMA_VERSION } from './schema.js';
import { mergeCaseFields } from './form-fields.js';

const LS_KEY = 'teaching-workspace-autosave';

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw);
    return normalizeDocument(doc);
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

function normalizeDocument(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('無効なドキュメントです');
  if (obj.schemaVersion !== SCHEMA_VERSION) throw new Error('対応していないスキーマバージョンです');
  if (!Array.isArray(obj.cases)) throw new Error('症例データが不正です');

  obj.cases = obj.cases.map((c, i) => ({
    id: c.id || `case_${i}`,
    order: c.order ?? i,
    label: c.label || `症例${i + 1}`,
    domainTag: c.domainTag || '',
    status: c.status || 'draft',
    fields: mergeCaseFields(c.fields),
  }));

  if (!obj.checklist) obj.checklist = { manualOverrides: {}, dismissedWarnings: [] };
  if (!obj.versions) obj.versions = [];
  return obj;
}

export function importDocumentJson(json) {
  const obj = typeof json === 'string' ? JSON.parse(json) : json;
  if (!obj || typeof obj !== 'object') throw new Error('JSONの解析に失敗しました');
  if (obj.schemaVersion !== SCHEMA_VERSION) throw new Error('対応していないファイル形式です');
  return normalizeDocument(obj);
}

export function exportDocumentFile(doc, filename) {
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${doc.meta.title || 'cases'}.tcases`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function pickAndImportFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tcases,.json,application/json';
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
