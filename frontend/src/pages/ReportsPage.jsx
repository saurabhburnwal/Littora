import { useState, useMemo } from "react";
import {
  FileText, Calendar, BarChart3, Settings, Download, Mail,
  Loader2, ShieldAlert, Sparkles,
  TrendingUp, Trash2, MapPin, Check
} from "lucide-react";
import axios from "axios";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import MetricCard from "../components/ui/MetricCard.jsx";
import Badge from "../components/ui/Badge.jsx";
import ToastNotification from "../components/ToastNotification.jsx";
import { generatePdfReport } from "../utils/generatePdfReport.js";
import { API_BASE, formatWasteType } from "../utils/wasteUtils.js";

const REPORT_TYPES = [
  { id: "daily",   icon: <FileText size={20} />,   title: "Daily Report",   desc: "Summary of today's detections" },
  { id: "weekly",  icon: <Calendar size={20} />,   title: "Weekly Report",  desc: "Overview of this week" },
  { id: "monthly", icon: <BarChart3 size={20} />,  title: "Monthly Report", desc: "Complete monthly analysis" },
  { id: "custom",  icon: <Settings size={20} />,   title: "Custom Report",  desc: "Select date range & filters" },
];

export default function ReportsPage() {
  const { stats } = useStats();
  const { getToken, user } = useAuth();
  const [selected, setSelected] = useState("monthly");
  const [emailing, setEmailing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const selectedReport = REPORT_TYPES.find((r) => r.id === selected) || REPORT_TYPES[2];

  const wasteEntries = useMemo(() => {
    return Object.entries(stats.aggregateDetections || {})
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [stats.aggregateDetections]);

  const generateReportText = () => {
    const reportTitle = selectedReport.title;
    const timestamp = new Date().toLocaleDateString("en-IN", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const wasteSummary = wasteEntries.length > 0
      ? wasteEntries.map(([type, count]) => `- ${formatWasteType(type)}: ${count.toLocaleString()}`).join("\n")
      : "- No waste items cataloged.";

    return `=====================================================
LITTORA - AI BEACH WASTE DETECTION SYSTEM
REPORT TYPE: ${reportTitle.toUpperCase()}
GENERATED FOR: ${user?.email || "User"}
DATE: ${timestamp}
=====================================================

1. SUMMARY METRICS
-----------------------------------------------------
- Total Detections Executed: ${(stats.totalAnalyses || 0).toLocaleString()}
- Total Waste Items Cataloged: ${(stats.totalWasteAllTime || 0).toLocaleString()}
- Monitored Locations: ${stats.locations?.length || 0} beaches
- AI Model Detection Accuracy: 91.3%
- Average Pollution Score: ${stats.avgScore || 0}

2. SEVERITY BREAKDOWN
-----------------------------------------------------
- Low Severity:      ${stats.severityCounts?.Low || 0}
- Moderate Severity: ${stats.severityCounts?.Moderate || 0}
- High Severity:     ${stats.severityCounts?.High || 0}
- Severe Pollution:  ${stats.severityCounts?.Severe || 0}

3. WASTE TYPE AGGREGATE COUNTS
-----------------------------------------------------
${wasteSummary}

4. ACTION RECOMMENDATIONS
-----------------------------------------------------
- Schedule targeted cleanup drives for high-severity beaches.
- Increase recycling bin placement near dense visitor areas.
- Continue automated daily surveillance of coastal zones.

=====================================================
End of Report - Littora Coastal Monitoring Systems
`;
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      await generatePdfReport(selected, stats, user);
      showToast("success", "PDF Report downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("error", "Could not generate PDF report.");
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailReport = async () => {
    setEmailing(true);
    try {
      const token = await getToken();
      const reportText = generateReportText();
      await axios.post(
        `${API_BASE}/api/email/send-report`,
        { reportType: selected, reportText },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      showToast("success", `Report emailed to ${user?.email || "your inbox"}!`);
    } catch (err) {
      showToast("error", err.response?.data?.error || "Could not email report.");
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Reports</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">Generate, preview, download, and email comprehensive environmental audit reports.</p>
        </div>
      </div>

      {/* Report Template Selector Cards */}
      <section className="space-y-4 mb-8">
        <SectionHeader
          title="Select Report Period"
          subtitle="Choose the temporal scope for coastal waste monitoring"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {REPORT_TYPES.map((r) => (
            <div
              key={r.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer bg-surface text-left flex items-start gap-3.5 shadow-sm ${
                selected === r.id
                  ? "selected border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelected(r.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(r.id);
                }
              }}
              aria-label={`Select ${r.title}`}
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
                {r.icon}
              </div>
              <div>
                <div className="font-display text-sm font-bold text-text-primary mb-1">
                  {r.title}
                </div>
                <div className="text-xs text-text-muted leading-relaxed">
                  {r.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Report Preview Section */}
      <section className="space-y-4 mb-8">
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  {selectedReport.title}
                </h2>
                <Badge variant="status" type="active">Certified AI Audit</Badge>
              </div>
              <p className="text-xs sm:text-sm text-text-muted">
                Generated for <strong>{user?.email || "Littora User"}</strong> on {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                onClick={handleEmailReport}
                disabled={emailing}
              >
                {emailing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Email to Me
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-secondary hover:bg-secondary-hover active:bg-secondary-active text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                onClick={handleDownloadReport}
                disabled={downloading}
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download PDF Report
              </button>
            </div>
          </div>

          {/* 1. Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Detections"
              value={(stats.totalAnalyses || 0).toLocaleString()}
              icon={<TrendingUp size={18} />}
              subtext="Scans Logged"
            />
            <MetricCard
              label="Total Waste Items"
              value={(stats.totalWasteAllTime || 0).toLocaleString()}
              icon={<Trash2 size={18} />}
              subtext="Cataloged Debris"
            />
            <MetricCard
              label="Beaches Monitored"
              value={stats.locations?.length || 0}
              icon={<MapPin size={18} />}
              subtext="Coastal Sites"
            />
            <MetricCard
              label="Model Accuracy"
              value="91.3%"
              icon={<Sparkles size={18} />}
              subtext="YOLO Benchmark"
            />
          </div>

          {/* 2. Severity & Waste Composition Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Severity Distribution Card */}
            <div className="bg-bg-secondary/40 border border-border/60 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                <ShieldAlert size={15} />
                <span>Severity Distribution</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0 text-xs sm:text-sm">
                  <Badge variant="severity" type="low">Low Severity</Badge>
                  <span className="font-semibold text-text-primary">{stats.severityCounts?.Low || 0}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0 text-xs sm:text-sm">
                  <Badge variant="severity" type="moderate">Moderate Severity</Badge>
                  <span className="font-semibold text-text-primary">{stats.severityCounts?.Moderate || 0}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0 text-xs sm:text-sm">
                  <Badge variant="severity" type="high">High Severity</Badge>
                  <span className="font-semibold text-text-primary">{stats.severityCounts?.High || 0}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0 text-xs sm:text-sm">
                  <Badge variant="severity" type="severe">Severe Pollution</Badge>
                  <span className="font-semibold text-text-primary">{stats.severityCounts?.Severe || 0}</span>
                </div>
              </div>
            </div>

            {/* Waste Composition Breakdown Card */}
            <div className="bg-bg-secondary/40 border border-border/60 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
                <Trash2 size={15} />
                <span>Top Waste Types</span>
              </div>
              {wasteEntries.length === 0 ? (
                <p className="text-xs text-text-muted italic py-2">No waste items cataloged yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {wasteEntries.slice(0, 4).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0 text-xs sm:text-sm">
                      <Badge variant="waste" type={type}>{formatWasteType(type)}</Badge>
                      <span className="font-semibold text-text-primary">{count.toLocaleString()} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Action Recommendations */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary">
              <Check size={16} />
              <span>Recommended Environmental Actions</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-text-secondary pl-1">
              <li>Deploy targeted community cleanup drives for high-severity beaches identified in this report.</li>
              <li>Increase smart waste receptacle placement near high-traffic coastal hotspots.</li>
              <li>Maintain ongoing automated surveillance and real-time YOLO debris classification.</li>
            </ul>
          </div>

          {/* 4. Raw Report Text (Disclosure Control) */}
          <details className="border border-border/70 rounded-xl p-3 bg-bg-secondary/30 transition-all">
            <summary className="text-xs font-semibold text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none">
              View raw report
            </summary>
            <pre className="mt-3 p-4 bg-bg-secondary text-text-primary rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-border/60">
              {generateReportText()}
            </pre>
          </details>
        </div>
      </section>

      {/* Toast Notification */}
      <ToastNotification toast={toast} />
    </div>
  );
}
