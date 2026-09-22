#!/bin/bash
set -euo pipefail

echo "Automatic sync/push is disabled by project policy."
echo "Use the normal manual workflow: git status && git add && git commit && git push origin main"
exit 1
