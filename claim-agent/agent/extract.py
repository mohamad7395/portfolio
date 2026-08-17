"""
Extraction node: raw user sentence -> ClaimFacts.
One LLM call via Groq (OpenAI-compatible API), forced tool call for
structured output instead of parsing free-text JSON.
"""

import json
import os

from dotenv import load_dotenv

from openai import OpenAI

from agent.state import ClaimFacts

load_dotenv()


client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)
MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = """You extract flight disruption facts from a passenger's message.

CRITICAL: only include a field in your tool call if the message explicitly
states it. Do not include a field with a placeholder value like "none",
"unknown", or "not mentioned" — omit the field entirely instead.

claim_type must be one of: delay, cancellation, denied_boarding, downgrading,
connection, package, other. Use "other" if it doesn't clearly fit.

origin/destination should be IATA airport codes if the user gives city or
airport names, convert to the 3-letter IATA code you're confident about.
If you're not confident, leave them out.
For cities with multiple major airports (e.g. Tokyo, Paris, London, New York), if the user doesn't specify which one, leave origin/destination blank 
rather than guessing a city code.
Example: "My flight was delayed" (no cause mentioned) -> do NOT set
stated_cause at all. Only set it if the user actually names a reason
(weather, technical fault, strike, etc).

"""

EXTRACT_TOOL = {
    "type": "function",
    "function": {
        "name": "record_claim_facts",
        "description": "Record flight disruption facts extracted from the message.",
        "parameters": ClaimFacts.model_json_schema(),
    },
}

# what's required before the rule gate can meaningfully run
REQUIRED_FIELDS = {
    "delay": ["claim_type", "origin", "destination", "delay_hours"],
    "cancellation": ["claim_type", "origin", "destination", "notice_days", "stated_cause"],
}


def _call_llm(existing: ClaimFacts, user_msg: str) -> dict:
    resp = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Known so far: {existing.model_dump_json(exclude_none=True)}\n\n"
                           f"Message: {user_msg}",
            },
        ],
        tools=[EXTRACT_TOOL],
        tool_choice={"type": "function", "function": {"name": "record_claim_facts"}},
    )
    args = resp.choices[0].message.tool_calls[0].function.arguments
    return json.loads(args)


def _missing_fields(facts: ClaimFacts) -> list[str]:
    from agent.calculate import _coords
    valid_codes = _coords()

    if facts.claim_type is None:
        return ["claim_type"]
    required = REQUIRED_FIELDS.get(facts.claim_type, ["claim_type"])

    missing = []
    for f in required:
        val = getattr(facts, f)
        if val is None:
            missing.append(f)
        elif f in ("origin", "destination") and val not in valid_codes:
            missing.append(f)
    return missing


def extract_facts_node(state: dict) -> dict:
    existing = state.get("facts") or ClaimFacts()
    question_context = state.get("last_question")
    user_msg = state["raw_input"]
    if question_context:
        user_msg = f"(You just asked: {question_context})\nUser's answer: {user_msg}"

    new_data = _call_llm(existing, user_msg)

    merged = existing.model_dump()
    merged.update({k: v for k, v in new_data.items() if v is not None})
    facts = ClaimFacts.model_validate(merged)

    return {"facts": facts, "missing_fields": _missing_fields(facts), "facts_confirmed": None}


if __name__ == "__main__":
    result = extract_facts_node({
        "raw_input":"My flight was cancelled, they told me two days before, no alternative was offered." ,
        "facts": None,
    })
    # print(result["facts"].model_dump_json(exclude_none=True, indent=2))
    # print("missing:", result["missing_fields"])