#!/usr/bin/env python3
"""Generate icd10mini.html from icd10.html (headers + code tables + definitions JSON)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "icd10.html"
OUT = ROOT / "icd10mini.html"


def extract_definitions_block(text: str) -> str:
    a = text.find("<!-- ICD10_DEFINITIONS_EMBED_START -->")
    b = text.find("<!-- ICD10_DEFINITIONS_EMBED_END -->")
    if a < 0 or b < 0:
        raise SystemExit("definitions embed markers not found")
    return text[a : b + len("<!-- ICD10_DEFINITIONS_EMBED_END -->")]


def extract_header(text: str, n: int) -> str:
    start = text.find(f"<!-- ============ F{n} ============ -->")
    body_mark = f'<div class="cat-body" id="f{n}-body">'
    i = text.find(body_mark, start)
    block = text[start:i].rstrip()
    block = re.sub(
        r'<span class="bg-white/20 text-xs font-bold px-2\.5 py-1 rounded-full">DSM:[^<]*</span>\s*',
        "",
        block,
    )
    return block


def extract_codes_inner(text: str, n: int) -> str:
    mark = f'<div class="toggle-panel open panel-codes" id="codes-f{n}">'
    idx = text.find(mark)
    rest = text[idx + len(mark) :]
    te = rest.find("</table>")
    d1 = rest.find("</div>", te)
    d2 = rest.find("</div>", d1 + 6)
    return rest[: d2 + 6]


OVERVIEW_GLOBAL = """
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
<div class="flex items-center gap-2 mb-3">
<i class="w-4 h-4 text-indigo-600" data-lucide="library"></i>
<span class="font-bold text-gray-800 text-sm">第5章（F00–F99）の位置づけ — WHO・厚生労働省の疾病分類に基づく整理</span>
</div>
<div class="text-sm text-gray-700 space-y-3 leading-relaxed">
<p><strong>国際疾病分類（ICD）</strong>は、世界保健機関（WHO）が維持する疾病・関連保健問題の分類体系であり、死因統計・疾病統計・保健指標の国際比較、医療情報の標準化に用いられます。精神領域は<strong>第5章「精神および行動の障害」（コード F00–F99）</strong>にまとめられ、器質性から物質関連、精神病性障害、気分障害、神経症性・ストレス関連障害、生理的関連、成人の人格・行動、知的障害、心理発達、小児期の行動・情緒までを階層的に区分します。</p>
<p>日本では、厚生労働省が ICD の邦文版・運用ガイド（疾病分類の取扱い、標準病名、医科診療報酬上の傷病名コード等）を整備しており、<strong>診療録・レセプト・DPC データベース・保健所・統計報告</strong>では、原則としてこの体系に沿ったコードと用語の使用が求められます。臨床現場では、WHO の診断ガイドライン（臨床記述と診断ガイドライン）の趣旨と、国内の標準病名・通知・算定ルールを併せて確認することが重要です。</p>
<p><strong>本ページ（ミニ版）</strong>は、上記の公的枠組みのうち、外来で頻用する <strong>F0〜F9 の10ブロック</strong>に絞り、各ブロックの分類趣旨（概要）とコード一覧だけを参照しやすくしたものです。確定診断・請求・法医学・研究登録では、必ず WHO 原典および厚生労働省の最新の改訂版・通知を参照してください。</p>
<p class="text-xs text-slate-500 pt-3 border-t border-gray-100 mt-3 leading-relaxed">概要の記述は、WHO が公表する ICD（精神・行動の障害の章立て・臨床記述・分類ルール）および、厚生労働省の疾病分類運用（標準病名、診療報酬上の傷病名、DPC 等の取扱いを含む通知・マスタ）の趣旨に沿って整理しています。コード一覧と各行の定義文は、同一プロジェクトの全面版ページに埋め込まれた定義データから自動生成しています。</p>
</div>
</div>
""".strip()

# Detailed per-block overviews (WHO Chapter V structure + MHLW clinical coding context)
OVERVIEWS: dict[int, str] = {
    0: """
