"""
Pollution score & severity calculation.

Kept in one place (here, inside the AI service) so Node never has to
duplicate or guess at this logic — it just stores and forwards whatever
this returns. Tune WEIGHTS and the severity thresholds based on real
beach survey data once Member 1's literature review settles on a
reference scale.
"""

# Relative "pollution weight" per item — bags and wrappers break down
# slower and entangle wildlife more than a single can, so they're
# weighted higher per unit. Adjust once you have a literature-backed
# reference (e.g. degradation time, marine-life hazard score).
WEIGHTS = {
    "bottle": 2.0,
    "can": 1.5,
    "bag": 3.0,
    "wrapper": 1.0,
}

# (max_score_inclusive, label) — checked in order
SEVERITY_THRESHOLDS = [
    (10, "Low"),
    (30, "Moderate"),
    (60, "High"),
    (float("inf"), "Severe"),
]


def compute_score(detections: dict[str, int]) -> tuple[int, int, str]:
    total_waste = sum(detections.values())

    raw_score = sum(
        WEIGHTS.get(waste_type, 1.0) * count
        for waste_type, count in detections.items()
    )
    pollution_score = round(raw_score)

    severity = next(
        label for max_score, label in SEVERITY_THRESHOLDS if pollution_score <= max_score
    )

    return total_waste, pollution_score, severity
