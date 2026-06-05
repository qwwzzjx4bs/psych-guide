import { CASE_CATEGORIES } from '../domain/case-categories';

/** Step1: 入院形態選択時の注意（表紙直下） */
export function getStep1AdmHint(admType: string): { html: string; variant: 'info' | 'warn' | 'none' } {
  if (admType === '医療保護入院') {
    return {
      variant: 'warn',
      html: '<strong>医療保護入院を選択：</strong>5症例のうち1例は<strong>入院時から担当し入院時の指定医診察に立ち会った症例</strong>が必要です（事務取扱要領 2オ）。このケースがそれに該当するか確認してください。',
    };
  }
  if (admType === '措置入院') {
    return {
      variant: 'info',
      html: '<strong>措置入院を選択：</strong>措置診察の契機（第22〜26条の通報・申請等）と自傷他害のおそれの具体的根拠の記載が必須です。',
    };
  }
  return { variant: 'none', html: '' };
}

/** Step3: 入院時状況の記載要件 */
export function getStep3AdmissionHint(admType: string): string {
  if (admType === '措置入院') {
    return '<strong>措置入院の入院時状況で必須記載：</strong>①精神障害者であること（ICD該当疾患）②医療及び保護のために入院させなければ③<strong>精神障害のために自傷他害のおそれ</strong>がある（具体的行為・発言・状況を記載）';
  }
  if (admType === '医療保護入院') {
    return '<strong>医療保護入院の入院時状況で必須記載：</strong>①精神障害者であること②医療・保護のために入院の必要③<strong>精神障害のため任意入院が行われる状態にない</strong>（病識欠如・同意能力の欠如を具体的に記載）④任意入院となるよう努めたが困難だった旨⑤告知（令和5年4月以降：患者本人および家族等への告知内容も記載）';
  }
  return 'ステップ1で入院形態を選択すると、入院時状況の記載要件が表示されます。';
}

/** Step4: 症例カテゴリ別 MSE ヒント */
export function getStep4MseHint(caseNum: number): string {
  const cat = CASE_CATEGORIES[caseNum];
  if (caseNum === 1) {
    return '<strong>F0器質性：</strong>意識障害・見当識障害・記憶障害・認知機能変化を重点的に記載。器質性原因（脳器質疾患・代謝異常等）との関連を示す。';
  }
  if (caseNum === 2) {
    return '<strong>F1依存症：</strong>離脱症状（アルコールの場合：振戦・発汗・けいれん等）・渇望・依存の程度（AUDIT/SDS等スコア）・精神病症状合併の有無。';
  }
  if (caseNum === 3) {
    return '<strong>F2統合失調症：</strong>陽性症状（幻覚・妄想の内容・強度）・陰性症状（感情鈍麻・意欲低下）・思考形式の障害（連合弛緩等）を体系的に記載。ICD-10のA基準（①〜④）への対応を意識する。';
  }
  if (caseNum === 4) {
    return '<strong>F3気分障害：</strong>うつ症状（SDS・HAM-D等）・希死念慮の強度と意図・計画・双極性の場合は躁症状の有無・睡眠・食欲・体重変化を記載。';
  }
  return `<strong>${cat.label}：</strong>当該疾患に特有の精神医学的所見を記載。ICD-10診断基準への対応を意識する。18歳未満の場合は発達段階・養育環境への配慮を追記。`;
}

/** Step5: 症例別 ICD 診断根拠ヒント */
export function getStep5DxHint(caseNum: number): string {
  if (caseNum === 1) {
    return '<strong>F0診断根拠：</strong>器質性原因（脳器質・代謝・内分泌等）の存在と、それによる精神症状との時系列的関連を記載。機能性疾患との鑑別も。';
  }
  if (caseNum === 2) {
    return '<strong>F1依存症診断根拠：</strong>依存症候群（ICD-10 F1x.2）の診断基準（強迫的使用・離脱・耐性・他の活動の放棄等）への対応を記載。有害使用のみでない根拠。';
  }
  if (caseNum === 3) {
    return '<strong>F2診断根拠：</strong>ICD-10 F20のA基準（少なくとも1ヶ月以上）①思考反響・させられ体験など ②支配・影響する妄想 ③会話の幻声 ④持続的な奇異な妄想、またはB基準（2つ以上の症状）への対応を記載。';
  }
  if (caseNum === 4) {
    return '<strong>F3診断根拠：</strong>ICD-10の気分エピソード（うつ・躁・軽躁）の診断基準（持続期間・症状数）への対応、器質性・薬物性・統合失調症の除外根拠を記載。';
  }
  return '選択した疾患のICD-10診断基準への対応を具体的に記載してください。';
}

/** Step5: 入院形態別法的根拠ヒント */
export function getStep5AdmBasisHint(admType: string): string {
  if (admType === '措置入院') {
    return '<strong>措置入院の根拠として記載：</strong>①精神障害者である（ICD-10診断）②医療・保護のために入院させなければ③<strong>精神障害のため自傷他害のおそれがある</strong>具体的根拠（発言・行動・状況）を記載。措置診察の契機（第22〜26条の通報等）も。';
  }
  if (admType === '医療保護入院') {
    return '<strong>医療保護入院の根拠として記載：</strong>①精神障害者である②入院の必要性③<strong>任意入院不可の根拠</strong>（病識欠如等）④任意入院となるよう努めたが不可であった経緯⑤家族等同意者（続柄・同意日）⑤令和5年4月以降：患者と家族等双方への告知内容。';
  }
  return 'ステップ1で入院形態を選択すると、根拠の記載要件が表示されます。';
}

/** Step6: 法的手続確認リスト（参照用） */
export function getStep6LegalChecksHtml(admType: string): string {
  if (admType === '措置入院') {
    return `<p class="legal-checks-title">措置入院 — 法的手続確認事項（様式3-1に✓を記入）</p>
<ul class="legal-checks-list">
<li>措置診察の契機（第22〜26条等）を確認したか</li>
<li>症状消退届（第29条の5）が提出されたか（退院時）</li>
<li>退院後生活環境相談員が選任されたか（令和6年4月1日以降入院）</li>
<li>地域援助事業者の紹介を行ったか（令和6年4月1日以降入院）</li>
</ul>`;
  }
  if (admType === '医療保護入院') {
    return `<p class="legal-checks-title">医療保護入院 — 法的手続確認事項（様式3-1に✓を記入）</p>
<ul class="legal-checks-list">
<li>指定医による医療保護入院の判定を行ったか</li>
<li>家族等のいずれかまたは市区町村長の同意を得たか（同意者の続柄・同意日）</li>
<li>令和5年4月以降：患者本人および家族等への書面告知（告知内容・告知日）</li>
<li>入院届が10日以内に提出されたか</li>
<li>令和6年4月1日以降：入院時に3ヶ月を超えない範囲で入院期間を定めたか</li>
<li>退院支援委員会が開催されたか（入院期間更新時）</li>
<li>退院後生活環境相談員が選任されたか</li>
<li>退院届が退院10日以内に提出されたか</li>
</ul>`;
  }
  return '<p class="field-hint">ステップ1で入院形態を選択すると確認事項が表示されます。</p>';
}

export function hintBox(html: string, variant: 'info' | 'warn' = 'info'): string {
  const cls = variant === 'warn' ? 'warn-box hint-box' : 'info-box hint-box';
  return `<div class="${cls}">${html}</div>`;
}
