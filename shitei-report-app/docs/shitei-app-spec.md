# 指定医レポート作成アプリ 仕様書 v1.4

## 概要

精神保健指定医（令和7年新基準）の5症例ケースレポート（様式3-1）作成を支援するデスクトップアプリ。
すべてのデータはローカルファイルに保存し、外部送信は行わない。

## v1.1 入力効率改善

### 共通項目の一括反映

Step 1（表紙情報）で、現在の症例の以下3項目を他症例の**空欄のみ**にコピーする:

| フィールド | 内容 |
|-----------|------|
| s1_date | 申請日 |
| s1_hospital | 医療機関名 |
| s1_supervisor | 指導医氏名・番号・期間 |

- 既に入力済みの症例フィールドは上書きしない
- ボタン: 「空欄へ一括反映（申請日・医療機関・指導医）」
- 結果はトーストで `{applied}件反映、{skipped}件スキップ` と表示

### 入力パフォーマンス

- テキスト入力時は全画面再描画を行わない（silent update）
- タイトル・字数カウンタのみ部分更新（`updateChrome`）
- 入院形態・行動制限・ICD選択などレイアウト変更時のみウィザードカードを再描画

### チェックリスト更新

- 入力に連動するチェック再計算は **500ms debounce**
- 症例切替・手動チェックトグル・一括反映時は即時更新

## v1.2 docx 出力

### 出力ボタン

| 場所 | ボタン | 動作 |
|------|--------|------|
| ヘッダー | 5症例 docx 出力 | 選択フォルダへ最大5ファイル |
| Step 7 | この症例を docx 出力 | 現在症例のみ1ファイル |

### 出力フロー

1. 55項目チェックの fail/warn があれば警告（キャンセル可、続行可）
2. 一括出力時、本文100字未満の症例があれば確認（スキップ / 全5件 / 中止）
3. 出力先フォルダを選択
4. メモリ上の編集内容から docx 生成（未保存でも可）
5. 完了後、エクスプローラー（Windows）/ Finder（macOS）で出力フォルダを表示

### 生成エンジン

- `tools/generate_docx/generate_docx.py`（様式3-1 令和7年1月版準拠）
- 配布ビルド: PyInstaller sidecar → `src-tauri/binaries/`
  - macOS: `npm run build:sidecar`
  - Windows x64: `npm run build:sidecar:win`
- 開発時: システム Python + `python-docx` にフォールバック（macOS: `python3` / Windows: `python` または `py -3`）

### スキーマ変換

アプリ `CaseData`（`s1_*` 等）→ `case-to-docx.ts` → Python 入力 JSON

## v1.3 入力効率

### チェック項目ジャンプ

- 右パネルのチェック行クリックで該当入力欄へ移動
- フィールド紐づけがある auto/semi 項目のみジャンプ（`check-navigation.ts`）
- 5症例共通項目は**未達症例のうち第1→5順で最初**の症例へ切替
- manual 項目はジャンプせず `manualHint` をトースト表示（5秒）

### 入院形態・症例別ヒント

[`adm-hints.ts`](shitei-report-app/src/wizard/adm-hints.ts) より Step 1/3/4/5/6 に表示:

| Step | 内容 |
|------|------|
| 1 | 措置/医療保護の注意（立会い要件等） |
| 3 | 入院時状況の法的記載要件 |
| 4 | F0〜F9 別 MSE 記載ポイント |
| 5 | 診断根拠・入院形態別法的根拠 |
| 6 | 法的手続確認リスト（参照用） |

入院形態・症例タブ切替でヒント自動更新。

## v1.4 入力効率（Undo/Redo・症例間コピー）

### Undo / Redo

- 編集履歴を最大50件保持（`undo-stack.ts`）
- 800ms debounce で1 undo 単位（連続入力は1操作として記録）
- ヘッダー「元に戻す」「やり直し」、Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z
- 対象外: 新規作成、ファイル読込、バージョン復元、undo/redo 自身
- 共通項目一括反映・Step コピーは即時1 undo 単位

### 症例間 Step コピー

- Step 2〜7 の step-nav に「他症例へコピー」ボタン（Step 1 は対象外）
- コピー先をチェックボックスで選択（現在症例以外、デフォルト全選択）
- **空欄のみ**反映（ソースが空のフィールド・ターゲット既存入力はスキップ）
- 実装: [`step-copy.ts`](shitei-report-app/src/domain/step-copy.ts)

## ファイル形式 `.shitei`

JSON形式。拡張子 `.shitei` または `.json`。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| schemaVersion | number | 現在 `2` |
| meta.title | string | ドキュメント表示名 |
| meta.createdAt | ISO8601 | 作成日時 |
| meta.modifiedAt | ISO8601 | 最終更新 |
| meta.appVersion | string | アプリバージョン |
| cases.case1〜case5 | CaseData | 症例データ |
| checklist.manualOverrides | Record<id, boolean> | 手動チェック上書き |
| checklist.dismissedWarnings | string[] | 警告非表示ID |
| versions[] | VersionSnapshot | 最大50件 |

## CaseData フィールド

現行ウィザード `FORM_FIELDS` + `s1_restriction` + `rt_*` をそのまま使用。

## 旧形式インポート

| 旧 `_type` | 変換 |
|-----------|------|
| shitei-wizard-save | cases にマージ |
| shitei-wizard-case-save | `_case` 番号の caseN にマージ |

## 画面構成

1. **メニューバー** — ファイル / 編集 / 表示 / ヘルプ
2. **ヘッダー** — タイトル、保存状態（*）、ショートカットボタン
3. **症例タブ** — 第1〜5症例
4. **ステップインジケータ** — 7ステップ
5. **ウィザード本文** — 入力フォーム
6. **右サイドパネル** — チェックリスト（55項目）進捗

## キーボードショートカット

| 操作 | macOS | Windows |
|------|-------|---------|
| 新規 | Cmd+N | Ctrl+N |
| 開く | Cmd+O | Ctrl+O |
| 保存 | Cmd+S | Ctrl+S |
| 名前を付けて保存 | Cmd+Shift+S | Ctrl+Shift+S |
| 元に戻す | Cmd+Z | Ctrl+Z |
| やり直し | Cmd+Shift+Z | Ctrl+Shift+Z |

## バージョン管理

- 明示的保存時にスナップショット追加（メッセージ任意）
- 復元前に現在状態を自動バックアップ
- JSONエクスポート/インポート対応

## 自動リカバリ

編集中500ms debounceで `recovery/autosave.shitei` に書き込み。
起動時にリカバリファイルがあれば復元ダイアログを表示。
