#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
統合失調症 心理教育資料 Web生成サーバー

ブラウザツール（schizophrenia-psychoeducation-generator.html）と連携し、
フォームに入力された症例データを Word (.docx) に変換して返す。

使い方:
    cd scripts/schizophrenia_psychoeducation
    pip install flask python-docx
    python serve_web.py

    → http://localhost:5001 でHTMLツールを配信
    → POST /generate で .docx を返す
    → GET  /health  でサーバー疎通確認
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Flask の import を試みる。なければインストール方法を案内して終了
try:
    from flask import Flask, Response, jsonify, request, send_file
    from flask import send_from_directory
except ImportError:
    print("Flask がインストールされていません。以下のコマンドでインストールしてください:")
    print("  pip install flask")
    sys.exit(1)

# =============================================
# パス設定
# =============================================
HERE = Path(__file__).resolve().parent          # scripts/schizophrenia_psychoeducation/
ROOT = HERE.parent.parent                        # My-First-Project/
HTML_TOOL = ROOT / "schizophrenia-psychoeducation-generator.html"
CONTENT_JSON = HERE / "content.json"
GENERATE_SCRIPT = HERE / "generate_docx.py"

app = Flask(__name__)

# =============================================
# CORS ヘッダー（ブラウザからの fetch を許可）
# =============================================
@app.after_request
def add_cors(response: Response) -> Response:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.route("/health", methods=["GET", "OPTIONS"])
def health() -> Response:
    """サーバー疎通確認エンドポイント。HTMLツールが5秒ごとに呼ぶ。"""
    return jsonify({"status": "ok", "version": "1.0"})


@app.route("/", methods=["GET"])
def index() -> Response:
    """HTMLツールを配信する。"""
    if HTML_TOOL.exists():
        return send_file(str(HTML_TOOL))
    return Response(
        "<p>HTMLツールが見つかりません。<br>"
        f"期待パス: {HTML_TOOL}</p>",
        status=404,
        mimetype="text/html; charset=utf-8",
    )


@app.route("/generate", methods=["POST", "OPTIONS"])
def generate() -> Response:
    """
    リクエストボディ: 症例 JSON（example_case.json と同じ構造）
    レスポンス: .docx バイナリ（Content-Disposition: attachment）

    処理フロー:
      1. JSON を一時ファイルに書き込む
      2. generate_docx.py を subprocess 呼び出し
      3. 生成された .docx を読み込んでレスポンス
    """
    if request.method == "OPTIONS":
        return Response(status=204)

    # JSON パース
    case_data: dict = {}
    try:
        case_data = request.get_json(force=True) or {}
    except Exception as e:
        return jsonify({"error": f"JSONのパースに失敗: {e}"}), 400

    # audience の確認
    audience = case_data.get("audience", "patient")
    if audience not in {"patient", "family"}:
        audience = "patient"

    # 一時ディレクトリで .docx を生成
    with tempfile.TemporaryDirectory() as tmpdir:
        case_path = Path(tmpdir) / "case.json"
        out_path  = Path(tmpdir) / "output.docx"

        case_path.write_text(json.dumps(case_data, ensure_ascii=False, indent=2), encoding="utf-8")

        cmd = [
            sys.executable,
            str(GENERATE_SCRIPT),
            "--input",    str(case_path),
            "--output",   str(out_path),
            "--audience", audience,
            "--content",  str(CONTENT_JSON),
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=str(HERE),
            )
        except subprocess.TimeoutExpired:
            return jsonify({"error": "Word生成がタイムアウトしました（30秒）"}), 500
        except Exception as e:
            return jsonify({"error": f"生成スクリプト起動失敗: {e}"}), 500

        if result.returncode != 0:
            err_msg = result.stderr or result.stdout or "不明なエラー"
            return jsonify({"error": err_msg}), 500

        if not out_path.exists():
            return jsonify({"error": "出力ファイルが生成されませんでした"}), 500

        docx_bytes = out_path.read_bytes()

    # ファイル名を症例の subject_line から生成
    subject = case_data.get("subject_line", "資料")
    # ファイル名に使えない文字を除去
    safe_subject = "".join(c for c in subject if c.isalnum() or c in "ー_- ")[:20].strip()
    if not safe_subject:
        safe_subject = "psychoedu"
    filename = f"psychoedu_{safe_subject}_{audience}.docx"
    # RFC 5987 エンコード
    try:
        encoded_name = filename.encode("utf-8").decode("latin-1")
    except Exception:
        encoded_name = "psychoedu_output.docx"

    return Response(
        docx_bytes,
        status=200,
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "Content-Length": str(len(docx_bytes)),
        },
    )


# =============================================
# エントリポイント
# =============================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print("=" * 60)
    print("統合失調症 心理教育資料 Webサーバー")
    print("=" * 60)
    print(f"  HTMLツール  : http://localhost:{port}/")
    print(f"  Word生成    : POST http://localhost:{port}/generate")
    print(f"  ヘルスチェック: GET  http://localhost:{port}/health")
    print()
    print("停止するには Ctrl+C を押してください。")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)
