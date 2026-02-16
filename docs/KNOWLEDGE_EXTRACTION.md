# Extracting knowledge from USB MP3s

PathLinks can use **transcribed text** from your USB podcast library as searchable clinical knowledge. This doc describes the two-step pipeline.

## Overview

1. **Parse filenames** → Builds a list of topics and sections from MP3 filenames (`clinical_topics_learning.json`).
2. **Transcribe audio** → Converts each MP3 to text with Whisper and saves everything in `knowledge_base.json`.

The app then loads `knowledge_base.json` (or falls back to the topics-only file), lets you **search** over titles and transcript text, and **read full transcripts** in the Learning topics section.

## Prerequisites

- **Node.js** (for step 1)
- **Python 3.8+** and **pip**
- **ffmpeg** (required by Whisper for MP3 decoding)  
  - macOS: `brew install ffmpeg`
- **USB drive** mounted (e.g. at `/Volumes/NO NAME`) with the MP3 files

## Step 1: Parse MP3 filenames

From the project root, with the USB drive connected:

```bash
node scripts/parse-mp3-topics.js "/Volumes/NO NAME"
```

This creates/updates `data/clinical_topics_learning.json` (sections and topic titles from filenames). No transcription yet.

## Step 2: Transcribe MP3s to text

Use a virtual environment (recommended) so Whisper and its dependencies stay inside the project:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME"
```

**ffmpeg is required.** Without it, every transcription will fail. You can either:
- **Use the project’s ffmpeg (recommended):** run `npm install ffmpeg-static` in the project root. The run script then uses `node_modules/ffmpeg-static/ffmpeg` automatically.
- **Or install system ffmpeg:** e.g. `brew install ffmpeg` (macOS), or put a static `ffmpeg` in your PATH.

Then run (from project root):

```bash
./scripts/run-transcription.sh "/Volumes/NO NAME"
```

or:

```bash
.venv/bin/python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME"
```

- First run: processes all MP3s (can take a long time for 180+ files; use `--limit 5` to test).
- Output: `data/knowledge_base.json` with the same sections/topics plus a `transcript` field for each topic.
- Re-running: skips topics that already have a transcript in the existing `knowledge_base.json`, so you can resume after interruption.

**Options:**

- `--limit N` – Only transcribe the first N topics (useful for testing).
- `--model base` – Whisper model: `tiny` (fast, less accurate), `base`, `small`, `medium`, `large`.
- `--save-txt` – Also write each transcript to `data/transcripts/<filename>.txt`.

Example test run (2 topics only):

```bash
python scripts/transcribe_mp3_to_knowledge.py "/Volumes/NO NAME" --limit 2
```

## Using the knowledge in PathLinks

1. Open the app and go to **Learning topics** in the sidebar.
2. If `knowledge_base.json` exists, the UI will:
   - Show a search box that searches **titles and transcript text**.
   - Show a **Read transcript** button for each topic that has a transcript; clicking it expands the full text below the topic.
3. If only `clinical_topics_learning.json` exists (no transcription run yet), you still see all topics by section and can search by title only.

## Anonymising transcripts (no person names)

To keep content suitable for internal use and avoid copyrighted/identifiable material, run:

```bash
python3 scripts/anonymize_transcripts.py
```

This script:

- Replaces person names (e.g. presenters, guests) with `[Name]` and organisation names with `[Organisation]`.
- Removes common podcast intro lines (e.g. “Hello, my name is…”, “Welcome to…”, “You can find us on…”) so the stored text starts with more clinical content.
- Overwrites `data/knowledge_base.json` and keeps a backup at `data/knowledge_base.json.bak`.

Run it after generating or updating `knowledge_base.json`.

## File summary

| File | Purpose |
|------|--------|
| `data/clinical_topics_learning.json` | Topic list and sections from MP3 filenames (step 1). |
| `data/knowledge_base.json` | Same structure plus anonymised `transcript` per topic (step 2 + optional anonymise). Used by the app when present. |
| `data/transcripts/*.txt` | Optional per-episode transcript files when using `--save-txt`. |

The USB drive is the **source of truth** for audio; the project only stores the extracted, anonymised text so PathLinks can use it without the USB being connected.
