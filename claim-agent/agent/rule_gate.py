from agent.state import ClaimFacts, GateResult

DELAY_THRESHOLD_HOURS = 3.0  # Sturgeon case law, not Art 6 — compensation trigger
IN_SCOPE = {"delay", "cancellation"}


def gate(facts: ClaimFacts) -> GateResult:
    """Block claims that cannot succeed. Only ever says no, never yes."""

    if facts.claim_type is not None and facts.claim_type not in IN_SCOPE:
        return GateResult(
            blocked=True,
            reason=f"'{facts.claim_type}' is out of scope for this tool. "
                   f"Only delays and cancellations on a single leg are handled.",
        )

    if facts.claim_type == "delay":
        if facts.delay_hours is not None and facts.delay_hours < DELAY_THRESHOLD_HOURS:
            return GateResult(
                blocked=True,
                reason=f"Arrival delay of {facts.delay_hours}h is below the 3 hour threshold "
                       f"for compensation.",
            )

    if facts.claim_type == "cancellation" and facts.notice_days is not None:
        n = facts.notice_days
        dep_early = facts.reroute_depart_early_hours
        arr_late = facts.reroute_arrive_late_hours

        if n >= 14:
            return GateResult(blocked=True, reason="Art 5(1)(c)(i): 14+ days notice, no compensation.")

        if 7 <= n < 14:
            if dep_early is not None and arr_late is not None and dep_early <= 2 and arr_late < 4:
                return GateResult(blocked=True, reason="Art 5(1)(c)(ii): 7-13 days notice, qualifying reroute offered.")

        if n < 7:
            if dep_early is not None and arr_late is not None and dep_early <= 1 and arr_late < 2:
                return GateResult(blocked=True, reason="Art 5(1)(c)(iii): <7 days notice, qualifying reroute offered.")

    return GateResult(blocked=False)


if __name__ == "__main__":
    cases = [
        # delay threshold (Sturgeon 3h)
        ("N01 short delay", ClaimFacts(claim_type="delay", delay_hours=1.5)),
        ("N02 2h50 delay", ClaimFacts(claim_type="delay", delay_hours=2.83)),
        ("E02 5h delay", ClaimFacts(claim_type="delay", delay_hours=5.0)),
        ("unknown delay hours", ClaimFacts(claim_type="delay")),

        # cancellation - 14+ days
        ("N03 21 days notice", ClaimFacts(claim_type="cancellation", notice_days=21)),
        ("N03b exactly 14 days", ClaimFacts(claim_type="cancellation", notice_days=14)),

        # cancellation - 7-13 days
        ("N04 10 days, qualifying reroute",
         ClaimFacts(claim_type="cancellation", notice_days=10,
                    reroute_depart_early_hours=1.0, reroute_arrive_late_hours=3.0)),
        ("E03 10 days, no reroute info",
         ClaimFacts(claim_type="cancellation", notice_days=10)),
        ("E04 10 days, non-qualifying reroute (arrives too late)",
         ClaimFacts(claim_type="cancellation", notice_days=10,
                    reroute_depart_early_hours=1.0, reroute_arrive_late_hours=5.0)),

        # cancellation - <7 days
        ("N05 5 days, qualifying reroute",
         ClaimFacts(claim_type="cancellation", notice_days=5,
                    reroute_depart_early_hours=0.5, reroute_arrive_late_hours=1.5)),
        ("E05 5 days, no reroute info",
         ClaimFacts(claim_type="cancellation", notice_days=5)),
        ("E06 5 days, non-qualifying reroute (departs too early)",
         ClaimFacts(claim_type="cancellation", notice_days=5,
                    reroute_depart_early_hours=2.0, reroute_arrive_late_hours=1.0)),

        # same-day cancellation, worst case
        ("E01 same day, no reroute", ClaimFacts(claim_type="cancellation", notice_days=0)),

        # out of scope
        ("S01 denied boarding", ClaimFacts(claim_type="denied_boarding")),
        ("S02 package travel", ClaimFacts(claim_type="package")),
    ]
    for name, f in cases:
        r = gate(f)
        print(f"{'BLOCKED' if r.blocked else 'passed ':<8} {name:<45} {r.reason or ''}")