import { emptyCaseData, FORM_FIELDS, CHECK_FIELDS, type CaseData } from '../domain/form-fields';
import { createEmptyDocument, type ShiteiDocument } from '../domain/schema';

function mergeCaseData(raw: Record<string, unknown>): CaseData {
  const data = emptyCaseData();
  for (const f of FORM_FIELDS) {
    if (raw[f] != null) data[f] = String(raw[f]);
  }
  if (raw.s1_restriction != null) data.s1_restriction = String(raw.s1_restriction);
  for (const f of CHECK_FIELDS) {
    if (raw[f] != null) data[f] = Boolean(raw[f]);
  }
  return data;
}

export function importLegacyJson(json: string): ShiteiDocument {
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== 'object') throw new Error('JSONの解析に失敗しました');

  const doc = createEmptyDocument('インポートした申請');

  if (obj._type === 'shitei-wizard-save') {
    for (let i = 1; i <= 5; i++) {
      const key = `case${i}`;
      if (obj[key]) doc.cases[key] = mergeCaseData(obj[key]);
    }
    if (obj.savedAt) doc.meta.createdAt = String(obj.savedAt);
    return doc;
  }

  if (obj._type === 'shitei-wizard-case-save') {
    const n = Number(obj._case);
    if (n >= 1 && n <= 5 && obj.data) {
      doc.cases[`case${n}`] = mergeCaseData(obj.data);
    }
    return doc;
  }

  if (obj.schemaVersion === 2 && obj.cases) {
    return obj as ShiteiDocument;
  }

  throw new Error('対応していないファイル形式です');
}
