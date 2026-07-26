#!/usr/bin/env bash
# Builds dist/chrome.zip and dist/firefox.zip from the shared src/ tree.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist build
mkdir -p dist

for target in chrome firefox; do
  mkdir -p "build/$target"
  cp -r src "build/$target/src"
  cp "manifest.$target.json" "build/$target/manifest.json"
  (cd "build/$target" && zip -qr "../../dist/$target.zip" .)
done

rm -rf build
echo "Built: dist/chrome.zip dist/firefox.zip"
