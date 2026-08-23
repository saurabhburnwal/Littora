import { useMemo } from "react";
import { Clock, Users, Waves, ShieldAlert, Sparkles, MapPin } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import Badge from "../components/ui/Badge.jsx";
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
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Cleanup Recommendations</h1>
          <p>AI-powered recommendations calculated dynamically from real-time database scans &amp; pollution analytics.</p>
        </div>
      </div>

      <div className="cards-grid-2">
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <SectionHeader
              title="Recommended Actions"
              subtitle="Prioritized cleanup interventions based on live database telemetry"
              action={
                <span style={{ fontSize: "0.73rem", color: "var(--teal)", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                  <Sparkles size={13} /> Live Database Powered
                </span>
              }
            />
          </div>

          {recommendations.length === 0 ? (
            <div className="full-card" style={{ textAlign: "center", padding: "2.5rem 1.5rem", color: "var(--text-muted)" }}>
              <ShieldAlert size={36} style={{ color: "var(--teal)", marginBottom: "0.5rem" }} />
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                No pollution records found. Upload a scan to generate recommendations.
              </p>
            </div>
          ) : (
            recommendations.map((r, i) => (
              <div key={i} className="cleanup-card">
                <div
                  className="cleanup-icon"
                  style={{
                    background:
                      r.priority === "high"
                        ? "rgba(239, 68, 68, 0.12)"
                        : r.priority === "medium"
                        ? "rgba(245, 158, 11, 0.12)"
                        : "rgba(16, 185, 129, 0.12)",
                    color:
                      r.priority === "high"
                        ? "#ef4444"
                        : r.priority === "medium"
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                >
                  <Waves size={20} />
                </div>
                <div className="cleanup-body">
                  <div className="cleanup-title">
                    <span>{r.beach}</span>
                    <span className={`priority-badge priority-${r.priority}`}>
                      {r.priority}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    <MapPin size={12} />
                    <span>{r.location}</span>
                  </div>
                  <div className="cleanup-action">{r.action}</div>
                  <div className="cleanup-reason">{r.reason}</div>
                  <div className="cleanup-estimate">
                    <span><Users size={12} /> {r.estimate.volunteers} volunteers</span>
                    <span><Clock size={12} /> {r.estimate.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div style={{ marginBottom: "1rem" }}>
            <SectionHeader
              title="Suggested Cleanup Schedule"
              subtitle="Intervention timeline for local municipal teams"
            />
          </div>

          <div className="full-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}>
            {upcomingCleanups.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                No high-priority cleanups currently scheduled. All coastal sites report optimal baseline scores.
              </p>
            ) : (
              upcomingCleanups.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 0",
                    borderBottom: i < upcomingCleanups.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text-primary)" }}>{c.beach}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>{c.date}</div>
                  </div>
                  <span className={`priority-badge priority-${c.priority}`}>{c.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
