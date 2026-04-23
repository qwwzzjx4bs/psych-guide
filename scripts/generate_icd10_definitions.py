#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""icd10.html のコード一覧行から ICD10_DEFINITIONS 用 JSON を生成する。

出力は icd10-definitions.json のみ。手動の文案修正は
icd10-definitions-overrides.json と scripts/edit_icd10_definition.py を使う。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "icd10.html"
OUT = ROOT / "icd10-definitions.json"

BLOCK_SHORT = {
    "0": "器質性・症状性の脳・全身要因に起因する精神症状（認知症・せん妄・器質性精神病等）の分類。",
    "1": "精神作用物質の使用を中核とする中毒・有害使用・依存・離脱・持続症状の分類。",
    "2": "統合失調症群・妄想性障害・急性精神病など、精神病症状主体で物質・器質で説明しきれない病態。",
    "3": "躁うつ病・再発性うつ・気分変調症など、気分症状を軸とする障害の分類。",
    "4": "不安・恐怖・強迫・解離・身体表現症状など、精神病性障害未満の神経症・ストレス関連群。",
    "5": "摂食・睡眠・性功能・産褥期など、生理・身体と行動心理が結びつく障害の分類。",
    "6": "成人の人格障害・衝動制御障害・性嗜好の障害など、持続的パーソナリティ・行動様式の病態。",
    "7": "知的発達の障害（知能と適応行動の両面の欠損）の重症度別分類。",
    "8": "言語・学習・運動・広汎性発達など、発達期に特異的な神経発達症群に近い障害。",
    "9": "小児青年期の行動・情緒・チック・遺尿遺糞など、発達段階特有の障害の分類。",
}

def parse_rows(html: str):
    blocks = re.findall(r'<table class="code-table">.*?</table>', html, re.DOTALL)
    rows = []
    for b in blocks:
        for m in re.finditer(
            r'<tr class="(main|sub)-row"[^>]*>(.*?)</tr>', b, re.DOTALL
        ):
            kind, row = m.group(1), m.group(2)
            if "en-col" not in row:
                continue
            cm = re.search(r'<span class="icd-code">([^<]+)</span>', row)
            if not cm:
                continue
            code = cm.group(1).strip()
            tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
            ja = re.sub(r"<[^>]+>", "", tds[1]).strip()
            en = re.sub(r"<[^>]+>", "", tds[2]).strip() if len(tds) > 2 else ""
            rows.append({"kind": kind, "code": code, "ja": ja, "en": en})
    return rows


def main_definition(code: str, ja: str, en: str) -> str:
    bi = code[1] if len(code) > 1 else "0"
    short = BLOCK_SHORT.get(bi, "")
    enbit = f" WHO 英語表記は『{en}』。" if en else ""
    return (
        f"{short} "
        f"コード {code} は日本語臨床で「{ja}」と表記される WHO ICD-10 の主区分であり、"
        f"診療録・研究・統計で標準的に用いられる。{enbit}"
        f"症状基準・時系列・身体・物質・薬物との関係の鑑別が診断の要。"
    )


def sub_definition(parent_code: str, parent_ja: str, code: str, ja: str, en: str) -> str:
    bi = code[1] if len(code) > 1 else "0"
    short = BLOCK_SHORT.get(bi, "")
    enbit = f" WHO 英語では『{en}』。" if en else ""
    return (
        f"{short} "
        f"下位区分 {code} は親カテゴリ（{parent_code}：{parent_ja}）内で、臨床的に「{ja}」を特徴づける症例向け。{enbit}"
        f"WHO の細分類であり、経過・疫学・治療方針の記述粒度を補う。"
    )


def build(rows):
    defs = {}
    last_main = None
    last_main_ja = None
    for r in rows:
        code, ja, en, kind = r["code"], r["ja"], r["en"], r["kind"]
        if kind == "main":
            last_main, last_main_ja = code, ja
            defs[code] = main_definition(code, ja, en)
        else:
            pc, pj = last_main or code[:3], last_main_ja or ja
            defs[code] = sub_definition(pc, pj, code, ja, en)
    return defs


def main():
    html = HTML.read_text(encoding="utf-8")
    rows = parse_rows(html)
    defs = build(rows)
    assert len(defs) == len(rows), (len(defs), len(rows))
    OUT.write_text(
        json.dumps(defs, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("wrote", OUT, "keys:", len(defs))


if __name__ == "__main__":
    main()
