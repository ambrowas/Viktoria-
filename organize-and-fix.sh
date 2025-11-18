#!/bin/bash
set -e
ROOT="$(pwd)"

echo "📦 Step 1: Creating src/ structure..."
mkdir -p src/components/icons
mkdir -p src/screens/editors
mkdir -p src/services

echo "📂 Step 2: Moving files..."
# Core files
mv -v App.tsx src/ 2>/dev/null || true
mv -v index.tsx src/ 2>/dev/null || true
mv -v types.ts src/ 2>/dev/null || true

# Components
mv -v components/Modal.tsx src/components/ 2>/dev/null || true
mv -v components/Sidebar.tsx src/components/ 2>/dev/null || true
mv -v components/Spinner.tsx src/components/ 2>/dev/null || true
mv -v components/icons/IconDefs.tsx src/components/icons/ 2>/dev/null || true

# Screens
mv -v screens/Dashboard.tsx src/screens/ 2>/dev/null || true
mv -v screens/GameCreator.tsx src/screens/ 2>/dev/null || true

# Editors
mv -v screens/editors/*.tsx src/screens/editors/ 2>/dev/null || true

# Services
mv -v services/*.ts src/services/ 2>/dev/null || true

echo "✅ Files reorganized."

echo "🛠 Step 3: Rewriting imports..."
# Replace relative imports with aliases
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#\.\.\/\.\.\/components/#@components/#g" \
  -e "s#\.\.\/components/#@components/#g" \
  -e "s#\./components/#@components/#g" \
  -e "s#\.\.\/\.\.\/screens/#@screens/#g" \
  -e "s#\.\.\/screens/#@screens/#g" \
  -e "s#\./screens/#@screens/#g" \
  -e "s#\.\.\/\.\.\/services/#@services/#g" \
  -e "s#\.\.\/services/#@services/#g" \
  -e "s#\./services/#@services/#g" \
  -e "s#\.\.\/\.\.\/types#@/types#g" \
  -e "s#\.\.\/types#@/types#g" \
  -e "s#\./types#@/types#g" \
  {} +

echo "✅ Import paths fixed."
echo "🎉 All done! Your frontend is now fully under src/ and imports use aliases."
