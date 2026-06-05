import { CASE_CATEGORIES } from '../domain/case-categories';
import { getCharCount, type CaseData } from '../domain/form-fields';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function v(data: CaseData, id: string): string {
  return String(data[id] ?? '').trim();
}

function getRestrictionStr(data: CaseData): string {
  if (String(data.s1_restriction) !== '有') return '無';
  const types: string[] = [];
  if (data.rt_kal) types.push('隔離');
  if (data.rt_phy) types.push('身体的拘束');
  if (data.rt_tel) types.push('電話の制限');
  if (data.rt_vis) types.push('面会の制限');
  if (data.rt_opn) types.push('開放処遇の制限');
  return '有（' + (types.join('・') || '種類未選択') + '）';
}

function buildLegalChecks(admType: string): { no: number; label: string }[] {
  if (admType === '措置入院') {
    return [
      { no: 1, label: '措置診察の契機（第22〜26条等）を確認した' },
      { no: 2, label: '症状消退届（第29条の5）が提出された（退院時）' },
      { no: 3, label: '退院後生活環境相談員が選任された（令和6年4月1日以降入院）' },
      { no: 4, label: '地域援助事業者の紹介を行った（令和6年4月1日以降入院）' },
    ];
  }
  if (admType === '医療保護入院') {
    return [
      { no: 1, label: '指定医による医療保護入院の判定を行った' },
      { no: 2, label: '家族等または市区町村長の同意を得た' },
      { no: 3, label: '患者本人および家族等への書面告知（令和5年4月以降）' },
      { no: 4, label: '入院届が10日以内に提出された' },
      { no: 5, label: '入院期間を3ヶ月以内で定めた（令和6年4月1日以降）' },
      { no: 6, label: '退院後生活環境相談員が選任された' },
    ];
  }
  return [];
}

