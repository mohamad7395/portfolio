"""Evaluate hybrid retrieval + generation over eval/testset.json.

Runs retrieve_hybrid + ask_with_context for every question in the test set,
stores per-question results (question/answer/contexts/ground_truth, RAGAS-shaped
for later use) to eval/eval_results.pkl, and computes hit_rate/mrr/context_precision
(answerable questions only) and refusal_rate (unanswerable questions only) by hand.
"""

import json
import os
import pickle
import subprocess
import sys
from pathlib import Path

import dagshub
import mlflow
from dotenv import load_dotenv

EVAL_DIR = Path(__file__).resolve().parent
RAG_BACKEND_DIR = EVAL_DIR.parent

sys.path.insert(0, str(RAG_BACKEND_DIR))
os.chdir(RAG_BACKEND_DIR)  # rag.py / config.yaml paths are relative to rag-backend/

load_dotenv()

from config import config  # noqa: E402
from rag import NVIDIA_MODEL, ask_with_context, retrieve_hybrid  # noqa: E402

TESTSET_PATH = EVAL_DIR / "testset.json"
RESULTS_PATH = EVAL_DIR / "eval_results.pkl"
LAST_RUN_ID_PATH = EVAL_DIR / "last_run_id.txt"

DAGSHUB_USERNAME = os.environ["DAGSHUB_USERNAME"]
DAGSHUB_REPO = os.environ["DAGSHUB_REPO"]

UNANSWERABLE_PHRASES = [
    "cannot help",
    "not in my background",
    "outside",
    "redirect",
    "not covered",
    "don't have information",
]


def is_refusal(answer: str) -> bool:
    lowered = answer.lower()
    return any(phrase in lowered for phrase in UNANSWERABLE_PHRASES)


def run_pipeline(testset):
    results = []
    for item in testset["questions"]:
        question = item["question"]
        source_section = item.get("source_section") or []
        source_project = source_section[0] if source_section else None

        retrieved_chunks = retrieve_hybrid(question, top_k=config.retrieval.top_k)
        answer = ask_with_context(question, retrieved_chunks)

        results.append(
            {
                "id": item["id"],
                "question": question,
                "answer": answer,
                "contexts": [chunk["text"] for chunk in retrieved_chunks],
                "retrieved_projects": [chunk["project"] for chunk in retrieved_chunks],
                "ground_truth": item["ground_truth"],
                "source_project": source_project,
                "type": item["type"],
            }
        )
        print(f"[{item['id']}] {question[:60]!r} -> done")

    return results


def compute_hand_metrics(results):
    answerable = [r for r in results if r["source_project"] is not None]
    unanswerable = [r for r in results if r["source_project"] is None]

    hits = 0
    precisions = []
    reciprocal_ranks = []

    for r in answerable:
        target = r["source_project"]
        relevant = [p == target for p in r["retrieved_projects"]]

        if any(relevant):
            hits += 1

        precisions.append(sum(relevant) / len(relevant) if relevant else 0.0)

        rank = next((i + 1 for i, flag in enumerate(relevant) if flag), None)
        reciprocal_ranks.append(1.0 / rank if rank else 0.0)

    refusals = sum(1 for r in unanswerable if is_refusal(r["answer"]))

    return {
        "hit_rate": hits / len(answerable) if answerable else None,
        "mrr": sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else None,
        "context_precision": sum(precisions) / len(precisions) if precisions else None,
        "refusal_rate": refusals / len(unanswerable) if unanswerable else None,
    }


def get_git_sha():
    return (
        subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=RAG_BACKEND_DIR)
        .decode()
        .strip()
    )


def main():
    with open(TESTSET_PATH, "r", encoding="utf-8") as f:
        testset = json.load(f)

    dagshub.init(repo_owner=DAGSHUB_USERNAME, repo_name=DAGSHUB_REPO, mlflow=True)

    with mlflow.start_run():
        current_run_id = mlflow.active_run().info.run_id

        mlflow.log_params(
            {
                "chunk_size": config.indexing.chunk_size,
                "chunk_overlap": config.indexing.chunk_overlap,
                "embedding_model": config.embedding.model,
                "top_k": config.retrieval.top_k,
                "candidate_k": config.retrieval.candidate_k,
                "llm_model": NVIDIA_MODEL,
                "prompt_version": config.generation.prompt_version,
            }
        )

        results = run_pipeline(testset)

        with open(RESULTS_PATH, "wb") as f:
            pickle.dump(results, f)
        print(f"\nSaved {len(results)} per-question results to {RESULTS_PATH}")

        summary = compute_hand_metrics(results)
        mlflow.log_metrics(summary)

        mlflow.set_tag("testset_version", testset["version"])
        mlflow.set_tag("git_sha", get_git_sha())

        with open(LAST_RUN_ID_PATH, "w", encoding="utf-8") as f:
            f.write(current_run_id)

        print("\n=== Evaluation summary ===")
        print(summary)
        print(f"\nMLflow run_id: {current_run_id}")

    return results, summary


if __name__ == "__main__":
    main()
