import { Link } from "react-router-dom";
import { Brain, BarChart3, MapPin, Leaf, TrendingUp, ArrowUpRight } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import StatCards          from "../components/StatCards.jsx";
import TrendChart         from "../components/TrendChart.jsx";
import WasteBreakdownChart from "../components/WasteBreakdownChart.jsx";
import beachHero          from "../assets/beach-hero.jpg";

const FEATURES = [
  {
    icon: <Brain size={18} />,
    title: "AI Detection",
    desc: "Identify waste from images using advanced AI",
  },
  {
    icon: <BarChart3 size={18} />,
    title: "Data Insights",
    desc: "Get meaningful insights and trends from waste data",
  },
  {
    icon: <MapPin size={18} />,
    title: "Beach Monitoring",
    desc: "Monitor pollution levels across beaches with interactive maps",
  },
  {
    icon: <Leaf size={18} />,
    title: "Take Action",
    desc: "Plan clean-ups and make a real impact on our environment",
  },
];

export default function DashboardPage() {
  const { stats } = useStats();

  return (
    <div>
      {/* ── Hero Banner ── */}
      <div
        className="dashboard-hero"
        style={{ backgroundImage: `url(${beachHero})` }}
      >
        <div className="hero-content">
          <p className="hero-welcome">Welcome to</p>
          <span className="hero-brand">LITTORA</span>
          <p className="hero-tagline">
            AI-Powered Beach Waste Detection for a Cleaner Tomorrow
          </p>

          <div className="hero-actions">
            <Link to="/detect" className="btn-primary">
              Detect Waste
            </Link>
            <button className="btn-outline">Explore Dashboard</button>
          </div>

          <div className="hero-feature-cards">
            {FEATURES.map((f) => (
              <div key={f.title} className="hero-feature-card">
                <div className="hero-feature-icon">{f.icon}</div>
                <div className="hero-feature-title">{f.title}</div>
                <div className="hero-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip at bottom of hero */}
        <div className="hero-stats-strip">
          <div className="hero-stat">
            <span className="hero-stat-value">
              {(stats.totalAnalyses || 0).toLocaleString()}
            </span>
            <span className="hero-stat-label">Images Analyzed</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">
              {(stats.totalWasteAllTime || 0).toLocaleString()}
            </span>
            <span className="hero-stat-label">Waste Items Detected</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">
              {(stats.locations?.length || 0)}
            </span>
            <span className="hero-stat-label">Beaches Monitored</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{stats.avgScore || '—'}</span>
            <span className="hero-stat-label">Avg Pollution Score</span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <StatCards
        totalAnalyses={stats.totalAnalyses}
        totalWasteAllTime={stats.totalWasteAllTime}
        avgScore={stats.avgScore}
        severityCounts={stats.severityCounts}
      />

      {/* ── Charts ── */}
      <div className="charts-row">
        <TrendChart history={stats.history} />
        <WasteBreakdownChart aggregateDetections={stats.aggregateDetections} />
      </div>
    </div>
  );
}
