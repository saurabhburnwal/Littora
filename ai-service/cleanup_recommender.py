"""
Cleanup Recommendations Engine for Littora AI Microservice.
Synthesizes prioritized, contextual coastal cleanup intervention plans using Ollama LLM
(`ministral-3:3b`) with automatic deterministic rule-based statistical fallback.
"""

from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional

import ollama_client
from schemas import (
    CleanupRecommendationItem,
    CleanupRequest,
    CleanupResponse,
    CleanupScheduleItem,
    LocationTelemetry,
    VolunteerEstimate,
)

logger = logging.getLogger("ai_service.cleanup")

SYSTEM_PROMPT = (
    "You are an expert coastal environmental operations manager and marine conservation coordinator "
    "for the Littora Coastal Cleanup Platform. Synthesize actionable, prioritized cleanup intervention "
    "plans for coastal sites based on live waste telemetry. You must respond in valid, strict JSON matching "
    "the exact schema requested."
)

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _deduplicate_list(items: List[str]) -> List[str]:
    seen = set()
    result = []
    for item in items:
        clean = item.strip()
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            result.append(clean)
    return result


def _derive_equipment(
    priority: str,
    top_waste: str,
    categories: Dict[str, int],
) -> List[str]:
    equipment = ["Heavy-duty gloves", "Trash grabbers", "Plastic sorting bags"]
    waste_str = (top_waste + " " + " ".join(categories.keys())).lower()

    if any(k in waste_str for k in ("glass", "bottle", "sharp")):
        equipment.extend(["Cut-resistant puncture-proof gloves", "Rigid glass sorting bins"])
    if any(k in waste_str for k in ("bag", "wrapper", "film", "micro")):
        equipment.extend(["Mesh microplastic collection sieves", "Lightweight mechanical grabbers"])
    if any(k in waste_str for k in ("can", "metal", "tin", "aluminum")):
        equipment.extend(["Heavy-duty canvas sacks", "Metal safety work gloves"])
    if priority == "high":
        equipment.extend(["First aid kit", "Sharps disposal container", "High-visibility safety vests"])

    return _deduplicate_list(equipment)


def _derive_target_zones(
    categories: Dict[str, int],
    scans: int,
    total_waste: int,
) -> List[str]:
    zones = ["High-tide waterline", "Dune perimeter"]
    cat_keys = " ".join(categories.keys()).lower()

    if any(k in cat_keys for k in ("glass", "bottle", "metal", "can")):
        zones.append("Rocky crevices & embankment")
    if any(k in cat_keys for k in ("bag", "wrapper", "plastic")):
        zones.append("Coastal vegetation line & windbreak fencing")
    if scans > 2 or total_waste > 15:
        zones.append("Recreational boardwalk & central access conduit")

    return _deduplicate_list(zones)


