#!/usr/bin/env bash
# ICD10mini → https://icd10mini-self-intro.surge.sh
set -e
HTML_FILE="/Users/ryotatakei/Desktop/My-First-Project/icd10mini.html"
CUSTOM_DOMAIN="icd10mini-self-intro"
SURGE="npx --yes surge"

if ! $SURGE whoami &>/dev/null; then
    echo "エラー: surge にログインしていません。npx surge login を実行してください。"
    exit 1
fi

if [ ! -f "$HTML_FILE" ]; then
    echo "エラー: $HTML_FILE が見つかりません"
    exit 1
fi

DOMAIN="${CUSTOM_DOMAIN}.surge.sh"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT
cp "$HTML_FILE" "$TEMP_DIR/index.html"
printf "User-agent: *\nDisallow: /\n" > "$TEMP_DIR/robots.txt"

echo "デプロイ中..."
(cd "$TEMP_DIR" && $SURGE . --domain "$DOMAIN")

echo ""
echo "完了！"
echo "公開URL: https://${DOMAIN}"
