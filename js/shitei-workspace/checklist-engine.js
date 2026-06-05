import { getCharCount, parseIcdNum } from './form-fields.js';
import { icdMatchesCategory } from './case-categories.js';
import { loadJsonWithFallback } from './json-loader.js';

let RULES = [];
let CATEGORIES = {};

export async function loadChecklistRules() {
  const data = await loadJsonWithFallback(
    'data/checklist-rules.json',
    'checklist-rules-embed',
  );
  RULES = data.rules;
  CATEGORIES = data.categories;
}

function getCase(doc, n) {
  return doc.cases[`case${n}`] || {};
}

function allCases(doc) {
  return [1, 2, 3, 4, 5].map((n) => getCase(doc, n));
}

function isFilled(v) {
  return String(v ?? '').trim().length > 0;
}

function admValid(data) {
  const t = String(data.s1_adm_type || '');
  return t === '措置入院' || t === '医療保護入院';
}

function evalRule(rule, doc) {
  const ev = rule.evaluator;
  if (!ev) return 'manual';

  switch (ev) {
    case 'icdCategory':
      return icdMatchesCategory(rule.caseNum, String(getCase(doc, rule.caseNum).s1_icd)) ? 'ok' : 'fail';
    case 'icdInRange': {
      const data = getCase(doc, rule.caseNum);
      const n = parseIcdNum(String(data.s1_icd));
      if (n === null) return 'fail';
      if (rule.prefix === 'F4F9') return n >= 40 && n <= 98 ? 'ok' : 'fail';
      return n >= (rule.min ?? 0) && n <= (rule.max ?? 99) ? 'ok' : 'fail';
    }
    case 'icdDependency': {
      const icd = String(getCase(doc, rule.caseNum).s1_icd || '');
      const n = parseIcdNum(icd);
      return /^F1[0-9]\.[2-9]/i.test(icd) || (n !== null && n >= 10 && n <= 19 && /\.[2-9]/.test(icd)) ? 'ok' : 'fail';
    }
    case 'admTypeValid':
      return admValid(getCase(doc, rule.caseNum)) ? 'ok' : 'fail';
    case 'fieldFilled':
      return (rule.fields || []).every((f) => isFilled(getCase(doc, rule.caseNum)[f])) ? 'ok' : 'warn';
    case 'admCount': {
      const count = allCases(doc).filter((c) => String(c.s1_adm_type) === rule.admType).length;
      return count >= (rule.minCount ?? 1) ? 'ok' : 'fail';
    }
    case 'anyFieldFilled':
      return allCases(doc).some((c) => (rule.fields || []).some((f) => isFilled(c[f]))) ? 'ok' : 'warn';
    case 'anyRestriction':
      return allCases(doc).some((c) => String(c.s1_restriction) === '有') ? 'ok' : 'warn';
    case 'withinYears':
    case 'withinYearsFromApp':
    case 'beforeYearsFromApp':
      return 'manual';
    case 'allCasesField':
      return allCases(doc).every((c) => isFilled(c[rule.field])) ? 'ok' : 'warn';
    case 'allCasesFields':
      return allCases(doc).every((c) => (rule.fields || []).every((f) => isFilled(c[f]))) ? 'ok' : 'warn';
    case 'allCasesAdmValid':
      return allCases(doc).every(admValid) ? 'ok' : 'fail';
    case 'allCasesRestrictionSet':
      return allCases(doc).every((c) => {
        const r = String(c.s1_restriction);
        return r === '有' || r === '無';
      }) ? 'ok' : 'warn';
    case 'allCasesCharCount': {
      const bad = allCases(doc).filter((c) => {
        const n = getCharCount(c);
        return n > 0 && (n < 1200 || n > 2500);
      });
      const empty = allCases(doc).filter((c) => getCharCount(c) === 0);
      if (empty.length > 0) return 'warn';
      return bad.length === 0 ? 'ok' : 'fail';
    }
    case 'restrictionDetailIfNeeded': {
      const need = allCases(doc).filter((c) => String(c.s1_restriction) === '有');
      if (need.length === 0) return 'ok';
      return need.every((c) => isFilled(c.s6_restriction_detail)) ? 'ok' : 'warn';
    }
    default:
      return 'manual';
  }
}

function findCategory(id) {
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    if (def.ids.includes(id)) return cat;
  }
  return 'common';
}

export function evaluateChecklist(doc) {
  const { manualOverrides } = doc.checklist;
  return RULES.map((rule) => {
    const auto = evalRule(rule, doc);
    const category = findCategory(rule.id);
    let status = rule.ruleType === 'manual' ? 'manual' : auto;
    let checked = status === 'ok';

    if (rule.ruleType === 'manual' || status === 'manual') {
      checked = Boolean(manualOverrides[rule.id]);
      status = 'manual';
    } else if (manualOverrides[rule.id] !== undefined) {
      checked = manualOverrides[rule.id];
    } else {
      checked = status === 'ok';
    }

    return { id: rule.id, label: rule.label, ruleType: rule.ruleType, status, checked, category };
  });
}

export function getCheckScores(results) {
  const byCategory = {};
  let done = 0;
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { done: 0, count: 0 };
    byCategory[r.category].count++;
    if (r.checked) {
      done++;
      byCategory[r.category].done++;
    }
  }
  return {
    total: { done, count: results.length, pct: results.length ? Math.round((done / results.length) * 100) : 0 },
    byCategory,
  };
}

export function toggleManualOverride(state, id, value) {
  const next = { ...state, manualOverrides: { ...state.manualOverrides } };
  next.manualOverrides[id] = value ?? !next.manualOverrides[id];
  return next;
}

export function getCategories() {
  return CATEGORIES;
}

export function getRuleById(id) {
  return RULES.find((r) => r.id === id);
}
