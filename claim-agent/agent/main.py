from fastapi import FastAPI
from pydantic import BaseModel
import uuid

from agent.graph import build_graph

app = FastAPI()
graph = build_graph()


class ClaimRequest(BaseModel):
    message: str
    thread_id: str | None = None


@app.post("/claim")
def submit_claim(req: ClaimRequest):
    thread_id = req.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    if req.thread_id:
        # resuming an existing paused conversation
        from langgraph.types import Command
        result = graph.invoke(Command(resume=req.message), config=config)
    else:
        # brand new claim
        result = graph.invoke({
            "raw_input": req.message,
            "facts": None,
            "missing_fields": [],
            "gate_result": None,
            "retrieved": [],
            "extraordinary": None,
            "extraordinary_reason": None,
            "response": None,
            "clarification_attempts": 0,
            "letter": None,
            "amount": None,
        }, config=config)

    if "__interrupt__" in result:
        return {"thread_id": thread_id, "question": result["__interrupt__"][0].value, "done": False}

    return {
        "thread_id": thread_id,
        "response": result.get("response"),
        "letter": result.get("letter"),
        "done": True,
    }