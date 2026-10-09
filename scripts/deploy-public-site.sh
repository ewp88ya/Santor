#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/deployment/public-site"
WEB_ROOT="${WEB_ROOT:-/var/www/santor}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ "$WEB_ROOT" != "/var/www/santor" ]]; then
  echo "Refusing unexpected WEB_ROOT: $WEB_ROOT" >&2
  exit 2
fi
if [[ ! -d "$SOURCE" || ! -s "$SOURCE/index.html" || ! -s "$SOURCE/sitemap.xml" || ! -s "$SOURCE/robots.txt" ]]; then
  echo "Public-site source is incomplete: $SOURCE" >&2
  exit 2
fi
if [[ ! -w "$WEB_ROOT" ]]; then
  echo "Run this script on the Santor web host with write access to $WEB_ROOT (typically sudo)." >&2
  exit 2
fi

# Validate source before touching production. Preserve app.html and /assets untouched.
python3 "$ROOT/scripts/check-public-site.py" "$SOURCE"
BACKUP="$WEB_ROOT/.backups/public-site-$STAMP"
mkdir -p "$BACKUP"
for item in index.html robots.txt sitemap.xml features pricing faq contact privacy terms imprint refund; do
  if [[ -e "$WEB_ROOT/$item" ]]; then cp -a "$WEB_ROOT/$item" "$BACKUP/"; fi
done

install -m 0644 "$SOURCE/index.html" "$WEB_ROOT/index.html"
install -m 0644 "$SOURCE/robots.txt" "$WEB_ROOT/robots.txt"
install -m 0644 "$SOURCE/sitemap.xml" "$WEB_ROOT/sitemap.xml"
for route in features pricing faq contact privacy terms imprint refund; do
  install -d -m 0755 "$WEB_ROOT/$route"
  install -m 0644 "$SOURCE/$route/index.html" "$WEB_ROOT/$route/index.html"
done

# Keep the existing customer SPA shell and hashed JS/CSS bundles intact.
test -s "$WEB_ROOT/app.html"
python3 - "$WEB_ROOT" <<'PYASSET'
from pathlib import Path
import re, sys
root = Path(sys.argv[1])
shell = (root / "app.html").read_text(encoding="utf-8")
assets = re.findall(r'(?:src|href)="(/assets/[^"]+)', shell)
if not assets:
    raise SystemExit("app.html does not reference any existing bundled assets")
missing = [asset for asset in assets if not (root / asset.lstrip("/")).is_file()]
if missing:
    raise SystemExit("app.html references missing assets: " + ", ".join(missing))
print(f"Verified {len(assets)} customer-app asset references")
PYASSET
if command -v nginx >/dev/null 2>&1; then nginx -t; fi
printf 'Public site deployed. Backup: %s\n' "$BACKUP"
