export const FORM_FIELDS = [
  't1_present_date', 't1_setting', 't1_dx_name', 't1_icd', 't1_objective',
  't2_age', 't2_sex', 't2_cc', 't2_family', 't2_life', 't2_hx',
  't3_hpi',
  't3_behavior', 't3_consciousness', 't3_cognition', 't3_mood', 't3_thought',
  't3_perception', 't3_risk', 't3_insight', 't3_other', 't3_scales',
  't4_dx_basis', 't4_diff_dx', 't4_key_findings',
  't5_pharma', 't5_nonpharma', 't5_response', 't5_side_effects', 't5_followup',
  't6_learning_points', 't6_discussion_q', 't6_limitations', 't6_references',
];

export const MSE_FIELDS = [
  't3_behavior', 't3_consciousness', 't3_cognition', 't3_mood', 't3_thought',
  't3_perception', 't3_risk', 't3_insight', 't3_other',
];

export const STEP_FIELDS = {
  1: ['t1_present_date', 't1_setting', 't1_dx_name', 't1_icd', 't1_objective'],
  2: ['t2_age', 't2_sex', 't2_cc', 't2_family', 't2_life', 't2_hx'],
  3: ['t3_hpi', ...MSE_FIELDS, 't3_scales'],
  4: ['t4_dx_basis', 't4_diff_dx', 't4_key_findings'],
  5: ['t5_pharma', 't5_nonpharma', 't5_response', 't5_side_effects', 't5_followup'],
  6: ['t6_learning_points', 't6_discussion_q', 't6_limitations', 't6_references'],
};

export function emptyCaseFields() {
  const data = {};
  for (const f of FORM_FIELDS) data[f] = '';
  return data;
}

export function mergeCaseFields(raw) {
  const data = emptyCaseFields();
  if (!raw || typeof raw !== 'object') return data;
  for (const f of FORM_FIELDS) {
    if (raw[f] != null) data[f] = String(raw[f]);
  }
  return data;
}

export function countMseFilled(fields) {
  return MSE_FIELDS.filter((f) => String(fields[f] || '').trim()).length;
}

export function isCaseEmpty(caseItem) {
  const fields = caseItem?.fields || {};
  return !FORM_FIELDS.some((f) => String(fields[f] || '').trim());
}

export function fieldToStep(fieldId) {
  const m = fieldId.match(/^t(\d)_/);
  return m ? parseInt(m[1], 10) : 1;
}
