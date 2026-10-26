#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v gs >/dev/null 2>&1; then
  echo "Ghostscript (gs) is not installed."
  echo "Install it with: sudo apt install ghostscript"
  exit 1
fi

if (( $# > 1 )); then
  echo "Usage: $0 [subdirectory]"
  exit 1
fi

if (( $# == 1 )); then
  sub="${1#./}"
  sub="${sub%/}"
  TARGET_DIR="$SCRIPT_DIR/$sub"
else
  TARGET_DIR="$SCRIPT_DIR"
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Not a directory: $TARGET_DIR"
  exit 1
fi

SCRIPT_REAL="$(cd "$SCRIPT_DIR" && pwd -P)"
TARGET_REAL="$(cd "$TARGET_DIR" && pwd -P)"
case "$TARGET_REAL" in
  "$SCRIPT_REAL"|"$SCRIPT_REAL"/*) ;;
  *)
    echo "Path escapes submissions directory: $1"
    exit 1
    ;;
esac

cd "$TARGET_DIR"

format_bytes() {
  awk -v n="$1" 'BEGIN {
    u[0]="B"; u[1]="KB"; u[2]="MB"; u[3]="GB"; u[4]="TB"
    v=n+0; i=0
    while (v >= 1024 && i < 4) { v /= 1024; i++ }
    if (i == 0) printf "%d %s", v, u[i]
    else if (v >= 10) printf "%.1f %s", v, u[i]
    else printf "%.2f %s", v, u[i]
  }'
}

echo "Optimizing PDFs under: $TARGET_REAL"
echo

mapfile -d '' files < <(
  find . -type f -iname '*.pdf' ! -name '*:Zone.Identifier' -print0 | sort -z
)

if (( ${#files[@]} == 0 )); then
  echo "No PDFs found."
  exit 0
fi

processed=0
replaced=0
skipped=0
failed=0
total_before=0
total_after=0

for file in "${files[@]}"; do
  rel="${file#./}"
  before=$(stat -c '%s' "$file")
  total_before=$((total_before + before))
  tmp="$(mktemp --suffix=.pdf)"

  if gs -sDEVICE=pdfwrite \
    -dCompatibilityLevel=1.4 \
    -dPDFSETTINGS=/ebook \
    -dDownsampleColorImages=true \
    -dDownsampleGrayImages=true \
    -dColorImageResolution=120 \
    -dGrayImageResolution=120 \
    -dColorImageDownsampleType=/Bicubic \
    -dGrayImageDownsampleType=/Bicubic \
    -dColorImageDownsampleThreshold=1.0 \
    -dGrayImageDownsampleThreshold=1.0 \
    -dDetectDuplicateImages=true \
    -dCompressFonts=true \
    -dSubsetFonts=true \
    -dPassThroughJPEGImages=false \
    -dAutoFilterColorImages=false \
    -dAutoFilterGrayImages=false \
    -dColorImageFilter=/DCTEncode \
    -dGrayImageFilter=/DCTEncode \
    -dColorConversionStrategy=/sRGB \
    -dProcessColorModel=/DeviceRGB \
    -dNOPAUSE -dQUIET -dBATCH \
    -sOutputFile="$tmp" \
    "$file"
  then
    after=$(stat -c '%s' "$tmp")
    if (( after < before )); then
      mv -f "$tmp" "$file"
      total_after=$((total_after + after))
      replaced=$((replaced + 1))
      saved=$((before - after))
      pct=$(awk -v b="$before" -v s="$saved" 'BEGIN { printf "%.1f", (s/b)*100 }')
      echo "✓ ${rel}: $(format_bytes "$before") → $(format_bytes "$after") (−$(format_bytes "$saved"), −${pct}%)"
    else
      rm -f "$tmp"
      total_after=$((total_after + before))
      skipped=$((skipped + 1))
      echo "· ${rel}: $(format_bytes "$before") (no smaller, kept)"
    fi
    processed=$((processed + 1))
  else
    rm -f "$tmp"
    total_after=$((total_after + before))
    failed=$((failed + 1))
    echo "✗ ${rel}: ghostscript failed"
  fi
done

saved_total=$((total_before - total_after))
if (( total_before > 0 )); then
  pct_total=$(awk -v b="$total_before" -v s="$saved_total" 'BEGIN { printf "%.1f", (s/b)*100 }')
else
  pct_total="0.0"
fi

echo
echo "── Summary ──"
echo "Processed: ${processed}"
echo "Replaced:  ${replaced}"
echo "Kept:      ${skipped}"
echo "Failed:    ${failed}"
echo "Total:     $(format_bytes "$total_before") → $(format_bytes "$total_after") (−$(format_bytes "$saved_total"), −${pct_total}%)"
