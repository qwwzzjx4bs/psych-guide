# 精神医学論文ツール — バックエンド API

精神医学の最新論文・ガイドラインを複数ソースから自動収集し、REST API で提供する FastAPI バックエンドです。

## 対応データソース

| ソース | 説明 | クロール間隔 |
|--------|------|-------------|
| PubMed（NCBI） | 精神医学関連 MeSH クエリで直近7日分を取得 | 6時間ごと |
| RSS フィード | JAMA Psychiatry、Lancet Psychiatry、AJP など主要14誌 | 6時間ごと |
| medRxiv / bioRxiv | 精神医学カテゴリのプレプリント（直近14日） | 12時間ごと |
| J-STAGE | 精神医学系キーワードで国内誌を検索 | 12時間ごと |
| ガイドライン | APA、NICE、Cochrane の RSS 監視 | 24時間ごと |

## セットアップ

### 1. Python 環境

```bash
cd scripts/literature_tool
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 環境変数

```bash
cp .env.example .env
# .env を編集して各種APIキーを設定
```

### 3. ローカル起動

```bash
python main.py
# または
uvicorn main:app --reload
```

API ドキュメント: http://localhost:8000/docs

### 4. Docker で起動

```bash
docker-compose up -d
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/api/papers` | 論文一覧（ページング・フィルタ） |
| GET | `/api/papers/{id}` | 論文詳細 |
| GET | `/api/search?q=...` | 全文検索 |
| POST | `/api/papers/{id}/summarize` | AI日本語要約生成 |
| POST | `/api/alerts` | キーワードアラート登録 |
| GET | `/api/alerts?email=...` | アラート一覧取得 |
| DELETE | `/api/alerts/{id}` | アラート削除 |
| POST | `/api/fetch/{source}` | 手動クロール実行（管理用） |
| GET | `/api/stats` | 収集統計 |

## クラウドデプロイ（Railway / Render）

### Railway

1. [railway.app](https://railway.app) でアカウント作成
2. `New Project → Deploy from GitHub repo` を選択
3. `scripts/literature_tool/` をルートディレクトリに設定
4. 環境変数（`.env.example` 参照）を Railway の Variables から設定
5. 自動デプロイが完了したら URL をコピー

### フロントエンドとの接続

`literature-search.html` の設定タブで「バックエンドAPI URL」にデプロイ先 URL を入力し、「バックエンドAPIを使用する」を有効にすると多ソース統合検索・AI要約・アラート登録が利用できるようになります。

## フォルダ構成

```
scripts/literature_tool/
├── main.py            # FastAPI アプリ + エンドポイント
├── config.py          # 設定（pydantic-settings）
├── database.py        # DB接続 + セッション管理
├── models.py          # SQLAlchemy ORM モデル
├── scheduler.py       # APScheduler 定期クロール設定
├── notifier.py        # キーワードアラートメール通知
├── fetchers/
│   ├── pubmed.py      # NCBI E-utilities
│   ├── rss.py         # feedparser（RSS フィード）
│   ├── medrxiv.py     # medRxiv / bioRxiv API
│   ├── jstage.py      # J-STAGE OpenAPI
│   └── guidelines.py  # 学会ガイドライン RSS
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
