#!/bin/bash
set -e

echo "🔍 Rewriting imports to use aliases..."

# Components
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#\.\.\/\.\.\/components/#@components/#g" \
  -e "s#\.\.\/components/#@components/#g" \
  -e "s#\./components/#@components/#g" \
  {} +

# IconDefs specifically
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#@components/IconDefs#@components/icons/IconDefs#g" \
  -e "s#\.\.\/\.\.\/components/icons/IconDefs#@components/icons/IconDefs#g" \
  -e "s#\.\.\/components/icons/IconDefs#@components/icons/IconDefs#g" \
  -e "s#\./icons/IconDefs#@components/icons/IconDefs#g" \
  {} +

# Screens
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#\.\.\/\.\.\/screens/#@screens/#g" \
  -e "s#\.\.\/screens/#@screens/#g" \
  -e "s#\./screens/#@screens/#g" \
  {} +

# Editors
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#@screens/editors#@editors#g" \
  -e "s#\.\.\/\.\.\/screens/editors/#@editors/#g" \
  -e "s#\.\.\/screens/editors/#@editors/#g" \
  -e "s#\./editors/#@editors/#g" \
  {} +

# Services
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#\.\.\/\.\.\/services/#@services/#g" \
  -e "s#\.\.\/services/#@services/#g" \
  -e "s#\./services/#@services/#g" \
  {} +

echo "✅ Import rewriting complete!"

# --- Verification ---
echo "🔎 Scanning for leftover relative imports..."
LEFTOVERS=$(grep -R "from ['\"]\.\." src || true)

if [ -z "$LEFTOVERS" ]; then
  echo "🎉 All imports look clean! No relative paths found."
else
  echo "⚠️ Found possible relative imports that may need manual review:"
  echo "$LEFTOVERS"
fi
    # Fix imports for types.ts
find src -type f -name "*.ts*" -exec sed -i '' \
  -e "s#\.\.\/\.\.\/types#@/types#g" \
  -e "s#\.\.\/types#@/types#g" \
  {} +
