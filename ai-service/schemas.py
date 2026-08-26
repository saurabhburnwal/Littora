"""
Pydantic Request and Response schemas for Littora AI Microservice.
Provides type validation and structured contracts for Computer Vision inference,
Ollama LLM Report Generation, Cleanup Recommendations, and Health Monitoring.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, model_validator


# =====================================================================
# 1. Computer Vision & Model Catalog Schemas
# =====================================================================

class ModelInfo(BaseModel):
    id: str
    name: str
    tag: str
    architecture: str
    params: str
    path: str
    description: str
    badge: str
    available: bool


class ModelListResponse(BaseModel):
    models: List[ModelInfo]


class BoundingBox(BaseModel):
    class_name: str
    confidence: float
    box: List[float] = Field(..., description="Bounding box pixel coordinates [x1, y1, x2, y2]")
    box_normalized: List[float] = Field(..., description="Normalized bounding box coordinates [x1, y1, x2, y2] (0..1)")


class DetectionResponse(BaseModel):
    detections: Dict[str, int]
    total_waste: int
    pollution_score: int
    severity: str
    boxes: List[BoundingBox]
    model_used: str
    model_name: str


class HealthResponse(BaseModel):
    status: str = "ok"
    device: str
    loaded_models: List[str]
    ollama_status: str = Field("unreachable", description="Ollama daemon status: 'connected', 'unreachable', or 'disabled'")
    ollama_model: str = Field("ministral-3:3b", description="Configured Ollama model tag")
    ollama_url: str = Field("http://localhost:11434", description="Configured Ollama base URL")


# =====================================================================
# 2. Report Generation Schemas (POST /report/generate)
# =====================================================================

class DateRange(BaseModel):
    start: Optional[str] = Field(None, description="Start date (ISO-8601 string or YYYY-MM-DD)")
    end: Optional[str] = Field(None, description="End date (ISO-8601 string or YYYY-MM-DD)")
    start_date: Optional[str] = Field(None, description="Alias for start date")
    end_date: Optional[str] = Field(None, description="Alias for end date")

    @model_validator(mode="before")
    @classmethod
    def normalize_dates(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        if "start_date" in values and "start" not in values:
            values["start"] = values["start_date"]
        elif "start" in values and "start_date" not in values:
            values["start_date"] = values["start"]
        if "end_date" in values and "end" not in values:
            values["end"] = values["end_date"]
        elif "end" in values and "end_date" not in values:
            values["end_date"] = values["end"]
        return values


class ReportTelemetry(BaseModel):
    total_scans: int = Field(0, description="Total number of scans conducted in this period")
    total_analyses: Optional[int] = Field(None, description="Alias for total_scans")
    total_waste_items: int = Field(0, description="Total number of waste items detected")
    total_waste: Optional[int] = Field(None, description="Alias for total_waste_items")
    avg_pollution_score: float = Field(0.0, description="Average pollution score across scans")
    avg_score: Optional[float] = Field(None, description="Alias for avg_pollution_score")
    severity_breakdown: Dict[str, int] = Field(
        default_factory=lambda: {"Low": 0, "Moderate": 0, "High": 0, "Severe": 0},
        description="Distribution of scans by severity level"
    )
    severity_counts: Optional[Dict[str, int]] = Field(None, description="Alias for severity_breakdown")
    top_categories: Optional[Union[Dict[str, int], List[Dict[str, Any]], List[str]]] = Field(
        default_factory=dict,
        description="Top waste categories detected (dict, list of objects, or list of strings)"
    )
    top_waste_types: Optional[Dict[str, int]] = Field(None, description="Alias for top_categories")
    monitored_locations_count: int = Field(0, description="Number of distinct beach locations monitored")
    model_accuracy: str = Field("91.3%", description="Computer vision benchmark accuracy")
    recent_trends: Optional[List[Dict[str, Any]]] = Field(None, description="Chronological telemetry data")

    @model_validator(mode="before")
    @classmethod
    def normalize_telemetry(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        # total_scans / total_analyses
        if "total_analyses" in values and values.get("total_analyses") is not None:
            values["total_scans"] = values["total_analyses"]
        elif "total_scans" in values and values.get("total_scans") is not None:
            values["total_analyses"] = values["total_scans"]

        # total_waste_items / total_waste
        if "total_waste" in values and values.get("total_waste") is not None:
            values["total_waste_items"] = values["total_waste"]
        elif "total_waste_items" in values and values.get("total_waste_items") is not None:
            values["total_waste"] = values["total_waste_items"]

        # avg_pollution_score / avg_score
        if "avg_score" in values and values.get("avg_score") is not None:
            values["avg_pollution_score"] = float(values["avg_score"])
        elif "avg_pollution_score" in values and values.get("avg_pollution_score") is not None:
            values["avg_score"] = float(values["avg_pollution_score"])

        # severity_breakdown / severity_counts
        if "severity_counts" in values and values.get("severity_counts") is not None:
            values["severity_breakdown"] = values["severity_counts"]
        elif "severity_breakdown" in values and values.get("severity_breakdown") is not None:
            values["severity_counts"] = values["severity_breakdown"]

        # top_categories / top_waste_types
        if "top_waste_types" in values and values.get("top_waste_types") is not None:
            values["top_categories"] = values["top_waste_types"]
        elif "top_categories" in values and values.get("top_categories") is not None:
            values["top_waste_types"] = values["top_categories"]

        return values

    def get_total_scans(self) -> int:
        return self.total_scans or self.total_analyses or 0

    def get_total_waste(self) -> int:
        return self.total_waste_items or self.total_waste or 0

    def get_avg_score(self) -> float:
        return self.avg_pollution_score or self.avg_score or 0.0

    def get_severity_breakdown(self) -> Dict[str, int]:
        base = {"Low": 0, "Moderate": 0, "High": 0, "Severe": 0}
        counts = self.severity_breakdown or self.severity_counts or {}
        for k, v in counts.items():
            k_title = str(k).strip().capitalize()
            if k_title in base:
                base[k_title] = int(v)
            else:
                base[k] = int(v)
        return base

    def get_top_categories_dict(self) -> Dict[str, int]:
        cats = self.top_categories or self.top_waste_types or {}
        if isinstance(cats, dict):
            return {str(k): int(v) for k, v in cats.items()}
        if isinstance(cats, list):
            result = {}
            for item in cats:
                if isinstance(item, dict):
                    name = item.get("category") or item.get("type") or item.get("name") or "debris"
                    count = item.get("count") or item.get("value") or 1
                    result[str(name)] = int(count)
                elif isinstance(item, str):
                    result[item] = result.get(item, 0) + 1
            return result
        return {}


class ReportRequest(BaseModel):
    period: Literal["daily", "weekly", "monthly", "custom"] = Field("monthly", description="Report temporal scope")
    date_range: Optional[DateRange] = None
    location_filter: Optional[str] = Field(None, description="Optional location filter (e.g. beach name or 'All Locations')")
    telemetry: ReportTelemetry = Field(default_factory=ReportTelemetry)
    user_email: Optional[str] = Field(None, description="Optional email address of the requesting user")


ReportGenerateRequest = ReportRequest


class ImpactAnalysisDetails(BaseModel):
    threat_level: str = Field(..., description="Overall coastal ecological threat level (Low, Moderate, High, Severe)")
    primary_contaminant: str = Field(..., description="Main type of debris driving pollution")
    ecosystem_risk: str = Field(..., description="Specific marine life or habitat risk narrative")
    recommended_patrol_frequency: str = Field(..., description="Suggested monitoring frequency")


class PriorityActionItem(BaseModel):
    action: str = Field(..., description="Actionable intervention item")
    urgency: Literal["Immediate", "High", "Moderate", "Routine"] = Field(..., description="Urgency rating")
    target: str = Field(..., description="Target area or waste category")


class ReportResponse(BaseModel):
    period: str = Field(..., description="Report temporal scope (daily, weekly, monthly, custom)")
    executive_summary: str = Field(..., description="Comprehensive synthesized environmental narrative")
    risk_assessment: str = Field(..., description="Ecological risk breakdown and hotspot analysis")
    actionable_takeaways: List[str] = Field(..., description="Key bullet points for authorities and volunteers")
    impact_analysis: Union[str, ImpactAnalysisDetails, Dict[str, Any]] = Field(..., description="Environmental impact analysis")
    priority_actions: Union[List[str], List[PriorityActionItem], List[Dict[str, Any]]] = Field(..., description="Prioritized interventions")
    source: Literal["ollama_ministral-3:3b", "rule_based_fallback"] = Field(..., description="Generation engine source")
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="ISO timestamp")
    report_id: Optional[str] = Field(None, description="Unique report identifier")
    period_label: Optional[str] = Field(None, description="Human-readable title")
    raw_text: Optional[str] = Field(None, description="Formatted ASCII report for plain text/email export")


ReportGenerateResponse = ReportResponse


# =====================================================================
# 3. Cleanup Recommendations Schemas (POST /cleanup/recommendations)
# =====================================================================

class LocationTelemetry(BaseModel):
    location: Optional[str] = Field(None, description="Beach or coastal landmark name")
    beach: Optional[str] = Field(None, description="Alias for location")
    location_id: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    location_label: Optional[str] = None
    scans: Optional[int] = Field(None, description="Number of scans recorded for this location")
    scan_count: Optional[int] = Field(None, description="Alias for scans")
    total_waste: Optional[int] = Field(None, description="Total waste items cataloged at this beach")
    pollution_score: Optional[float] = Field(None, description="Average or aggregate pollution score")
    score: Optional[float] = Field(None, description="Alias for pollution_score")
    severity: Optional[str] = Field("Low", description="Severity classification (Low, Moderate, High, Severe)")
    top_waste: Optional[str] = Field(None, description="Primary detected waste type")
    categories: Optional[Dict[str, int]] = Field(default_factory=dict, description="Waste type distribution")
    detections: Optional[Dict[str, int]] = Field(None, description="Alias for categories")

    @model_validator(mode="before")
    @classmethod
    def normalize_location_fields(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        # location / beach
        if "beach" in values and values.get("beach") is not None and "location" not in values:
            values["location"] = values["beach"]
        elif "location" in values and values.get("location") is not None and "beach" not in values:
            values["beach"] = values["location"]

        # scans / scan_count
        if "scan_count" in values and values.get("scan_count") is not None:
            values["scans"] = values["scan_count"]
        elif "scans" in values and values.get("scans") is not None:
            values["scan_count"] = values["scans"]

        # pollution_score / score
        if "score" in values and values.get("score") is not None:
            values["pollution_score"] = float(values["score"])
        elif "pollution_score" in values and values.get("pollution_score") is not None:
            values["score"] = float(values["pollution_score"])

        # categories / detections
        if "detections" in values and values.get("detections") is not None:
            values["categories"] = values["detections"]
        elif "categories" in values and values.get("categories") is not None:
            values["detections"] = values["categories"]

        return values

    def get_name(self) -> str:
        return self.location or self.beach or self.location_label or "Coastal Site"

    def get_scans(self) -> int:
        return self.scans or self.scan_count or 1

    def get_total_waste(self) -> int:
        if self.total_waste is not None:
            return self.total_waste
        if self.categories:
            return sum(self.categories.values())
        return int(self.get_score())

    def get_score(self) -> float:
        return self.pollution_score or self.score or 0.0

    def get_categories(self) -> Dict[str, int]:
        return self.categories or self.detections or {}


class CleanupRequest(BaseModel):
    locations: List[LocationTelemetry] = Field(default_factory=list, description="List of coastal locations")
    max_recommendations: Optional[int] = Field(10, description="Maximum number of recommendations to return")


CleanupRecommendationsRequest = CleanupRequest


class VolunteerEstimate(BaseModel):
    volunteers: str = Field(..., description="Recommended volunteer crew size (e.g. '25-40')")
    time: str = Field(..., description="Estimated duration (e.g. '4 hours')")
    equipment: List[str] = Field(default_factory=list, description="Required tools and safety gear")


class CleanupRecommendationItem(BaseModel):
    location: str = Field(..., description="Full location or beach name")
    beach: Optional[str] = Field(None, description="Beach name")
    priority: Literal["high", "medium", "low"] = Field("medium", description="Priority tier (high, medium, low)")
    priority_tier: str = Field("Tier 2 - Moderate", description="Display priority tier (e.g. 'Tier 1 - Critical')")
    urgency: str = Field("Moderate", description="Urgency level (Immediate, High, Moderate, Routine)")
    severity: str = Field("Moderate", description="Severity classification (Severe, High, Moderate, Low)")
    action: Optional[str] = Field(None, description="Actionable intervention statement")
    reason: Optional[str] = Field(None, description="Data-driven rationale citing telemetry")
    rationale: str = Field(..., description="Data-driven justification citing telemetry")
    estimated_volunteers: Union[int, str] = Field(15, description="Recommended volunteer crew count")
    estimated_duration_hours: Union[int, float, str] = Field(3, description="Estimated duration in hours")
    estimate: Optional[VolunteerEstimate] = Field(None, description="Structured resource estimate")
    equipment: List[str] = Field(default_factory=list, description="List of required equipment and safety gear")
    targeted_zones: List[str] = Field(default_factory=list, description="Specific coastal zones to clean")
    target_zones: Optional[List[str]] = Field(None, description="Alias for targeted_zones")
    suggested_schedule: str = Field("Within 7 days", description="Suggested intervention timeframe")
    waste_breakdown: Optional[Dict[str, int]] = Field(None, description="Waste type distribution for context")

    @model_validator(mode="before")
    @classmethod
    def normalize_recommendation_item(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        if "location" not in values or not values.get("location"):
            values["location"] = values.get("beach") or "Coastal Site"
        if "beach" not in values or not values.get("beach"):
            values["beach"] = values.get("location")

        if "rationale" not in values or not values.get("rationale"):
            values["rationale"] = values.get("reason") or "Routine maintenance recommended."
        if "reason" not in values or not values.get("reason"):
            values["reason"] = values.get("rationale")

        if "targeted_zones" not in values or values.get("targeted_zones") is None:
            values["targeted_zones"] = values.get("target_zones") or ["High-tide waterline", "Dune perimeter"]
        if "target_zones" not in values or values.get("target_zones") is None:
            values["target_zones"] = values.get("targeted_zones")

        return values


CleanupPlanItem = CleanupRecommendationItem


class CleanupScheduleItem(BaseModel):
    beach: str = Field(..., description="Beach name")
    suggested_date: str = Field(..., description="Scheduled date and time string")
    priority: str = Field(..., description="Priority level")
    team_type: str = Field("Community Volunteer Drive", description="Designated team type")


class CleanupResponse(BaseModel):
    recommendations: List[CleanupRecommendationItem] = Field(default_factory=list, description="Prioritized intervention plans")
    source: Literal["ollama_ministral-3:3b", "rule_based_fallback"] = Field(..., description="Generation engine source")
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="ISO timestamp")
    total_hotspots: Optional[int] = Field(None, description="Number of hotspots evaluated")
    high_priority_count: Optional[int] = Field(None, description="Number of high-priority intervention sites")
    suggested_schedule: Optional[List[CleanupScheduleItem]] = Field(None, description="Intervention timeline")


CleanupRecommendationsResponse = CleanupResponse