export function buildForm31Html(caseNum: number, data: CaseData): string {
  const cat = CASE_CATEGORIES[caseNum];
  const admType = v(data, 's1_adm_type') || '（未記入）';
  const admTotal = getCharCount(data);
  const checks = buildLegalChecks(admType);
  const checksHtml = checks.map(c => `
    <tr><td class="check-no">${c.no}</td><td>${esc(c.label)}</td><td class="check-box">□</td></tr>`).join('');

  const bodyText = [
    v(data, 's2_family') ? `【家族歴】\n${v(data, 's2_family')}` : '',
    v(data, 's2_life') ? `\n【生育・生活歴】\n${v(data, 's2_life')}` : '',
    v(data, 's2_hx') ? `\n【既往歴】\n${v(data, 's2_hx')}` : '',
    v(data, 's2_cc') ? `\n【初診時主訴】\n${v(data, 's2_cc')}` : '',
    '\n【現病歴】',
    v(data, 's3_pre') ? `\n〈入院前経過〉\n${v(data, 's3_pre')}` : '',
    v(data, 's3_admission') ? `\n〈入院時の状況〉\n${v(data, 's3_admission')}` : '',
    v(data, 's3_course') ? `\n〈入院後経過〉\n${v(data, 's3_course')}` : '',
    '\n【精神医学的所見】',
    v(data, 's4_behavior') ? `\n外観・行動：${v(data, 's4_behavior')}` : '',
    v(data, 's4_consciousness') ? `\n意識・見当識：${v(data, 's4_consciousness')}` : '',
    v(data, 's4_cognition') ? `\n知的機能・記憶：${v(data, 's4_cognition')}` : '',
    v(data, 's4_mood') ? `\n気分・感情：${v(data, 's4_mood')}` : '',
    v(data, 's4_thought') ? `\n思考：${v(data, 's4_thought')}` : '',
    v(data, 's4_perception') ? `\n知覚：${v(data, 's4_perception')}` : '',
    v(data, 's4_risk') ? `\n自傷他害リスク：${v(data, 's4_risk')}` : '',
    v(data, 's4_insight') ? `\n病識・判断力：${v(data, 's4_insight')}` : '',
    v(data, 's4_other') ? `\n追記：${v(data, 's4_other')}` : '',
    '\n【診断根拠】',
    v(data, 's5_dx_basis') ? `\n${v(data, 's5_dx_basis')}` : '',
    v(data, 's5_diff_dx') ? `\n【鑑別診断】\n${v(data, 's5_diff_dx')}` : '',
    v(data, 's5_adm_basis') ? `\n【入院形態の根拠】\n${v(data, 's5_adm_basis')}` : '',
    '\n【治療計画・経過】',
    v(data, 's7_pharma') ? `\n薬物療法：${v(data, 's7_pharma')}` : '',
    v(data, 's7_nonpharma') ? `\n非薬物療法：${v(data, 's7_nonpharma')}` : '',
    v(data, 's7_consider') ? `\n\n【考察】\n${v(data, 's7_consider')}` : '',
  ].filter(Boolean).join('');

  const charColor = admTotal < 1200 ? '#b45309' : admTotal > 2500 ? '#dc2626' : '#15803d';
  const charMsg = admTotal < 1200 ? '▲ 1200字未満' : admTotal > 2500 ? '▲ 2500字超' : '✓ 規定範囲内';

  return `<div class="form31-title">様式３－１</div>
<div class="form31-subtitle">ケースレポート（${esc(cat.label)}）　令和７年２月１日以降申請版</div>
<table class="form31-table"><tbody>
<tr><th>① 申請日</th><td>${esc(v(data, 's1_date') || '（未記入）')}</td></tr>
<tr><th>② 最終診断名</th><td>${esc(v(data, 's1_dx_name') || '（未記入）')}</td></tr>
<tr><th>② ICD-10コード</th><td>${esc(v(data, 's1_icd') || '（未記入）')}</td></tr>
<tr><th>③ 主な評価対象の入院形態</th><td>${esc(admType)}</td></tr>
<tr><th>④ 医療機関名</th><td>${esc(v(data, 's1_hospital') || '（未記入）')}</td></tr>
<tr><th>⑤ 患者イニシャル</th><td>${esc(v(data, 's1_initial') || '（未記入）')}</td></tr>
<tr><th>⑤ 生年月日</th><td>${esc(v(data, 's1_dob') || '（未記入）')}</td></tr>
<tr><th>⑥ 入院日</th><td>${esc(v(data, 's1_admit_date') || '（未記入）')}</td></tr>
<tr><th>⑥ 退院日</th><td>${esc(v(data, 's1_discharge_date') || '（未記入）')}</td></tr>
<tr><th>⑦-1 担当開始</th><td>${esc(v(data, 's1_attend_start') || '（未記入）')}</td></tr>
<tr><th>⑦-2 指導医</th><td style="white-space:pre-wrap">${esc(v(data, 's1_supervisor') || '（未記入）')}</td></tr>
<tr><th>⑧ 退院後通院</th><td>${esc(v(data, 's7_aftercare') || '—')}</td></tr>
<tr><th>⑨ 文字数</th><td><span class="form31-charcount">${admTotal}字</span> <span style="color:${charColor}">${charMsg}</span></td></tr>
<tr><th>⑩ 行動制限</th><td>${esc(getRestrictionStr(data))}</td></tr>
</tbody></table>
<div class="form31-section-title">本　文</div>
<div class="form31-body-text">${esc(bodyText.trim())}</div>
<div class="form31-section-title">関係法規に定める手続への対応</div>
<table class="form31-check-table"><thead><tr><th>No.</th><th>手続事項</th><th>対応</th></tr></thead>
<tbody>${checksHtml || '<tr><td colspan="3">入院形態未設定</td></tr>'}</tbody></table>
<p>行動制限詳細</p><div class="form31-detail-area">${esc(v(data, 's6_restriction_detail') || '行動制限なし')}</div>
${v(data, 's6_seisanin') ? `<p>退院後生活環境相談員</p><div class="form31-detail-area">${esc(v(data, 's6_seisanin'))}</div>` : ''}`;
}

export function buildTextDraft(caseNum: number, data: CaseData): string {
  const cat = CASE_CATEGORIES[caseNum];
  const total = getCharCount(data);
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ケースレポート（${cat.label}）草案
様式3-1 令和7年1月版 準拠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

文字数：${total}字（1200〜2500字）

${buildForm31Html(caseNum, data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`;
}

export function printForm31(caseNum: number, data: CaseData): void {
  const html = buildForm31Html(caseNum, data);
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>様式3-1 第${caseNum}症例</title>
<style>
body{font-family:'Noto Sans JP',sans-serif;font-size:10pt;padding:20px}
.form31-title{text-align:center;font-size:13pt;font-weight:700}
.form31-subtitle{text-align:center;font-size:9pt;margin-bottom:1rem}
.form31-table,.form31-check-table{width:100%;border-collapse:collapse;margin-bottom:1rem}
.form31-table th,.form31-table td,.form31-check-table th,.form31-check-table td{border:1px solid #555;padding:.4rem .6rem;font-size:9.5pt}
.form31-table th{background:#f1f5f9;width:38%}
.form31-body-text{border:1px solid #555;padding:.8rem;white-space:pre-wrap;line-height:1.9;min-height:200px}
.form31-section-title{font-weight:700;border-bottom:2px solid #1e3a5f;margin:1rem 0 .5rem}
.form31-detail-area{border:1px solid #555;padding:.6rem;white-space:pre-wrap}
</style></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}
