"""Hybrid retrieval over the EU261 corpus: BM25 + dense, fused with RRF."""

import json
import pickle
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

INDEX = Path("corpus/index")
MODEL = "BAAI/bge-small-en-v1.5"
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
RRF_K = 60


class Retriever:
    def __init__(self, path: Path = INDEX):
        self.chunks = [
            json.loads(l)
            for l in (path / "meta.jsonl").read_text(encoding="utf-8").splitlines()
            if l.strip()
        ]
        with (path / "bm25.pkl").open("rb") as f:
            self.bm25 = pickle.load(f)
        self.index = faiss.read_index(str(path / "faiss.index"))
        self.model = SentenceTransformer(MODEL)

    def search(self, query: str, k: int = 5, pool: int = 20, source: str | None = None):
        allowed = {i for i, c in enumerate(self.chunks) if source is None or c["type"] == source}

        # keyword
        scores = self.bm25.get_scores(query.lower().split())
        bm25_order = [i for i in np.argsort(scores)[::-1] if int(i) in allowed][:pool]

        # dense
        qv = self.model.encode([QUERY_PREFIX + query], normalize_embeddings=True)
        _, ids = self.index.search(np.asarray(qv, dtype="float32"), len(self.chunks))
        dense_order = [i for i in ids[0] if int(i) in allowed][:pool]

        # reciprocal rank fusion
        fused: dict[int, float] = {}
        for lst in (bm25_order, dense_order):
            for rank, idx in enumerate(lst):
                fused[int(idx)] = fused.get(int(idx), 0.0) + 1.0 / (RRF_K + rank + 1)

        top = sorted(fused.items(), key=lambda x: -x[1])[:k]
        return [{**self.chunks[i], "score": s} for i, s in top]


if __name__ == "__main__":
    r = Retriever()
    for q in [
       "cancellation compensation notice period technical fault extraordinary circumstances distance"
    ]:
        print(f"\n=== {q}")
        for src in ("article", "section"):
            for hit in r.search(q, k=3, source=src):
                print(f"  {src:<12} {hit['ref']:<22} {hit.get('title','')[:40]}")