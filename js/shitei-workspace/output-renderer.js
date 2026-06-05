import { getCharCount } from './form-fields.js';
import { CASE_CATEGORIES } from './case-categories.js';

function val(data, id) {
  return String(data[id] ?? '').trim();
}

function getRestrictionStr(data) {
  if (String(data.s1_restriction) !== '有') return '無';
  const types = [];
  if (data.rt_kal) types.push('隔離');
  if (data.rt_phy) types.push('身体的拘束');
  if (data.rt_tel) types.push('電話の制限');
  if (data.rt_vis) types.push('面会の制限');
  if (data.rt_opn) types.push('開放処遇の制限');
  return '有（' + (types.join('・') || '種類未選択') + '）';
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function buildLegalChecks(admType) {
  if (admType === '措置入院') {
    return [
      { no: 1, label: '措置診察の契機（精神保健福祉法第22条〜第26条等による通報・申請等）を確認した' },
      { no: 2, label: '措置入院の判定（2名の指定医による一致した診察）を行った' },
      { no: 3, label: '都道府県知事（政令指定都市市長）への診察結果の報告を行った' },
      { no: 4, label: '患者本人に対して入院の告知（病名・入院理由・退院請求権等）を行った' },
      { no: 5, label: '症状消退届（第29条の5）を退院時に提出した（または提出予定）' },
      { no: 6, label: '退院後生活環境相談員を選任した（令和6年4月1日以降の新規入院）' },
      { no: 7, label: '地域援助事業者の紹介を行った（令和6年4月1日以降の新規入院）' },
    ];
  }
  if (admType === '医療保護入院') {
    return [
      { no: 1, label: '指定医による診察（医療保護入院の要件の判定）を行った' },
      { no: 2, label: '家族等のいずれかの同意（続柄・同意日）または市区町村長の同意を得た' },
      { no: 3, label: '患者本人に対して入院の告知（病名・入院理由・退院請求権等）を行った（令和5年4月1日以降）' },
      { no: 4, label: '家族等に対して書面での告知（告知内容・告知日）を行った（令和5年4月1日以降）' },
      { no: 5, label: '入院届を10日以内に提出した（または提出予定）' },
      { no: 6, label: '入院時に入院期間（3ヶ月以内）を定めた（令和6年4月1日以降の新規入院）' },
      { no: 7, label: '退院後生活環境相談員を入院後7日以内に選任した' },
      { no: 8, label: '退院支援委員会を入院期間更新時に開催した（または開催予定）' },
      { no: 9, label: '退院届を退院後10日以内に提出した（または提出予定）' },
    ];
  }
  return [];
}

export function generateDraftText(caseNum, data) {
  const cat = CASE_CATEGORIES[caseNum];
  const adm = val(data, 's1_adm_type') || '（未選択）';
  const admTotal = getCharCount(data);

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ケースレポート（${cat.label}）草案
様式3-1 令和7年1月版 準拠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【表紙情報】
① 申請日：${val(data, 's1_date') || '（要記入）'}
② 最終診断名：${val(data, 's1_dx_name') || '（要記入）'}
   ICD-10コード：F ${(val(data, 's1_icd') || '（要記入）').replace(/^F/, '')}
③ 主な評価対象の入院形態：${adm}
④ 医療機関名：${val(data, 's1_hospital') || '（要記入）'}
⑤ 患者イニシャル：${val(data, 's1_initial') || '（要記入）'}  生年月日：${val(data, 's1_dob') || '（要記入）'}
⑥ 入院日：${val(data, 's1_admit_date') || '（要記入）'}  退院日：${val(data, 's1_discharge_date') || '（要記入）'}
⑦-1 担当医開始：${val(data, 's1_attend_start') || '（要記入）'}
⑦-2 指導医：${val(data, 's1_supervisor') || '（要記入）'}
⑩ 行動制限：${getRestrictionStr(data)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【本 文】
文字数：${admTotal}字（1200〜2500字の範囲内であること）

【初診時主訴】
${val(data, 's2_cc') || '（要記入）'}

【家族歴】
${val(data, 's2_family') || '（要記入）'}

【生育・生活歴】
${val(data, 's2_life') || '（要記入）'}

【既往歴】
${val(data, 's2_hx') || '（要記入）'}

【現病歴】
＜入院前経過＞
${val(data, 's3_pre') || '（要記入）'}

＜入院時の状況＞
${val(data, 's3_admission') || '（要記入）'}

＜入院後経過＞
${val(data, 's3_course') || '（要記入）'}

【精神医学的所見】
外観・行動：${val(data, 's4_behavior')}
意識・見当識：${val(data, 's4_consciousness')}
思考：${val(data, 's4_thought')}
自傷他害リスク：${val(data, 's4_risk')}

【診断根拠】
${val(data, 's5_dx_basis') || '（要記入）'}

【治療計画】
薬物療法：${val(data, 's7_pharma') || '（要記入）'}

【考察】
${val(data, 's7_consider') || '（任意記載）'}
`.trim();
}

export function buildForm31Html(caseNum, data) {
  const cat = CASE_CATEGORIES[caseNum];
  const admType = val(data, 's1_adm_type') || '（未記入）';
  const admTotal = getCharCount(data);
  const restrictStr = getRestrictionStr(data);

  const bodyText = [
    val(data, 's2_family') ? `【家族歴】\n${val(data, 's2_family')}` : '',
    val(data, 's2_life') ? `\n【生育・生活歴】\n${val(data, 's2_life')}` : '',
    val(data, 's2_hx') ? `\n【既往歴】\n${val(data, 's2_hx')}` : '',
    val(data, 's2_cc') ? `\n【初診時主訴】\n${val(data, 's2_cc')}` : '',
    '\n【現病歴】',
    val(data, 's3_pre') ? `\n〈入院前経過〉\n${val(data, 's3_pre')}` : '',
    val(data, 's3_admission') ? `\n〈入院時の状況〉\n${val(data, 's3_admission')}` : '',
    val(data, 's3_course') ? `\n〈入院後経過〉\n${val(data, 's3_course')}` : '',
    '\n【精神医学的所見】',
    val(data, 's4_behavior') ? `\n外観・行動：${val(data, 's4_behavior')}` : '',
    val(data, 's4_thought') ? `\n思考：${val(data, 's4_thought')}` : '',
    val(data, 's4_risk') ? `\n自傷他害リスク：${val(data, 's4_risk')}` : '',
    '\n【診断根拠】',
    val(data, 's5_dx_basis') ? `\n${val(data, 's5_dx_basis')}` : '',
    val(data, 's5_adm_basis') ? `\n【入院形態の根拠】\n${val(data, 's5_adm_basis')}` : '',
    '\n【治療計画・経過】',
    val(data, 's7_pharma') ? `\n薬物療法：${val(data, 's7_pharma')}` : '',
    val(data, 's7_consider') ? `\n\n【考察】\n${val(data, 's7_consider')}` : '',
  ].filter(Boolean).join('');

  const checks = buildLegalChecks(admType);
  const checksHtml = checks.map((c) => `
    <tr><td class="check-no">${c.no}</td><td>${esc(c.label)}</td><td class="check-box">□</td></tr>`).join('');

  const charColor = admTotal < 1200 ? '#b45309' : admTotal > 2500 ? '#dc2626' : '#15803d';
  const charLabel = admTotal < 1200 ? '▲ 1200字未満' : admTotal > 2500 ? '▲ 2500字超' : '✓ 規定範囲内';

  return `
<div class="form31-title">様式３－１</div>
<div class="form31-subtitle">ケースレポート（${esc(cat.label)}）　令和７年２月１日以降申請版</div>
<table class="form31-table"><tbody>
  <tr><th>① 申請日</th><td>${esc(val(data, 's1_date') || '（未記入）')}</td></tr>
  <tr><th>② 最終診断名</th><td>${esc(val(data, 's1_dx_name') || '（未記入）')}</td></tr>
  <tr><th>② ICD-10</th><td>${esc(val(data, 's1_icd') || '（未記入）')}</td></tr>
  <tr><th>③ 入院形態</th><td>${esc(admType)}</td></tr>
  <tr><th>④ 医療機関名</th><td>${esc(val(data, 's1_hospital') || '（未記入）')}</td></tr>
  <tr><th>⑤ イニシャル / 生年月日</th><td>${esc(val(data, 's1_initial'))} / ${esc(val(data, 's1_dob'))}</td></tr>
  <tr><th>⑥ 入院日 / 退院日</th><td>${esc(val(data, 's1_admit_date'))} / ${esc(val(data, 's1_discharge_date'))}</td></tr>
  <tr><th>⑦-2 指導医</th><td style="white-space:pre-wrap">${esc(val(data, 's1_supervisor'))}</td></tr>
  <tr><th>⑨ 本文字数</th><td><span class="form31-charcount">${admTotal}字</span> <span style="color:${charColor}">${charLabel}</span></td></tr>
  <tr><th>⑩ 行動制限</th><td>${esc(restrictStr)}</td></tr>
</tbody></table>
<div class="form31-section-title">本　文</div>
<div class="form31-body-text">${esc(bodyText.trim())}</div>
<div class="form31-section-title">関係法規に定める手続への対応</div>
<table class="form31-check-table"><thead><tr><th>No.</th><th>手続事項</th><th>対応</th></tr></thead>
<tbody>${checksHtml || '<tr><td colspan="3">入院形態未設定</td></tr>'}</tbody></table>
<div class="form31-detail-area">${esc(val(data, 's6_restriction_detail') || '行動制限なし')}</div>`;
}
