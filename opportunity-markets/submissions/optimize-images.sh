#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "Optimizing images under: $TARGET_REAL"
echo

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Installing sharp (temporary)…"
npm install --prefix "$WORK" --no-save --silent sharp

# Script must live next to node_modules so ESM can resolve `sharp`.
cat > "$WORK/optimize.mjs" <<'EOF'
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const root = process.env.SUBMISSIONS_ROOT;
if (!root) {
  console.error("SUBMISSIONS_ROOT is not set");
  process.exit(1);
}

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.includes(":Zone.Identifier")) continue;
    if (!IMAGE_RE.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n;
  let i = -1;
  do {
    v /= 1024;
    i++;
  } while (v >= 1024 && i < units.length - 1);
  return `${v.toFixed(v >= 10 || i === 0 ? 1 : 2)} ${units[i]}`;
}

const files = walk(root).sort();
if (files.length === 0) {
  console.log("No images found.");
  process.exit(0);
}

let processed = 0;
let replaced = 0;
let skipped = 0;
let failed = 0;
let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const rel = path.relative(root, file);
  const before = fs.statSync(file).size;
  totalBefore += before;
  const ext = path.extname(file).toLowerCase();
  const tmp = path.join(
    os.tmpdir(),
    `optimize-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
  );

  try {
    const sharpOpts = { animated: ext === ".gif", limitInputPixels: false };
    const meta = await sharp(file, sharpOpts).metadata();
    const origWidth = meta.width ?? 0;
    const resized = origWidth > 2000;

    let pipeline = sharp(file, sharpOpts).resize({
      width: 2000,
      withoutEnlargement: true,
    });

    if (ext === ".png") {
      pipeline = pipeline.png({ compressionLevel: 9, effort: 10 });
    } else if (ext === ".jpg" || ext === ".jpeg") {
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({ quality: 85 });
    } else if (ext === ".gif") {
      pipeline = pipeline.gif();
    }

    await pipeline.toFile(tmp);
    const after = fs.statSync(tmp).size;
    const sizeNote = resized ? `${origWidth}w→2000w, ` : "";

    if (after < before) {
      fs.renameSync(tmp, file);
      totalAfter += after;
      replaced++;
      const saved = before - after;
      const pct = ((saved / before) * 100).toFixed(1);
      console.log(
        `✓ ${rel}: ${sizeNote}${formatBytes(before)} → ${formatBytes(after)} (−${formatBytes(saved)}, −${pct}%)`,
      );
    } else {
      fs.unlinkSync(tmp);
      totalAfter += before;
      skipped++;
      console.log(`· ${rel}: ${sizeNote}${formatBytes(before)} (no smaller, kept)`);
    }
    processed++;
  } catch (err) {
    failed++;
    totalAfter += before;
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    console.error(`✗ ${rel}: ${err.message ?? err}`);
  }
}

const savedTotal = totalBefore - totalAfter;
const pctTotal =
  totalBefore > 0 ? ((savedTotal / totalBefore) * 100).toFixed(1) : "0.0";

console.log();
console.log("── Summary ──");
console.log(`Processed: ${processed}`);
console.log(`Replaced:  ${replaced}`);
console.log(`Kept:      ${skipped}`);
console.log(`Failed:    ${failed}`);
console.log(
  `Total:     ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (−${formatBytes(savedTotal)}, −${pctTotal}%)`,
);
EOF

SUBMISSIONS_ROOT="$TARGET_REAL" node "$WORK/optimize.mjs"
