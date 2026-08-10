#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_DIR="$ROOT/public/images/mobile"
OUTPUT_DIR="$SOURCE_DIR/hevc"
TMP_DIR="$ROOT/.cache/ios-alpha-prores"

command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
command -v swift >/dev/null || { echo "Swift/Xcode tools are required" >&2; exit 1; }
mkdir -p "$OUTPUT_DIR" "$TMP_DIR"

PAIRS=(
  "pearl-transparent-mobile.webm|pearl-transparent-ios.mov"
  "fish-transparent-mobile.webm|fish-transparent-ios.mov"
  "turtle-transparent-mobile.webm|turtle-transparent-ios.mov"
  "chest-transparent-mobile.webm|chest-transparent-ios.mov"
  "jellyfish-transparent-mobile.webm|jellyfish-transparent-ios.mov"
  "crab-transparent-mobile.webm|crab-transparent-ios.mov"
  "mermaid-transparent-mobile.webm|mermaid-transparent-ios.mov"
)
for pair in "${PAIRS[@]}"; do
  input="${pair%%|*}"
  output="${pair##*|}"
  stem="${output%.mov}"
  intermediate="$TMP_DIR/$stem-prores4444.mov"

  echo "Preparing $input"
  ffmpeg -y -c:v libvpx-vp9 -i "$SOURCE_DIR/$input" \
    -an -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le "$intermediate"

  echo "Encoding $output"
  swift "$SCRIPT_DIR/export-hevc-alpha.swift" \
    "$intermediate" "$OUTPUT_DIR/$output"
done

echo "HEVC-alpha assets are ready in $OUTPUT_DIR"
