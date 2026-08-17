"""
Judges whether the stated cause of disruption counts as "extraordinary
circumstances" (Art 5(3)) based on retrieved guideline text.
This is the one place an LLM actually makes a judgment call using
retrieved evidence — not a lookup, not a threshold check.

The agent picks its own search queries, can search multiple times, and
only stops when it chooses to give a verdict (bounded at MAX_STEPS).
"""

import json
import os

from openai import OpenAI
from dotenv import load_dotenv
from langgraph.config import get_stream_writer

from retrieve import Retriever

client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)
MODEL = "openai/gpt-oss-120b"


MAX_STEPS = 3

SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "search_guidelines",
        "description": "Search the EU261 regulation + guidelines for relevant text.",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
    },
}
JUDGE_TOOL = {
    "type": "function",
    "function": {
        "name": "record_judgment",
        "description": "Give your final verdict once you have enough evidence.",
        "parameters": {
            "type": "object",
            "properties": {
                "is_extraordinary": {"type": "boolean"},
                "reasoning": {"type": "string"},
                "citations": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["is_extraordinary", "reasoning", "citations"],
        },
    },
}


def _preview(hit: dict) -> dict:
    """Short, clean preview — skip the repeated section header, get to real content."""
    text = hit.get("text", "")
    parts = [p.strip() for p in text.split("\n\n") if p.strip()]
    body = " ".join(parts[2:]) if len(parts) > 2 else " ".join(parts)

    snippet = body[:180].rsplit(" ", 1)[0] + "…" if len(body) > 180 else body
    return {"ref": hit["ref"], "title": hit.get("title", ""), "preview": snippet}


def judge_extraordinary_node(state: dict) -> dict:
    writer = get_stream_writer()
    cause = state["facts"].stated_cause
    # print(f"\n[judge] stated_cause = {cause!r}")
    writer({"type": "judge_thinking", "detail": f"stated cause: {cause}"})

    if not cause:
        # print("[judge] no cause stated -> skipping judgment, not extraordinary by default")
        writer({"type": "judge_thinking", "detail": "no cause stated, skipping judgment"})
        return {"extraordinary": False, "retrieved": []}

    retriever = Retriever()
    messages = [
        {"role": "system", "content":
         "Decide if the stated cause is 'extraordinary circumstances' under EU261 Art 5(3). "
         "You may search once or twice if the first results aren't clearly relevant. "
         "Do NOT search more than twice with similar wording — if your searches are returning "
         "the same guideline sections repeatedly, you already have enough evidence. "
         "Call record_judgment as soon as you can support a verdict."},
        {"role": "user", "content": f"Stated cause: {cause}"},
    ]
    all_hits = []

    for step in range(MAX_STEPS):
        # print(f"[judge] step {step + 1}/{MAX_STEPS} — calling LLM...")
        writer({"type": "judge_thinking", "detail": f"step {step + 1}/{MAX_STEPS}: thinking..."})

        resp = client.chat.completions.create(
            model=MODEL, temperature=0, messages=messages,
            tools=[SEARCH_TOOL, JUDGE_TOOL],
        )
        msg = resp.choices[0].message
        if not msg.tool_calls:
            # print("[judge] no tool call returned, stopping")
            writer({"type": "judge_thinking", "detail": "stopped: no tool call returned"})
            break
        call = msg.tool_calls[0]
        messages.append(msg)

        if call.function.name == "search_guidelines":
            query = json.loads(call.function.arguments)["query"]
            # print(f"[judge] -> search_guidelines(query={query!r})")
            writer({"type": "judge_thinking", "detail": f"searching: {query!r}"})

            hits = retriever.search(query, k=3)
            for h in hits:
                # print(f"[judge]    found: {h['ref']}  {h.get('title','')[:50]}")
                writer({"type": "judge_thinking", "detail": f"found: {h['ref']} — {h.get('title','')[:50]}"})

            all_hits.extend(hits)
            result_text = "\n".join(f"{h['ref']}: {h['text'][:200]}" for h in hits)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result_text})

        elif call.function.name == "record_judgment":
            verdict = json.loads(call.function.arguments)
            # print(f"[judge] -> record_judgment(is_extraordinary={verdict['is_extraordinary']})")
            # print(f"[judge]    reasoning: {verdict['reasoning']}")
            writer({"type": "judge_thinking",
                    "detail": f"verdict: {'extraordinary' if verdict['is_extraordinary'] else 'not extraordinary'} — {verdict['reasoning']}"})
            return {
                "extraordinary": verdict["is_extraordinary"],
                "extraordinary_reason": verdict["reasoning"],
                "retrieved": [_preview(h) for h in all_hits],
            }

    # print("[judge] ran out of steps without a verdict -> defaulting to not extraordinary")
    writer({"type": "judge_thinking", "detail": "ran out of steps, defaulting to not extraordinary"})
    return {"extraordinary": False, "retrieved": [_preview(h) for h in all_hits]}