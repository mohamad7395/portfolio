from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field

ClaimType = Literal[
    "delay", "cancellation", "denied_boarding",
    "downgrading", "connection", "package", "other"
]
Verdict = Literal["eligible", "not_eligible", "need_info", "refuse"]


class ClaimFacts(BaseModel):
    claim_type: Optional[ClaimType] = None

    origin: Optional[str] = None
    destination: Optional[str] = None
    flight_date: Optional[date] = None
    carrier_is_eu: Optional[bool] = None

    delay_hours: Optional[float] = None

    notice_days: Optional[int] = None
    rerouted: Optional[bool] = None
    reroute_arrive_late_hours: Optional[float] = None

    stated_cause: Optional[str] = None
    cause_source: Optional[Literal["user", "search", "unknown"]] = None

    reroute_depart_early_hours: Optional[float] = None


class GateResult(BaseModel):
    blocked: bool
    reason: Optional[str] = None


def default_claim_state(raw_input: str) -> dict:
    """The full, fresh state for a brand-new conversation — single source of
    truth so no caller can start a claim with a missing or stale key."""
    return {
        "raw_input": raw_input,
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
        "final_letter": None,
        "facts_confirmed": None,
        "last_question": None,
        "missing_field_names": None,
    }