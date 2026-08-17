"""
The graph.

extract_facts -> route -> rule_gate -> route -> judge_extraordinary -> route -> respond

judge_extraordinary is the one real agent here: it decides its own search
queries, can search multiple times, and only stops when it chooses to give
a verdict (bounded at 3 steps). Everything else is deterministic workflow
logic around it.

When facts are missing, ask_clarification interrupts the graph run and
waits for a human answer, then loops back into extract_facts. This is
capped at 3 attempts so a stuck extraction can't loop forever.
"""

from typing import TypedDict, Optional

from langgraph.graph import StateGraph, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver

from agent.state import ClaimFacts, GateResult
from agent.extract import extract_facts_node
from agent.rule_gate import gate
from agent.calculate import amount_for
from agent.judge import judge_extraordinary_node
from agent.draft import draft_letter_node


class ClaimState(TypedDict):
    raw_input: str
    facts: Optional[ClaimFacts]
    missing_fields: list[str]
    gate_result: Optional[GateResult]
    retrieved: list[dict]
    extraordinary: Optional[bool]
    extraordinary_reason: Optional[str]
    response: Optional[str]
    clarification_attempts: int
    letter: Optional[str]
    amount: Optional[int]
    final_letter: Optional[str]
    last_question: Optional[str]
    facts_confirmed: Optional[bool]



from openai import OpenAI
import os
client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)
MODEL = "openai/gpt-oss-120b"



from langgraph.config import get_stream_writer
from agent.calculate import great_circle_km, intra_eu, band_for, amount_for

def rule_gate_node(state: ClaimState) -> dict:
    writer = get_stream_writer()
    result = gate(state["facts"])
    update = {"gate_result": result}

    if not result.blocked:
        facts = state["facts"]
        try:
            distance = great_circle_km(facts.origin, facts.destination)
            is_eu = intra_eu(facts.origin, facts.destination)
            band = band_for(distance, is_eu)
            writer({"type": "gate_thinking", "detail": f"distance {facts.origin}-{facts.destination}: {distance:.0f} km, intra-EU261: {is_eu}"})
            writer({"type": "gate_thinking", "detail": f"Article 7 band: EUR {band}"})
            amount = amount_for(facts.origin, facts.destination, facts.reroute_arrive_late_hours)
            update["amount"] = amount
        except KeyError:
            writer({"type": "gate_thinking", "detail": "couldn't resolve one of the airport codes"})
            update["gate_result"] = GateResult(
                blocked=True,
                reason="Could not identify one of the airports from your description. Please provide the specific airport (e.g. Tokyo Narita/NRT, not just 'Tokyo')."
            )

    return update

def ask_clarification_node(state: ClaimState) -> dict:
    field_prompts = {
        "origin": "departure airport (3-letter code, e.g. CGN, or the airport name)",
        "destination": "arrival airport (3-letter code, e.g. LHR, or the airport name)",
        "notice_days": "how many days before departure were you told",
        "stated_cause": "what reason did the airline give",
        "claim_type": "was it a delay or a cancellation",
    }
    asks = [field_prompts.get(f, f) for f in state["missing_fields"]]
    question = "I still need: " + "; ".join(asks) + ". Can you provide that?"

    writer = get_stream_writer()
    writer({"type": "clarification_asked", "detail": question})

    answer = interrupt(question)
    return {
        "raw_input": answer,
        "last_question": question,
        "clarification_attempts": state.get("clarification_attempts", 0) + 1,
    }

def confirm_facts_node(state: ClaimState) -> dict:
    facts = state["facts"]
    summary = (
        f"Please confirm: {facts.claim_type} from {facts.origin} to {facts.destination}, "
        f"{f'{facts.notice_days} days notice' if facts.notice_days is not None else ''}"
        f"{f', delay of {facts.delay_hours}h' if facts.delay_hours is not None else ''}, "
        f"cause: {facts.stated_cause or 'not specified'}. "
        f"Is this correct? Reply 'yes' or tell me what to fix."
    )
    answer = interrupt(summary)

    if answer.strip().lower() in ("yes", "y", "correct", "confirmed"):
        return {"facts_confirmed": True}
    else:
        return {"facts_confirmed": False, "raw_input": answer}

    
