import { useStats } from "../context/StatsContext.jsx";
import StatCards          from "../components/StatCards.jsx";
import TrendChart         from "../components/TrendChart.jsx";
import WasteBreakdownChart from "../components/WasteBreakdownChart.jsx";

export default function DashboardPage() {
  const { stats } = useStats();

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Dashboard</h1>
        <p>A real-time overview of beach waste analyses and pollution trends.</p>
      </div>

      <StatCards
        totalAnalyses={stats.totalAnalyses}
        totalWasteAllTime={stats.totalWasteAllTime}
        avgScore={stats.avgScore}
        severityCounts={stats.severityCounts}
      />

      <div className="charts-row">
        <TrendChart history={stats.history} />
        <WasteBreakdownChart aggregateDetections={stats.aggregateDetections} />
      </div>
    </div>
  );
}
