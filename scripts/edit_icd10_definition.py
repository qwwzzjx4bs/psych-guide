#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
コード一覧の「定義」文を手軽に差し替え、変更履歴を JSONL に追記する。

  上書き:  python scripts/edit_icd10_definition.py set F20.0 "新しい定義文" --note "短文化"
  ファイル: python scripts/edit_icd10_definition.py set F20.0 -f path/to.txt --note "..."
  履歴:    python scripts/edit_icd10_definition.py history F20.0
  全体:    python scripts/edit_icd10_definition.py history -n 50
  戻す:    python scripts/edit_icd10_definition.py revert F20.0 --note "自動生成ベースに戻す"

上書き後は python scripts/inject_definitions_html.py で HTML へ反映。
手動で icd10-definitions-overrides.json を編集してもよい（履歴はその場合は自分で JSONL に追記）。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from icd10_definitions_merge import (
    load_base,
    load_merged,
    load_overrides,
    save_overrides,
)

ROOT = Path(__file__).resolve().parents[1]
CHANGELOG = ROOT / "icd10-definitions-changelog.jsonl"


def _append_changelog(
    code: str, note: str, before: str, after: str, action: str = "set"
) -> None:
    entry = {
        "ts": datetime.now().astimezone().isoformat(timespec="seconds"),
        "action": action,
        "code": code,
        "note": note,
        "before": before,
        "after": after,
    }
    with CHANGELOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def cmd_set(args: argparse.Namespace) -> None:
    text = args.text
    if args.file is not None:
        text = Path(args.file).read_text(encoding="utf-8").strip()
    if text is None or text == "":
        print("エラー: 定義文が空です。-f ファイルか本文を指定してください。", file=sys.stderr)
        sys.exit(1)

    before = load_merged().get(args.code, "")
    if not before and args.code not in load_base():
        print(
            f"警告: {args.code} は icd10-definitions.json にありません（新規キーとして追加します）。",
            file=sys.stderr,
        )

    over = load_overrides()
    over[args.code] = text
    save_overrides(over)
    _append_changelog(args.code, args.note or "", before, text, "set")
    print(f"更新: {args.code} → icd10-definitions-overrides.json + changelog")
    print("次: python scripts/inject_definitions_html.py")


def cmd_revert(args: argparse.Namespace) -> None:
    over = load_overrides()
    if args.code not in over:
        print(f"エラー: {args.code} には上書きがありません。", file=sys.stderr)
        sys.exit(1)

    before = load_merged().get(args.code, "")
    del over[args.code]
    save_overrides(over)
    base = load_base()
    after = base.get(args.code, "")
    _append_changelog(
        args.code, args.note or "", before, after, "revert"
    )
    print(f"削除: overrides の {args.code}（表示は自動生成ベースに戻ります）")
    print("次: python scripts/inject_definitions_html.py")


def cmd_history(args: argparse.Namespace) -> None:
    if not CHANGELOG.exists() or CHANGELOG.stat().st_size == 0:
        print("（履歴なし）")
        return
    lines = CHANGELOG.read_text(encoding="utf-8").strip().splitlines()
    rows: list[dict] = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"警告: 壊れた行をスキップ: {e}", file=sys.stderr)
    if args.code:
        rows = [r for r in rows if r.get("code") == args.code]
    tail = rows[-args.n :] if len(rows) > args.n else rows
    for r in tail:
        print(json.dumps(r, ensure_ascii=False))


def main() -> None:
    ap = argparse.ArgumentParser(description="ICD-10 コード一覧・定義文の手動編集と履歴")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_set = sub.add_parser("set", help="定義文を上書き（overrides + changelog）")
    p_set.add_argument("code", help="例: F20.0")
    p_set.add_argument("text", nargs="?", default=None, help="定義全文（短い場合）")
    p_set.add_argument("-f", "--file", type=Path, help="定義文を UTF-8 テキストファイルから読む")
    p_set.add_argument("--note", default="", help="変更メモ（履歴に残る）")
    p_set.set_defaults(func=cmd_set)

    p_rev = sub.add_parser("revert", help="当該コードの上書きを削除（ベース定義に戻す）")
    p_rev.add_argument("code")
    p_rev.add_argument("--note", default="")
    p_rev.set_defaults(func=cmd_revert)

    p_hist = sub.add_parser("history", help="changelog JSONL を表示")
    p_hist.add_argument("code", nargs="?", help="省略時は全コード")
    p_hist.add_argument("-n", type=int, default=30, help="直近 N 件（コード指定時も適用）")
    p_hist.set_defaults(func=cmd_history)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
