import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, ScanLine, TrendingUp } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import StatCards          from "../components/StatCards.jsx";
import TrendChart         from "../components/TrendChart.jsx";
import WasteBreakdownChart from "../components/WasteBreakdownChart.jsx";
import GuestLockScreen    from "../components/GuestLockScreen.jsx";
import dashboardBg        from "../assets/dashboard_bg.png";

export default function DashboardPage() {
  const { stats } = useStats();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const scrollToStats = () => {
    const el = document.getElementById("dashboard-analytics") || document.getElementById("analytics-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const sectionTitle =
    user ? "Live Monitoring & Analytics" : "Platform Overview & Preview Analytics";

  return (
    <div
      className="relative min-h-screen text-text-primary"
      data-testid="dashboard-container"
      style={{
        "--dashboard-image": `url(${dashboardBg})`,
        backgroundImage: isDark
          ? `linear-gradient(to right, rgba(11,18,32,0.96), rgba(11,18,32,0.88), rgba(11,18,32,0.65)), url(${dashboardBg})`
          : `linear-gradient(to right, rgba(247,242,232,0.88), rgba(247,242,232,0.65), rgba(247,242,232,0.20)), url(${dashboardBg})`,
        backgroundAttachment: "fixed, fixed",
        backgroundSize: "cover, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
      }}
    >
      {/* ── Hero Content ── */}
      <div className="relative z-10 px-4 sm:px-8 pt-8 sm:pt-12 pb-10 sm:pb-14">
        <div className="max-w-6xl mx-auto w-full">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C2826] dark:text-white leading-[1.15] mb-3.5 tracking-tight">
            AI-Powered<br />
            <span>Beach Waste</span><br />
            Detection
          </h1>

          <p className="text-base sm:text-[1.05rem] text-[#5B564D] dark:text-white/85 max-w-[580px] mb-7 leading-relaxed font-normal">
            Detect, classify and analyze beach waste for a cleaner tomorrow.
          </p>

          <div className="flex items-center gap-4 flex-wrap mb-10">
            <Link
              to="/detect"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-pill bg-[#0E8C86] hover:bg-[#0B746F] dark:bg-[#00D4AA] dark:hover:bg-[#00C29A] dark:text-[#0B1220] text-white font-bold text-sm shadow-[0_4px_14px_rgba(14,140,134,0.3)] dark:shadow-[0_4px_14px_rgba(0,212,170,0.3)] transition-all hover:-translate-y-0.5 no-underline"
            >
              Start Detection <ArrowRight size={18} />
            </Link>
            <button
              onClick={scrollToStats}
              className="inline-flex items-center gap-2 px-5.5 py-3 rounded-pill bg-[#EADFCB]/80 hover:bg-[#EADFCB] dark:bg-white/10 dark:hover:bg-white/20 text-[#2C2A27] dark:text-white font-semibold text-sm border border-[#D7CBB8] dark:border-white/25 backdrop-blur-sm cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <BarChart3 size={17} /> View Live Analytics
            </button>
          </div>

          {/* Bottom 3 feature circle cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full border border-[#2C2A27]/30 dark:border-white/30 text-[#1C2826] dark:text-white flex items-center justify-center shrink-0">
                <ScanLine size={19} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#1C2826] dark:text-white mb-0.5">Smart Detection</h3>
                <p className="text-xs text-[#5B564D] dark:text-white/75 leading-relaxed">AI model detects and classifies waste in beach images</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full border border-[#2C2A27]/30 dark:border-white/30 text-[#1C2826] dark:text-white flex items-center justify-center shrink-0">
                <TrendingUp size={19} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#1C2826] dark:text-white mb-0.5">Real-time Analysis</h3>
                <p className="text-xs text-[#5B564D] dark:text-white/75 leading-relaxed">Get instant results and insights on waste types and counts</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full border border-[#2C2A27]/30 dark:border-white/30 text-[#1C2826] dark:text-white flex items-center justify-center shrink-0">
                <BarChart3 size={19} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#1C2826] dark:text-white mb-0.5">Data for Impact</h3>
                <p className="text-xs text-[#5B564D] dark:text-white/75 leading-relaxed">Track trends and contribute to a cleaner environment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Analytics / Monitoring Section ── */}
      <div id="dashboard-analytics" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Guest Lock Banner for non-authenticated users */}
        {!user && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border shadow-sm mb-6">
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-text-primary mb-1">👋 Welcome to Guest Preview Mode</h3>
              <p className="text-xs sm:text-sm text-text-muted">Sign in with your Littora account to access full interactive analytics, historical trends, and upload detection scans.</p>
            </div>
            <button
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-pill shadow-sm transition-colors shrink-0 cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Sign In to View All
            </button>
          </div>
        )}

        <div className="mb-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              <TrendChart history={stats.history} />
              <WasteBreakdownChart aggregateDetections={stats.aggregateDetections} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
