"""Build BM25 and FAISS indexes from corpus/chunks.jsonl."""

import json
import pickle
from pathlib import Path

import faiss
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

CHUNKS = Path("corpus/chunks.jsonl")
OUT = Path("corpus/index")
MODEL = "BAAI/bge-small-en-v1.5"


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    chunks = [json.loads(l) for l in CHUNKS.read_text(encoding="utf-8").splitlines() if l.strip()]
    texts = [c["text"] for c in chunks]
    print(f"loaded {len(chunks)} chunks")

    # BM25
    bm25 = BM25Okapi([t.lower().split() for t in texts])
    with (OUT / "bm25.pkl").open("wb") as f:
        pickle.dump(bm25, f)
    print("built bm25")

    # dense
    model = SentenceTransformer(MODEL)
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    vecs = np.asarray(vecs, dtype="float32")

    index = faiss.IndexFlatIP(vecs.shape[1])
    index.add(vecs)
    faiss.write_index(index, str(OUT / "faiss.index"))
    print(f"built faiss: {index.ntotal} vectors, dim {vecs.shape[1]}")

    # chunk metadata, in the same order as the index
    with (OUT / "meta.jsonl").open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    print(f"\nwrote to {OUT}/")


if __name__ == "__main__":
    main()