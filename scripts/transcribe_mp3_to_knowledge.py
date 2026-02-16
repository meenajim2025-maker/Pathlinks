#!/usr/bin/env python3
"""
Extract knowledge from USB MP3s: transcribe each file to text and build
knowledge_base.json for use in PathLinks (search + display).

Usage:
  pip install -r requirements.txt
  brew install ffmpeg   # if not installed
  python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME"
  python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME" --limit 3   # test run

Output: data/knowledge_base.json (sections + topics + transcripts)
        data/transcripts/       (optional per-file .txt backups)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

# Project paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
LEARNING_JSON = DATA_DIR / "clinical_topics_learning.json"
OUT_JSON = DATA_DIR / "knowledge_base.json"
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"


def load_learning_json():
    if not LEARNING_JSON.exists():
        print("Run parse-mp3-topics.js first to create clinical_topics_learning.json")
        sys.exit(1)
    with open(LEARNING_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def find_mp3_path(usb_root: Path, filename: str) -> Optional[Path]:
    """Resolve filename to full path on USB (handles spaces and unicode)."""
    candidates = list(usb_root.glob("**/*.mp3"))
    for p in candidates:
        if p.name == filename or p.name.replace("\u2013", "-") == filename.replace("\u2013", "-"):
            return p
    return usb_root / filename


def transcribe_with_whisper(audio_path: Path, model_name: str = "base") -> str:
    import whisper
    model = whisper.load_model(model_name)
    result = model.transcribe(str(audio_path), language="en", fp16=False)
    return (result.get("text") or "").strip()


def main():
    parser = argparse.ArgumentParser(description="Transcribe USB MP3s to text and build knowledge base")
    parser.add_argument("usb_path", nargs="?", default="/Volumes/NO NAME", help="USB drive root path")
    parser.add_argument("--limit", type=int, default=None, help="Max number of MP3s to process (for testing)")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model (base = good speed/quality)")
    parser.add_argument("--save-txt", action="store_true", help="Also save each transcript as data/transcripts/*.txt")
    args = parser.parse_args()

    usb_root = Path(args.usb_path)
    if not usb_root.exists():
        print(f"USB path not found: {usb_root}")
        sys.exit(1)

    data = load_learning_json()
    # Pre-fill from existing knowledge_base so we can skip already-done when resuming
    existing = {}
    if OUT_JSON.exists():
        try:
            with open(OUT_JSON, "r", encoding="utf-8") as f:
                prev = json.load(f)
            for s in prev.get("sections", []):
                for t in s.get("topics", []):
                    key = (s.get("id", ""), t.get("filename", ""))
                    if t.get("transcript"):
                        existing[key] = t.get("transcript")
        except Exception as e:
            print(f"Note: could not load existing knowledge base: {e}")
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    for section in data.get("sections", []):
        for topic in section.get("topics", []):
            total += 1
    if args.limit:
        print(f"Processing up to {args.limit} of {total} topics")
    else:
        print(f"Processing {total} topics from USB")

    n_done = 0
    for section in data.get("sections", []):
        sid = section.get("id", "")
        sname = section.get("name", "")
        for topic in section.get("topics", []):
            if args.limit and n_done >= args.limit:
                break
            filename = topic.get("filename", "")
            if not filename.endswith(".mp3"):
                continue
            key = (sid, filename)
            if key in existing:
                topic["transcript"] = existing[key]
                print(f"  Skip (already in knowledge base): {topic.get('title', filename)[:40]}...")
                n_done += 1
                continue
            mp3_path = find_mp3_path(usb_root, filename)
            if not mp3_path.exists():
                print(f"  Skip (not found): {filename}")
                topic["transcript"] = ""
                topic["transcript_error"] = "File not found on USB"
                n_done += 1
                continue
            title = topic.get("title", filename)
            print(f"  Transcribing: {title[:50]}...")
            try:
                text = transcribe_with_whisper(mp3_path, model_name=args.model)
                topic["transcript"] = text
                if args.save_txt:
                    safe = re.sub(r"[^\w\-]", "_", filename)[:80]
                    txt_path = TRANSCRIPTS_DIR / f"{safe}.txt"
                    txt_path.write_text(text, encoding="utf-8")
            except Exception as e:
                topic["transcript"] = ""
                topic["transcript_error"] = str(e)
                print(f"    Error: {e}")
            n_done += 1
        if args.limit and n_done >= args.limit:
            break

    out = {
        "source": "Transcribed from USB MP3s (Whisper)",
        "generated": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "totalTopics": sum(len(s.get("topics", [])) for s in data.get("sections", [])),
        "sections": data.get("sections", []),
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"Written {OUT_JSON}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
