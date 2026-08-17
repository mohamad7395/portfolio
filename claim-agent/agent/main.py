from fastapi import FastAPI
from pydantic import BaseModel
import uuid

from agent.graph import build_graph

app = FastAPI()
graph = build_graph()


class ClaimRequest(BaseModel):
    message: str
    thread_id: str | None = None

from fastapi.responses import StreamingResponse
import json

@app.post("/claim")
async def stream_claim(req: ClaimRequest):
    thread_id = req.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    if req.thread_id:
        from langgraph.types import Command
        stream_input = Command(resume=req.message)
    else:
        stream_input = {
            "raw_input": req.message,
            "facts": None, "missing_fields": [], "gate_result": None,
            "retrieved": [], "extraordinary": None, "extraordinary_reason": None,
            "response": None, "clarification_attempts": 0,
            "letter": None, "amount": None, "final_letter": None,
        }

    def event_stream():
        yield f"data: {json.dumps({'type': 'thread', 'thread_id': thread_id})}\n\n"

        for mode, chunk in graph.stream(stream_input, config=config, stream_mode=["updates", "custom"]):
            if mode == "updates":
                for node_name, node_output in chunk.items():
                    if node_name == "__interrupt__":
                        payload = {"type": "interrupt", "question": chunk[node_name][0].value}
                    elif node_name == "draft_letter":
                        payload = {"type": "node_complete", "node": "draft_letter", "output": {"status": "letter drafted"}}
                    else:
                        payload = {"type": "node_complete", "node": node_name, "output": _safe(node_output)}
                    yield f"data: {json.dumps(payload)}\n\n"
            elif mode == "custom":
                yield f"data: {json.dumps(chunk)}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

def _safe(obj):
    if hasattr(obj, "items"):
        return {k: _safe(v) for k, v in obj.items()}
    if hasattr(obj, "model_dump"):
        return obj.model_dump(exclude_none=True)
    return obj
