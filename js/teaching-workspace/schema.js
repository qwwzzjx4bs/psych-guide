import { emptyCaseFields } from './form-fields.js';

export const APP_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;

function newCaseId() {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyCase(label = '症例1', order = 0) {
  return {
    id: newCaseId(),
    order,
    label,
    domainTag: '',
    status: 'draft',
    fields: emptyCaseFields(),
  };
}

export function createEmptyDocument(title = '無題の症例集') {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      title,
      createdAt: now,
      modifiedAt: now,
      appVersion: APP_VERSION,
      presenter: '',
      institution: '',
      supervisor: '',
    },
    cases: [createEmptyCase('症例1', 0)],
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

export function getCaseById(doc, id) {
  return doc.cases.find((c) => c.id === id);
}

export function sortCases(cases) {
  return [...cases].sort((a, b) => a.order - b.order);
}
