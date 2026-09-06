#!/bin/sh
# Use the desktop-bundled Codex instead of the legacy npm CLI.
set -eu
runtime='/Applications/ChatGPT.app/Contents/Resources/codex'
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
preset=${1:-sol}
case "$preset" in
  sol) profile=metasense-sol ;;
  astra) profile=metasense-astra ;;
  deep) profile=metasense-astra-deep ;;
  *) echo 'Usage: bash scripts/codex-metasense.sh [sol|astra|deep] [Codex arguments...]' >&2; exit 2 ;;
esac
if [ "$#" -gt 0 ]; then shift; fi
if [ ! -x "$runtime" ]; then
  echo "Desktop Codex runtime not found: $runtime" >&2
  exit 1
fi
cd "$project_dir"
exec "$runtime" --profile "$profile" "$@"
