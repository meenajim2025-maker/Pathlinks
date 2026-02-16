#!/usr/bin/env python3
"""
Anonymize transcripts in knowledge_base.json: remove ALL person names and
intro/boilerplate sentences so content is anonymous and suitable for internal use.
Writes back to the same file (with backup).
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KB_PATH = PROJECT_ROOT / "data" / "knowledge_base.json"
BACKUP_PATH = PROJECT_ROOT / "data" / "knowledge_base.json.bak"

# Names and handles to replace (case-insensitive)
NAMES = [
    "Kate Chesterman", "ChestermanCate", "Roger Henderson", "Roger the Doctor",
    "RogerTheDoctor", "Roger Hans", "Kevin Fernando", "Dr Kevin Fernando",
    "James Waldron", "Yasajavade", "Chest Man", "Chesterman", "Waldron",
    "Henderson", "Fernando", "Chesterman", "North Berwick", "South Norfolk",
    "Dumfries", "Galoway", "Northampton", "North Ampton", "Nottingham",
    "Vale of Trent", "GP Notebook", "GPnotebook", "GP Notebook",
]

# Sentences containing these (case-insensitive) are removed entirely (intro/boilerplate)
INTRO_KEYWORDS = [
    "my name is", "i'm a gp", "i am a gp", "welcome to the", "welcome to this",
    "welcome again", "you can find us on", "you can find this on",
    "please follow us", "do please follow us", "so do please follow us",
    "follow us to receive", "follow me on twitter", "you can also follow us on twitter",
    "follow me there", "you can follow me there", "and you can follow me",
    "finally you can visit", "finally, you can visit", "you could follow me",
    "for podcast episode show notes", "podcast.com", "gpnotebook", "visit www",
    "i also co-host", "i co-host the", "co-host the gp", "study groups",
    "bite-sized topics aimed", "bite sized", "for more information about the new podcasts",
    "if you like what you hear", "consider leaving a review", "help other listeners find us",
    "where we discuss", "where we present", "aimed at all those working in primary care",
    "chronic conditions month", "in may 2022", "in may 2023",
]


def is_intro_sentence(sent: str) -> bool:
    s = sent.strip().lower()
    if len(s) < 10:
        return False
    for kw in INTRO_KEYWORDS:
        if kw in s:
            return True
    if re.match(r"^hello[,!]?\s", s) or re.match(r"^and welcome\s", s):
        return True
    if re.search(r"twitter at\s+\w+", s) or re.search(r"visit\s+[\w.]+\.com", s):
        return True
    return False


def remove_intro_sentences(text: str) -> str:
    """Remove every sentence that is intro/boilerplate. Never return original if we stripped (avoid showing names)."""
    if not text or not text.strip():
        return text
    sentences = re.split(r"(?<=[.!?])\s+", text)
    kept = [s for s in sentences if not is_intro_sentence(s)]
    result = " ".join(kept).strip()
    return result if result else "(Intro removed; no clinical content in this segment.)"


def anonymize_text(text: str) -> str:
    if not text or not text.strip():
        return text
    s = text
    for name in NAMES:
        if not name.strip():
            continue
        pat = re.compile(re.escape(name), re.IGNORECASE)
        if "notebook" in name.lower() or name.strip().lower() == "gp notebook":
            s = pat.sub("[Organisation]", s)
        else:
            s = pat.sub("[Name]", s)
    # "my name is X Y" / "I'm X Y" – replace name part with [Name]
    s = re.sub(r"\bmy name is\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", "the presenter is [Name]", s, flags=re.IGNORECASE)
    s = re.sub(r"\bI'm\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", "I'm [Name]", s, flags=re.IGNORECASE)
    s = re.sub(r"\bI am\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", "I am [Name]", s, flags=re.IGNORECASE)
    s = re.sub(r"\b(?:Dr\.?|Professor)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", "[Name]", s)
    s = re.sub(r"\b(?:Dr\.?|Professor)\s+[A-Z][a-z]+", "[Name]", s)
    s = re.sub(r"on Twitter at\s+[A-Za-z0-9]+", "on [social media]", s, flags=re.IGNORECASE)
    s = re.sub(r"follow me (?:on Twitter )?at\s+[A-Za-z0-9]+", "on [social media]", s, flags=re.IGNORECASE)
    s = re.sub(r"follow me there (?:too )?at\s+[A-Za-z0-9]+", "on [social media]", s, flags=re.IGNORECASE)
    s = re.sub(r"find me there (?:to add|too at)\s+[A-Za-z0-9]+", "on [social media]", s, flags=re.IGNORECASE)
    s = re.sub(r"\bI'm a GP (?:in|and)\s+[^.]*?\.", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"the presenter is \[Name\],?\s*I'm a GP[^.]*?\.", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"  +", " ", s)
    return s.strip()


def main():
    if not KB_PATH.exists():
        print(f"Not found: {KB_PATH}")
        return 1
    with open(KB_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    with open(BACKUP_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Backup: {BACKUP_PATH}")
    n = 0
    for section in data.get("sections", []):
        for topic in section.get("topics", []):
            tr = topic.get("transcript") or ""
            if not tr:
                continue
            tr = remove_intro_sentences(tr)
            tr = anonymize_text(tr)
            topic["transcript"] = tr
            n += 1
    with open(KB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Anonymized {n} transcripts. Saved to {KB_PATH}")
    return 0


if __name__ == "__main__":
    exit(main())
