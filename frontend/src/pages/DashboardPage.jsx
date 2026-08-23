import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, ScanLine, TrendingUp, Leaf, LogIn } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import StatCards          from "../components/StatCards.jsx";
import TrendChart         from "../components/TrendChart.jsx";
import WasteBreakdownChart from "../components/WasteBreakdownChart.jsx";
import GuestLockScreen    from "../components/GuestLockScreen.jsx";
import dashboardBg        from "../assets/dashboard_bg.png";

export default function DashboardPage() {
  const { stats } = useStats();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const scrollToStats = () => {
    const el = document.getElementById("analytics-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const sectionTitle =
    isAdmin         ? "Live Monitoring & Analytics (All Users)"
    : user          ? "Your Personal Beach Waste Analytics"
    :                 "Platform Overview & Preview Analytics";

  return (
    <div
      className="dashboard-light-container"
      style={{ "--dashboard-image": `url(${dashboardBg})` }}
    >
      {/* ── Hero Banner (Reference Image 1 Aesthetic) ── */}
      <div className="dashboard-hero-light">
        <div className="hero-light-overlay">
          <div className="hero-light-main">
            <h1 className="hero-title-light">
              AI-Powered<br />
              <span className="hero-title-accent">Beach Waste</span><br />
              Detection
            </h1>

            <p className="hero-subtitle-light">
              Detect, classify and analyze beach waste for a cleaner tomorrow.
            </p>

            <div className="hero-cta-row">
              <Link to="/detect" className="btn-hero-primary-pill">
                Start Detection <ArrowRight size={18} />
              </Link>
              <button onClick={scrollToStats} className="btn-hero-outline-pill">
                <BarChart3 size={17} /> View Dashboard
              </button>
            </div>

            {/* Bottom 3 feature circle cards */}
            <div className="hero-features-circle-trio">
              <div className="feature-circle-item">
                <div className="feature-circle-icon">
                  <ScanLine size={20} />
                </div>
                <div className="feature-circle-text">
                  <h3>Smart Detection</h3>
                  <p>AI model detects and classifies waste in beach images</p>
                </div>
              </div>

              <div className="feature-circle-item">
                <div className="feature-circle-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="feature-circle-text">
                  <h3>Real-time Analysis</h3>
                  <p>Get instant results and insights on waste types and counts</p>
                </div>
              </div>

              <div className="feature-circle-item">
                <div className="feature-circle-icon">
                  <Leaf size={20} />
                </div>
                <div className="feature-circle-text">
                  <h3>Data for Impact</h3>
                  <p>Track trends and contribute to a cleaner environment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics & Monitoring Section ── */}
      <div id="analytics-section" className="dashboard-light-body">
        {!user && (
          <div className="guest-preview-banner" style={{
            background: "linear-gradient(135deg, rgba(47, 111, 94, 0.12) 0%, rgba(212, 146, 75, 0.12) 100%)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <div>
              <h4 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
                👋 Welcome to Guest Preview Mode
              </h4>
              <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--muted)" }}>
                You are browsing a preview of Littora. Sign in or create an account to record beach waste detections, view your personal statistics, and access reports.
              </p>
            </div>
            <button
              className="filter-btn-apply"
              onClick={() => navigate("/login")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
            >
              <LogIn size={15} />
              Sign In / Register
            </button>
          </div>
        )}

        <div className="section-header-badge">
          <h2>{sectionTitle}</h2>
        </div>

        {!user ? (
          <GuestLockScreen
            title="Analytics Are Private to Signed-In Users"
            message="Sign in or create an account to view personal detection stats, trend charts, and waste breakdowns."
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
