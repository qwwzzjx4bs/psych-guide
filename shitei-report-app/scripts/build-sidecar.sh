#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/tools/generate_docx"
BIN_DIR="$ROOT/src-tauri/binaries"
ARCH="$(uname -m)"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"

if [[ "$ARCH" == "arm64" ]]; then
  TARGET="aarch64-apple-darwin"
elif [[ "$ARCH" == "x86_64" && "$OS" == "darwin" ]]; then
  TARGET="x86_64-apple-darwin"
else
  echo "Unsupported platform: $OS $ARCH" >&2
  exit 1
fi

OUT="$BIN_DIR/generate_docx-$TARGET"
mkdir -p "$BIN_DIR"

if ! command -v python3 >/dev/null; then
  echo "python3 が必要です" >&2
  exit 1
fi

python3 -m pip install -q -r "$TOOLS/requirements.txt" pyinstaller
python3 -m PyInstaller --onefile --name "generate_docx-$TARGET" \
  --distpath "$BIN_DIR" \
  --workpath "$TOOLS/build" \
  --specpath "$TOOLS" \
  "$TOOLS/generate_docx.py"

chmod +x "$OUT"
echo "Built sidecar: $OUT"
