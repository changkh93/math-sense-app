#!/bin/bash
# ============================================================
# Agora Connect Extension 빌드 스크립트
# ============================================================
# 모든 JS를 IIFE 포맷으로 빌드합니다 (bare import 제로).
# popup.html은 Vite 처리 없이 그대로 복사합니다.
# ============================================================

set -e
cd "$(dirname "$0")/.."

echo "🔨 [1/5] background.js (IIFE) 빌드..."
EXT_TARGET=bg npx vite build -c vite.config.ext.js

echo "🔨 [2/5] popup.js (IIFE) 빌드..."
EXT_TARGET=popup npx vite build -c vite.config.ext.js

echo "🔨 [3/6] content.js (IIFE) 빌드..."
EXT_TARGET=content npx vite build -c vite.config.ext.js

echo "📦 [4/6] 정적 파일 복사..."
# popup.html, manifest, styles, icons 복사
cp agora-connect-ext/popup.html dist-ext/
cp agora-connect-ext/manifest.json dist-ext/
cp agora-connect-ext/styles.css dist-ext/
mkdir -p dist-ext/icons
cp -r agora-connect-ext/icons/* dist-ext/icons/ 2>/dev/null || true

echo "🔍 [4/5] 빌드 검증..."
# bare import 검사
if grep -q 'from "firebase' dist-ext/background.js 2>/dev/null; then
  echo "❌ 오류: background.js에 bare import 발견!"
  exit 1
fi
if grep -q 'from "firebase' dist-ext/popup.js 2>/dev/null; then
  echo "❌ 오류: popup.js에 bare import 발견!"
  exit 1
fi

# IIFE 확인
if head -1 dist-ext/background.js | grep -q "^(function\|^var "; then
  echo "  ✓ background.js: IIFE 확인"
else
  echo "  ⚠️ background.js: IIFE 아닐 수 있음"
fi
if head -1 dist-ext/popup.js | grep -q "^(function\|^var "; then
  echo "  ✓ popup.js: IIFE 확인"
else
  echo "  ⚠️ popup.js: IIFE 아닐 수 있음"
fi

echo ""
echo "✅ [5/5] 빌드 완료!"
echo ""
echo "  📂 dist-ext/ 내용물:"
ls -lh dist-ext/*.{js,html,css,json} 2>/dev/null
echo ""
echo "  👉 chrome://extensions 에서 dist-ext 폴더를 다시 로드하세요."
