"""
Drafts the claim letter once we know the claim is eligible.
Uses the facts, the amount, and article citations to write it.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
MODEL = 'meta-llama/llama-3.3-70b-instruct'
client = OpenAI(base_url='https://openrouter.ai/api/v1', api_key=OPENROUTER_API_KEY) if OPENROUTER_API_KEY else None


def draft_letter_node(state: dict) -> dict:
    writer = get_stream_writer()
    facts = state["facts"]
    amount = state["amount"]
    extraordinary_reason = state.get("extraordinary_reason")

    writer({"type": "draft_thinking", "detail": "drafting your claim letter..."})
    print(f"[draft] writing letter — {facts.claim_type}, EUR {amount}, {facts.origin}->{facts.destination}")

    prompt = f"""Write a short, formal compensation claim email to an airline. no fileds for name, address,

Facts:
- Flight: {facts.origin} to {facts.destination}
- Type of disruption: {facts.claim_type}
- Notice given: {facts.notice_days} days (if cancellation)
- Delay: {facts.delay_hours} hours (if delay)
- Stated cause: {facts.stated_cause or "not specified"}
- Compensation owed: EUR {amount}

The airline may attempt to claim "extraordinary circumstances" (Article 5(3))
to avoid paying. Preemptively address this: {extraordinary_reason or "the cause does not qualify as extraordinary circumstances under the regulation"}.
Include this as a specific point in the letter, showing you've already
anticipated and rebutted that defense — this makes the letter harder to
dispute.

Cite Regulation (EC) 261/2004, Article 5 (cancellation) or Article 6 (delay),
and Article 7 (compensation amount) as relevant. Keep it under 220 words,
polite but firm, and ask for payment within 14 days.
 """

    resp = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    letter = resp.choices[0].message.content
    print(f"[draft] letter written ({len(letter)} chars)")
    return {"letter": letter}