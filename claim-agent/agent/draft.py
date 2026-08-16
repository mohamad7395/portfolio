"""
Drafts the claim letter once we know the claim is eligible.
Uses the facts, the amount, and article citations to write it.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.environ["GROQ_API_KEY"], base_url="https://api.groq.com/openai/v1")
MODEL = "llama-3.3-70b-versatile"


def draft_letter_node(state: dict) -> dict:
    facts = state["facts"]
    amount = state["amount"]

    print(f"[draft] writing letter — {facts.claim_type}, EUR {amount}, {facts.origin}->{facts.destination}")

    prompt = f"""Write a short, formal compensation claim letter to an airline.

Facts:
- Flight: {facts.origin} to {facts.destination}
- Type of disruption: {facts.claim_type}
- Notice given: {facts.notice_days} days (if cancellation)
- Delay: {facts.delay_hours} hours (if delay)
- Compensation owed: EUR {amount}

Cite Regulation (EC) 261/2004, Article 5 (cancellation) or Article 6 (delay),
and Article 7 (compensation amount) as relevant. Keep it under 200 words,
polite but firm, and ask for payment within 14 days."""

    resp = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    letter = resp.choices[0].message.content
    print(f"[draft] letter written ({len(letter)} chars)")
    return {"letter": letter}