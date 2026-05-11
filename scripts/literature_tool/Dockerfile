# ============================================================
# 精神医学論文ツール — Dockerfile
# Python 3.12 slim + FastAPI + uvicorn
# ============================================================
FROM python:3.12-slim

# システム依存ライブラリ（lxml, feedparser用）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 libxslt1.1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存関係インストール（キャッシュ最適化のためコードより先にコピー）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコード
COPY . .

# データディレクトリ作成（SQLite DB 保存先）
RUN mkdir -p /app/data

EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