def generate_rule_based_cleanup_recommendations(request: CleanupRequest) -> CleanupResponse:
    """
    Pure-Python deterministic rule-based fallback engine for cleanup intervention recommendations.
    Evaluates each location's pollution score, severity, scan count, and debris breakdown.
    """
    locations = request.locations
    if not locations:
        return CleanupResponse(
            recommendations=[],
            source="rule_based_fallback",
            generated_at=datetime.now(timezone.utc).isoformat(),
            total_hotspots=0,
            high_priority_count=0,
            suggested_schedule=[],
        )

    recommendations: List[CleanupRecommendationItem] = []
    now = datetime.now(timezone.utc)

    for loc in locations:
        loc_name = loc.get_name()
        scans = loc.get_scans()
        total_waste = loc.get_total_waste()
        score = loc.get_score()
        categories = loc.get_categories()
        top_waste = loc.top_waste or (max(categories.items(), key=lambda x: x[1])[0] if categories else "Mixed Debris")

        # Determine normalized severity
        sev = loc.severity or "Low"
        if sev not in ("Low", "Moderate", "High", "Severe"):
            if score >= 60.0:
                sev = "Severe"
            elif score >= 31.0:
                sev = "High"
            elif score >= 11.0:
                sev = "Moderate"
            else:
                sev = "Low"

        # Determine Priority & Volunteer / Schedule Tiers
        if sev in ("Severe", "High") or score >= 31.0:
            priority = "high"
            is_critical = sev == "Severe" or score >= 60.0
            priority_tier = "Tier 1 - Critical" if is_critical else "Tier 1 - High Priority"
            urgency = "Immediate" if is_critical else "High"
            schedule_str = "Immediate (Within 48 hours)" if is_critical else "Within 72 hours"
            volunteers_count = 30 if total_waste > 25 else (20 if total_waste > 10 else 15)
            volunteers_range = "25-40" if total_waste > 20 else "15-25"
            duration_hours = 4
            duration_str = "4 hours"
            action = "Organize urgent cleanup drive within 48 hours & deploy waste bins."
            reason = (
                f"High pollution alert across {scans} scan(s) ({total_waste} items, {score:.1f} pts). "
                f"Immediate intervention required."
                if scans > 1
                else f"Critical pollution score detected ({score:.1f} pts, {total_waste} items). Immediate intervention required."
            )
        elif sev == "Moderate" or score >= 11.0:
            priority = "medium"
            priority_tier = "Tier 2 - Moderate"
            urgency = "Moderate"
            schedule_str = "Scheduled Bi-weekly Drive (Within 7-10 days)"
            volunteers_count = 12
            volunteers_range = "10-15"
            duration_hours = 3
            duration_str = "3 hours"
            action = "Schedule bi-weekly community monitoring and collection drives."
            reason = (
                f"Moderate accumulation across {scans} scan(s) ({total_waste} items, {score:.1f} pts). "
                f"Upward trend observed."
                if scans > 1
                else f"Moderate waste accumulation ({total_waste} items, {score:.1f} pts). Preventive collection recommended."
            )
        else:
            priority = "low"
            priority_tier = "Tier 3 - Routine"
            urgency = "Routine"
            schedule_str = "Routine Monthly Maintenance"
            volunteers_count = 6
            volunteers_range = "5-8"
            duration_hours = 2
            duration_str = "2 hours"
            action = "Awareness campaign for local visitors and regular beach checks."
            reason = (
                f"Aggregated across {scans} scan(s) ({total_waste} total items, {score:.1f} pts). Low accumulation rate."
                if scans > 1
                else f"Low waste accumulation ({total_waste} items, {score:.1f} pts). Preventive maintenance recommended."
            )

        equipment = _derive_equipment(priority, top_waste, categories)
        zones = _derive_target_zones(categories, scans, total_waste)

        recommendations.append(
            CleanupRecommendationItem(
                location=loc_name,
                beach=loc_name,
                priority=priority,
                priority_tier=priority_tier,
                urgency=urgency,
                severity=sev,
                action=action,
                reason=reason,
                rationale=reason,
                estimated_volunteers=volunteers_count,
                estimated_duration_hours=duration_hours,
                estimate=VolunteerEstimate(
                    volunteers=volunteers_range,
                    time=duration_str,
                    equipment=equipment,
                ),
                equipment=equipment,
                targeted_zones=zones,
                target_zones=zones,
                suggested_schedule=schedule_str,
                waste_breakdown=categories if categories else None,
            )
        )

    # Sort recommendations by priority (high -> medium -> low), then highest pollution score / total waste
    recommendations.sort(
        key=lambda r: (
            PRIORITY_ORDER.get(r.priority, 2),
            -float(r.estimated_volunteers if isinstance(r.estimated_volunteers, int) else 0),
        )
    )

    if request.max_recommendations and len(recommendations) > request.max_recommendations:
        recommendations = recommendations[: request.max_recommendations]

    # Generate timeline schedule for top sites
    schedule_items: List[CleanupScheduleItem] = []
    for idx, rec in enumerate([r for r in recommendations if r.priority in ("high", "medium")][:5]):
        offset_days = (idx + 1) * 2
        sched_date = (now + timedelta(days=offset_days)).strftime("%d %b %Y, 07:00 AM")
        schedule_items.append(
            CleanupScheduleItem(
                beach=rec.beach or rec.location,
                suggested_date=sched_date,
                priority=rec.priority.capitalize(),
                team_type="Rapid Response Team" if rec.priority == "high" else "Community Volunteer Drive",
            )
        )

    high_count = sum(1 for r in recommendations if r.priority == "high")

    return CleanupResponse(
        recommendations=recommendations,
        source="rule_based_fallback",
        generated_at=now.isoformat() + "Z",
        total_hotspots=len(recommendations),
        high_priority_count=high_count,
        suggested_schedule=schedule_items,
    )


