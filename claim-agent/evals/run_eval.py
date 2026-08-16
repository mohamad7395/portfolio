import json
from pathlib import Path
import sys

sys.path.insert(0, ".")
from retrieve import Retriever

cases = json.loads(Path("/Users/mohamad/python-workspace/claim-agent/evals/retrieval_testset.json").read_text())

r = Retriever()

hits = 0
total = 0
misses = []

for c in cases:
    articles = [h["chunk_id"] for h in r.search(c["q"], k=3, source="article")]
    sections = [h["chunk_id"] for h in r.search(c["q"], k=3, source="section")]
    got = articles + sections
    for want in c["expect"]:
        total += 1
        if want in got:
            hits += 1
        else:
            misses.append((c["q"], want, got))

print(f"\nrecall@5: {hits}/{total} = {hits/total:.2f}\n")
for q, want, got in misses:
    print(f"  MISS  {want}")
    print(f"        {q}")
    print(f"        got: {', '.join(got)}\n")
    