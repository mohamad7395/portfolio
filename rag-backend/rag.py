import os
import pickle

import faiss
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

from config import config

load_dotenv()

NVIDIA_API_KEY = os.environ["NVIDIA_API_KEY"]
NVIDIA_BASE_URL = config.generation.nvidia_base_url
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", config.generation.nvidia_model_default)

EMBEDDING_MODEL = config.embedding.model
RERANKER_MODEL = config.retrieval.reranker_model
INDEX_PATH = config.paths.index_path
CHUNKS_PATH = config.paths.chunks_path
BM25_PATH = config.paths.bm25_path
TOP_K = config.retrieval.top_k
CANDIDATE_K = config.retrieval.candidate_k
RRF_K = config.retrieval.rrf_k
TEMPERATURE = config.generation.temperature

SYSTEM_PROMPT = config.generation.system_prompt

index = faiss.read_index(INDEX_PATH)
with open(CHUNKS_PATH, "rb") as f:
    chunks = pickle.load(f)
with open(BM25_PATH, "rb") as f:
    bm25 = pickle.load(f)

embedder = SentenceTransformer(EMBEDDING_MODEL)
reranker = CrossEncoder(RERANKER_MODEL)
client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=NVIDIA_API_KEY)


def reciprocal_rank_fusion(rankings, k=RRF_K):
    """Fuse ranked lists of chunk indices into a single ranking via RRF."""
    scores = {}
    for ranking in rankings:
        for rank, idx in enumerate(ranking):
            scores[idx] = scores.get(idx, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)


def retrieve_hybrid(question, top_k=TOP_K, candidate_k=CANDIDATE_K):
    query_embedding = embedder.encode([question], convert_to_numpy=True)
    _, faiss_indices = index.search(query_embedding, candidate_k)
    faiss_ranking = faiss_indices[0].tolist()

    bm25_scores = bm25.get_scores(question.lower().split())
    bm25_ranking = sorted(
        range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True
    )[:candidate_k]

    fused_ranking = reciprocal_rank_fusion([faiss_ranking, bm25_ranking])
    candidate_indices = fused_ranking[:candidate_k]

    pairs = [[question, chunks[i]["text"]] for i in candidate_indices]
    rerank_scores = reranker.predict(pairs)

    reranked = sorted(
        zip(candidate_indices, rerank_scores), key=lambda x: x[1], reverse=True
    )
    return [chunks[i] for i, _ in reranked[:top_k]]


def ask_with_context(question, retrieved_chunks):
    context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)
    prompt = (
        "Answer the question using only the context below.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )
    response = client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=TEMPERATURE,
    )
    return response.choices[0].message.content


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    retrieved = retrieve_hybrid(request.question)
    answer = ask_with_context(request.question, retrieved)
    return ChatResponse(answer=answer)
# test
