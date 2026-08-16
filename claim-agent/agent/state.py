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