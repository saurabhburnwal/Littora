import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock, Users, Waves, ShieldAlert, Sparkles, MapPin,
  RefreshCw, Loader2, Wrench, Navigation, Calendar
} from "lucide-react";
import axios from "axios";
import { useStats } from "../context/StatsContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import Badge from "../components/ui/Badge.jsx";
import ToastNotification from "../components/ToastNotification.jsx";
import { AI_SERVICE_URL, normalizeSeverity } from "../utils/wasteUtils.js";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function synthesizeStatisticalCleanupPlans(locations = []) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return [];
  }

  const list = locations.map((loc) => {
    const totalWaste = loc.total_waste ?? loc.totalWaste ?? loc.wasteCount ?? 0;
    const score = loc.pollution_score ?? loc.pollutionScore ?? totalWaste;
    const normSev = normalizeSeverity(loc.severity || score);
    const scanCount = loc.scan_count || loc.scanCount || (loc.scans ? loc.scans.length : 1);
    const displayBeach = loc.beach || (loc.location_label || loc.locationLabel || "").split(",")[0]?.trim() || "Coastal Site";
    const displayLocation = loc.location_label || loc.locationLabel || [loc.city, loc.country].filter(Boolean).join(", ") || "Coastal Region";

    let priority = "low";
    let priority_tier = "Tier 3 - Routine";
    let urgency = "Routine";
    let action = "Deploy routine awareness monitors and inspect municipal collection bins.";
    let rationale = scanCount > 1
      ? `Low accumulation rate observed across ${scanCount} scans (${totalWaste} items). Baseline cleanliness maintained.`
      : `Low waste accumulation (${totalWaste} items). Preventive maintenance and bin servicing recommended.`;
    let estimated_volunteers = "5-8";
    let estimated_duration_hours = "2 hours";
    let equipment = ["Standard puncture-resistant gloves", "Trash grabbers", "Sorting tarps"];
    let targeted_zones = ["Visitor boardwalk", "Upper dry sand perimeter"];
    let suggested_schedule = "Within 14 days";

    if (normSev === "Severe" || normSev === "High" || score > 40) {
      priority = "high";
      priority_tier = "Tier 1 - Critical";
      urgency = "Immediate";
      action = "Organize rapid volunteer cleanup mobilization and hazardous waste triage.";
      rationale = scanCount > 1
        ? `High pollution alert across ${scanCount} scans (${totalWaste} items, avg score ${score}). Immediate ecological hazard detected.`
        : `Critical pollution level detected (${totalWaste} debris items, score ${score}). Immediate intervention required.`;
      estimated_volunteers = totalWaste > 25 ? "25-40" : "15-25";
      estimated_duration_hours = "4 hours";
      equipment = [
        "Cut-resistant gloves",
        "Heavy-duty grabbers",
        "Microplastic sifters",
        "Color-coded sorting bins",
        "Biohazard disposal containers"
      ];
      targeted_zones = ["High-tide waterline", "Intertidal wash zone", "Storm drainage outflow"];
      suggested_schedule = "Within 48 hours";
    } else if (normSev === "Moderate" || score > 15) {
      priority = "medium";
      priority_tier = "Tier 2 - Moderate";
      urgency = "Moderate";
      action = "Schedule community beach drive and deploy smart recycling receptacles.";
      rationale = scanCount > 1
        ? `Moderate accumulation across ${scanCount} scans (${totalWaste} items). Upward trend identified.`
        : `Moderate debris accumulation (${totalWaste} items). Proactive cleanup scheduled to prevent severe fouling.`;
      estimated_volunteers = "10-18";
      estimated_duration_hours = "3 hours";
      equipment = [
        "Puncture-resistant gloves",
        "Debris grabber tongs",
        "Recycling collection sacks",
        "Sorting station tarps"
      ];
      targeted_zones = ["Dune boundary", "Central picnic corridor", "Main beach access path"];
      suggested_schedule = "Within 7 days";
    }

    return {
      beach: displayBeach,
      location: displayLocation,
      priority,
      priority_tier,
      urgency,
      action,
      rationale,
      reason: rationale,
      estimate: {
        volunteers: estimated_volunteers,
        time: estimated_duration_hours,
      },
      equipment,
      targeted_zones,
      suggested_schedule,
      totalWaste,
      score,
      scanCount,
      severity: normSev,
    };
  });

  return list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) || b.totalWaste - a.totalWaste);
}

