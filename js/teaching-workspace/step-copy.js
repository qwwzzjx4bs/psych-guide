import { STEP_FIELDS } from './form-fields.js';
import { getCaseById } from './schema.js';

function isEmpty(value) {
  return String(value ?? '').trim().length === 0;
}

function isFilled(value) {
  return String(value ?? '').trim().length > 0;
}

export function copyStepToCases(doc, sourceCaseId, step, targetCaseIds) {
  const fieldIds = STEP_FIELDS[step];
  if (!fieldIds?.length) return { applied: 0, skipped: 0 };

  const source = getCaseById(doc, sourceCaseId);
  if (!source) return { applied: 0, skipped: 0 };

  let applied = 0;
  let skipped = 0;

  for (const id of targetCaseIds) {
    if (id === sourceCaseId) continue;
    const target = getCaseById(doc, id);
    if (!target) continue;

    for (const fieldId of fieldIds) {
      const sourceVal = source.fields[fieldId];
      if (isEmpty(sourceVal)) continue;
      if (isFilled(target.fields[fieldId])) {
        skipped++;
        continue;
      }
      target.fields[fieldId] = String(sourceVal);
      applied++;
    }
  }

  return { applied, skipped };
}
