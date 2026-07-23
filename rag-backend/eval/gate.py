"""Regression gate: compare the latest eval run against the best prior run
(the "champion") on the same testset version, and fail CI if key metrics dropped.
"""

import os
import sys
from pathlib import Path

import dagshub
from dotenv import load_dotenv
from mlflow.tracking import MlflowClient

EVAL_DIR = Path(__file__).resolve().parent
RAG_BACKEND_DIR = EVAL_DIR.parent

LAST_RUN_ID_PATH = EVAL_DIR / "last_run_id.txt"

REGRESSION_THRESHOLD = 0.05
GATED_METRICS = ['hit_rate', 'mrr', 'refusal_rate']

load_dotenv()

DAGSHUB_USERNAME = os.environ["DAGSHUB_USERNAME"]
DAGSHUB_REPO = os.environ["DAGSHUB_REPO"]
DAGSHUB_TOKEN = os.environ["DAGSHUB_TOKEN"]
MLFLOW_TRACKING_URI = os.environ["MLFLOW_TRACKING_URI"]

dagshub.init(repo_owner=DAGSHUB_USERNAME, repo_name=DAGSHUB_REPO, mlflow=True)

os.environ["MLFLOW_TRACKING_USERNAME"] = DAGSHUB_USERNAME
os.environ["MLFLOW_TRACKING_PASSWORD"] = DAGSHUB_TOKEN


def main():
    with open(LAST_RUN_ID_PATH, "r", encoding="utf-8") as f:
        current_run_id = f.read().strip()

    client = MlflowClient()
    current_run = client.get_run(current_run_id)
    current_data = current_run.data

    testset_version = current_data.tags.get("testset_version")

    experiment = client.get_experiment_by_name("Default")
    experiment_id = experiment.experiment_id

    candidates = client.search_runs(
        experiment_ids=[experiment_id],
        filter_string=f"tags.testset_version = '{testset_version}'",
        order_by=["metrics.hit_rate DESC"],
    )
    candidates = [run for run in candidates if run.info.run_id != current_run_id]

    if not candidates:
        print("No champion yet — this run is the baseline.")
        sys.exit(0)

    champion = candidates[0]
    champion_data = champion.data

    regressions = []
    for metric in GATED_METRICS:
        current_value = current_data.metrics.get(metric)
        champion_value = champion_data.metrics.get(metric)

        if current_value is None or champion_value is None:
            continue

        threshold = champion_value * (1 - REGRESSION_THRESHOLD)
        if current_value < threshold:
            drop = champion_value - current_value
            regressions.append((metric, current_value, champion_value, drop))

    if regressions:
        print("=== Regression gate FAILED ===")
        for metric, current_value, champion_value, drop in regressions:
            print(
                f"{metric} regressed: current={current_value:.4f} "
                f"champion={champion_value:.4f} (drop={drop:.4f})"
            )
        sys.exit(1)

    print("=== Regression gate passed ===")
    print(f"{'metric':<20}{'current':<12}{'champion':<12}")
    for metric in GATED_METRICS:
        current_value = current_data.metrics.get(metric)
        champion_value = champion_data.metrics.get(metric)
        print(f"{metric:<20}{current_value:<12.4f}{champion_value:<12.4f}")
    sys.exit(0)


if __name__ == "__main__":
    main()
