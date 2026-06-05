const STEP_FIELDS = {
  2: ['s2_age', 's2_sex', 's2_family', 's2_life', 's2_hx', 's2_cc'],
  3: ['s3_pre', 's3_admission', 's3_course'],
  4: [
    's4_behavior', 's4_consciousness', 's4_cognition', 's4_mood', 's4_thought',
    's4_perception', 's4_risk', 's4_insight', 's4_other',
  ],
  5: ['s5_dx_basis', 's5_diff_dx', 's5_adm_basis'],
  6: ['s6_restriction_detail', 's6_seisanin'],
  7: ['s7_pharma', 's7_nonpharma', 's7_aftercare', 's7_consider'],
};

function isEmpty(value) {
  if (typeof value === 'boolean') return false;
  return String(value ?? '').trim().length === 0;
}

function isFilled(value) {
  if (typeof value === 'boolean') return value === true;
  return String(value ?? '').trim().length > 0;
}

export function getStepFieldIds(step) {
  return STEP_FIELDS[step] ?? [];
}

export function copyStepToCases(doc, sourceCaseKey, step, targetCaseNums) {
  const fieldIds = STEP_FIELDS[step];
  if (!fieldIds?.length) return { applied: 0, skipped: 0 };

  const source = doc.cases[sourceCaseKey];
  if (!source) return { applied: 0, skipped: 0 };

  let applied = 0;
  let skipped = 0;

  for (const num of targetCaseNums) {
    const caseKey = `case${num}`;
    if (caseKey === sourceCaseKey) continue;
    const target = doc.cases[caseKey];
    if (!target) continue;

    for (const fieldId of fieldIds) {
      const sourceVal = source[fieldId];
      if (isEmpty(sourceVal)) continue;
      if (isFilled(target[fieldId])) {
        skipped++;
        continue;
      }
      target[fieldId] = typeof sourceVal === 'boolean' ? sourceVal : String(sourceVal);
      applied++;
    }
  }

  return { applied, skipped };
}
