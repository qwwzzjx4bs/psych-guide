# 指定医レポート作成アプリ

精神保健指定医（令和7年新基準）の5症例ケースレポート（様式3-1）作成支援デスクトップアプリ。

## 機能

- 7ステップ × 5症例の入力ウィザード
- `.shitei` ファイルの新規・開く・保存・上書き保存・名前を付けて保存
- ドキュメント内蔵バージョン履歴（最大50件）
- 自動リカバリ（クラッシュ後復元）
- 55項目チェックリスト（ウィザードデータから自動判定 + 手動確認）
- 様式3-1 HTMLプレビュー・印刷
- 旧ウィザード JSON（`shitei-wizard-save`）のインポート

## 開発

### macOS

```bash
cd shitei-report-app
npm install
npm run tauri dev
```

### Windows（x64）

```powershell
cd shitei-report-app
npm install
npm run tauri dev
```

## ビルド

### macOS

docx 出力を含む配布ビルド:

```bash
npm run build:sidecar
npm run tauri build
```

成果物: `src-tauri/target/release/bundle/macos/指定医レポート作成.app`

### Windows（x64）

前提:

- Node.js LTS
- [Rust](https://rustup.rs/)（stable, MSVC toolchain）
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — 「C++ によるデスクトップ開発」
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)（Win10/11 では通常済み）
- Python 3.11+（docx sidecar 用）

```powershell
npm install
npm run build:win
npm run package:win
```

**配布用 ZIP（初心者向け）:**

```
dist/windows/指定医レポート作成_Windows版.zip
  ├── 指定医レポート作成_インストーラー.exe
  └── インストールのしかた.txt
```

この ZIP 1つを配布してください。詳しい手順は [`docs/windows-install-guide.txt`](docs/windows-install-guide.txt) を参照。

**開発者向け成果物（参考）:**

```
src-tauri/target/release/bundle/nsis/指定医レポート作成_*_x64-setup.exe
```

※ sidecar バイナリ（`src-tauri/binaries/generate_docx-*`）は OS ごとにローカルビルド。リポジトリには含めません。

## 操作

| 操作 | ショートカット |
|------|----------------|
| 新規 | Cmd/Ctrl+N |
| 開く | Cmd/Ctrl+O |
| 保存 | Cmd/Ctrl+S |
| 名前を付けて保存 | Cmd/Ctrl+Shift+S |
| 元に戻す | Cmd/Ctrl+Z |
| やり直し | Cmd/Ctrl+Shift+Z |

## データの取扱い

すべてローカルファイルに保存されます。外部サーバーへの送信は行いません。

## 旧HTMLツールからの移行

1. 旧ウィザードで「保存」した JSON をエクスポート
2. 本アプリの「旧JSON取込」から読み込み
3. `.shitei` として「名前を付けて保存」

## ドキュメント

- [仕様書](docs/shitei-app-spec.md)
- [チェックルール定義](checklist-rules.json)
- [Windows インストール手順（配布用）](docs/windows-install-guide.txt)
