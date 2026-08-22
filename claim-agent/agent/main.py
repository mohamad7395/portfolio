from fastapi import FastAPI
from pydantic import BaseModel
import uuid

from agent.graph import build_graph, prune_stale_threads, touch_thread
from agent.state import default_claim_state

app = FastAPI()
graph = build_graph()


class ClaimRequest(BaseModel):
    message: str
    thread_id: str | None = None

from fastapi.responses import StreamingResponse
import json

@app.post("/claim/stream")
async def stream_claim(req: ClaimRequest):
    prune_stale_threads(graph)

    thread_id = req.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    touch_thread(thread_id)

    if req.thread_id:
        # a thread_id from before a server restart (e.g. --reload picking up
        # a file change) has no checkpoint in this process's MemorySaver —
        # resuming it crashes extract_facts_node on a missing raw_input.
        if not graph.get_state(config).values:
            def lost_session_stream():
                yield f"data: {json.dumps({'type': 'thread', 'thread_id': thread_id})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'message': 'Session was reset by the server — please restate your claim.'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return StreamingResponse(lost_session_stream(), media_type="text/event-stream")

        from langgraph.types import Command
        stream_input = Command(resume=req.message)
    else:
        stream_input = default_claim_state(req.message)

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