def respond_node(state: ClaimState) -> dict:
    if state["missing_fields"]:
        return {"response": f"Still need: {', '.join(state['missing_fields'])}"}

    facts = state["facts"]
    gate_result = state["gate_result"]

    if gate_result and gate_result.blocked:
        outcome = f"NOT ELIGIBLE. Reason: {gate_result.reason}"
    elif state["extraordinary"]:
        outcome = f"NOT ELIGIBLE. Extraordinary circumstances: {state['extraordinary_reason']}"
    else:
        outcome = f"ELIGIBLE for EUR {state['amount']}. Flight {facts.origin}->{facts.destination}, {facts.claim_type}, not extraordinary circumstances."

    resp = client.chat.completions.create(
        model=MODEL, temperature=0,
        messages=[{"role": "user", "content":
                   f"Write a very short summary (max 2 sentences) explaining this EU261 claim outcome to the passenger in plain language.\n\n{outcome}"}],
    )
    summary = resp.choices[0].message.content.strip()

    return {
        "response": summary,
        "final_letter": state.get("letter"),
    }


def route(state: ClaimState) -> str:
    writer = get_stream_writer()

    if state["missing_fields"]:
        if state.get("clarification_attempts", 0) >= 3:
            decision = "respond"
        else:
            decision = "ask_clarification"
    elif not state.get("facts_confirmed"):
        decision = "extract_facts" if state.get("facts_confirmed") is False else "confirm_facts"
    elif state["gate_result"] is None:
        decision = "rule_gate"
    elif not state["gate_result"].blocked and state["extraordinary"] is None:
        decision = "judge_extraordinary"
    elif not state["gate_result"].blocked and not state["extraordinary"] and state.get("letter") is None:
        decision = "draft_letter"
    else:
        decision = "respond"

    writer({"type": "route_decision", "detail": f"router -> {decision}"})
    print(f"[router] missing={state['missing_fields']} gate={state['gate_result']} "
          f"extraordinary={state['extraordinary']} confirmed={state.get('facts_confirmed')} -> {decision}")
    return decision


def build_graph():
    g = StateGraph(ClaimState)

    g.add_node("extract_facts", extract_facts_node)
    g.add_node("confirm_facts", confirm_facts_node)   # <- this line, make sure it's here
    g.add_node("rule_gate", rule_gate_node)
    g.add_node("judge_extraordinary", judge_extraordinary_node)
    g.add_node("ask_clarification", ask_clarification_node)
    g.add_node("draft_letter", draft_letter_node)
    g.add_node("respond", respond_node)

    g.set_entry_point("extract_facts")

    for node in ("extract_facts", "confirm_facts", "rule_gate", "judge_extraordinary", "draft_letter"):
        g.add_conditional_edges(node, route, {
            "rule_gate": "rule_gate",
            "confirm_facts": "confirm_facts",
            "judge_extraordinary": "judge_extraordinary",
            "ask_clarification": "ask_clarification",
            "draft_letter": "draft_letter",
            "respond": "respond",
            "extract_facts": "extract_facts",
        })

    g.add_edge("ask_clarification", "extract_facts")
    g.add_edge("respond", END)

    return g.compile(checkpointer=MemorySaver())


if __name__ == "__main__":
    app = build_graph()
    config = {"configurable": {"thread_id": "test-1"}}

    result = app.invoke({
        "raw_input": "My flight was cancelled.",
        "facts": None,
        "missing_fields": [],
        "gate_result": None,
        "retrieved": [],
        "extraordinary": None,
        "extraordinary_reason": None,
        "response": None,
        "clarification_attempts": 0,
        "facts_confirmed": None,
    }, config=config)

    while "__interrupt__" in result:
        question = result["__interrupt__"][0].value
        answer = input(f"\n[agent] {question}\n> ")
        result = app.invoke(Command(resume=answer), config=config)

    # print(f"\n{result['response']}")
