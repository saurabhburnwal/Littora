import { useState, useMemo } from "react";
import {
  FileText, Calendar, BarChart3, Settings, Download, Mail,
  Loader2, CheckCircle, AlertTriangle, ShieldAlert, Sparkles,
  TrendingUp, Trash2, MapPin, Check
} from "lucide-react";
import axios from "axios";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import MetricCard from "../components/ui/MetricCard.jsx";
import Badge from "../components/ui/Badge.jsx";
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
    <div className="page-container">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>Generate, preview, download, and email comprehensive environmental audit reports.</p>
        </div>
      </div>

      {/* Report Template Selector Cards */}
      <section className="reports-section">
        <SectionHeader
          title="Select Report Period"
          subtitle="Choose the temporal scope for coastal waste monitoring"
        />
        <div className="cards-grid-2">
          {REPORT_TYPES.map((r) => (
            <div
              key={r.id}
              className={`report-card${selected === r.id ? " selected" : ""}`}
              onClick={() => setSelected(r.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelected(r.id)}
              aria-label={`Select ${r.title}`}
            >
              <div className="report-icon">{r.icon}</div>
              <div>
                <div className="report-card-title">{r.title}</div>
                <div className="report-card-desc">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Report Preview Section */}
      <section className="reports-section">
        <div className="full-card report-preview-card">
          {/* Header Action Row */}
          <div className="report-preview-header">
            <div>
              <div className="report-title-wrap">
                <h2 className="report-title-text">
                  {selectedReport.title}
                </h2>
                <Badge variant="status" type="active">Certified AI Audit</Badge>
              </div>
              <p className="report-subtitle-text">
                Generated for <strong>{user?.email || "Littora User"}</strong> on {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div className="report-actions-wrap">
              <button
                type="button"
                className="export-btn report-btn--teal"
                onClick={handleEmailReport}
                disabled={emailing}
              >
                {emailing ? <Loader2 size={14} className="is-spinning" /> : <Mail size={14} />}
                Email to Me
              </button>
              <button
                type="button"
                className="export-btn report-btn--secondary"
                onClick={handleDownloadReport}
                disabled={downloading}
              >
                {downloading ? <Loader2 size={14} className="is-spinning" /> : <Download size={14} />}
                Download PDF Report
              </button>
            </div>
          </div>

          {/* 1. Summary Metrics Cards */}
          <div className="kpi-stats-grid">
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
          <div className="report-breakdown-grid">
            {/* Severity Distribution Card */}
            <div className="report-breakdown-card">
              <div className="report-breakdown-header">
                <ShieldAlert size={15} />
                <span>Severity Distribution</span>
              </div>
              <div className="report-breakdown-list">
                <div className="report-breakdown-row">
                  <Badge variant="severity" type="low">Low Severity</Badge>
                  <span className="report-breakdown-val">{stats.severityCounts?.Low || 0}</span>
                </div>
                <div className="report-breakdown-row">
                  <Badge variant="severity" type="moderate">Moderate Severity</Badge>
                  <span className="report-breakdown-val">{stats.severityCounts?.Moderate || 0}</span>
                </div>
                <div className="report-breakdown-row">
                  <Badge variant="severity" type="high">High Severity</Badge>
                  <span className="report-breakdown-val">{stats.severityCounts?.High || 0}</span>
                </div>
                <div className="report-breakdown-row">
                  <Badge variant="severity" type="severe">Severe Pollution</Badge>
                  <span className="report-breakdown-val">{stats.severityCounts?.Severe || 0}</span>
                </div>
              </div>
            </div>

            {/* Waste Composition Breakdown Card */}
            <div className="report-breakdown-card">
              <div className="report-breakdown-header">
                <Trash2 size={15} />
                <span>Top Waste Types</span>
              </div>
              {wasteEntries.length === 0 ? (
                <p className="table-null-dash">No waste items cataloged yet.</p>
              ) : (
                <div className="report-breakdown-list">
                  {wasteEntries.slice(0, 4).map(([type, count]) => (
                    <div key={type} className="report-breakdown-row">
                      <Badge variant="waste" type={type}>{formatWasteType(type)}</Badge>
                      <span className="report-breakdown-val">{count.toLocaleString()} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Action Recommendations */}
          <div className="report-recommendations-box">
            <div className="report-rec-title">
              <Check size={16} />
              <span>Recommended Environmental Actions</span>
            </div>
            <ul className="report-rec-list">
              <li>Deploy targeted community cleanup drives for high-severity beaches identified in this report.</li>
              <li>Increase smart waste receptacle placement near high-traffic coastal hotspots.</li>
              <li>Maintain ongoing automated surveillance and real-time YOLO debris classification.</li>
            </ul>
          </div>

          {/* 4. Raw Report Text (Disclosure Control) */}
          <details className="raw-report-details">
            <summary className="raw-report-summary">
              View raw report
            </summary>
            <pre className="raw-report-pre">
              {generateReportText()}
            </pre>
          </details>
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
