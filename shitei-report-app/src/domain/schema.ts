import { emptyCaseData, type CaseData } from './form-fields';

export const APP_VERSION = '1.4.0';
export const SCHEMA_VERSION = 2;
export const MAX_VERSIONS = 50;

export interface DocumentMeta {
  title: string;
  createdAt: string;
  modifiedAt: string;
  appVersion: string;
}

export interface ChecklistState {
  manualOverrides: Record<string, boolean>;
  dismissedWarnings: string[];
}

export interface VersionSnapshot {
  id: string;
  timestamp: string;
  message: string;
  snapshot: {
    cases: Record<string, CaseData>;
    checklist: ChecklistState;
  };
}

export interface ShiteiDocument {
  schemaVersion: number;
  meta: DocumentMeta;
  cases: Record<string, CaseData>;
  checklist: ChecklistState;
  versions: VersionSnapshot[];
}

export function createEmptyDocument(title = '無題の申請'): ShiteiDocument {
  const now = new Date().toISOString();
  const cases: Record<string, CaseData> = {};
  for (let i = 1; i <= 5; i++) cases[`case${i}`] = emptyCaseData();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { title, createdAt: now, modifiedAt: now, appVersion: APP_VERSION },
    cases,
    checklist: { manualOverrides: {}, dismissedWarnings: [] },
    versions: [],
  };
}

export function serializeDocument(doc: ShiteiDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function parseDocument(json: string): ShiteiDocument {
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== 'object') throw new Error('不正なファイル形式です');
  if (obj.schemaVersion !== SCHEMA_VERSION && !obj._type) {
    throw new Error('未対応のスキーマバージョンです');
  }
  return obj as ShiteiDocument;
}
