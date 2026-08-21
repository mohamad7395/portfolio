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

@app.post("/claim/stream")
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
            "response": None, "clarification_attempts": 0, "last_question": None,
            "letter": None, "amount": None, "final_letter": None,
            "missing_field_names": None,
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

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



# @app.post("/claim")
# def submit_claim(req: ClaimRequest):
#     thread_id = req.thread_id or str(uuid.uuid4())
#     config = {"configurable": {"thread_id": thread_id}}

#     if req.thread_id:
#         # resuming an existing paused conversation
#         from langgraph.types import Command
#         result = graph.invoke(Command(resume=req.message), config=config)
#     else:
#         # brand new claim
#         result = graph.invoke({
#             "raw_input": req.message,
#             "facts": None,
#             "missing_fields": [],
#             "gate_result": None,
#             "retrieved": [],
#             "extraordinary": None,
#             "extraordinary_reason": None,
#             "response": None,
#             "clarification_attempts": 0,
#             "last_question": None,
#             "letter": None,
#             "amount": None,
#         }, config=config)

#     if "__interrupt__" in result:
#         return {"thread_id": thread_id, "question": result["__interrupt__"][0].value, "done": False}

#     return {
#         "thread_id": thread_id,
#         "response": result.get("response"),
#         "letter": result.get("letter"),
#         "done": True,
#     }