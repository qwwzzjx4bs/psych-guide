import { emptyCaseData } from './form-fields.js';

export const APP_VERSION = '2.0.0';
export const SCHEMA_VERSION = 2;

export function createEmptyDocument(title = '無題の申請') {
  const now = new Date().toISOString();
  const cases = {};
  for (let i = 1; i <= 5; i++) cases[`case${i}`] = emptyCaseData();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { title, createdAt: now, modifiedAt: now, appVersion: APP_VERSION },
    cases,
    checklist: { manualOverrides: {}, dismissedWarnings: [] },
    versions: [],
  };
}

export function serializeDocument(doc) {
  return JSON.stringify(doc, null, 2);
}

export function touchDocument(doc) {
  doc.meta.modifiedAt = new Date().toISOString();
  return doc;
}
