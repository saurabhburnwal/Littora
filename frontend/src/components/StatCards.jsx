import { ScanLine, Trash2, Activity, ShieldCheck } from "lucide-react";

export default function StatCards({
  totalAnalyses     = 0,
  totalWasteAllTime = 0,
  avgScore          = 0,
}) {
  const avgWastePerScan = totalAnalyses > 0 ? (totalWasteAllTime / totalAnalyses).toFixed(1) : "0.0";

  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Detections</span>
          <ScanLine size={20} className="stat-card-icon" color="var(--teal)" />
        </div>
        <span className="stat-card-value">{totalAnalyses.toLocaleString()}</span>
        <div className="stat-card-delta positive">
          <span>Live Database Analyses</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Waste Items</span>
          <Trash2 size={20} className="stat-card-icon" color="var(--clay)" />
        </div>
        <span className="stat-card-value">{totalWasteAllTime.toLocaleString()}</span>
        <div className="stat-card-delta positive">
          <span>Aggregated Objects</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Avg. Waste / Image</span>
          <Activity size={20} className="stat-card-icon" color="var(--amber)" />
        </div>
        <span className="stat-card-value">{avgWastePerScan}</span>
        <div className="stat-card-delta positive">
          <span>Objects Per Upload</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Pollution Severity Index</span>
          <ShieldCheck size={20} className="stat-card-icon" color="var(--rose)" />
        </div>
        <span className="stat-card-value">{avgScore}/100</span>
        <div className="stat-card-delta positive">
          <span>Mean Risk Score</span>
        </div>
      </div>
    </div>
  );
}
