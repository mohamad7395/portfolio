"""
Chunk the 2024 Interpretative Guidelines into retrievable units.

Headings look like:
    1.   INTRODUCTION
    2.1.   Territorial scope
    2.1.1.   Geographical scope
    A.   General

i.e. a number (or letter) + '.' + two or more spaces + title.
The two-space rule distinguishes a heading from an ordinary numbered
sentence like "1. This Regulation establishes...".

Parent headings usually have no body of their own, but their titles carry
the meaning: '4.4.5 Amount of compensation' and '4.4.10 Amount of
compensation' are indistinguishable without knowing that one sits under
'Compensation in the event of cancellation' and the other under
'Compensation in the event of long delay at arrival'. So parents are
tracked and prepended to each chunk as a breadcrumb.

Footnote markers are deliberately NOT stripped: here they are separated by
a space ("TFEU (18)"), which makes them indistinguishable from legal
references ("Article 355 (1)"). Losing article references would be worse
than keeping a little noise.
"""

import json
import re
from pathlib import Path

CORPUS = Path("corpus")
MAX_CHARS = 6000          # above this, split on paragraph boundaries

HEADING = re.compile(r"^([A-G]|\d+(?:\.\d+)*)\.\s{2,}(\S.*)$")


def depth_of(ref: str) -> int:
    """2.1.1 -> 3.  Letter dividers (A..G) sit at the same level as x.y."""
    return ref.count(".") + 1 if ref[0].isdigit() else 2


def split_long(body: str, limit: int = MAX_CHARS) -> list[str]:
    """Split an oversized section on blank lines, packing paragraphs up to the limit."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    parts, buf = [], ""
    for para in paras:
        if buf and len(buf) + len(para) + 2 > limit:
            parts.append(buf)
            buf = para
        else:
            buf = f"{buf}\n\n{para}" if buf else para
    if buf:
        parts.append(buf)
    return parts


def parse_sections(raw: str) -> list[dict]:
    lines = raw.split("\n")

    heads = []
    for i, line in enumerate(lines):
        m = HEADING.match(line.strip())
        if m:
            heads.append((i, m.group(1), m.group(2).strip()))

    chunks = []
    parents: dict[int, str] = {}

    for n, (start, ref, title) in enumerate(heads):
        end = heads[n + 1][0] if n + 1 < len(heads) else len(lines)
        body = "\n".join(lines[start + 1:end]).strip()

        # record this heading, then drop any deeper ones left over
        d = depth_of(ref)
        parents[d] = title
        for deeper in [k for k in parents if k > d]:
            del parents[deeper]

        # parent headings carry no body — their title is captured above
        if not body:
            continue

        # breadcrumb excludes the section's own title (it follows straight after)
        context = " > ".join(parents[k] for k in sorted(parents) if k < d)

        for idx, part in enumerate(split_long(body)):
            suffix = f"-{chr(ord('a') + idx)}" if idx or len(split_long(body)) > 1 else ""
            head = f"{context}\n\n{ref}. {title}" if context else f"{ref}. {title}"
            chunks.append({
                "chunk_id": f"gl-{ref.replace('.', '-')}{suffix}",
                "source": "guidelines",
                "celex": "52024XC05687",
                "type": "section",
                "ref": f"Guidelines {ref}{suffix}",
                "title": title,
                "context": context,
                "citable": False,      # guidelines inform reasoning; the regulation is cited
                "text": f"{head}\n\n{part}",
            })

    return chunks


def main():
    raw = (CORPUS / "guidelines.txt").read_text(encoding="utf-8")
    chunks = parse_sections(raw)

    out = CORPUS / "chunks_guidelines.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    print(f"{len(chunks)} chunks -> {out}\n")
    for c in chunks:
        size = len(c["text"])
        flag = "  <-- large" if size > MAX_CHARS else ""
        print(f"  {c['ref']:<22} {c['title'][:44]:<46} {size:>6}{flag}")

    total = sum(len(c["text"]) for c in chunks)
    print(f"\ntotal {total:,} chars, mean {total // max(len(chunks), 1):,}")


if __name__ == "__main__":
    main()