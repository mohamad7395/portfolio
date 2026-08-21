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


OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
MODEL = 'meta-llama/llama-3.3-70b-instruct'
client = OpenAI(base_url='https://openrouter.ai/api/v1', api_key=OPENROUTER_API_KEY) if OPENROUTER_API_KEY else None

SYSTEM_PROMPT = """You extract flight disruption facts from a passenger's message.

CRITICAL: only include a field in your tool call if the message explicitly
states it. Do not include a field with a placeholder value like "none",
"unknown", or "not mentioned" — omit the field entirely instead.

claim_type must be one of: delay, cancellation, denied_boarding, downgrading,
connection, package, other. Use "other" if it doesn't clearly fit. If the
message doesn't mention the type of disruption at all, omit this field
rather than guessing "other".

origin/destination must be real 3-letter IATA AIRPORT codes. Convert city
names to their main international airport code, even if the city has
multiple airports — always pick the largest/most common one:
  Paris -> CDG, London -> LHR, Tokyo -> NRT, New York -> JFK, Milan -> MXP,
  Berlin -> BER, Cologne -> CGN, Frankfurt -> FRA, Amsterdam -> AMS,
  Munich -> MUC, Madrid -> MAD, Barcelona -> BCN, Vienna -> VIE.
If you are not confident which airport the user means at all, make your
best guess with the primary/largest airport for that city rather than
leaving the field blank — the user will get a chance to correct it.
If a city has no major commercial airport (e.g. Bonn) and the user hasn't
clarified, leave the field out.

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
    parsed = json.loads(args)

    if "parameters" in parsed and isinstance(parsed["parameters"], dict):
        parsed = parsed["parameters"]

    return parsed


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
    missing_field_names = state.get("missing_field_names")
    user_msg = state["raw_input"]
    print(f"[extract_facts] missing_field_names from state: {state.get('missing_field_names')}")

    if missing_field_names:
        user_msg = (
            f"You specifically asked the user for these fields: {', '.join(missing_field_names)}.\n"
            f"The user's reply is: \"{user_msg}\"\n"
            f"Map their reply to the specific field(s) you asked about. If their reply "
            f"only makes sense as an answer to ONE of the fields you asked for, only fill in that one."
        )

    new_data = _call_llm(existing, user_msg)

    merged = existing.model_dump()
    is_correction = state.get("facts_confirmed") is False

    for k, v in new_data.items():
        if v is None:
            continue
        if merged.get(k) is None or is_correction:
            merged[k] = v

    facts = ClaimFacts.model_validate(merged)

    return {"facts": facts, "missing_fields": _missing_fields(facts), "facts_confirmed": None}


if __name__ == "__main__":
    result = extract_facts_node({
        "raw_input":"My flight was cancelled, they told me two days before, no alternative was offered." ,
        "facts": None,
    })
    # print(result["facts"].model_dump_json(exclude_none=True, indent=2))
    # print("missing:", result["missing_fields"])