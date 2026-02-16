#!/bin/bash
# Transcribe all USB MP3s into the knowledge base.
# Uses ffmpeg from node_modules/ffmpeg-static if present; otherwise requires ffmpeg in PATH.
set -e
cd "$(dirname "$0")/.."
USB="${1:-/Volumes/NO NAME}"
if [ ! -d "$USB" ]; then
  echo "USB path not found: $USB"
  echo "Usage: $0 [path-to-USB]"
  exit 1
fi
FFMPEG_DIR="$(pwd)/node_modules/ffmpeg-static"
if [ -x "$FFMPEG_DIR/ffmpeg" ]; then
  export PATH="$FFMPEG_DIR:$PATH"
  echo "Using project ffmpeg (node_modules/ffmpeg-static)"
elif ! command -v ffmpeg &>/dev/null; then
  echo "ffmpeg not found. Run: npm install ffmpeg-static"
  echo "Or install system ffmpeg: brew install ffmpeg"
  exit 1
fi
echo "Transcribing from: $USB"
.venv/bin/python scripts/transcribe_mp3_to_knowledge.py "$USB"
