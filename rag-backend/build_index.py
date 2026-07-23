import pickle
import re

import faiss
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from config import config

SOURCE_FILES = config.paths.source_files
EMBEDDING_MODEL = config.embedding.model
INDEX_PATH = config.paths.index_path
CHUNKS_PATH = config.paths.chunks_path
BM25_PATH = config.paths.bm25_path

PROJECT_HEADER = re.compile(r"===\s*PROJECT:\s*(.+?)\s*===")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.indexing.chunk_size,
    chunk_overlap=config.indexing.chunk_overlap,
)


def split_by_project(text):
    """Split text into (project_name, section_text) pairs on '=== PROJECT: ... ===' headers."""
    matches = list(PROJECT_HEADER.finditer(text))
    if not matches:
        return [(None, text)]

    sections = []
    preamble = text[: matches[0].start()].strip()
    if preamble:
        sections.append((None, preamble))

    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections.append((match.group(1).strip(), text[start:end]))

    return sections


def main():
    chunks = []
    for path in SOURCE_FILES:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        for project_name, section_text in split_by_project(text):
            for chunk in splitter.split_text(section_text):
                chunks.append({"text": chunk, "source": path, "project": project_name})

    model = SentenceTransformer(EMBEDDING_MODEL)
    embeddings = model.encode(
        [chunk["text"] for chunk in chunks],
        convert_to_numpy=True,
        show_progress_bar=True,
    )

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    faiss.write_index(index, INDEX_PATH)

    bm25 = BM25Okapi([chunk["text"].lower().split() for chunk in chunks])
    with open(BM25_PATH, "wb") as f:
        pickle.dump(bm25, f)

    with open(CHUNKS_PATH, "wb") as f:
        pickle.dump(chunks, f)

    print(f"Indexed {len(chunks)} chunks from {len(SOURCE_FILES)} files")
    print(
        f"Saved FAISS index to {INDEX_PATH}, BM25 index to {BM25_PATH}, "
        f"and chunk metadata to {CHUNKS_PATH}"
    )


if __name__ == "__main__":
    main()
