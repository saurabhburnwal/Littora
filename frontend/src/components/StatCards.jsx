import { ScanLine, Trash2, Activity, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

const SEVERITIES = ["Low", "Moderate", "High", "Severe"];

export default function StatCards({
  totalAnalyses    = 0,
  totalWasteAllTime = 0,
  avgScore         = 0,
  severityCounts   = {},
}) {
  // Mock deltas — in a real app these would come from comparing to last month's data
  const deltas = [
    { value: "+19.4%", label: "from last month", positive: true },
    { value: "+21.4%", label: "from last month", positive: true },
    { value: "+4.8%",  label: "from last month", positive: false },
    { value: "+2.1%",  label: "from last month", positive: true },
  ];

  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Detections</span>
          <ScanLine size={20} className="stat-card-icon" color="var(--teal)" />
        </div>
        <span className="stat-card-value">{totalAnalyses.toLocaleString()}</span>
        <div className={`stat-card-delta ${deltas[0].positive ? 'positive' : 'negative'}`}>
          {deltas[0].positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {deltas[0].value} {deltas[0].label}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Total Waste Items</span>
          <Trash2 size={20} className="stat-card-icon" color="var(--clay)" />
        </div>
        <span className="stat-card-value">{totalWasteAllTime.toLocaleString()}</span>
        <div className={`stat-card-delta ${deltas[1].positive ? 'positive' : 'negative'}`}>
          {deltas[1].positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {deltas[1].value} {deltas[1].label}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Avg. Waste / Image</span>
          <Activity size={20} className="stat-card-icon" color="var(--amber)" />
        </div>
        <span className="stat-card-value">
          {totalAnalyses > 0 ? (totalWasteAllTime / totalAnalyses).toFixed(1) : '0.0'}
        </span>
        <div className={`stat-card-delta ${deltas[2].positive ? 'positive' : 'negative'}`}>
          {deltas[2].positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {deltas[2].value} {deltas[2].label}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">Accuracy</span>
          <BarChart3 size={20} className="stat-card-icon" color="var(--rose)" />
        </div>
        <span className="stat-card-value">91.3%</span>
        <div className={`stat-card-delta ${deltas[3].positive ? 'positive' : 'negative'}`}>
          {deltas[3].positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {deltas[3].value} {deltas[3].label}
        </div>
      </div>
    </div>
  );
}
