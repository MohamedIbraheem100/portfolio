"""The AI twin's knowledge base (apps/api/knowledge) is the only thing it may answer from.

These checks keep it honest before any model reads it: the eight files exist, nothing private or
unfinished is in them, and every percentage they state is also in resume.yaml (D13).
"""

import re
from pathlib import Path

import pytest

API = Path(__file__).resolve().parents[1]
KNOWLEDGE = API / "knowledge"
RESUME = API.parent / "web" / "content" / "resume.yaml"
FILES = [
    "bio.md",
    "experience.md",
    "projects.md",
    "opinions.md",
    "working-style.md",
    "voice.md",
    "faq.md",
    "boundaries.md",
]
EMOJI = re.compile("[\U0001f300-\U0001faff☀-➿️]")


def read(name: str) -> str:
    return (KNOWLEDGE / name).read_text(encoding="utf-8")


@pytest.mark.parametrize("name", FILES)
def test_file_exists_and_is_clean(name):
    text = read(name)
    assert len(text) > 200, f"{name} is too short to be useful"
    assert "TODO" not in text
    assert "[VERIFY" not in text and "[UNKNOWN" not in text  # markers of the unverified outline
    assert not re.search(r"\+?20\d{9,}", text), "a phone number must never be in the knowledge base"
    assert not EMOJI.search(text), "no emoji anywhere (CLAUDE.md)"


def test_no_unlisted_files():
    assert sorted(p.name for p in KNOWLEDGE.glob("*.md")) == sorted(FILES)


def test_every_percentage_is_backed_by_the_resume():
    resume = RESUME.read_text(encoding="utf-8")
    stated = {m for name in FILES for m in re.findall(r"\d+(?:\.\d+)?%", read(name))}
    assert stated, "the knowledge base should carry the verified numbers"
    missing = sorted(p for p in stated if p not in resume)
    assert not missing, f"numbers in the knowledge base that resume.yaml does not state: {missing}"


def test_the_fallback_and_the_disclosure_are_written_down():
    boundaries = read("boundaries.md")
    assert "I'd rather Mohamed answer that himself" in boundaries
    assert "AI trained on Mohamed's work" in boundaries
    assert "I'd rather Mohamed answer that himself" in read("faq.md")
