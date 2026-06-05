import { fieldToStep } from './form-fields.js';
import { getRuleById } from './checklist-engine.js';

function isFilled(v) {
  return String(v ?? '').trim().length > 0;
}

function getCurrentCase(doc, currentCaseId) {
  return doc.cases.find((c) => c.id === currentCaseId) || doc.cases[0];
}

function firstCaseInDomain(doc, domain) {
  return doc.cases.find((c) => c.domainTag === domain);
}

function resolveNavRule(rule, doc, currentCaseId) {
  const ev = rule.evaluator;

  if (rule.ruleType === 'manual' || !ev) {
    if (rule.manualHint) return { type: 'manual', hint: rule.manualHint };
    return null;
  }

  const current = getCurrentCase(doc, currentCaseId);

  switch (ev) {
    case 'domainCoverage': {
      const c = firstCaseInDomain(doc, rule.domain);
      if (!c) return { type: 'nav', target: { caseId: current?.id, step: 1, fields: ['t1_domain_tag'] } };
      return { type: 'nav', target: { caseId: c.id, step: 1, fields: ['t1_status'] } };
    }
    case 'metaField':
      return { type: 'nav', target: { caseId: current?.id, step: 1, fields: [`meta_${rule.field}`] } };
    case 'currentCaseField':
      return { type: 'nav', target: { caseId: current?.id, step: fieldToStep(rule.field), fields: [rule.field] } };
    case 'currentCaseFields': {
      const f = (rule.fields || []).find((id) => !isFilled(current?.fields?.[id])) || rule.fields?.[0];
      return { type: 'nav', target: { caseId: current?.id, step: fieldToStep(f), fields: [f] } };
    }
    case 'currentCaseDomain':
      return { type: 'nav', target: { caseId: current?.id, step: 1, fields: ['t1_domain_tag'] } };
    case 'currentCaseMseCount':
      return { type: 'nav', target: { caseId: current?.id, step: 3, fields: ['t3_behavior'] } };
    default:
      return null;
  }
}

export function resolveCheckNavigation(ruleId, doc, currentCaseId) {
  const rule = getRuleById(ruleId);
  if (!rule) return null;
  return resolveNavRule(rule, doc, currentCaseId);
}

export function getCheckNavKind(ruleId) {
  const rule = getRuleById(ruleId);
  if (!rule) return 'none';
  if (rule.ruleType === 'manual' && rule.manualHint) return 'hint';
  if (rule.ruleType === 'manual') return 'none';
  if (rule.evaluator) return 'jump';
  return 'none';
}