<div style="background:linear-gradient(135deg,#fef9ee 0%,#fef3c7 100%);border-left:4px solid #d97706;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#d97706;"></i>
<span class="font-bold text-sm" style="color:#92400e;">F00–F09 症状性を含む器質性精神障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO ICD-10 第5章では、<strong>脳の器質的病変、全身疾患、あるいは精神作用物質以外の中毒</strong>が直接関与して生じる精神症状を本ブロックに分類します。認知症（アルツハイマー型・血管性・特定身体疾患に続発するもの等）、<strong>せん妄</strong>、器質性精神病性・気分・不安症状、脳損傷後の人格変化・遺残症状などが含まれます。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">分類上の要点は、①精神症状の前後関係から<strong>器質的基盤を疑う所見</strong>があること、②可能な限り<strong>病因（神経変性・血管・感染・代謝・外傷等）</strong>を身体側の ICD コードと組み合わせて記録すること、③急性の意識・注意障害は<strong>せん妄（F05）</strong>として、持続的な認知症候群とは区別すること、です。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本の標準病名・レセプト運用でも、認知症・せん妄は高頻度コードであり、<strong>画像・血液・診察所見による身体評価</strong>とセットで記載するのが実務上の標準です。軽度認知障害（F06.7）は研究・臨床で用いられる一方、保険請求上の取扱いは施設・ガイドラインに従ってください。</p>
</div>
""".strip(),
    1: """
<div style="background:linear-gradient(135deg,#fff5f5 0%,#fee2e2 100%);border-left:4px solid #ef4444;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#ef4444;"></i>
<span class="font-bold text-sm" style="color:#991b1b;">F10–F19 精神作用物質使用による精神及び行動の障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">本ブロックは、<strong>アルコール、オピオイド、大麻類、鎮静催眠薬、コカイン、覚醒薬、タバコ、揮発溶剤</strong>など、精神作用のある物質の使用に関連して生じる障害を、<strong>物質種別（第2桁）</strong>と<strong>臨床症候（第4桁）</strong>の組み合わせで表します。急性中毒、有害な使用、依存症候群、離脱、離脱せん妄、精神病性障害、器質性健忘症候群、残遺・遅発性障害などが定義されています。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO の分類は、使用パターンと身体・社会的後果、離脱・中毒の生理学的特徴を重視します。日本の臨床・依存症医療では、覚醒剤・アルコール・処方薬（ベンゾジアゼピン系等）が重要で、<strong>複数物質使用（F19）</strong>も実務で留意が必要です。</p>
<p class="text-sm text-gray-800 leading-relaxed"><strong>第4桁の共通枠</strong>（.0 急性中毒〜.7 残遺等）は、各物質ブロックで同じ意味を持ちます。請求・行政報告では、物質名と症候の両方が追跡できるよう、可能な限り特定コードを用い、不明な場合は F19 を用いる運用が一般的です。</p>
</div>
""".strip(),
    2: """
<div style="background:linear-gradient(135deg,#faf5ff 0%,#ede9fe 100%);border-left:4px solid #8b5cf6;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#7c3aed;"></i>
<span class="font-bold text-sm" style="color:#5b21b6;">F20–F29 統合失調症型障害および妄想性障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">統合失調症（F20）、統合失調症型障害（F21）、持続性妄想性障害（F22）、急性一過性精神病性障害（F23）、誘発性妄想性障害（F24）、統合失調感情障害（F25）など、<strong>妄想・幻覚・形式思考障害・緊張病</strong>などの精神病性症状を中核とする疾患群です。WHO は症状の組み合わせ、持続期間、急性一過性かどうか、気分症状との関係で下位区分を定めています。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">鑑別では、<strong>物質・せん妄・認知症・気分障害の精神病症状</strong>を除外することが前提です。急性多形性精神病（F23）や妄想性障害（F22.0）は、病歴・経過で統合失調症と区別する必要があります。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本の標準病名でも本ブロックは精神科急性期・再発管理の中核であり、入院医療・地域医療連携票・精神保健指定医の診断書などで頻用されます。ICD-11 への移行議論があるため、研究・国際連携では版の違いに注意してください。</p>
</div>
""".strip(),
    3: """
