#!/usr/bin/env python3
"""
build_offline.py — 精神科臨床ガイド USB オフライン版ビルドスクリプト

実行すると offline/ フォルダにすべての外部依存を解決した
自己完結版を生成します。

使い方:
    python3 scripts/build_offline.py

必要環境:
    Python 3.8 以上 / インターネット接続（初回のみ）
"""

import os
import re
import shutil
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ──────────────────────────────────────────────
# 設定
# ──────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
OFFLINE_DIR  = PROJECT_ROOT / "offline"
VENDOR_DIR   = OFFLINE_DIR / "vendor"
FONTS_DIR    = VENDOR_DIR / "fonts"

# ダウンロードする JS ライブラリ
VENDOR_JS = {
    "tailwind.js": "https://cdn.tailwindcss.com",
    "lucide.js":   "https://unpkg.com/lucide@latest/dist/umd/lucide.js",
}

# Google Fonts: 全ページで使われる全ウェイトをカバーする1本のリクエスト
GFONTS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900"
    "&family=Inter:wght@300;400;500;600;700;800"
    "&family=JetBrains+Mono:wght@400;600"
    "&display=swap"
)

# コピーする拡張子（ルート直下のみ）
COPY_EXTENSIONS = {".html", ".js", ".json"}

# ──────────────────────────────────────────────
# ユーティリティ
# ──────────────────────────────────────────────

def log(msg: str) -> None:
    print(msg, flush=True)

