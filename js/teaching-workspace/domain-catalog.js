import { ICD_DATA } from '../shitei-workspace/case-categories.js';

export const DOMAIN_TAGS = [
  { id: 'F0', label: 'F0 器質性精神障害', hint: '器質性・せん妄・認知症に重畳する精神症状など' },
  { id: 'F1', label: 'F1 精神作用物質関連', hint: '依存症・離脱・有害使用など' },
  { id: 'F2', label: 'F2 統合失調症スペクトラム', hint: '統合失調症・妄想性障害など' },
  { id: 'F3', label: 'F3 気分障害', hint: 'うつ・双極・気分変調障害など' },
  { id: 'F4-9', label: 'F4〜F9 その他', hint: '不安障害・人格障害・発達障害・児童期障害など' },
];

export const COVERAGE_DOMAINS = ['F0', 'F1', 'F2', 'F3', 'F4-9'];

export const SETTING_OPTIONS = [
  '外来',
  '入院（一般）',
  '救急・精神科救急',
  '児童・思春期',
  'その他',
];

export const STATUS_OPTIONS = [
  { value: 'draft', label: '下書き' },
  { value: 'ready', label: '提示準備完了' },
  { value: 'presented', label: '提示済み' },
];

export function getAllIcdGroups() {
  return Object.entries(ICD_DATA);
}

export function getDomainHint(tagId) {
  return DOMAIN_TAGS.find((d) => d.id === tagId)?.hint || '';
}

export function getDomainLabel(tagId) {
  return DOMAIN_TAGS.find((d) => d.id === tagId)?.label || tagId || '未設定';
}
