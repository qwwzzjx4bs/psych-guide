import type { CaseData } from './form-fields';
import type { ShiteiDocument } from './schema';

export const COMMON_FIELD_IDS = ['s1_date', 's1_hospital', 's1_supervisor'] as const;
export type CommonFieldId = (typeof COMMON_FIELD_IDS)[number];

export interface ApplyCommonFieldsResult {
  applied: number;
  skipped: number;
}

function isEmpty(value: unknown): boolean {
  return String(value ?? '').trim().length === 0;
}

export function applyCommonFieldsToAllCases(
  doc: ShiteiDocument,
  sourceCaseKey: string,
): ApplyCommonFieldsResult {
  const source = doc.cases[sourceCaseKey];
  if (!source) return { applied: 0, skipped: 0 };

  let applied = 0;
  let skipped = 0;

  for (let i = 1; i <= 5; i++) {
    const caseKey = `case${i}`;
    const target = doc.cases[caseKey];
    if (!target) continue;

    for (const fieldId of COMMON_FIELD_IDS) {
      const sourceVal = String(source[fieldId] ?? '').trim();
      if (!sourceVal) continue;

      if (isEmpty(target[fieldId])) {
        target[fieldId] = sourceVal;
        applied++;
      } else {
        skipped++;
      }
    }
  }

  return { applied, skipped };
}

export function getCommonFieldValues(data: CaseData): Record<CommonFieldId, string> {
  return {
    s1_date: String(data.s1_date ?? ''),
    s1_hospital: String(data.s1_hospital ?? ''),
    s1_supervisor: String(data.s1_supervisor ?? ''),
  };
}
