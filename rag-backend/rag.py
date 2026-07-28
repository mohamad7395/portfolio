import os
import pickle
import time

import faiss
import numpy as np
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer
from supabase import Client, create_client

from config import config

load_dotenv()

NVIDIA_API_KEY = os.environ["NVIDIA_API_KEY"]
NVIDIA_BASE_URL = config.generation.nvidia_base_url
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", config.generation.nvidia_model_default)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

print(SUPABASE_URL, SUPABASE_SECRET_KEY)

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_SECRET_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

UNANSWERABLE_PHRASES = [
    "cannot help",
    "not in my background",
    "outside",
    "redirect",
    "not covered",
    "don't have information",
]

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


def embed_query(question):
    return embedder.encode([question], convert_to_numpy=True)


def retrieve_hybrid(question, query_embedding=None, top_k=TOP_K, candidate_k=CANDIDATE_K):
    if query_embedding is None:
        query_embedding = embed_query(question)
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

    results = []
    scores_array = np.array([float(score) for _, score in reranked[:top_k]])
    softmax_probs = np.exp(scores_array) / np.exp(scores_array).sum()

    for idx, (chunk_idx, raw_score) in enumerate(reranked[:top_k]):
        chunk = dict(chunks[chunk_idx])
        chunk["rerank_score"] = round(float(softmax_probs[idx]) * 100, 1)
        results.append(chunk)
        
    return results


def generate_response(question, retrieved_chunks):
    context = "\n\n".join(chunk["text"] for chunk in retrieved_chunks)
    prompt = (
        "Answer the question using only the context below.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )
    return client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=TEMPERATURE,
    )


def ask_with_context(question, retrieved_chunks):
    return generate_response(question, retrieved_chunks).choices[0].message.content


def is_refusal(answer):
    lowered = answer.lower()
    return any(phrase in lowered for phrase in UNANSWERABLE_PHRASES)


def log_request_to_supabase(row):
    if supabase is None:
        return
    try:
        supabase.table("requests").insert(row).execute()
    except Exception:
        pass


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

import math

def sigmoid(x):
    return 1 / (1 + math.exp(-x))


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    t0 = time.perf_counter()
    query_embedding = embed_query(request.question)
    t1 = time.perf_counter()

    retrieved = retrieve_hybrid(request.question, query_embedding=query_embedding)
    t2 = time.perf_counter()

    response = generate_response(request.question, retrieved)
    t3 = time.perf_counter()

    answer = response.choices[0].message.content

    top_chunk_scores = [chunk["rerank_score"] for chunk in retrieved]
    best_score = max(top_chunk_scores) if top_chunk_scores else None

    usage = response.usage
    tokens_in = usage.prompt_tokens if usage else None
    tokens_out = usage.completion_tokens if usage else None

    background_tasks.add_task(
    log_request_to_supabase,
    {
    "query": request.question,
    "latency_embed_ms": (t1 - t0) * 1000,
    "latency_retrieve_ms": (t2 - t1) * 1000,
    "latency_generate_ms": (t3 - t2) * 1000,
    "latency_total_ms": (t3 - t0) * 1000,
    "top_chunk_scores": top_chunk_scores,
    "best_score": best_score,
    "tokens_in": tokens_in,
    "tokens_out": tokens_out,
    "llm_model": NVIDIA_MODEL,
    "embedding_model": EMBEDDING_MODEL,
    "prompt_version": config.generation.prompt_version,
    "chunk_size": config.indexing.chunk_size,
    "refused": is_refusal(answer),
    },
    )

    return ChatResponse(answer=answer)
# test
