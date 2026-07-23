import { ScanLine, Trash2, Activity, BarChart3 } from "lucide-react";

const SEVERITIES = ["Low", "Moderate", "High", "Severe"];

export default function StatCards({
  totalAnalyses    = 0,
  totalWasteAllTime = 0,
  avgScore         = 0,
  severityCounts   = {},
}) {
  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Analyses</span>
          <ScanLine size={20} className="stat-card-icon" color="var(--teal)" />
        </div>
        <span className="stat-card-value">{totalAnalyses.toLocaleString()}</span>
        <span className="stat-card-sub">photos scanned</span>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Waste</span>
          <Trash2 size={20} className="stat-card-icon" color="var(--clay)" />
        </div>
        <span className="stat-card-value">{totalWasteAllTime.toLocaleString()}</span>
        <span className="stat-card-sub">items detected, all-time</span>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Avg Pollution Score</span>
          <Activity size={20} className="stat-card-icon" color="var(--amber)" />
        </div>
        <span className="stat-card-value">{avgScore}</span>
        <span className="stat-card-sub">out of 100</span>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Severity Mix</span>
          <BarChart3 size={20} className="stat-card-icon" color="var(--rose)" />
        </div>
        <div className="severity-mix">
          {SEVERITIES.map((s) => (
            <span key={s} className={`severity-badge severity-${s.toLowerCase()}`}>
              {s[0]}&thinsp;{severityCounts[s] ?? 0}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