<div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-left:4px solid #3b82f6;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#2563eb;"></i>
<span class="font-bold text-sm" style="color:#1e40af;">F30–F39 気分障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3"><strong>躁病エピソード（F30）、双極性感情障害（F31）、うつ病エピソード（F32）、反復性うつ病性障害（F33）、持続性気分障害（F34）</strong>など、抑うつ・躁・気分循環を主軸とする障害です。重症度（軽症・中等症・重症）や精神病症状の有無、現在のエピソード型、寛解の記載など、<strong>第3・第4桁で経過を細分化</strong>します。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO の定義は、エピソードの持続時間・症状数・機能障害の程度を重視します。臨床では、うつ病エピソードと双極性障害のうつエピソードの鑑別、薬物誘発性気分障害の除外が重要です。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本の診療報酬・重症度区分・自殺対策・休職診断書でも本ブロックが広く用いられます。混合エピソード（F31.6）や気分変調症（F34.1）など、コード選択時は最新の標準病名対応表を確認してください。</p>
</div>
""".strip(),
    4: """
<div style="background:linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 100%);border-left:4px solid #14b8a6;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#0d9488;"></i>
<span class="font-bold text-sm" style="color:#134e4a;">F40–F48 神経症性障害、ストレス関連障害および身体表現性障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">恐怖症性不安（F40）、パニック・全般性不安など（F41）、強迫性障害（F42）、PTSD・適応障害（F43）、解離性障害（F44）、身体表現性障害（F45）、神経衰弱・離人症（F48）など、<strong>精神病性障害に至らない不安・恐怖・ストレス反応・身体訴え</strong>を扱います。WHO は症状の主パターンと持続・機能障害で区分します。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">適応障害（F43.2）は、<strong>識別可能なストレッサーと時間的関連</strong>があり、うつ病やPTSDより短期・軽度の反応として位置づけられます。身体表現性障害では、器質疾患の除外と患者との合意形成が診療の鍵となります。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本の心療内科・精神科外来で最頻のブロックの一つです。労災・公的補償・メンタルヘルス不調欠勤の文書でも、F43・F41 等が多用されます。混合性不安抑うつ（F41.2）は DSM と比較して扱いが異なる場合があるため、国際論文では版を明記します。</p>
</div>
""".strip(),
    5: """
<div style="background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);border-left:4px solid #f97316;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#ea580c;"></i>
<span class="font-bold text-sm" style="color:#9a3412;">F50–F59 生理的障害および身体要因に関連する行動症候群</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">摂食障害（F50）、非器質性睡眠障害（F51）、性機能不全（F52）、産褥関連の精神・行動障害（F53）、他疾患に関連する心理・行動要因（F54）、非依存物質の乱用（F55）など、<strong>身体リズム・摂食・睡眠・性・産褥</strong>と心理が交差する領域です。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO は、神経性無食欲症・過食症の身体所見（体重・代謝）と行動パターンを重視します。睡眠障害では、<strong>器質性・物質性を除外</strong>した上で F51 を選択します。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本では産科・小児科・内科との連携が多く、F53（産褥うつ等）や F50（摂食障害）の早期介入が公衆衛生上も重要です。F54 は「原疾患は別章だが心理要因が治療上問題となる」場合に用います。</p>
</div>
""".strip(),
    6: """
