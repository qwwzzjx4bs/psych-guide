#!/usr/bin/env python3
"""icd10-definitions.json と手動上書き overrides をマージする共通処理。"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = ROOT / "icd10-definitions.json"
OVERRIDES_PATH = ROOT / "icd10-definitions-overrides.json"


def load_base() -> dict[str, str]:
    data = json.loads(BASE_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise TypeError("icd10-definitions.json はオブジェクトである必要があります")
    return {str(k): str(v) for k, v in data.items()}


def load_overrides() -> dict[str, str]:
    if not OVERRIDES_PATH.exists():
        return {}
    data = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise TypeError("icd10-definitions-overrides.json はオブジェクトである必要があります")
    return {str(k): str(v) for k, v in data.items()}


def load_merged() -> dict[str, str]:
    base = load_base()
    over = load_overrides()
    merged = {**base, **over}
    return merged


def save_overrides(over: dict[str, str]) -> None:
    OVERRIDES_PATH.write_text(
        json.dumps(over, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
