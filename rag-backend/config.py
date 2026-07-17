from pathlib import Path

import yaml
from pydantic import BaseModel

CONFIG_PATH = Path(__file__).parent / "config.yaml"


class PathsConfig(BaseModel):
    source_files: list[str]
    index_path: str
    chunks_path: str
    bm25_path: str


class IndexingConfig(BaseModel):
    chunk_size: int
    chunk_overlap: int
    version: str


class EmbeddingConfig(BaseModel):
    model: str


class RetrievalConfig(BaseModel):
    reranker_model: str
    top_k: int
    candidate_k: int
    rrf_k: int


class GenerationConfig(BaseModel):
    nvidia_base_url: str
    nvidia_model_default: str
    temperature: float
    system_prompt: str
    prompt_version: str


class Config(BaseModel):
    paths: PathsConfig
    indexing: IndexingConfig
    embedding: EmbeddingConfig
    retrieval: RetrievalConfig
    generation: GenerationConfig


def load_config(path: Path = CONFIG_PATH) -> Config:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return Config(**data)


config = load_config()