<div style="background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);border-left:4px solid #64748b;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#475569;"></i>
<span class="font-bold text-sm" style="color:#1e293b;">F60–F69 成人の人格障害および行動障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">特定のパーソナリティ障害（F60）、混合型（F61）、脳疾患後の人格の恒久的変化（F62）、習慣・衝動障害（F63）、性同一性障害（F64）、性嗜好の障害（F65）、その他（F68）など、<strong>持続的な行動・思考様式や衝動制御</strong>の問題を扱います。境界型・妄想性・強迫性などは F60 の下位でコード化されます。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO の人格障害診断は、<strong>長期にわたる機能障害と柔軟性の欠如</strong>を前提とします。急性精神病やうつ病の「状態」による一時的な行動変化との鑑別が重要です。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本の司法・児童福祉・依存症領域でも本ブロックが参照されます。性に関するコード（F64・F65）はプライバシーと人権に配慮した記録が求められます。作為症（F68.1）と詐病（F68.2）は動機と臨床文脈で区別します。</p>
</div>
""".strip(),
    7: """
<div style="background:linear-gradient(135deg,#f9fafb 0%,#f3f4f6 100%);border-left:4px solid #9ca3af;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#6b7280;"></i>
<span class="font-bold text-sm" style="color:#374151;">F70–F79 知的障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">軽度（F70）・中等度（F71）・重度（F72）・最重度（F73）・その他（F78）・詳細不明（F79）に分け、<strong>知能指数だけでなく適応行動の欠損</strong>を含めた発達期からの機能障害を表します。第4桁で行動障害の要否を付記する形式（.0/.1）があります。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO は、知的障害を単なる知能検査の数値ではなく、<strong>社会的・実践的スキル</strong>の観点で捉えます。併存する自閉スペクトラム症や身体疾患コードとの併記が一般的です。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本では障害者総合支援法・特別支援教育・医療的ケア児支援など制度と連動しており、診断書では重症度区分が求められることがあります。用語は「精神遅滞」から「知的障害」への移行が進んでいますが、ICD-10 コード体系は引き続き F7x を使用します。</p>
</div>
""".strip(),
    8: """
<div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-left:4px solid #22c55e;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#16a34a;"></i>
<span class="font-bold text-sm" style="color:#14532d;">F80–F89 心理発達障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">言語発達（F80）、学習スキル（F81）、運動（F82）、混合（F83）、<strong>広汎性発達障害（F84）</strong>など、幼少期からの発達の偏りや遅れを扱います。自閉症、アスペルガー、Rett、崩壊性障害などは F84 の下位に位置づけられます（DSM-5 の ASD とは分類の切り口が異なります）。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO は発達史・多面評価（言語・社会性・遊び・認知）に基づきます。学習障害（読字・算数等）は神経学的除外のうえ F81 でコード化します。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本では教育現場の特別支援・発達検診・児童精神科で本ブロックが中心です。療育手帳・障害児支援と医療記録の整合に留意してください。成人期に初診される発達障害の記録では、後方視的診断と現在の機能障害の記載が重要です。</p>
</div>
""".strip(),
    9: """
<div style="background:linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%);border-left:4px solid #ec4899;padding:0.9rem 1.1rem;border-radius:0.75rem;">
<div class="flex items-center gap-2 mb-2"><i class="w-4 h-4" data-lucide="book-open" style="color:#db2777;"></i>
<span class="font-bold text-sm" style="color:#9d174d;">F90–F98 小児期・青年期に通常起こる行動・情緒障害</span></div>
<p class="text-sm text-gray-800 leading-relaxed mb-3">多動性障害（F90）、行為障害（F91）、行為と情緒の混合（F92）、小児期特異的情緒障害（F93）、社会機能障害（F94）、チック（F95）、遺尿・遺糞・哺育障害など（F98）を含みます。<strong>発達段階に特異的な行動・情緒の問題</strong>を、成人の精神病や人格障害と区別して整理します。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">WHO は症状の持続期間・場面特異性・学校・家庭での機能障害を重視します。ADHD 相当は F90 に含まれ、行為障害（F91）や学習障害（F81）との併存がよく問題になります。</p>
<p class="text-sm text-gray-800 leading-relaxed mb-3">F99 は本章に属するが詳細不明の精神障害に用い、鑑別未了の一時コードとしての性格が強いです。</p>
<p class="text-sm text-gray-800 leading-relaxed">日本の児童精神科・小児科・学校保健では本ブロックが常用されます。不登校・いじめ・児童虐待への対応では、F43（ストレス関連）や F92 などの併記が検討されることがあります。</p>
</div>
""".strip(),
}

CSS_EXTRA = """
    .section-card { scroll-margin-top: 108px; }
    .toggle-nav--dual { flex-wrap: nowrap; }
    .toggle-nav--dual .toggle-btn {
      flex: 1;
      width: auto;
      min-width: 0;
      justify-content: center;
    }
