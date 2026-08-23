import { ScanLine, Trash2, Activity, ShieldCheck } from "lucide-react";
import MetricCard from "./ui/MetricCard.jsx";

export default function StatCards({
  totalAnalyses     = 0,
  totalWasteAllTime = 0,
  avgScore          = 0,
}) {
  const avgWastePerScan = totalAnalyses > 0 ? (totalWasteAllTime / totalAnalyses).toFixed(1) : "0.0";

  return (
    <div className="stat-cards">
      <MetricCard
        label="Total Detections"
        value={totalAnalyses.toLocaleString()}
        icon={<ScanLine size={18} />}
        subtext="Live Database Analyses"
      />
      <MetricCard
        label="Total Waste Items"
        value={totalWasteAllTime.toLocaleString()}
        icon={<Trash2 size={18} />}
        subtext="Aggregated Objects"
      />
      <MetricCard
        label="Avg. Waste / Image"
        value={avgWastePerScan}
        icon={<Activity size={18} />}
        subtext="Objects Per Upload"
      />
      <MetricCard
        label="Pollution Severity Index"
        value={avgScore}
        icon={<ShieldCheck size={18} />}
        subtext="Mean Risk Score"
      />
    </div>
  );
}
