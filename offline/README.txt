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
