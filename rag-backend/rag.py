import os
import pickle
import time

import faiss
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

load_dotenv()

NVIDIA_API_KEY = os.environ["NVIDIA_API_KEY"]
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL = "meta/llama-3.1-8b-instruct"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
INDEX_PATH = "index.faiss"
CHUNKS_PATH = "chunks.pkl"
BM25_PATH = "bm25.pkl"
TOP_K = 5
CANDIDATE_K = 10

SYSTEM_PROMPT = """You are Mohammad Akbari Monfared, an AI/ML Engineer, answering questions from a recruiter or hiring manager on your portfolio site.

Respond in first person, casual but professional, like a real interview. Be specific and concrete. When you have experience from multiple projects or roles, clearly distinguish between them — say ‘In my thesis I did X’ and ‘At DCV I did Y’ rather than blending them together.

Only answer questions about your professional background. If asked something unrelated, politely redirect."""

index = faiss.read_index(INDEX_PATH)
with open(CHUNKS_PATH, "rb") as f:
    chunks = pickle.load(f)
with open(BM25_PATH, "rb") as f:
    bm25 = pickle.load(f)

embedder = SentenceTransformer(EMBEDDING_MODEL)
reranker = CrossEncoder(RERANKER_MODEL)
client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=NVIDIA_API_KEY)


def reciprocal_rank_fusion(rankings, k=60):
    """Fuse ranked lists of chunk indices into a single ranking via RRF."""
    scores = {}
    for ranking in rankings:
        for rank, idx in enumerate(ranking):
            scores[idx] = scores.get(idx, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)


def retrieve_hybrid(question, top_k=TOP_K, candidate_k=CANDIDATE_K):
    t0 = time.perf_counter()
    query_embedding = embedder.encode([question], convert_to_numpy=True)
    t1 = time.perf_counter()
    print(f"[timing] embed query:      {t1 - t0:.3f}s")

    _, faiss_indices = index.search(query_embedding, candidate_k)
    faiss_ranking = faiss_indices[0].tolist()
    t2 = time.perf_counter()
    print(f"[timing] faiss search:     {t2 - t1:.3f}s")

    bm25_scores = bm25.get_scores(question.lower().split())
    bm25_ranking = sorted(
        range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True
    )[:candidate_k]
    t3 = time.perf_counter()
    print(f"[timing] bm25 search:      {t3 - t2:.3f}s")

    fused_ranking = reciprocal_rank_fusion([faiss_ranking, bm25_ranking])
    candidate_indices = fused_ranking[:candidate_k]

    pairs = [[question, chunks[i]["text"]] for i in candidate_indices]
    rerank_scores = reranker.predict(pairs)
    t4 = time.perf_counter()
    print(f"[timing] rerank:           {t4 - t3:.3f}s")

    reranked = sorted(
        zip(candidate_indices, rerank_scores), key=lambda x: x[1], reverse=True
    )
    print(f"[timing] retrieve_hybrid total: {t4 - t0:.3f}s")
    return [chunks[i] for i, _ in reranked[:top_k]]


def ask_with_context(question, retrieved_chunks):
    context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)
    prompt = (
        "Answer the question using only the context below.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )
    t0 = time.perf_counter()
    response = client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    t1 = time.perf_counter()
    print(f"[timing] llm call:         {t1 - t0:.3f}s")
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
    t0 = time.perf_counter()
    retrieved = retrieve_hybrid(request.question)
    t1 = time.perf_counter()
    answer = ask_with_context(request.question, retrieved)
    t2 = time.perf_counter()
    print(f"[timing] retrieve: {t1-t0:.3f}s")
    print(f"[timing] llm: {t2-t1:.3f}s")
    print(f"[timing] total: {t2-t0:.3f}s")
    return ChatResponse(answer=answer)
