import { useMemo } from "react";
import { Clock, Users, Waves, ShieldAlert, Sparkles, MapPin } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import { normalizeSeverity } from "../utils/wasteUtils.js";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function CleanupPage() {
  const { stats } = useStats();

  const recommendations = useMemo(() => {
    if (!stats?.locations || stats.locations.length === 0) {
      return [];
    }

    const list = stats.locations.map((loc) => {
      const totalWaste = loc.total_waste ?? loc.totalWaste ?? loc.wasteCount ?? 0;
      const score = loc.pollution_score ?? loc.pollutionScore ?? totalWaste;
      const normSev = normalizeSeverity(loc.severity || score);
      const scanCount = loc.scan_count || loc.scanCount || (loc.scans ? loc.scans.length : 1);

      let priority = "low";
      let action = "Awareness campaign for local visitors and regular beach checks.";
      let reason = scanCount > 1
        ? `Aggregated across ${scanCount} scans (${totalWaste} total items). Low accumulation rate.`
        : `Low waste accumulation (${totalWaste} items). Preventive maintenance recommended.`;
      let estimate = { volunteers: "5-8", time: "2 hours" };

      if (normSev === "Severe" || normSev === "High") {
        priority = "high";
        action = "Organize urgent cleanup drive within 48 hours & deploy waste bins.";
        reason = scanCount > 1
          ? `High pollution alert across ${scanCount} scans (${totalWaste} items, avg ${score} pts). Immediate intervention required.`
          : `Critical pollution score detected (${score} pts). Immediate action required.`;
        estimate = { volunteers: totalWaste > 20 ? "25-40" : "15-25", time: "4 hours" };
      } else if (normSev === "Moderate") {
        priority = "medium";
        action = "Schedule bi-weekly community monitoring and collection drives.";
        reason = scanCount > 1
          ? `Moderate accumulation across ${scanCount} scans (${totalWaste} items). Upward trend observed.`
          : `Moderate waste accumulation (${totalWaste} items). Upward pollution trend observed.`;
        estimate = { volunteers: "10-15", time: "3 hours" };
      }

      const displayBeach = loc.beach || (loc.location_label || loc.locationLabel || "").split(",")[0]?.trim() || "Coastal Site";
      const displayLocation = loc.location_label || loc.locationLabel || [loc.city, loc.country].filter(Boolean).join(", ") || "Coastal Region";

      return {
        beach: displayBeach,
        location: displayLocation,
        priority,
        action,
        reason,
        estimate,
        totalWaste,
        score,
        scanCount,
        severity: normSev,
      };
    });

    // Sort by priority (High -> Medium -> Low), then highest waste count
    return list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) || b.totalWaste - a.totalWaste);
  }, [stats?.locations]);

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
        };
      });
  }, [recommendations]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Cleanup Recommendations</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">AI-powered recommendations calculated dynamically from real-time database scans &amp; pollution analytics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Recommended Actions */}
        <div className="space-y-4">
          <SectionHeader
            title="Recommended Actions"
            subtitle="Prioritized cleanup interventions based on live database telemetry"
            action={
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles size={13} /> Live Database Powered
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
                  className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex gap-4 items-start shadow-sm hover:border-primary/40 transition-all"
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
                      r.priority === "high"
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : r.priority === "medium"
                        ? "bg-secondary/10 text-secondary border border-secondary/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    <Waves size={20} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap font-bold text-text-primary font-display text-sm sm:text-base">
                      <span>{r.beach}</span>
                      <span
                        className={`uppercase text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-pill ${
                          r.priority === "high"
                            ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                            : r.priority === "medium"
                            ? "bg-secondary/15 text-secondary border border-secondary/30"
                            : "bg-primary/15 text-primary border border-primary/30"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{r.location}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-text-secondary leading-snug">{r.action}</div>
                    <div className="text-xs text-text-muted bg-bg-secondary/50 p-2.5 rounded-xl border border-border/40 leading-relaxed">{r.reason}</div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-text-muted pt-1">
                      <span className="flex items-center gap-1"><Users size={12} /> {r.estimate.volunteers} volunteers</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {r.estimate.time}</span>
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
            title="Suggested Cleanup Schedule"
            subtitle="Intervention timeline for local municipal teams"
          />

          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            {upcomingCleanups.length === 0 ? (
              <p className="text-xs text-text-muted italic py-6 text-center">
                No high-priority cleanups currently scheduled. All coastal sites report optimal baseline scores.
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {upcomingCleanups.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="text-sm font-bold text-text-primary font-display">{c.beach}</div>
                      <div className="text-xs text-text-muted mt-0.5">{c.date}</div>
                    </div>
                    <span
                      className={`uppercase text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-pill ${
                        c.priority === "high"
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                          : "bg-secondary/15 text-secondary border border-secondary/30"
                      }`}
                    >
                      {c.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
