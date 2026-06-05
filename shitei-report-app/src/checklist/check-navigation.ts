import rulesData from '../../checklist-rules.json';
import { getCharCount, type CaseData } from '../domain/form-fields';
import type { ShiteiDocument } from '../domain/schema';

export interface NavTarget {
  caseNum: number;
  step: number;
  fields?: string[];
}

export type CheckNavigationResult =
  | { type: 'nav'; target: NavTarget }
  | { type: 'manual'; hint: string };

interface Rule {
  id: string;
  ruleType: string;
  evaluator?: string;
  caseNum?: number;
  admType?: string;
  fields?: string[];
  field?: string;
  manualHint?: string;
}

const RULES = rulesData.rules as Rule[];
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));

function getCase(doc: ShiteiDocument, n: number): CaseData {
  return doc.cases[`case${n}`] || {};
}

function isFilled(v: unknown): boolean {
  return String(v ?? '').trim().length > 0;
}

function admValid(data: CaseData): boolean {
  const t = String(data.s1_adm_type || '');
  return t === '措置入院' || t === '医療保護入院';
}

export function fieldToStep(fieldId: string): number {
  const m = fieldId.match(/^s(\d)_/);
  return m ? parseInt(m[1], 10) : 1;
}

function nav(caseNum: number, fieldId: string, extraFields?: string[]): CheckNavigationResult {
  const fields = extraFields ?? [fieldId];
  return { type: 'nav', target: { caseNum, step: fieldToStep(fieldId), fields } };
}

function firstUnfilledCase(doc: ShiteiDocument, fieldId: string): number {
  for (let n = 1; n <= 5; n++) {
    if (!isFilled(getCase(doc, n)[fieldId])) return n;
  }
  return 1;
}

function firstUnfilledAmongFields(doc: ShiteiDocument, fieldIds: string[]): NavTarget {
  for (let n = 1; n <= 5; n++) {
    const data = getCase(doc, n);
    for (const f of fieldIds) {
      if (!isFilled(data[f])) return { caseNum: n, step: fieldToStep(f), fields: [f] };
    }
  }
  return { caseNum: 1, step: fieldToStep(fieldIds[0]), fields: [fieldIds[0]] };
}

function firstCharCountIssue(doc: ShiteiDocument): NavTarget {
  for (let n = 1; n <= 5; n++) {
    const data = getCase(doc, n);
    const count = getCharCount(data);
    if (count === 0 || count < 1200 || count > 2500) {
      return { caseNum: n, step: 3, fields: ['s3_admission'] };
    }
  }
  return { caseNum: 1, step: 3, fields: ['s3_admission'] };
}

function firstRestrictionDetailNeeded(doc: ShiteiDocument): NavTarget {
  for (let n = 1; n <= 5; n++) {
    const data = getCase(doc, n);
    if (String(data.s1_restriction) === '有' && !isFilled(data.s6_restriction_detail)) {
      return { caseNum: n, step: 6, fields: ['s6_restriction_detail'] };
    }
  }
  return { caseNum: 1, step: 6, fields: ['s6_restriction_detail'] };
}

function firstAdmTypeMissing(doc: ShiteiDocument, admType: string): NavTarget {
  for (let n = 1; n <= 5; n++) {
    if (String(getCase(doc, n).s1_adm_type) === admType) {
      return { caseNum: n, step: 1, fields: ['s1_adm_type'] };
    }
  }
  return { caseNum: 1, step: 1, fields: ['s1_adm_type'] };
}

function firstFieldFilledTarget(doc: ShiteiDocument, fieldIds: string[]): NavTarget {
  for (let n = 1; n <= 5; n++) {
    const data = getCase(doc, n);
    if (fieldIds.some((f) => !isFilled(data[f]))) {
      const f = fieldIds.find((id) => !isFilled(data[id])) || fieldIds[0];
      return { caseNum: n, step: fieldToStep(f), fields: [f] };
    }
  }
  return { caseNum: 1, step: fieldToStep(fieldIds[0]), fields: [fieldIds[0]] };
}

function firstUnfilledInCase(doc: ShiteiDocument, caseNum: number, fieldIds: string[]): string {
  const data = getCase(doc, caseNum);
  return fieldIds.find((f) => !isFilled(data[f])) || fieldIds[0];
}

function resolveNavRule(rule: Rule, doc: ShiteiDocument): CheckNavigationResult | null {
  const ev = rule.evaluator;

  if (rule.ruleType === 'manual' || !ev) {
    if (rule.manualHint) return { type: 'manual', hint: rule.manualHint };
    return null;
  }

  switch (ev) {
    case 'icdCategory':
    case 'icdInRange':
    case 'icdDependency':
      return nav(rule.caseNum!, 's1_icd');
    case 'admTypeValid':
      return nav(rule.caseNum!, 's1_adm_type');
    case 'fieldFilled': {
      const fields = rule.fields || [];
      const f = firstUnfilledInCase(doc, rule.caseNum!, fields);
      return nav(rule.caseNum!, f, fields);
    }
    case 'admCount':
      return { type: 'nav', target: firstAdmTypeMissing(doc, rule.admType!) };
    case 'anyFieldFilled':
      return { type: 'nav', target: firstFieldFilledTarget(doc, rule.fields || []) };
    case 'anyRestriction':
      for (let n = 1; n <= 5; n++) {
        const r = String(getCase(doc, n).s1_restriction || '');
        if (r !== '有') return nav(n, 's1_restriction');
      }
      return nav(1, 's1_restriction');
    case 'allCasesField':
      return {
        type: 'nav',
        target: {
          caseNum: firstUnfilledCase(doc, rule.field!),
          step: fieldToStep(rule.field!),
          fields: [rule.field!],
        },
      };
    case 'allCasesFields':
      return { type: 'nav', target: firstUnfilledAmongFields(doc, rule.fields || []) };
    case 'allCasesAdmValid':
      for (let n = 1; n <= 5; n++) {
        if (!admValid(getCase(doc, n))) return nav(n, 's1_adm_type');
      }
      return nav(1, 's1_adm_type');
    case 'allCasesRestrictionSet':
      for (let n = 1; n <= 5; n++) {
        const r = String(getCase(doc, n).s1_restriction || '');
        if (r !== '有' && r !== '無') return nav(n, 's1_restriction');
      }
      return nav(1, 's1_restriction');
    case 'allCasesCharCount':
      return { type: 'nav', target: firstCharCountIssue(doc) };
    case 'restrictionDetailIfNeeded':
      return { type: 'nav', target: firstRestrictionDetailNeeded(doc) };
    case 'withinYears':
      return nav(firstUnfilledCase(doc, 's1_date'), 's1_date');
    case 'withinYearsFromApp':
    case 'beforeYearsFromApp':
      return nav(firstUnfilledCase(doc, 's1_attend_start'), 's1_attend_start');
    default:
      return null;
  }
}

export function resolveCheckNavigation(ruleId: string, doc: ShiteiDocument): CheckNavigationResult | null {
  const rule = RULE_BY_ID.get(ruleId);
  if (!rule) return null;
  return resolveNavRule(rule, doc);
}

export function getCheckNavKind(ruleId: string): 'jump' | 'hint' | 'none' {
  const rule = RULE_BY_ID.get(ruleId);
  if (!rule) return 'none';
  if (rule.ruleType === 'manual' && rule.manualHint) return 'hint';
  if (rule.ruleType === 'manual') return 'none';
  if (rule.evaluator) return 'jump';
  return 'none';
}
