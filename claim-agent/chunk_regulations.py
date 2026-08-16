"""
Chunk the EU261 regulation into retrievable units.

Splits on legal structure, not token counts: recitals and articles are the
units a citation can point at.
"""

import json
import re
from pathlib import Path

CORPUS = Path("corpus")
SPLIT_MARKER = "HAVE ADOPTED THIS REGULATION"


def strip_footnotes(text: str) -> str:
    """Remove footnote markers like `transport(4)` but keep `(a)` and line-initial `(1)`."""
    # (N) glued to the end of a word = footnote reference
    return re.sub(r"(?<=\S)\((\d+)\)", "", text)


def chunk_recitals(preamble: str) -> list[dict]:
    """Recitals are numbered blocks: (1) ... (2) ... before the enacting clause."""
    chunks = []
    # split at line-initial (N)
    parts = re.split(r"\n\((\d+)\)\s+", "\n" + preamble)
    # parts = ['', '1', 'text', '2', 'text', ...]
    for num, body in zip(parts[1::2], parts[2::2]):
        text = strip_footnotes(body).strip()
        if not text:
            continue
        chunks.append({
            "chunk_id": f"reg-rec-{num}",
            "source": "regulation",
            "celex": "32004R0261",
            "type": "recital",
            "ref": f"Recital {num}",
            "citable": True,
            "text": text,
        })
    return chunks


def chunk_articles(body: str) -> list[dict]:
    """Articles are `Article N` on its own line, followed by a title line."""
    chunks = []
    parts = re.split(r"\nArticle (\d+)\n", "\n" + body)
    for num, block in zip(parts[1::2], parts[2::2]):
        lines = [l for l in block.strip().split("\n") if l.strip()]
        if not lines:
            continue
        title = lines[0].strip()
        text = strip_footnotes("\n".join(lines[1:])).strip()
        chunks.append({
            "chunk_id": f"reg-art-{num}",
            "source": "regulation",
            "celex": "32004R0261",
            "type": "article",
            "ref": f"Article {num}",
            "title": title,
            "citable": True,
            # keep the heading in the text so retrieval can match on it
            "text": f"Article {num} — {title}\n\n{text}",
        })
    return chunks


def main():
    raw = (CORPUS / "regulation.txt").read_text(encoding="utf-8")

    if SPLIT_MARKER not in raw:
        raise SystemExit(f"Could not find '{SPLIT_MARKER}' — check the file")

    preamble, body = raw.split(SPLIT_MARKER, 1)

    chunks = chunk_recitals(preamble) + chunk_articles(body)

    out = CORPUS / "chunks_regulation.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    recitals = [c for c in chunks if c["type"] == "recital"]
    articles = [c for c in chunks if c["type"] == "article"]
    print(f"{len(recitals)} recitals, {len(articles)} articles -> {out}")
    print()
    for c in articles:
        print(f"  {c['ref']:<12} {c['title'][:50]:<52} {len(c['text']):>5} chars")


if __name__ == "__main__":
    main()