"""

SCRIPT_MINI = """
<script>
  const displayStates = { overview: true, codes: true };

  function typeFromPanelId(panelId) {
    for (const t of Object.keys(displayStates)) {
      if (panelId.startsWith(t + '-')) return t;
    }
    return panelId.split('-')[0];
  }

  function togglePanel(panelId, btn) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const type = typeFromPanelId(panelId);
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('on', isOpen);
    const openBody = document.querySelector('.cat-body.open');
    if (openBody) {
      const sibling = openBody.querySelectorAll('.panel-' + type);
      const allOn = [...sibling].every(p => p.classList.contains('open'));
      displayStates[type] = allOn;
    } else {
      displayStates[type] = isOpen;
    }
  }

  function toggleSection(bodyId, header) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    const isOpening = !body.classList.contains('open');
    const chevron = document.getElementById(bodyId + '-chevron');
    document.querySelectorAll('.cat-body').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.chevron').forEach(c => c.classList.remove('open'));
    if (isOpening) {
      body.classList.add('open');
      if (chevron) chevron.classList.add('open');
      Object.keys(displayStates).forEach(type => {
        const visible = displayStates[type];
        body.querySelectorAll('.panel-' + type)
            .forEach(p => p.classList.toggle('open', visible));
        body.querySelectorAll('.toggle-btn[data-panel^="' + type + '-"]')
            .forEach(b => b.classList.toggle('on', visible));
      });
      const section = body.closest('.section-card');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    syncJumpNavHighlight();
  }

  function syncJumpNavHighlight() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;
    nav.querySelectorAll('a.nav-btn.nav-btn--active')
       .forEach(a => a.classList.remove('nav-btn--active'));
    const openBodies = document.querySelectorAll('.cat-body.open');
    if (openBodies.length !== 1) return;
    const m = openBodies[0].id.match(/^(f\\d+)-body$/);
    if (!m) return;
    const link = nav.querySelector('a.nav-btn[href="#' + m[1] + '"]');
    if (link) link.classList.add('nav-btn--active');
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncJumpNavHighlight();
  });
</script>
"""


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    head_end = text.find("</head>")
    head = text[:head_end]
    # Insert extra CSS before </style>
    if "</style>" not in head:
        raise SystemExit("no </style> in head")
    head = head.replace("</style>", CSS_EXTRA + "\n    </style>", 1)
    # Trim title
    head = re.sub(
        r"<title>.*?</title>",
        "<title>ICD-10 精神科疾患分類 ミニ版（概要・コード一覧）F0〜F9 | 精神科臨床ガイド</title>",
        head,
        count=1,
    )

    defs_block = extract_definitions_block(text)

    parts: list[str] = []
    parts.append(head)
    parts.append("</head>\n<body class=\"bg-gray-50\">")
    parts.append(
        """
