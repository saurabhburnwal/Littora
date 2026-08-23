import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, ScanLine, TrendingUp } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import StatCards          from "../components/StatCards.jsx";
import TrendChart         from "../components/TrendChart.jsx";
import WasteBreakdownChart from "../components/WasteBreakdownChart.jsx";
import GuestLockScreen    from "../components/GuestLockScreen.jsx";
import dashboardBg        from "../assets/dashboard_bg.png";

export default function DashboardPage() {
  const { stats } = useStats();
  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollToStats = () => {
    const el = document.getElementById("analytics-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const sectionTitle =
    user ? "Live Monitoring & Analytics" : "Platform Overview & Preview Analytics";

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
                  <BarChart3 size={20} />
                </div>
                <div className="feature-circle-text">
                  <h3>Real-time Analysis</h3>
                  <p>Track pollution trends, waste breakdown and severity</p>
                </div>
              </div>

              <div className="feature-circle-item">
                <div className="feature-circle-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="feature-circle-text">
                  <h3>Data for Impact</h3>
                  <p>Data-driven recommendations for targeted cleanups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Analytics / Monitoring Section ── */}
      <div id="analytics-section" className="dashboard-light-body">
        {/* Guest Lock Banner for non-authenticated users */}
        {!user && (
          <div className="guest-analytics-notice">
            <div className="guest-notice-content">
              <h3>👋 Welcome to Guest Preview Mode</h3>
              <p>Sign in with your Littora account to access full interactive analytics, historical trends, and upload detection scans.</p>
            </div>
            <button
              className="btn-guest-signin"
              onClick={() => navigate("/login")}
            >
              Sign In to View All
            </button>
          </div>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <SectionHeader
            title={sectionTitle}
            subtitle={user ? "Real-time coastal waste telemetry and breakdown" : "Preview metrics available in guest mode"}
          />
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
            />

            <div className="charts-row" style={{ marginTop: "1.5rem" }}>
              <TrendChart history={stats.history} />
              <WasteBreakdownChart aggregateDetections={stats.aggregateDetections} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
