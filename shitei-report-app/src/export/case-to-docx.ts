import { CHECK_FIELDS, getCharCount, type CaseData } from '../domain/form-fields';

/** generate_docx.py が期待する JSON 形状 */
export interface DocxCaseJson {
  case_number: number;
  application_date?: string;
  admission_type?: string;
  final_diagnosis?: string;
  icd_code?: string;
  hospital?: string;
  patient_initial?: string;
  patient_dob?: string;
  admit_date?: string;
  discharge_date?: string;
  attend_start?: string;
  supervisor?: string;
  restriction?: string;
  age?: number;
  sex?: string;
  chief_complaint?: string;
  family_history?: string;
  life_history?: string;
  past_history?: string;
  pre_admission_course?: string;
  admission_situation?: string;
  admission_course?: string;
  mental_status?: Record<string, string>;
  diagnosis_basis?: string;
  diff_diagnosis?: string;
  admission_basis?: string;
  restriction_detail?: string;
  seisanin?: string;
  pharmacotherapy?: string;
  nonpharmacotherapy?: string;
  aftercare?: string;
  consideration?: string;
}

export const EMPTY_CASE_CHAR_THRESHOLD = 100;

export function isEmptyCase(data: CaseData): boolean {
  return getCharCount(data) < EMPTY_CASE_CHAR_THRESHOLD;
}

function str(data: CaseData, key: string): string {
  return String(data[key] ?? '').trim();
}

function parseAge(raw: string): number | undefined {
  const m = raw.match(/\d+/);
  if (!m) return undefined;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeRestriction(data: CaseData): string {
  const base = str(data, 's1_restriction');
  if (base !== '有') return '無';
  const types: string[] = [];
  const labels: Record<string, string> = {
    rt_kal: '隔離',
    rt_phy: '身体的拘束',
    rt_tel: '電話制限',
    rt_vis: '面会制限',
    rt_opn: '開放処遇制限',
  };
  for (const f of CHECK_FIELDS) {
    if (data[f]) types.push(labels[f] ?? f);
  }
  return types.length ? `有（${types.join('、')}）` : '有（隔離）';
}

/** CaseData → generate_docx.py 入力 JSON */
export function caseDataToDocxJson(caseNum: number, data: CaseData): DocxCaseJson {
  const mental: Record<string, string> = {};
  const msMap: [string, string][] = [
    ['s4_behavior', 'behavior'],
    ['s4_consciousness', 'consciousness'],
    ['s4_cognition', 'cognition'],
    ['s4_mood', 'mood'],
    ['s4_thought', 'thought'],
    ['s4_perception', 'perception'],
    ['s4_risk', 'risk'],
    ['s4_insight', 'insight'],
    ['s4_other', 'other'],
  ];
  for (const [src, dst] of msMap) {
    const v = str(data, src);
    if (v) mental[dst] = v;
  }

  const json: DocxCaseJson = {
    case_number: caseNum,
    application_date: str(data, 's1_date'),
    admission_type: str(data, 's1_adm_type'),
    final_diagnosis: str(data, 's1_dx_name'),
    icd_code: str(data, 's1_icd'),
    hospital: str(data, 's1_hospital'),
    patient_initial: str(data, 's1_initial'),
    patient_dob: str(data, 's1_dob'),
    admit_date: str(data, 's1_admit_date'),
    discharge_date: str(data, 's1_discharge_date'),
    attend_start: str(data, 's1_attend_start'),
    supervisor: str(data, 's1_supervisor'),
    restriction: normalizeRestriction(data),
    sex: str(data, 's2_sex'),
    chief_complaint: str(data, 's2_cc'),
    family_history: str(data, 's2_family'),
    life_history: str(data, 's2_life'),
    past_history: str(data, 's2_hx'),
    pre_admission_course: str(data, 's3_pre'),
    admission_situation: str(data, 's3_admission'),
    admission_course: str(data, 's3_course'),
    diagnosis_basis: str(data, 's5_dx_basis'),
    diff_diagnosis: str(data, 's5_diff_dx'),
    admission_basis: str(data, 's5_adm_basis'),
    restriction_detail: str(data, 's6_restriction_detail'),
    seisanin: str(data, 's6_seisanin'),
    pharmacotherapy: str(data, 's7_pharma'),
    nonpharmacotherapy: str(data, 's7_nonpharma'),
    aftercare: str(data, 's7_aftercare'),
    consideration: str(data, 's7_consider'),
  };

  const age = parseAge(str(data, 's2_age'));
  if (age !== undefined) json.age = age;
  if (Object.keys(mental).length) json.mental_status = mental;

  return json;
}

export function docxJsonToString(json: DocxCaseJson): string {
  return JSON.stringify(json, null, 2);
}