<header class="header-gradient text-white py-8 md:py-9">
<div class="max-w-6xl mx-auto px-4">
<div class="flex items-center gap-3 mb-2">
<i class="w-7 h-7 opacity-75" data-lucide="brain"></i>
<span class="text-xs font-semibold uppercase tracking-widest opacity-70">精神科臨床ガイド</span>
</div>
<h1 class="text-3xl md:text-4xl font-bold leading-tight">ICD-10 精神科疾患分類 ミニ版</h1>
<p class="mt-1.5 text-lg opacity-85 font-medium">F0〜F9 概要とコード一覧（シンプル表示）</p>
<div class="flex flex-wrap gap-2 mt-4">
<span class="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">WHO ICD-10 趣旨</span>
<span class="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">厚労省疾病分類との対応を意識</span>
</div>
</div>
</header>
<nav class="sticky-nav no-print">
<div class="max-w-6xl mx-auto px-4 py-2 border-b border-gray-100">
<div class="jump-nav-grid">
<a class="nav-btn f0-grad" href="#f0">F0 器質性</a>
<a class="nav-btn f1-grad" href="#f1">F1 物質</a>
<a class="nav-btn f2-grad" href="#f2">F2 統合失調症</a>
<a class="nav-btn f3-grad" href="#f3">F3 気分</a>
<a class="nav-btn f4-grad" href="#f4">F4 神経症</a>
<a class="nav-btn f5-grad" href="#f5">F5 生理的</a>
<a class="nav-btn f6-grad" href="#f6">F6 人格</a>
<a class="nav-btn f7-grad" href="#f7">F7 知的</a>
<a class="nav-btn f8-grad" href="#f8">F8 発達</a>
<a class="nav-btn f9-grad" href="#f9">F9 小児期</a>
</div>
</div>
</nav>
<main class="max-w-6xl mx-auto px-4 py-6">
"""
    )
    parts.append(OVERVIEW_GLOBAL)
    parts.append(
        """
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
<div class="flex items-center gap-2 mb-2">
<i class="w-4 h-4 text-slate-600" data-lucide="table"></i>
<span class="font-bold text-gray-700 text-sm">コード一覧の見方</span>
</div>
<p class="text-xs text-gray-600 leading-relaxed">表の各行は、WHO の ICD-10 コードとその下の DSM-5-TR 側の対応表記、日本語疾患名、英語名を並べています。<strong>定義</strong>列は JSON データから挿入され、セルをクリックすると展開して読みやすく表示できます。請求・法医学・研究では原典を必ず確認してください。</p>
</div>
"""
    )

    for n in range(10):
        parts.append(extract_header(text, n))
        parts.append(f'<div class="cat-body" id="f{n}-body">')
        parts.append('<div class="f-panel-shell">')
        parts.append(
            '<div class="toggle-nav toggle-nav--per-panel toggle-nav--dual">\n'
            f'<button type="button" class="toggle-btn on" data-panel="overview-f{n}" onclick="togglePanel(\'overview-f{n}\', this)">'
            '<i class="w-3.5 h-3.5" data-lucide="book-open"></i>概要</button>\n'
            f'<button type="button" class="toggle-btn on" data-panel="codes-f{n}" onclick="togglePanel(\'codes-f{n}\', this)">'
            '<i class="w-3.5 h-3.5" data-lucide="list"></i>コード一覧</button>\n'
            "</div>"
        )
        parts.append(f'<div class="toggle-panel open panel-overview" id="overview-f{n}">')
        parts.append(OVERVIEWS[n])
        parts.append("</div>")
        parts.append(f'<div class="toggle-panel open panel-codes" id="codes-f{n}">')
        parts.append(extract_codes_inner(text, n))
        parts.append("</div></div></div></div>")

    parts.append(
        """
<div class="text-center text-xs text-gray-400 mt-10 mb-6">
<p>icd10mini.html — icd10.html から自動生成（コード表・定義データ継承）</p>
</div>
</main>
"""
    )
    parts.append(defs_block)
    parts.append(SCRIPT_MINI)
    parts.append(
        """
<script>
  lucide.createIcons();
</script>
</body>
</html>
"""
    )

    OUT.write_text("".join(parts), encoding="utf-8")
    print("Wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
