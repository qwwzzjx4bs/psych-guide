#!/usr/bin/env python3
"""Generate DSM-5-TR HTML overview pages (detailed + mini) matching icd10.html UX patterns."""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_D = ROOT / "dsm5tr.html"
OUT_M = ROOT / "dsm5trmini.html"

GRADE = (
    ("f8-grad", "f8-bg"),
    ("f2-grad", "f2-bg"),
    ("f5-grad", "f5-bg"),
    ("f3-grad", "f3-bg"),
    ("f4-grad", "f4-bg"),
    ("f9-grad", "f9-bg"),
    ("f6-grad", "f6-bg"),
    ("f1-grad", "f1-bg"),
    ("f0-grad", "f0-bg"),
)

CSS_LINES = (
    ":root{--psych-gradient:linear-gradient(135deg,#312e81,#0f766e);--dsm-sticky-offset:10rem;}",
    ".f0-grad{background:linear-gradient(135deg,#92400e,#d97706);}.f1-grad{background:linear-gradient(135deg,#991b1b,#ef4444);}",
    ".f2-grad{background:linear-gradient(135deg,#5b21b6,#8b5cf6);}.f3-grad{background:linear-gradient(135deg,#1e40af,#3b82f6);}",
    ".f4-grad{background:linear-gradient(135deg,#134e4a,#14b8a6);}.f5-grad{background:linear-gradient(135deg,#9a3412,#f97316);}",
    ".f6-grad{background:linear-gradient(135deg,#1e293b,#64748b);}.f7-grad{background:linear-gradient(135deg,#374151,#9ca3af);}",
    ".f8-grad{background:linear-gradient(135deg,#14532d,#22c55e);}.f9-grad{background:linear-gradient(135deg,#9d174d,#ec4899);}",
    ".f0-bg{background:#fef3c7;}.f1-bg{background:#fee2e2;}.f2-bg{background:#ede9fe;}.f3-bg{background:#dbeafe;}",
    ".f4-bg{background:#ccfbf1;}.f5-bg{background:#ffedd5;}.f6-bg{background:#f1f5f9;}.f7-bg{background:#f3f4f6;}",
    ".f8-bg{background:#dcfce7;}.f9-bg{background:#fce7f3;}",
    "body { font-family: 'Noto Sans JP','Inter',sans-serif; }",
    "@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth;}}",
    ".header-gradient{background:var(--psych-gradient);}",
    ".dsm-code{font-family:ui-monospace,monospace;font-size:.78rem;font-weight:700;",
    "padding:.1rem .45rem;border-radius:.35rem;background:#eef2ff;color:#3730a3;}",
    ".icd-mini{font-size:.68rem;color:#0369a1;font-family:ui-monospace,monospace;display:block;margin-top:.2rem}",
    ".section-card{background:#fff;border-radius:1rem;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden;",
    "margin-bottom:1rem;scroll-margin-top:var(--dsm-sticky-offset)}",
    ".cat-header{cursor:pointer;padding:1.2rem 1.5rem;display:flex;gap:1rem;align-items:center;user-select:none;}",
    ".cat-header:hover{opacity:.93;}",
    ".cat-body{display:none;border-top:1px solid #e5e7eb;padding:1.25rem 1.5rem;}",
    ".cat-body.open{display:block}",
    ".chevron{transition:transform .25s;} .chevron.open{transform:rotate(180deg)}",
    ".code-table{width:100%;border-collapse:collapse;font-size:.82rem;}",
    ".code-table thead tr{background:#f8fafc;} .code-table th{font-weight:700;color:#374151;",
    "font-size:.72rem;padding:.5rem .85rem;text-align:left;border-bottom:2px solid #e2e8f0}",
    ".code-table td{border-bottom:1px solid #f1f5f9;padding:.5rem .85rem;vertical-align:top;line-height:1.5}",
    ".code-table tr:last-child td{border:none}",
    ".code-table tr:hover td{background:#f9fafb}",
    ".main-row td:nth-child(2){font-weight:600}",
    ".sub-row td:nth-child(2){padding-left:1.35rem;color:#475569;font-weight:400}",
    ".en-col{font-size:.78rem}",
    ".code-table td.def-col{font-size:.74rem;line-height:1.5;color:#374151;max-height:4.4em;overflow:hidden;transition:max-height .26s}",
    ".code-table tr.expanded td.def-col{max-height:60rem;padding-top:.65rem;background:#fafafa}",
    ".jump-nav{display:grid;gap:.35rem;grid-template-columns:repeat(auto-fill,minmax(8.2rem,1fr))}",
    ".nav-btn{display:block;text-align:center;padding:.42rem .5rem;border-radius:.55rem;font-size:.6rem;font-weight:700;",
    "color:#fff;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".sticky-nav{position:sticky;top:0;z-index:40;background:rgba(249,250,251,.95);backdrop-filter:blur(6px);border-bottom:1px solid #eef2ff}",
    ".diff-box{font-size:.75rem;line-height:1.55;background:#fffbeb;border:1px solid #fcd34d;border-radius:.75rem;",
    "padding:.75rem 1rem;margin-bottom:.85rem;color:#92400e}",
    ".toggle-nav{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem}",
    ".toggle-btn{cursor:pointer;border:none;padding:.38rem .7rem;border-radius:999px;font-size:.66rem;font-weight:600;",
    "background:#e5e7eb;color:#334155;display:inline-flex;gap:.35rem;align-items:center}",
    ".toggle-btn.on{background:linear-gradient(135deg,#4f46e5,#4338ca);color:#fff;transform:translateY(-1px)",
    ";box-shadow:0 4px 10px rgba(67,56,202,.35)}",
    ".toggle-panel{display:none;border-left:3px solid #e5e7eb;padding:.85rem}",
    ".toggle-panel.open{display:block;border-left-color:#4f46e5}",
    ".global-bar{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.35rem}",
    ".gbtn{cursor:pointer;border:none;padding:.3rem .6rem;font-size:.64rem;font-weight:700;border-radius:999px}",
    ".gbtn.on{color:#fff} .gbtn:not(.on){background:#e2e8f0;color:#475569}",
    ".g-overview.on{background:#4f46e5} .g-icd.on{background:#2563eb} .g-code.on{background:#1e293b}",
    ".expandable{cursor:pointer} .expandable:not(.expanded):hover td{background:rgba(67,56,202,.06)}",
    ".dsm5tr-mini .code-table td.def-col{max-height:none;overflow:visible;background:transparent}",
    ".stat-mini{display:flex;flex-wrap:wrap;gap:.75rem}",
    ".stat-mini>div{padding:.55rem .9rem;background:rgba(255,255,255,.15);border-radius:.65rem;text-align:center;flex:1 1 7rem}",
)


def R(uid: str, dsm: str, icdc: str, ja: str, en: str, de: str, sub: bool = False) -> dict[str, Any]:
    return {"uid": uid, "dsm": dsm.strip(), "icd": icdc.strip(), "ja": ja.strip(), "en": en.strip(), "def": de.strip(), "sub": sub}


def build_chapters() -> list[dict[str, Any]]:
    ch: list[dict[str, Any]] = []

    def add(ix: int, key: str, nr: int, title: str, nav: str, luc: str, overview: str, icd_note: str, rows: list):
        gg, dbg = GRADE[ix % len(GRADE)]
        ch.append(
            {
                "key": key,
                "nr": nr,
                "nav": nav,
                "title": title,
                "grad": gg,
                "dbg": dbg,
                "lucide": luc,
                "overview": overview,
                "icd_note": icd_note,
                "rows": rows,
            }
        )

    add(
        0,
        "ch01",
        1,
        "神経発達障害 Neurodevelopmental",
        "神経発達",
        "puzzle",
        "<p class=\"text-sm text-gray-800 mb-2\">発達史的根拠と現在の機能障害の両方を評価。成人ASD・成人ADHDの記録粒度に注意。</p>",
        "<strong>F70–F79</strong>（知的）、<strong>F80–F89/F84</strong>（心理発達／広汎性発達）との対応。",
        [
            R("01a", "317", "F70", "軽度知的発達障害", "Mild intellectual developmental disorder", "概念的・実践的・社会的適応の低下を伴う軽度域。", False),
            R("01b", "319", "F79", "知的発達障害（詳細不明）／重症度未評価", "Unspecified intellectual disability", "評価未了または重症度未定。コード更新を計画。", True),
            R("01c", "315.81", "F80.82", "音声障害 Speech sound disorder", "Speech sound disorder", "音声の誤謬が会話に持続し聴力・構造異常除外済。", True),
            R("01d", "315.2", "F81.82", "協調運動発達障害", "Developmental coordination disorder", "ASDなどとの鑑別が必要。", True),
            R("01e", "315.1x", "F81.81", "限定技能障害（読字など）", "Specific learning disorder", "教育的にも改善乏しい機能障害。", False),
            R("01f", "299.x", "F84.x", "自閉スペクトラム症", "Autism spectrum disorder", "質的異常としての対人コミュニケーション欠損と限局パターン。", False),
            R("01g", "314.xx", "F90.x", "注意欠如・多動症", "ADHD presentations", "不注意・多動・衝動の機能障害。呈示タイプを注記。", False),
            R("01h", "315.82", "F89", "社会実用コミュニケーション障害※", "Social pragmatic communication disorder", "ASD と重複しないときに限る。", True),
            R("01i", "316–319", "F88–89", "その他明示／不特定の神経発達障害", "Other specified / unspecified ND", "機能を文章明示。", True),
        ],
    )
    add(
        1,
        "ch02",
        2,
        "統合失調症スペクトラムおよびその他精神病性障害",
        "精神病性",
        "split",
        "<p class=\"text-sm mb-2\"><strong>Criterion A 症状セット</strong> と <strong>6ヶ月以上の機能障害枠</strong> がDSMの背骨。"
        " いったん器質・物質評価をセットで。</p>",
        "ICD <strong>F20–F29</strong>。請求桁は院内運用順守。※ICD側に残る細分類は補足的併記。",
        [
            R("02a", "298.x", "F23/F29", "短期および境界性病態", "Brief / acute transient psychoses", "時間経過で統合失調症／ICD区分へ収束評価。", False),
            R("02b", "295.40", "F20.x", "統合失調様障害 schizoform", "Schizophreniform disorder", "<6か月モデル。※", False),
            R("02c", "295.x", "F20.9 等", "統合失調症", "Schizophrenia", "陰性症状・認知障害評価の記載推奨。", False),
            R("02d", "297.x", "F22.x", "妄想症／妄想障害モデル*", "Delusional disorder ICD bridge", "妄想が主。", True),
            R("02e", "—", "F05/F06", "器質・せん妄モデルクロス*", "Organic rule-out ICD bridge", "鑑別最優先。", True),
            R("02f", "298.89", "F29", "未特定の精神病的精神障害", "Unspecified psychotic disorder", "初診評価中。", True),
        ],
    )
    add(
        2,
        "ch03",
        3,
        "双極性および関連障害",
        "双極",
        "activity",
        "<p class=\"text-sm mb-2\">単相との鑑別は病歴評価。児での<strong>DMDD</strong>（抑うつ章）との境界評価も。</p>",
        "ICD <strong>F31</strong> と <strong>F34.0/F34.81</strong> 環境クロス。※",
        [
            R("03a", "296.xx", "F31", "双極性障害 I（躁・混合など）モデル*", "Bipolar I cohort", "ICD桁は順守。※", False),
            R("03b", "296.xx", "F31.81", "双極性障害 II モデル*", "Bipolar II cohort", "軽躁の強度評価。", True),
            R("03c", "301.13", "F34.0", "環状気分障害 Cyclothymic", "Cyclothymic disorder", "閾値下の振幅持続。", True),
            R("03d", "296.xx", "F31.9", "その他明示・不特定 双極*", "Specified / unspecified bipolar", "機能を文章。", True),
        ],
    )
    add(
        3,
        "ch04",
        4,
        "抑うつ障害および関連モデル Depressive Disorders",
        "抑うつ",
        "cloud-rain",
        "<p class=\"text-sm mb-2\">重症度 specifier、精神病性側面、アジテーション側面。※産褥・経前不快気は章横断。</p>",
        "ICD <strong>F32/F33/F34.8x</strong> 等。",
        [
            R("04a", "296.xx", "F33.x/F32.x", "大うつ病性エピソードおよび反復モデル*", "Major depressive ICD bridge", "基準セットはDSM。※個別桁は順守。", False),
            R("04b", "300", "F34.82", "持続気分モデル*", "Persistent depressive ICD bridge condensed", "機能持続の評価。※", False),
            R("04c", "300", "F34.92", "不特定モデル*", "Unspecified ICD bridge condensed", "評価未了。※", True),
            R("04d", "—", "F53", "産褥モデルクロス*", "Postpartum ICD bridge condensed", "産科連携。※", True),
            R("04e", "—", "N94.3", "月経前不快気群モデルクロス*", "PMDD cross chapter ICD", "婦科コード並記。※国内運用順守。", True),
        ],
    )
    add(
        4,
        "ch05",
        5,
        "不安障害 Anxiety Disorders",
        "不安",
        "wind",
        "<p class=\"text-sm mb-2\">強度・場面特異・身体症状との関係。※身体症状症およびTIC群とのクロス評価。</p>",
        "概ね ICD <strong>F40–F41</strong>。混合性うつ気分 ICD F41.2 はDSM と概念が異なる場合あり。",
        [
            R("05a", "300.xx", "F40.26", "分離不安", "Separation anxiety disorder", "児のみならず成人も対象。※", False),
            R("05b", "300.23", "F94.82", "選択緘黙", "Selective mutism linkage", "ASD・社交との鑑別。", True),
            R("05c", "300.xx", "F40.2xx", "恐怖症モデル*", "Specific phobia cohort", "", False),
            R("05d", "300.23", "F40.11", "社会不安／社交不安", "Social anxiety disorder", "", False),
            R("05e", "300.01", "F41.0", "パニック障害", "Panic disorder", "回避評価と身体検査。※", False),
            R("05f", "300.xx", "F41.1", "全般性不安障害", "Generalized anxiety disorder", "", False),
            R("05g", "300.xx", "F41.8", "その他明示・不特定 不安*", "Other / unspecified anxiety", "", True),
        ],
    )
    add(
        5,
        "ch06",
        6,
        "強迫症および関連障害",
        "強迫関連",
        "refresh-ccw",
        "<p class=\"text-sm mb-2\">次元モデル、身体醜形、収集強迫。※チックとの併存評価。</p>",
        "概ね ICD <strong>F42</strong> と身体関連 F45 クロス。※",
        [
            R("06a", "300.3", "F42", "強迫症関連モデル*", "OCD cohort", "", False),
            R("06b", "300.7", "F45.23", "身体醜形症モデル*", "Body dysmorphic linkage", "", False),
            R("06c", "300.81", "F42.A", "捨てられない症（ひどい収集）", "Hoarding disorder", "", True),
            R("06d", "312.39", "F63.3", "抜毛症", "Trichotillomania", "", True),
            R("06e", "312.82", "F42.94", "皮膚掻抓関連モデル*", "Excoriation linkage", "", True),
            R("06f", "300.xx", "F42.xx", "その他不特定*", "Specified unspecified OCD-related", "", True),
        ],
    )
    add(
        6,
        "ch07",
        7,
        "トラウマおよびストレス関連障害",
        "ストレス",
        "shield",
        "<p class=\"text-sm mb-2\">APA独立章モデル。※適応は短期反応モデル評価でうつ単相とも切り離す。</p>",
        "ICD <strong>F43.1</strong>（PTSD）／<strong>F43.21–25</strong>（適応障害ほか）。",
        [
            R("07a", "313.xx", "F94.82", "反応性愛着障害モデル*", "RAD linkage", "", True),
            R("07b", "309.xx", "F94.xx", "脱抑制愛着モデル*", "DSED linkage", "", True),
            R("07c", "309.81", "F43.10", "PTSD モデル*", "PTSD cohort", "", False),
            R("07d", "308.3", "F43.xx", "急性ストレス障害モデル*", "Acute stress linkage", "", True),
            R("07e", "309.xx", "F43.xx", "適応障害モデル*", "Adjustment disorder linkage", "", False),
            R("07f", "309.xx", "F43.xx", "その他不特定*", "Other trauma linkage", "", True),
        ],
    )
    add(
        7,
        "ch08",
        8,
        "解離性障害",
        "解離",
        "unlink",
        "<p class=\"text-sm mb-2\">質的モデル評価。器質・文化横断的注意。</p>",
        "概ね ICD <strong>F44</strong>。",
        [
            R("08a", "300.xx", "F44.xx", "解離健忘モデル*", "Dissociative amnesia linkage", "", False),
            R("08b", "300.xx", "F44.xx", "解離離人モデル*", "Depersonalization/derealization linkage", "", False),
            R("08c", "300.xx", "F44.xx", "解離身分障害モデル*", "Dissociative identity linkage", "", True),
            R("08d", "300.xx", "F44.xx", "その他不特定*", "Specified unspecified dissociative", "", True),
        ],
    )
    add(
        8,
        "ch09",
        9,
        "身体症状症および関連障害",
        "身体症状",
        "stethoscope",
        "<p class=\"text-sm mb-2\">症状・関連行動・信念のモデル。※器質評価のバランスと治療関係調整。</p>",
        "<strong>F45</strong> 相当。※病気不安症 Illness anxiety。",
        [
            R("09a", "300.xx", "F45.xx", "身体症状症モデル*", "Somatic symptom disorder linkage", "", False),
            R("09b", "300.xx", "F45.xx", "病気不安症モデル*", "Illness anxiety linkage", "", True),
            R("09c", "300.xx", "F45.xx", "変換障害モデル*", "Functional neurological symptom ICD bridge condensed", "", True),
            R("09d", "300.xx", "F45.xx", "その他不特定*", "Specified unspecified linkage", "", True),
        ],
    )
    add(
        9,
        "ch10",
        10,
        "摂食障害",
        "摂食",
        "utensils",
        "<p class=\"text-sm mb-2\">栄養・代謝合併回避と回復モデル。※ARFID 説明言語運用にも配慮。</p>",
        "概ね <strong>F50</strong> 群。※",
        [
            R("10a", "307.1xx", "F50.0/F50.82", "神経性やせモデル*", "Restriction AN linkage", "", False),
            R("10b", "307.53", "F50.82", "神経性大食モデル*", "Bulimia linkage", "", False),
            R("10c", "307.91", "F50.94", "回避・限局的摂食 ARFIDモデル*", "ARFID linkage", "", False),
            R("10d", "307.51", "F50.81", "過食症 BEDモデル*", "BED linkage", "", True),
            R("10e", "307.xx", "F50.xx", "その他不特定*", "Specified unspecified linkage", "", True),
        ],
    )
    add(
        10,
        "ch11",
        11,
        "排泄障害",
        "排泄",
        "droplet",
        "<p class=\"text-xs mb-2\">尿路・消化器評価を必要に応じ併記。</p>",
        "<strong>F98.92/F98.95</strong>など。※",
        [
            R("11a", "307.71", "F98.93", "遺尿症モデル*", "Enuresis linkage", "", False),
            R("11b", "307.71", "F98.93", "遺失禁モデル*", "Encopresis linkage", "", True),
            R("11c", "307.xx", "F98.xx", "その他不特定*", "Linkage unspecified elimination", "", True),
        ],
    )
    add(
        11,
        "ch12",
        12,
        "睡眠‐覚醒障害※",
        "睡眠",
        "moon",
        "<p class=\"text-xs mb-2 text-amber-800\"><strong>G47内科コード</strong>とのクロス必須。本章は精神科寄りモデル。※</p>",
        "ICD <strong>G47.xx</strong>／<strong>F51</strong> 混在。※",
        [
            R("12a", "307.xx", "F51.xx", "内因性不眠モデル*", "Primary insomnia DSM linkage", "", False),
            R("12b", "307.xx", "F51.xx", "過眠・睡眠リズム関連モデル*", "Hypersomnia/circadian linkage", "", True),
            R("12c", "307.xx", "F51.xx", "異寝眠モデル*", "Parasomnia linkage", "", True),
            R("12d", "—", "G47.x", "内科睡眠クロス*", "Sleep disorder ICD other chapter linkage", "", True),
        ],
    )
    add(
        12,
        "ch13",
        13,
        "性機能障害",
        "性機能",
        "heart-pulse",
        "<p class=\"text-sm mb-2\">関連医学評価、薬理的側面。※",
        "<strong>F52</strong> 群。※",
        [
            R("13a", "302.xx", "F52.xx", "性機能モデル*", "Sexual dysfunction cohort", "", False),
            R("13b", "302.xx", "F52.xx", "早漏モデル*", "Premature ejaculation linkage", "", True),
            R("13c", "302.xx", "F52.xx", "遅延／阻害モデル*", "Delayed ejaculation linkage", "", True),
            R("13d", "302.xx", "F52.xx", "その他不特定*", "Unspecified linkage", "", True),
        ],
    )
    add(
        13,
        "ch14",
        14,
        "性別違和",
        "性別違和",
        "users",
        "<p class=\"text-xs mb-2\">本人志向と精神科・連携モデル。※ICD-11は異なるモデル。※",
        "ICD-10運用：<strong>F64</strong>。※",
        [
            R("14a", "302.xx", "F64", "成人・思春期モデル*", "Gender dysphoria cohort", "", False),
            R("14b", "302.xx", "F64.xx", "その他不特定モデル*", "Specified unspecified linkage", "", True),
        ],
    )
    add(
        14,
        "ch15",
        15,
        "破壊性／衝動制御および行為障害",
        "行動調節",
        "flame",
        "<p class=\"text-sm mb-2\">児および成人モデル。※ODD・Conduct・病的賭博等。</p>",
        "<strong>F63/F91/F92</strong> 周辺。※",
        [
            R("15a", "312.81", "F91.xx", "反抗挑戦モデル*", "Oppositional linkage", "", False),
            R("15b", "312.xx", "F91.xx", "行為障害モデル*", "Conduct linkage", "", False),
            R("15c", "312.xx", "F63.xx", "衝動制御モデル*", "Impulse ICD bridge condensed", "", True),
            R("15d", "305.xx", "F63.xx", "病的賭博モデル*", "Gambling ICD bridge DSM15", "", True),
            R("15e", "312.xx", "F63.xx", "病的放火モデル*", "Pyromania linkage", "", True),
            R("15f", "312.xx", "F63.xx", "病的窃取モデル*", "Kleptomania linkage", "", True),
        ],
    )
    add(
        15,
        "ch16",
        16,
        "物質関連および嗜癖モデル／中毒連関*",
        "物質",
        "beaker",
        "<p class=\"text-sm mb-2\">使用障害の重症度モデル。※離脱・中毒・関連精神症状を時系列評価。</p>",
        "ICD <strong>F10–F19</strong> 第４桁枠。※",
        [
            R("16a", "303.xx", "F10.xx", "アルコール関連モデル*", "Alcohol linkage", "", False),
            R("16b", "305.xx", "F12.xx", "大麻モデル*", "Cannabis linkage", "", True),
            R("16c", "305.xx", "F11.xx/F14.xx/F15.xx/F18.xx", "オピオイド〜刺激薬・鎮静薬モデル*", "Opioids/stims/sed linkage", "", True),
            R("16d", "305.xx", "F17.xx", "たばこ使用障害*", "Tobacco linkage", "", True),
            R("16e", "—", "F16.xx", "幻覚剤モデル*", "Hallucinogen linkage", "", True),
            R("16f", "—", "F19.xx", "複合物質その他不特定モデル*", "Polysubstance linkage", "", True),
        ],
    )
    add(
        16,
        "ch17",
        17,
        "神経認知障害",
        "神経認知",
        "brain",
        "<p class=\"text-sm mb-2\"><strong>Mild／Major神経認知</strong>、病因評価は身体側ICD と併記。※",
        "認知 <strong>G30/F03/F06/F05</strong>クロス。※",
        [
            R("17a", "294.xx", "F03/F05", "主要神経認知／せん妄モデル*", "Major NCD/Delirium linkage", "", False),
            R("17b", "331.xx", "R41.xx", "軽度神経認知モデル*", "Mild NCD linkage condensed", "", True),
            R("17c", "294.xx", "F02.xx", "病因注記モデル*", "etiological specifier linkage ICD", "", True),
        ],
    )
    add(
        17,
        "ch18",
        18,
        "パーソナリティ障害",
        "人格障害",
        "fingerprint",
        "<p class=\"text-xs mb-2\">持続的パターン。※急性状態の誤適用回避。クラスタモデル。※</p>",
        "<strong>F60–F61</strong>。※",
        [
            R("18a", "301.xx", "F60.xx", "群Aモデル*", "Cluster A ICD bridge DSM", "", False),
            R("18b", "301.xx", "F60.3 xx", "群Bモデル*", "Cluster B linkage", "", True),
            R("18c", "301.xx", "F60.xx", "群Cモデル*", "Cluster C linkage", "", True),
            R("18d", "301.xx", "F60.xx", "その他不特定モデル*", "Specified unspecified linkage", "", True),
            R("18e", "—", "F62", "脳疾患後人格変容*", "Organic personality ICD bridge", "", True),
        ],
    )
    add(
        18,
        "ch19",
        19,
        "異常性愛障害／パラフィリア群*",
        "パラフィリア",
        "lock",
        "<p class=\"text-xs mb-2 text-rose-800\">同意／苦痛／機能障害モデル。※倫理的配慮と通報順守。※</p>",
        "<strong>F65</strong>。※",
        [
            R("19a", "302.xx", "F65.xx", "パラフィリア障害モデル*", "Paraphilic linkage cohort ICD", "", False),
            R("19b", "302.xx", "F65.xx", "不特定モデル*", "Specified unspecified linkage", "", True),
        ],
    )
    add(
        19,
        "ch20",
        20,
        "その他不特定精神病モデルおよび危機ワークフロー橋渡し※",
        "その他",
        "more-horizontal",
        "<p class=\"text-xs mb-2\">評価未了モデル。※自殺危機ワークフローは別評価表とセット。※",
        "<strong>R45/F99</strong>クロス。※",
        [
            R("20a", "—", "R45.xx", "自殺行動モデルクロス*", "Suicidal behavior ICD bridge DSM ref", "", False),
            R("20b", "—", "F99", "不特定モデル*", "Unspecified ICD bridge DSM", "", True),
        ],
    )
    add(
        20,
        "ch21",
        21,
        "薬物誘発性運動障害および他有害現象モデル※",
        "有害現象",
        "pill",
        "<p class=\"text-xs mb-2\">薬理的因果モデル。※G25〜系コード環境クロス。※",
        "ICD複数章混在。※",
        [
            R("21a", "333.xx", "G21/G24/G25", "不随意運動有害モデル*", "TDK linkage ICD bridge DSM", "", False),
            R("21b", "—", "F06.xx", "精神／器質モデルクロス*", "Drug induced ICD bridge DSM", "", True),
            R("21c", "—", "G71/G91", "神経モデルクロス*", "Secondary neuro ICD DSM bridge condensed", "", True),
        ],
    )
    return ch


def defs_map(chapters: list[dict[str, Any]]) -> dict[str, str]:
    m: dict[str, str] = {}
    for c in chapters:
        for r in c["rows"]:
            m[r["uid"]] = r["def"]
    return m


def table_body(chapter: dict[str, Any], mini: bool) -> str:
    lines: list[str] = []
    for r in chapter["rows"]:
        cls = "sub-row" if r["sub"] else "main-row"
        tr_cls = cls + (" expandable" if not mini else "")
        extra = ''
        if not mini:
            extra = ' tabindex="0" aria-expanded="false"'
        jc = "<div>"
        jc += f'<span class="dsm-code">{html.escape(str(r["dsm"]))}</span>'
        jc += f'<span class="icd-mini">{html.escape(str(r["icd"]))}</span></div>'
        def_td = ""
        if mini:
            def_td = f'<td class="def-col">{html.escape(str(r["def"]))}</td>'
        lines.append(
            f'<tr class="{tr_cls.strip()}" data-def-key="{html.escape(str(r["uid"]))}"{extra}>'
            f"<td>{jc}</td><td>{html.escape(str(r['ja']))}</td>"
            f'<td class="en-col text-gray-500">{html.escape(str(r["en"]))}</td>{def_td}</tr>'
        )
    return "\n".join(lines)


def thead_html(mini: bool) -> str:
    h = (
        '<thead><tr>'
        '<th>DSM-5-TR <span class="block text-[0.65rem] font-normal text-slate-500 mt-0.5">'
        "ICD-10-CM連関</span></th>"
        '<th>日本語疾患名／概念メモ*</th>'
        '<th class="en-col">英語*</th>'
    )
    if mini:
        h += '<th class="def-col">概要</th>'
    h += "</tr></thead>"
    return h


def render_section_inner(ch: dict[str, Any], *, mini: bool) -> str:
    ov_block = (
        f'<div class="rounded-xl p-4 border-l-4 border-indigo-600 {html.escape(ch["dbg"])}"'
        f'>{ch["overview"]}</div>'
    )
    icd_block = f'<div class="diff-box">{ch["icd_note"]}</div>'
    tbl = (
        '<div class="overflow-x-auto"><table class="code-table">'
        f"{thead_html(mini)}<tbody>{table_body(ch, mini)}</tbody></table></div>"
    )
    return f'<div class="space-y-3">{ov_block}{icd_block}{tbl}</div>'


def render_card(ch: dict[str, Any], *, mini: bool, open_first: bool) -> str:
    bid = ch["key"] + "-body"
    title_html = html.escape(ch["title"])
    body_cls = "cat-body open" if open_first else "cat-body"
    cv_cls = "w-5 h-5 chevron shrink-0 open" if open_first else "w-5 h-5 chevron shrink-0"
    return (
        f'<div class="section-card" id="{html.escape(ch["key"])}">'
        f'<div class="cat-header text-white {html.escape(ch["grad"])}" '
        f'onclick="dsmToggleCat(\'{html.escape(bid)}\')">'
        f'<div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">'
        f'<i data-lucide="{html.escape(ch["lucide"])}" class="w-6 h-6"></i></div>'
        f'<div class="flex-1 min-w-0">'
        f'<span class="text-xl font-bold">第{ch["nr"]}章</span> '
        f'<span class="text-sm ml-2 font-semibold opacity-95">{title_html}</span></div>'
        f'<i data-lucide="chevron-down" class="{cv_cls}" id="{html.escape(bid)}-cv"></i></div>'
        f'<div class="{body_cls}" id="{html.escape(bid)}">{render_section_inner(ch, mini=mini)}</div></div>'
    )


_DETAIL_INJECT_DEFS = (
    '(function(){function inject(){if(document.body.classList.contains("dsm5tr-mini"))return;'
    "var el=document.getElementById('dsm-defs-json');if(!el)return;var defs={};"
    "try{defs=JSON.parse(el.textContent);}catch(e){return;}"
    "document.querySelectorAll('table.code-table').forEach(function(table){var trh=table.querySelector('thead tr');"
    "var thEn=trh&&trh.querySelector('th.en-col');"
    'if(!trh||!thEn||trh.querySelector("th.def-col-head"))return;'
    "var th=document.createElement('th');th.className='def-col-head def-col';th.textContent='概要';thEn.after(th);"
    "table.querySelectorAll('tbody tr').forEach(function(tr){var k=(tr.dataset.defKey||'').trim();"
    'if(tr.querySelector("td.def-col"))return;'
    "var ds=defs[k]||'—';var tds=[].slice.call(tr.querySelectorAll(':scope > td'));"
    "if(tds.length<3)return;var en=tds[2];var td=document.createElement('td');td.className='def-col';"
    "td.textContent=ds;en.after(td);if(tr.classList.contains('expandable')){"
    'tr.addEventListener("click",function(ev){if(ev.target.closest("a"))return;ev.preventDefault();'
    'tr.classList.toggle("expanded");});}});});inject();})();'
)


def compose_page(chapters: list[dict[str, Any]], *, mini: bool, title_suffix: str) -> str:
    nav = "".join(f'<a class="nav-btn {c["grad"]}" href="#{html.escape(c["key"])}">{html.escape(c["nav"])}</a>' for c in chapters)
    defs = defs_map(chapters)
    defs_block = ""
    script_tail = ""

    body_attr = 'class="bg-gray-50 dsm5tr-mini"' if mini else 'class="bg-gray-50"'

    if not mini:
        defs_raw = json.dumps(defs, ensure_ascii=False).replace("</", "<\\/")
        defs_block = f'<script type="application/json" id="dsm-defs-json">{defs_raw}</script>'
        script_tail = f"<script>{_DETAIL_INJECT_DEFS}</script>"

    note = "*本文は<strong>概要メモとICDクロスだけ</strong>であり、請求／法務には必ず原典。※"

    hdr_stats = ""
    if mini:
        hdr_stats = (
            "<div class=\"stat-mini mt-5\"><div><div class=\"text-2xl font-bold\">"
            + str(len(chapters))
            + "</div><div class=\"text-xs opacity-80\">セクション*</div></div>"
            "<div><div class=\"text-2xl font-bold\">軽量</div><div class=\"text-xs opacity-80\">印刷向け*</div></div></div>"
        )

    main_cards = "".join(
        render_card(ch, mini=mini, open_first=i == 0) for i, ch in enumerate(chapters)
    )

    ttl = html.escape(f"DSM-5-TR 章一覧 {title_suffix}")
    hl = html.escape(("DSM-5-TR 章立てクリニカル概要 " + ("（ミニ版）" if mini else "（詳細版）")))

    return f'''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{ttl} | 精神科臨床ガイド</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>{chr(10).join(CSS_LINES)}</style>
</head>
<body {body_attr}>
<header class="header-gradient text-white py-9">
<div class="max-w-6xl mx-auto px-4">
<div class="flex items-center gap-3 mb-2">
<i data-lucide="book-copy" class="w-8 h-8 opacity-80"></i>
<span class="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-85">精神科臨床ガイド</span></div>
<h1 class="text-3xl md:text-4xl font-bold">{hl}</h1>
<p class="mt-2 text-lg opacity-90">APA Section II × ICD-10-CM 連関*</p>
{hdr_stats}</div></header>
<nav id="dsm-sticky-jump-root" class="sticky-nav no-print"><div class="max-w-6xl mx-auto px-4 py-2 border-b border-gray-100">
<div class="jump-nav">{nav}</div>
<p class="text-[11px] text-gray-600 mt-2 mb-0.5 leading-snug">上のジャンプリンクまたは<strong>各色の章見出し</strong>をクリックすると、その章の表が開きます。<span class="text-gray-500">（読み込み時は第1章が開いています。）</span></p>
</div></nav>
<main class="max-w-6xl mx-auto px-4 py-6">
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5 text-xs text-gray-600 leading-relaxed">
<i data-lucide="alert-circle" class="w-4 h-4 text-amber-600 inline align-middle mr-1"></i>{note}
<span class="block mt-2 text-[11px] text-gray-500"><strong>dsm5tr.html</strong> / <strong>dsm5trmini.html</strong> は <strong>scripts/generate_dsm5tr.py</strong> で再生成してください。</span>
</div>{main_cards}
<div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6 text-[11px] text-gray-500 leading-relaxed">
<strong>参考文献：</strong>American Psychiatric Association. <em>Diagnostic and Statistical Manual of Mental Disorders,</em> 5th ed., text revision. 2022. 
ICD-10-CMコードはCMS版の最新改訂に従ってください。<br/><span class="tabular-nums">2026年5月現在</span>のメモ構成です。</div></main>
<script>
(function(){{
var NAV_ID='dsm-sticky-jump-root';
var EXTRA=6;
function dsmStickyOffsetPx(){{
  var el=document.getElementById(NAV_ID);
  if(!el)return null;
  return Math.ceil(el.getBoundingClientRect().height)+EXTRA;
}}
function dsmSyncStickyJump(){{
  var px=dsmStickyOffsetPx();
  if(px==null)return;
  document.documentElement.style.setProperty('--dsm-sticky-offset', px+'px');
}}
function dsmRevealHashAnchor(){{
  var slug=(location.hash||'').slice(1);
  if(!slug)return;
  var tgt=document.getElementById(slug);
  if(!tgt)return;
  requestAnimationFrame(function(){{ requestAnimationFrame(function(){{ tgt.scrollIntoView({{block:'start'}}); }}); }});
}}
window.dsmRefreshJumpScroll=function(){{
  dsmSyncStickyJump();
  dsmRevealHashAnchor();
}};
dsmSyncStickyJump();
window.addEventListener('resize', dsmSyncStickyJump);
window.addEventListener('hashchange', function(){{ window.dsmRefreshJumpScroll(); }});
if(window.ResizeObserver){{ var nav=document.getElementById(NAV_ID); if(nav) {{ new ResizeObserver(dsmSyncStickyJump).observe(nav); }} }}
}})();
function dsmToggleCat(id){{
var body=document.getElementById(id); var cv=document.getElementById(id+'-cv');
if(!body) return;
var opening=!body.classList.contains('open');
document.querySelectorAll('.cat-body').forEach(function(b){{ if(b!==body) b.classList.remove('open'); }});
document.querySelectorAll('.chevron').forEach(function(c){{ if(c!==cv) c.classList.remove('open'); }});
body.classList.toggle('open', opening);
if(cv) cv.classList.toggle('open', opening);
if(opening){{
setTimeout(function(){{
var card=body.closest('.section-card');
if(!card)return;
var red=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
card.scrollIntoView({{behavior:red?'auto':'smooth',block:'start'}});
}},100);
}}
}}
document.addEventListener('DOMContentLoaded',function(){{
if(typeof lucide!=='undefined')lucide.createIcons();
requestAnimationFrame(function(){{
if(window.dsmRefreshJumpScroll)window.dsmRefreshJumpScroll();
}});
}});
</script>
{defs_block}{script_tail}
</body></html>'''


def main() -> None:
    chap = build_chapters()
    OUT_D.write_text(compose_page(chap, mini=False, title_suffix="詳細版"), encoding="utf-8")
    OUT_M.write_text(compose_page(chap, mini=True, title_suffix="ミニ版"), encoding="utf-8")
    print("Written:", OUT_D, OUT_M)


if __name__ == "__main__":
    main()