async def generate_cleanup_recommendations(request: CleanupRequest) -> CleanupResponse:
    """
    Generates prioritized cleanup recommendations.
    First attempts Ollama LLM prompt synthesis (`ministral-3:3b`).
    If Ollama is unavailable, times out, or returns malformed JSON, activates the
    deterministic rule-based statistical fallback engine.
    """
    locations = request.locations
    if not locations:
        return CleanupResponse(
            recommendations=[],
            source="rule_based_fallback",
            generated_at=datetime.now(timezone.utc).isoformat(),
            total_hotspots=0,
            high_priority_count=0,
            suggested_schedule=[],
        )

    # Prepare prompt for Ollama
    loc_summaries = []
    for loc in locations:
        loc_summaries.append({
            "location": loc.get_name(),
            "scans": loc.get_scans(),
            "total_waste": loc.get_total_waste(),
            "pollution_score": round(loc.get_score(), 1),
            "severity": loc.severity or "Low",
            "top_waste": loc.top_waste or "Mixed",
            "categories": loc.get_categories(),
        })

    user_prompt = f"""You are a coastal cleanup planner. Return ONLY a valid JSON object (no markdown, no explanation).

Beach pollution data:
{json.dumps(loc_summaries, indent=2)}

Respond with this exact JSON structure:
{{"recommendations": [{{"location": "string", "priority_tier": "Tier 1 - Critical|Tier 2 - Moderate|Tier 3 - Routine", "urgency": "Immediate|High|Moderate|Routine", "severity": "Severe|High|Moderate|Low", "action": "string", "rationale": "string", "estimated_volunteers": 15, "estimated_duration_hours": 3, "equipment": ["string"], "targeted_zones": ["string"], "suggested_schedule": "string"}}]}}
"""

    llm_result = await ollama_client.generate(
        prompt=user_prompt,
        system_prompt=SYSTEM_PROMPT,
        json_format=True,
        temperature=0.2,
    )

    if (
        isinstance(llm_result, dict)
        and "recommendations" in llm_result
        and isinstance(llm_result["recommendations"], list)
        and len(llm_result["recommendations"]) > 0
    ):
        try:
            parsed_recs: List[CleanupRecommendationItem] = []
            for item in llm_result["recommendations"]:
                if not isinstance(item, dict):
                    continue
                loc_name = item.get("location") or item.get("beach") or "Coastal Site"
                tier = item.get("priority_tier", "Tier 2 - Moderate")
                priority = "high" if "1" in tier or "critical" in tier.lower() or "high" in tier.lower() else ("medium" if "2" in tier or "moderate" in tier.lower() else "low")
                urgency = item.get("urgency", "Moderate")
                sev = item.get("severity", "Moderate")
                action = item.get("action", "Organize community cleanup drive.")
                rationale = item.get("rationale") or item.get("reason") or "Identified coastal accumulation."
                vols = item.get("estimated_volunteers", 15)
                dur = item.get("estimated_duration_hours", 3)
                eq = item.get("equipment", ["Heavy-duty gloves", "Trash grabbers", "Plastic sorting bags"])
                if not isinstance(eq, list):
                    eq = ["Heavy-duty gloves", "Trash grabbers", "Plastic sorting bags"]
                zones = item.get("targeted_zones") or item.get("target_zones") or ["High-tide waterline", "Dune perimeter"]
                if not isinstance(zones, list):
                    zones = ["High-tide waterline", "Dune perimeter"]
                sched = item.get("suggested_schedule", "Within 7 days")

                vol_str = f"{vols-5}-{vols+5}" if isinstance(vols, int) and vols > 5 else str(vols)
                dur_str = f"{dur} hours" if isinstance(dur, (int, float)) else str(dur)

                parsed_recs.append(
                    CleanupRecommendationItem(
                        location=loc_name,
                        beach=loc_name,
                        priority=priority,
                        priority_tier=tier,
                        urgency=urgency,
                        severity=sev,
                        action=action,
                        reason=rationale,
                        rationale=rationale,
                        estimated_volunteers=vols,
                        estimated_duration_hours=dur,
                        estimate=VolunteerEstimate(volunteers=vol_str, time=dur_str, equipment=eq),
                        equipment=eq,
                        targeted_zones=zones,
                        target_zones=zones,
                        suggested_schedule=sched,
                    )
                )

            if parsed_recs:
                parsed_recs.sort(
                    key=lambda r: (
                        PRIORITY_ORDER.get(r.priority, 2),
                        -float(r.estimated_volunteers if isinstance(r.estimated_volunteers, int) else 0),
                    )
                )

                now = datetime.now(timezone.utc)
                schedule_items: List[CleanupScheduleItem] = []
                for idx, rec in enumerate([r for r in parsed_recs if r.priority in ("high", "medium")][:5]):
                    offset_days = (idx + 1) * 2
                    sched_date = (now + timedelta(days=offset_days)).strftime("%d %b %Y, 07:00 AM")
                    schedule_items.append(
                        CleanupScheduleItem(
                            beach=rec.beach or rec.location,
                            suggested_date=sched_date,
                            priority=rec.priority.capitalize(),
                            team_type="Rapid Response Team" if rec.priority == "high" else "Community Volunteer Drive",
                        )
                    )

                return CleanupResponse(
                    recommendations=parsed_recs,
                    source="ollama_ministral-3:3b",
                    generated_at=now.isoformat(),
                    total_hotspots=len(parsed_recs),
                    high_priority_count=sum(1 for r in parsed_recs if r.priority == "high"),
                    suggested_schedule=schedule_items,
                )
        except Exception as parse_err:
            logger.warning(f"Error structuring Ollama cleanup recommendations, activating fallback: {parse_err}")

    # Activate Fallback
    logger.info("Generating deterministic rule-based cleanup recommendations fallback.")
    return generate_rule_based_cleanup_recommendations(request)
