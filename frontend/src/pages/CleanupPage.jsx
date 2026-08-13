import { useMemo } from "react";
import { Clock, Users, Waves, ShieldAlert, Sparkles, MapPin } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import { normalizeSeverity } from "../utils/wasteUtils.js";
import GuestLockScreen from "../components/GuestLockScreen.jsx";

export default function CleanupPage() {
  const { user } = useAuth();
  const { stats, loading } = useStats();

  const recommendations = useMemo(() => {
    if (!stats?.locations || stats.locations.length === 0) {
      return [];
    }

    return stats.locations.map((loc) => {
      const totalWaste = loc.total_waste ?? loc.totalWaste ?? loc.wasteCount ?? 0;
      const score = loc.pollution_score ?? loc.pollutionScore ?? totalWaste;
      const normSev = normalizeSeverity(loc.severity || score);

      let priority = "low";
      let action = "Awareness campaign for local visitors and regular beach checks.";
      let reason = `Low waste accumulation (${totalWaste} items). Preventive maintenance recommended.`;
      let estimate = { volunteers: "5-8", time: "2 hours" };

      if (normSev === "Severe" || normSev === "High") {
        priority = "high";
        action = "Organize urgent cleanup drive within 48 hours & deploy waste bins.";
        reason = `Critical pollution score detected (${score} pts). Immediate action required.`;
        estimate = { volunteers: "20-30", time: "4 hours" };
      } else if (normSev === "Moderate") {
        priority = "medium";
        action = "Schedule bi-weekly community monitoring and collection drives.";
        reason = `Moderate waste accumulation (${totalWaste} items). Upward pollution trend observed.`;
        estimate = { volunteers: "10-15", time: "3 hours" };
      }

      const displayBeach = loc.beach || (loc.location_label || loc.locationLabel || "").split(",")[0]?.trim() || "Coastal Site";
      const displayLocation = loc.location_label || loc.locationLabel || (loc.city ? `${loc.city}, India` : "Coastal Region");

      return {
        beach: displayBeach,
        location: displayLocation,
        priority,
        action,
        reason,
        estimate,
        totalWaste,
      };
    });
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
        <h1>Cleanup Recommendations</h1>
        <p>AI-powered recommendations calculated dynamically from real-time database scans &amp; pollution analytics.</p>
      </div>

      {!user ? (
        <GuestLockScreen
          title="Cleanup Recommendations Are Private"
          message="Sign in to view AI-powered priority cleanup recommendations based on live pollution scan data."
        />
      ) : (
        <div className="cards-grid-2">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <p className="section-title" style={{ margin: 0 }}>Recommended Actions</p>
              <span style={{ fontSize: '0.73rem', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                <Sparkles size={13} /> Live Database Powered
              </span>
            </div>

            {loading ? (
              <div className="full-card" style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                Loading database recommendations...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="full-card" style={{ textAlign: "center", padding: "2.5rem 1.5rem", color: "var(--muted)" }}>
                <ShieldAlert size={36} style={{ color: "var(--teal)", marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
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
                    <Waves size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)" }}>{r.beach}</div>
                      <span className={`cleanup-priority priority-${r.priority}`}>
                        {r.priority.charAt(0).toUpperCase() + r.priority.slice(1)} Priority
                      </span>
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <MapPin size={12} /> {r.location}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-light)", fontWeight: 600, marginBottom: "0.25rem" }}>
                      {r.action}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.45rem", fontStyle: "italic" }}>
                      &quot;{r.reason}&quot;
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <Users size={12} /> {r.estimate.volunteers} volunteers
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <Clock size={12} /> {r.estimate.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <p className="section-title">Scheduled Cleanups</p>
            <div className="full-card" style={{ marginBottom: 0 }}>
              {upcomingCleanups.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
                  No immediate high-priority cleanups scheduled.
                </div>
              ) : (
                upcomingCleanups.map((u, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 0",
                      borderBottom: i < upcomingCleanups.length - 1 ? "1px solid var(--border-lt)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.86rem", marginBottom: "0.15rem" }}>{u.beach}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={11} /> {u.date}
                      </div>
                    </div>
                    <span className={`cleanup-priority priority-${u.priority}`}>
                      {u.priority.charAt(0).toUpperCase() + u.priority.slice(1)} Priority
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
