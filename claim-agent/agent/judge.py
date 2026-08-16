"""
Real agentic node: judges extraordinary circumstances, but decides
for itself what to search for and whether it needs more evidence.
Bounded ReAct loop, max 3 tool calls, then forced final answer.
"""

import json, os
from openai import OpenAI
from dotenv import load_dotenv
from retrieve import Retriever

load_dotenv()
client = OpenAI(api_key=os.environ["GROQ_API_KEY"], base_url="https://api.groq.com/openai/v1")
MODEL = "llama-3.3-70b-versatile"
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


def judge_extraordinary_node(state: dict) -> dict:
    cause = state["facts"].stated_cause
    print(f"\n[judge] stated_cause = {cause!r}")

    if not cause:
        print("[judge] no cause stated -> skipping judgment, not extraordinary by default")
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
        print(f"[judge] step {step + 1}/{MAX_STEPS} — calling LLM...")
        resp = client.chat.completions.create(
            model=MODEL, temperature=0, messages=messages,
            tools=[SEARCH_TOOL, JUDGE_TOOL],
        )
        msg = resp.choices[0].message
        if not msg.tool_calls:
            print("[judge] no tool call returned, stopping")
            break
        call = msg.tool_calls[0]
        messages.append(msg)

        if call.function.name == "search_guidelines":
            query = json.loads(call.function.arguments)["query"]
            print(f"[judge] -> search_guidelines(query={query!r})")
            hits = retriever.search(query, k=3)
            for h in hits:
                print(f"[judge]    found: {h['ref']}  {h.get('title','')[:50]}")
            all_hits.extend(hits)
            result_text = "\n".join(f"{h['ref']}: {h['text'][:200]}" for h in hits)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result_text})

        elif call.function.name == "record_judgment":
            verdict = json.loads(call.function.arguments)
            print(f"[judge] -> record_judgment(is_extraordinary={verdict['is_extraordinary']})")
            print(f"[judge]    reasoning: {verdict['reasoning']}")
            return {
                "extraordinary": verdict["is_extraordinary"],
                "extraordinary_reason": verdict["reasoning"],
                "retrieved": all_hits,
            }

    print("[judge] ran out of steps without a verdict -> defaulting to not extraordinary")
    return {"extraordinary": False, "retrieved": all_hits}