export default function CleanupPage() {
  const { stats } = useStats();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [engineSource, setEngineSource] = useState("deterministic");
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRecommendations = useCallback(async (manual = false) => {
    const rawLocations = stats?.locations || [];
    if (rawLocations.length === 0) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    const fallbackPlans = synthesizeStatisticalCleanupPlans(rawLocations);

    try {
      const payload = {
        locations: rawLocations.map((loc) => ({
          location: loc.beach || loc.location_label || loc.locationLabel || "Coastal Site",
          beach: loc.beach || loc.location_label,
          scans: loc.scan_count || (loc.scans ? loc.scans.length : 1),
          total_waste: loc.total_waste ?? loc.totalWaste ?? 0,
          pollution_score: loc.pollution_score ?? loc.pollutionScore ?? 0,
          severity: loc.severity || "Low",
          categories: loc.detections || {},
        })),
        max_recommendations: 10,
      };

      const response = await axios.post(`${AI_SERVICE_URL}/cleanup/recommendations`, payload, {
        timeout: 6000,
      });

      if (response.data && Array.isArray(response.data.recommendations) && response.data.recommendations.length > 0) {
        const parsed = response.data.recommendations.map((item, idx) => {
          const fb = fallbackPlans[idx] || fallbackPlans[0] || {};
          const prio = (item.priority || fb.priority || "medium").toLowerCase();
          const pTier = item.priority_tier || (prio === "high" ? "Tier 1 - Critical" : prio === "medium" ? "Tier 2 - Moderate" : "Tier 3 - Routine");

          return {
            beach: item.beach || item.location || fb.beach || "Coastal Site",
            location: item.location || fb.location || "Monitored Region",
            priority: prio,
            priority_tier: pTier,
            urgency: item.urgency || fb.urgency || "Moderate",
            action: item.action || fb.action || "Deploy regular volunteer patrol.",
            rationale: item.rationale || item.reason || fb.rationale || "Telemetry-based cleanup action.",
            reason: item.reason || item.rationale || fb.reason,
            estimate: item.estimate || {
              volunteers: String(item.estimated_volunteers || fb.estimate?.volunteers || "15-25"),
              time: `${item.estimated_duration_hours || fb.estimate?.time || 3} hours`,
            },
            equipment: Array.isArray(item.equipment) && item.equipment.length > 0
              ? item.equipment
              : fb.equipment || ["Cut-resistant gloves", "Debris grabbers", "Sorting bins"],
            targeted_zones: Array.isArray(item.targeted_zones) && item.targeted_zones.length > 0
              ? item.targeted_zones
              : (Array.isArray(item.target_zones) && item.target_zones.length > 0 ? item.target_zones : fb.targeted_zones || ["High-tide line"]),
            suggested_schedule: item.suggested_schedule || fb.suggested_schedule || "Within 7 days",
            totalWaste: item.totalWaste ?? fb.totalWaste ?? 0,
            score: item.score ?? fb.score ?? 0,
            scanCount: item.scanCount ?? fb.scanCount ?? 1,
            severity: item.severity || fb.severity || "Moderate",
          };
        });

        parsed.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) || (b.totalWaste || 0) - (a.totalWaste || 0));
        setRecommendations(parsed);
        setEngineSource(response.data.source || "ollama_ministral-3:3b");
        if (manual) showToast("success", "AI Cleanup Plans refreshed successfully!");
      } else {
        setRecommendations(fallbackPlans);
        setEngineSource("rule_based_fallback");
      }
    } catch {
      // Graceful fallback to deterministic rule-based calculation
      setRecommendations(fallbackPlans);
      setEngineSource("rule_based_fallback");
      if (manual) showToast("info", "Synthesized deterministic cleanup plans (offline mode).");
    } finally {
      setLoading(false);
    }
  }, [stats?.locations]);

  useEffect(() => {
    fetchRecommendations(false);
  }, [fetchRecommendations]);

  const upcomingCleanups = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return [];

    const now = new Date();
    return recommendations
      .filter((r) => r.priority === "high" || r.priority === "medium")
      .slice(0, 5)
      .map((r, idx) => {
        const scheduleDate = new Date(now.getTime() + (idx + 1) * 2 * 24 * 60 * 60 * 1000);
        const dateStr = scheduleDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        return {
          beach: r.beach,
          date: `${dateStr}, 07:00 AM`,
          priority: r.priority,
          priority_tier: r.priority_tier,
          suggested_schedule: r.suggested_schedule,
        };
      });
  }, [recommendations]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Cleanup Recommendations</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">AI-powered recommendations calculated dynamically from real-time database scans &amp; pollution analytics.</p>
        </div>

        <button
          type="button"
          onClick={() => fetchRecommendations(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-surface hover:bg-bg-secondary border border-border text-xs font-semibold text-text-primary shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          {loading ? <Loader2 size={14} className="animate-spin text-primary" /> : <RefreshCw size={14} className="text-primary" />}
          <span>Refresh AI Recommendations</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Recommended Actions (2 Columns Wide on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Recommended Actions"
            subtitle="Prioritized cleanup interventions with equipment & volunteer estimates"
            action={
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles size={13} /> {engineSource === "ollama_ministral-3:3b" ? "Ollama LLM Powered" : "Telemetry Powered"}
              </span>
            }
          />

          {recommendations.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm">
              <ShieldAlert size={36} className="text-text-muted mb-3" />
              <p className="text-sm font-bold text-text-primary font-display">
                No pollution records found. Upload a scan to generate recommendations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((r, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex gap-4 items-start shadow-sm hover:border-primary/40 transition-all space-y-1"
                >
                  <div
                    className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${
                      r.priority === "high"
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : r.priority === "medium"
                        ? "bg-secondary/10 text-secondary border border-secondary/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    <Waves size={22} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Header: Beach name & Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-bold text-text-primary font-display text-base sm:text-lg">
                          {r.beach}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                          <MapPin size={12} className="shrink-0 text-primary" />
                          <span className="truncate">{r.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`uppercase text-[10px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-pill ${
                            r.priority === "high"
                              ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                              : r.priority === "medium"
                              ? "bg-secondary/15 text-secondary border border-secondary/30"
                              : "bg-primary/15 text-primary border border-primary/30"
                          }`}
                        >
                          {r.priority_tier || r.priority}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-pill bg-bg-secondary text-text-muted border border-border font-medium">
                          📅 {r.suggested_schedule || "Within 7 days"}
                        </span>
                      </div>
                    </div>

                    {/* Action statement */}
                    <div className="text-xs sm:text-sm font-semibold text-text-primary bg-primary/5 border border-primary/15 p-3 rounded-xl">
                      {r.action}
                    </div>

                    {/* Telemetry Rationale */}
                    <div className="text-xs text-text-secondary bg-bg-secondary/50 p-3 rounded-xl border border-border/50 leading-relaxed">
                      <strong>Rationale:</strong> {r.rationale || r.reason}
                    </div>

                    {/* Targeted Coastal Zones */}
                    {Array.isArray(r.targeted_zones) && r.targeted_zones.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          <Navigation size={11} />
                          <span>Targeted Coastal Zones</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.targeted_zones.map((zone, zIdx) => (
                            <span
                              key={zIdx}
                              className="text-[11px] font-medium px-2.5 py-0.5 rounded-pill bg-bg-secondary text-text-secondary border border-border/80"
                            >
                              📍 {zone}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Equipment */}
                    {Array.isArray(r.equipment) && r.equipment.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          <Wrench size={11} />
                          <span>Recommended Equipment</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.equipment.map((item, eIdx) => (
                            <span
                              key={eIdx}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-primary/10 text-primary border border-primary/20"
                            >
                              🛡️ {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estimated Volunteers and Duration */}
                    <div className="flex items-center gap-5 text-xs font-semibold text-text-muted pt-2 border-t border-border/50">
                      <span className="flex items-center gap-1.5 text-text-primary">
                        <Users size={14} className="text-primary" /> {r.estimate.volunteers} Volunteers Required
                      </span>
                      <span className="flex items-center gap-1.5 text-text-primary">
                        <Clock size={14} className="text-secondary" /> {r.estimate.time} Est. Duration
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Suggested Cleanup Schedule */}
        <div className="space-y-4">
          <SectionHeader
            title="Suggested Schedule"
            subtitle="Deployment calendar for volunteer & municipal teams"
          />

          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            {upcomingCleanups.length === 0 ? (
              <p className="text-xs text-text-muted italic py-6 text-center">
                No high-priority cleanups currently scheduled. All coastal sites report optimal baseline scores.
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {upcomingCleanups.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-text-primary font-display flex items-center gap-1.5">
                        <Calendar size={13} className="text-primary" />
                        <span>{c.beach}</span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{c.date}</div>
                    </div>
                    <span
                      className={`uppercase text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-pill shrink-0 ${
                        c.priority === "high"
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                          : "bg-secondary/15 text-secondary border border-secondary/30"
                      }`}
                    >
                      {c.priority_tier || c.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <ToastNotification toast={toast} />
    </div>
  );
}
