#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# List all regular files under submissions/, largest first, with human sizes + total.
find . -type f -printf '%s\t%P\n' | sort -nr | awk -F'\t' '
function human(n,    u, i, v) {
  u[0] = "B"; u[1] = "KB"; u[2] = "MB"; u[3] = "GB"; u[4] = "TB"
  v = n + 0
  i = 0
  while (v >= 1024 && i < 4) {
    v /= 1024
    i++
  }
  if (i == 0) return sprintf("%d %s", v, u[i])
  if (v >= 10) return sprintf("%.1f %s", v, u[i])
  return sprintf("%.2f %s", v, u[i])
}
{
  size = $1 + 0
  path = $2
  total += size
  count++
  printf "%10s  %s\n", human(size), path
}
END {
  print ""
  printf "Files: %d\n", count + 0
  printf "Total: %s (%d bytes)\n", human(total + 0), total + 0
}
'
