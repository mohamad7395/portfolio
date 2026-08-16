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


def rule_gate_node(state: ClaimState) -> dict:
    result = gate(state["facts"])
    update = {"gate_result": result}
    if not result.blocked:
        facts = state["facts"]
        update["amount"] = amount_for(facts.origin, facts.destination)
    return update


def ask_clarification_node(state: ClaimState) -> dict:
    question = f"Still need: {', '.join(state['missing_fields'])}. Can you provide that?"
    answer = interrupt(question)
    return {
        "raw_input": answer,
        "clarification_attempts": state.get("clarification_attempts", 0) + 1,
    }


def respond_node(state: ClaimState) -> dict:
    if state["missing_fields"]:
        return {"response": f"Still need: {', '.join(state['missing_fields'])}"}

    gate_result = state["gate_result"]

    if gate_result and gate_result.blocked:
        text = f"Not eligible: {gate_result.reason}"
    elif state["extraordinary"]:
        text = f"Not eligible: extraordinary circumstances. {state['extraordinary_reason']}"
    elif state.get("letter"):
        text = state["letter"]
    else:
        text = f"Eligible for EUR {state['amount']}."

    return {"response": text}


def route(state: ClaimState) -> str:
    if state["missing_fields"]:
        if state.get("clarification_attempts", 0) >= 3:
            decision = "respond"
        else:
            decision = "ask_clarification"
    elif state["gate_result"] is None:
        decision = "rule_gate"
    elif not state["gate_result"].blocked and state["extraordinary"] is None:
        decision = "judge_extraordinary"
    elif not state["gate_result"].blocked and not state["extraordinary"] and state.get("letter") is None:
        decision = "draft_letter"
    else:
        decision = "respond"

    print(f"[router] missing={state['missing_fields']} gate={state['gate_result']} "
          f"extraordinary={state['extraordinary']} -> {decision}")
    return decision


def build_graph():
    g = StateGraph(ClaimState)

    g.add_node("extract_facts", extract_facts_node)
    g.add_node("rule_gate", rule_gate_node)
    g.add_node("judge_extraordinary", judge_extraordinary_node)
    g.add_node("ask_clarification", ask_clarification_node)
    g.add_node("draft_letter", draft_letter_node)
    g.add_node("respond", respond_node)

    g.set_entry_point("extract_facts")

    for node in ("extract_facts", "rule_gate", "judge_extraordinary", "draft_letter"):
        g.add_conditional_edges(node, route, {
            "rule_gate": "rule_gate",
            "judge_extraordinary": "judge_extraordinary",
            "ask_clarification": "ask_clarification",
            "draft_letter": "draft_letter",
            "respond": "respond",
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
    }, config=config)

    while "__interrupt__" in result:
        question = result["__interrupt__"][0].value
        answer = input(f"\n[agent] {question}\n> ")
        result = app.invoke(Command(resume=answer), config=config)

    print(f"\n{result['response']}")