def download(url: str, dest: Path, label: str = "") -> None:
    """URL をダウンロードして dest に保存する。"""
    name = label or dest.name
    log(f"  ↓ {name} ...")
    req = urllib.request.Request(
        url,
        headers={
            # WOFF2 を返してもらうために Chrome 相当の UA を使う
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            dest.write_bytes(resp.read())
    except urllib.error.URLError as e:
        log(f"  [ERROR] {name} のダウンロードに失敗しました: {e}")
        sys.exit(1)

# ──────────────────────────────────────────────
# ステップ 1: offline/ ディレクトリの初期化
# ──────────────────────────────────────────────

def init_dirs() -> None:
    log("\n[1/4] ディレクトリを初期化しています...")
    if OFFLINE_DIR.exists():
        shutil.rmtree(OFFLINE_DIR)
    FONTS_DIR.mkdir(parents=True)
    log(f"  offline/  作成完了")

# ──────────────────────────────────────────────
# ステップ 2: ベンダー JS のダウンロード
# ──────────────────────────────────────────────

def download_vendor_js() -> None:
    log("\n[2/4] ベンダー JS をダウンロードしています...")
    for filename, url in VENDOR_JS.items():
        download(url, VENDOR_DIR / filename, filename)

# ──────────────────────────────────────────────
# ステップ 3: Google Fonts のダウンロード
# ──────────────────────────────────────────────

def download_fonts() -> None:
    log("\n[3/4] Google Fonts をダウンロードしています...")

    # (3-a) Google Fonts CSS を取得
    log("  Google Fonts CSS を取得中...")
    req = urllib.request.Request(
        GFONTS_URL,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            css_text = resp.read().decode("utf-8")
    except urllib.error.URLError as e:
        log(f"  [ERROR] Google Fonts CSS の取得に失敗しました: {e}")
        sys.exit(1)

    # (3-b) WOFF2 URL を抽出してダウンロード
    woff2_urls: list[str] = re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)", css_text)
    if not woff2_urls:
        log("  [ERROR] WOFF2 URL が見つかりませんでした。CSS を確認してください。")
        sys.exit(1)

    log(f"  {len(woff2_urls)} 個のフォントファイルをダウンロードします...")
    for woff2_url in woff2_urls:
        # URL の末尾部分をファイル名に使用（ユニーク性のためパスのハッシュ部分も含める）
        filename = woff2_url.split("/")[-1]
        dest = FONTS_DIR / filename
        if not dest.exists():
            download(woff2_url, dest, filename)

    # (3-c) ローカル参照用 fonts.css を生成
    # gstatic.com の URL を相対パスに置換
    local_css = re.sub(
        r"url\(https://fonts\.gstatic\.com/[^)]+/([^/)]+\.woff2)\)",
        lambda m: f"url({Path(m.group(0)).name.rstrip(')')})",
        css_text,
    )
    # url(https://fonts.gstatic.com/.../xxx.woff2) → url(xxx.woff2) に変換
    local_css = re.sub(
        r"url\(https://fonts\.gstatic\.com(?:/[^)]+)*/([^/)]+\.woff2)\)",
        r"url(\1)",
        css_text,
    )
    (FONTS_DIR / "fonts.css").write_text(local_css, encoding="utf-8")
    log(f"  fonts.css を生成しました ({len(woff2_urls)} フォントファイル)")

# ──────────────────────────────────────────────
# ステップ 4: HTML/JS/JSON のコピーと URL 書き換え
# ──────────────────────────────────────────────

# 書き換えルール（正規表現 → 置換文字列）
# 適用順序は重要。長いパターンを先に処理する。
REWRITE_RULES: list[tuple[str, str]] = [
    # Tailwind CDN
    (
        r'<script\s+src="https://cdn\.tailwindcss\.com"[^>]*></script>',
        '<script src="vendor/tailwind.js"></script>',
    ),
    # Lucide (フルパス版)
    (
        r'<script\s+src="https://unpkg\.com/lucide@[^"]+/dist/umd/lucide\.js"[^>]*></script>',
        '<script src="vendor/lucide.js"></script>',
    ),
    # Lucide (短縮版 @latest のみ)
    (
        r'<script\s+src="https://unpkg\.com/lucide@[^"]*"[^>]*></script>',
        '<script src="vendor/lucide.js"></script>',
    ),
    # Google Fonts の preconnect リンク（fonts.googleapis.com / fonts.gstatic.com）
    (
        r'<link\s[^>]*rel="preconnect"\s+href="https://fonts\.(googleapis|gstatic)\.com"[^>]*/?>',
        "",
    ),
    (
        r'<link\s[^>]*href="https://fonts\.(googleapis|gstatic)\.com"[^>]*rel="preconnect"[^>]*/?>',
        "",
    ),
    # Google Fonts CSS（fonts.googleapis.com/css2?... の link タグ）
    (
        r'<link\s[^>]*href="https://fonts\.googleapis\.com/css2\?[^"]*"[^>]*/?>',
        '<link href="vendor/fonts/fonts.css" rel="stylesheet">',
    ),
    # canonical リンク（オフライン版では不要）
    (
        r'<link\s[^>]*rel="canonical"[^>]*/?>',
        "",
    ),
]

# コンパイル済みルール
_COMPILED_RULES = [(re.compile(pat, re.IGNORECASE), rep) for pat, rep in REWRITE_RULES]


def rewrite_html(content: str) -> str:
    """HTML 文字列に全書き換えルールを適用して返す。"""
    for pattern, replacement in _COMPILED_RULES:
        content = pattern.sub(replacement, content)
    return content


def copy_and_rewrite_files() -> None:
    log("\n[4/4] ファイルをコピーして URL を書き換えています...")

    html_count = js_count = json_count = 0

    for src in sorted(PROJECT_ROOT.iterdir()):
        if not src.is_file():
            continue
        if src.suffix not in COPY_EXTENSIONS:
            continue

        dest = OFFLINE_DIR / src.name

        if src.suffix == ".html":
            content = src.read_text(encoding="utf-8")
            rewritten = rewrite_html(content)
            dest.write_text(rewritten, encoding="utf-8")
            html_count += 1
        else:
            shutil.copy2(src, dest)
            if src.suffix == ".js":
                js_count += 1
            elif src.suffix == ".json":
                json_count += 1

    log(f"  HTML: {html_count} ファイル（URL 書き換え済み）")
    log(f"  JS:   {js_count} ファイル")
    log(f"  JSON: {json_count} ファイル")

# ──────────────────────────────────────────────
# README.txt の生成
# ──────────────────────────────────────────────

README_TEXT = """\
==============================================
精神科臨床ガイド — USB オフライン版
==============================================

■ 使い方
  1. このフォルダ (offline/) をそのまま USB ドライブにコピーしてください。
  2. USB 上の offline/index.html をブラウザで開いてください。
     ※ Chrome / Firefox / Safari / Edge いずれも対応しています。
  3. ポータル画面（top.html）から各ツールへアクセスできます。

■ 完全オフライン対応済みの内容
  - Tailwind CSS（スタイル）
  - Lucide アイコン
  - Google Fonts（Noto Sans JP / Inter / JetBrains Mono）
  - 全 HTML / JS / JSON ファイル

■ 注意事項
  - 外部ネットワークへの通信は一切行いません。
  - psych-news.html（精神科ニュース）など、外部 API を利用する
    一部ページはオフライン環境ではデータ取得ができません。
  - 元の HTML ファイルは変更していません。最新版を反映したい場合は
    再度 python3 scripts/build_offline.py を実行してください。

■ ビルド情報
  ビルドスクリプト: scripts/build_offline.py
  プロジェクト URL: https://github.com/qwwzzjx4bs/psych-guide（オンライン版）
"""

def write_readme() -> None:
    (OFFLINE_DIR / "README.txt").write_text(README_TEXT, encoding="utf-8")
    log("  README.txt を生成しました")

# ──────────────────────────────────────────────
# メイン
# ──────────────────────────────────────────────

def main() -> None:
    log("=" * 50)
    log(" 精神科臨床ガイド — USB オフライン版ビルド開始")
    log("=" * 50)

    init_dirs()
    download_vendor_js()
    download_fonts()
    copy_and_rewrite_files()
    write_readme()

    log("\n" + "=" * 50)
    log(" ビルド完了！")
    log(f" 出力先: {OFFLINE_DIR}")
    log(" 次のステップ:")
    log("   1. offline/ フォルダを USB ドライブにコピー")
    log("   2. USB 上の offline/index.html をブラウザで開く")
    log("=" * 50)


if __name__ == "__main__":
    main()
