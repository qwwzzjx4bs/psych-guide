import { countMseFilled } from './form-fields.js';
import { loadJsonWithFallback } from '../shitei-workspace/json-loader.js';

let RULES = [];
let CATEGORIES = {};

export async function loadChecklistRules() {
  const data = await loadJsonWithFallback(
    'data/teaching-checklist-rules.json',
    'teaching-checklist-rules-embed',
  );
  RULES = data.rules;
  CATEGORIES = data.categories;
}

function isFilled(v) {
  return String(v ?? '').trim().length > 0;
}

function getCurrentCase(doc, currentCaseId) {
  if (!currentCaseId) return doc.cases[0] || null;
  return doc.cases.find((c) => c.id === currentCaseId) || doc.cases[0] || null;
}

function hasPresentedInDomain(doc, domain) {
  return doc.cases.some((c) => c.domainTag === domain && c.status === 'presented');
}

function hasAnyInDomain(doc, domain) {
  return doc.cases.some((c) => c.domainTag === domain && !isCaseOnlyMeta(c));
}

function isCaseOnlyMeta(c) {
  const f = c.fields || {};
  return !Object.keys(f).some((k) => isFilled(f[k]));
}

export function getDomainCoverage(doc) {
  const domains = ['F0', 'F1', 'F2', 'F3', 'F4-9'];
  return domains.map((d) => ({
    domain: d,
    hasCase: doc.cases.some((c) => c.domainTag === d),
    presented: hasPresentedInDomain(doc, d),
    ready: doc.cases.some((c) => c.domainTag === d && (c.status === 'ready' || c.status === 'presented')),
  }));
}

function evalRule(rule, doc, currentCaseId) {
  const ev = rule.evaluator;
  if (!ev) return 'manual';
  const current = getCurrentCase(doc, currentCaseId);

  switch (ev) {
    case 'domainCoverage':
      return hasPresentedInDomain(doc, rule.domain) ? 'ok' : (hasAnyInDomain(doc, rule.domain) ? 'warn' : 'fail');
    case 'metaField':
      return isFilled(doc.meta?.[rule.field]) ? 'ok' : 'warn';
    case 'currentCaseField':
      return current && isFilled(current.fields?.[rule.field]) ? 'ok' : 'warn';
    case 'currentCaseFields':
      return current && (rule.fields || []).some((f) => isFilled(current.fields?.[f])) ? 'ok' : 'warn';
    case 'currentCaseDomain':
      return current && isFilled(current.domainTag) ? 'ok' : 'fail';
    case 'currentCaseMseCount':
      return current && countMseFilled(current.fields || {}) >= (rule.minCount ?? 3) ? 'ok' : 'warn';
    default:
      return 'manual';
  }
}

function findCategory(id) {
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    if (def.ids.includes(id)) return cat;
  }
  return 'meta';
}

export function evaluateChecklist(doc, currentCaseId) {
  const { manualOverrides } = doc.checklist;
  return RULES.map((rule) => {
    const auto = evalRule(rule, doc, currentCaseId);
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
