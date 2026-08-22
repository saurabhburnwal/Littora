"""
Pollution score & severity calculation.

Kept in one place (here, inside the AI service) so Node never has to
duplicate or guess at this logic — it just stores and forwards whatever
this returns. Tune WEIGHTS and the severity thresholds based on real
beach survey data once literature review settles on a reference scale.
"""

from typing import Mapping

# Relative pollution-risk weights per detected item. Bags pose the highest
# entanglement risk; wrappers are persistent and difficult to collect.
WEIGHTS: dict[str, float] = {
    "bottle": 2.0,
    "can": 2.0,
    "bag": 5.0,
    "wrapper": 3.0,
}

# Items outside the model's known classes receive a conservative base weight.
UNKNOWN_ITEM_WEIGHT = 1.0

# (max_score_inclusive, label) — checked in order
SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (10.0, "Low"),
    (30.0, "Moderate"),
    (60.0, "High"),
    (float("inf"), "Severe"),
]


def compute_score(detections: Mapping[str, int] | None = None) -> tuple[int, int, str]:
    """
    Computes total waste count, weighted pollution score, and severity level.

    :param detections: Dict mapping waste category names to their detected counts.
    :return: Tuple of (total_waste_count, pollution_score, severity_label)
    """
    if not detections:
        return 0, 0, "Low"

    total_waste = sum(max(0, count) for count in detections.values())

    raw_score = sum(
        WEIGHTS.get(waste_type.lower().strip(), UNKNOWN_ITEM_WEIGHT) * max(0, count)
        for waste_type, count in detections.items()
    )
    pollution_score = round(raw_score)

    severity = next(
        (label for max_score, label in SEVERITY_THRESHOLDS if pollution_score <= max_score),
        "Severe",
    )

    return total_waste, pollution_score, severity
