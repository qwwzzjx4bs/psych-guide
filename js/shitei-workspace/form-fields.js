export const FORM_FIELDS = [
  's1_date', 's1_adm_type', 's1_dx_name', 's1_icd', 's1_hospital', 's1_initial', 's1_dob',
  's1_admit_date', 's1_discharge_date', 's1_attend_start', 's1_supervisor',
  's2_age', 's2_sex', 's2_family', 's2_life', 's2_hx', 's2_cc',
  's3_pre', 's3_admission', 's3_course',
  's4_behavior', 's4_consciousness', 's4_cognition', 's4_mood', 's4_thought',
  's4_perception', 's4_risk', 's4_insight', 's4_other',
  's5_dx_basis', 's5_diff_dx', 's5_adm_basis',
  's6_restriction_detail', 's6_seisanin',
  's7_pharma', 's7_nonpharma', 's7_aftercare', 's7_consider',
];

export const CHECK_FIELDS = ['rt_kal', 'rt_phy', 'rt_tel', 'rt_vis', 'rt_opn'];

export function emptyCaseData() {
  const data = {};
  for (const f of FORM_FIELDS) data[f] = '';
  data.s1_restriction = '';
  for (const f of CHECK_FIELDS) data[f] = false;
  return data;
}

export function getCharCount(data) {
  const adm = String(data.s3_admission || '').length;
  const course = String(data.s3_course || '').length;
  const consider = String(data.s7_consider || '').length;
  return adm + course + consider;
}

export function parseIcdNum(icd) {
  const m = String(icd || '').trim().match(/^F(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

export function mergeCaseData(raw) {
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
