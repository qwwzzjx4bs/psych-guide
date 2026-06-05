import { getDomainLabel } from './domain-catalog.js';
import { MSE_FIELDS } from './form-fields.js';

const MSE_LABELS = {
  t3_behavior: '外観・行動',
  t3_consciousness: '意識・見当識',
  t3_cognition: '知的機能・記憶',
  t3_mood: '気分・感情',
  t3_thought: '思考',
  t3_perception: '知覚',
  t3_risk: '自傷他害リスク',
  t3_insight: '病識・判断力',
  t3_other: '追記',
};

function val(fields, id) {
  return String(fields[id] ?? '').trim();
}

function section(title, body) {
  if (!body) return '';
  return `\n【${title}】\n${body}\n`;
}

export function generateDraftText(caseItem, meta = {}) {
  const f = caseItem.fields || {};
  const statusLabel = { draft: '下書き', ready: '提示準備完了', presented: '提示済み' }[caseItem.status] || caseItem.status;

  let mseBlock = '';
  for (const id of MSE_FIELDS) {
    const v = val(f, id);
    if (v) mseBlock += `・${MSE_LABELS[id]}：${v}\n`;
  }

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
症例提示資料
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${meta.title ? `タイトル：${meta.title}\n` : ''}${meta.presenter ? `発表者：${meta.presenter}\n` : ''}${meta.institution ? `所属：${meta.institution}\n` : ''}${meta.supervisor ? `指導医：${meta.supervisor}\n` : ''}
症例：${caseItem.label}
F章領域：${getDomainLabel(caseItem.domainTag)}
ステータス：${statusLabel}

${section('症例概要', [
    val(f, 't1_present_date') && `提示日：${val(f, 't1_present_date')}`,
    val(f, 't1_setting') && `診療場面：${val(f, 't1_setting')}`,
    val(f, 't1_dx_name') && `診断名：${val(f, 't1_dx_name')}`,
    val(f, 't1_icd') && `ICD-10：${val(f, 't1_icd')}`,
    val(f, 't1_objective') && `学習目的：${val(f, 't1_objective')}`,
  ].filter(Boolean).join('\n'))}
${section('背景・主訴', [
    val(f, 't2_age') && `年齢：${val(f, 't2_age')}`,
    val(f, 't2_sex') && `性別：${val(f, 't2_sex')}`,
    val(f, 't2_cc') && `主訴：${val(f, 't2_cc')}`,
    val(f, 't2_family') && `家族歴：${val(f, 't2_family')}`,
    val(f, 't2_life') && `生活歴：${val(f, 't2_life')}`,
    val(f, 't2_hx') && `既往歴：${val(f, 't2_hx')}`,
  ].filter(Boolean).join('\n'))}
${section('病歴・評価', [
    val(f, 't3_hpi') && `現病歴：\n${val(f, 't3_hpi')}`,
    mseBlock && `精神状態所見（MSE）：\n${mseBlock}`,
    val(f, 't3_scales') && `使用スケール：${val(f, 't3_scales')}`,
  ].filter(Boolean).join('\n\n'))}
${section('診断・鑑別', [
    val(f, 't4_dx_basis') && `診断根拠：\n${val(f, 't4_dx_basis')}`,
    val(f, 't4_diff_dx') && `鑑別診断：\n${val(f, 't4_diff_dx')}`,
    val(f, 't4_key_findings') && `重要所見：\n${val(f, 't4_key_findings')}`,
  ].filter(Boolean).join('\n\n'))}
${section('治療・経過', [
    val(f, 't5_pharma') && `薬物療法：\n${val(f, 't5_pharma')}`,
    val(f, 't5_nonpharma') && `非薬物療法：\n${val(f, 't5_nonpharma')}`,
    val(f, 't5_response') && `治療反応：\n${val(f, 't5_response')}`,
    val(f, 't5_side_effects') && `副作用：\n${val(f, 't5_side_effects')}`,
    val(f, 't5_followup') && `フォロー：\n${val(f, 't5_followup')}`,
  ].filter(Boolean).join('\n\n'))}
${section('学習・討議', [
    val(f, 't6_learning_points') && `学習ポイント：\n${val(f, 't6_learning_points')}`,
    val(f, 't6_discussion_q') && `討議用の問い：\n${val(f, 't6_discussion_q')}`,
    val(f, 't6_limitations') && `限界・反省：\n${val(f, 't6_limitations')}`,
    val(f, 't6_references') && `参考文献：\n${val(f, 't6_references')}`,
  ].filter(Boolean).join('\n\n'))}
`.trim();
}

export function generateMarkdown(caseItem, meta = {}) {
  const text = generateDraftText(caseItem, meta);
  return text
    .replace(/━+/g, '---')
    .replace(/【([^】]+)】/g, '## $1');
}
