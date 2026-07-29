#!/usr/bin/env bash
# Builds dist/chrome.zip and dist/firefox.zip from the shared src/ tree.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist build
mkdir -p dist

for target in chrome firefox; do
  mkdir -p "build/$target"
  cp -r src "build/$target/src"
  cp -r icons "build/$target/icons"
  cp "manifest.$target.json" "build/$target/manifest.json"
  # Strip macOS metadata files before zipping
  find "build/$target" -name '.DS_Store' -delete
  (cd "build/$target" && zip -qr "../../dist/$target.zip" . -x "*.DS_Store" -x "__MACOSX/*")
done

rm -rf build
echo "Built: dist/chrome.zip dist/firefox.zip"