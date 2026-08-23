import { useState } from "react";
import { FileText, Calendar, BarChart3, Settings, Download, Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import axios from "axios";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
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

  const generateReportText = () => {
    const reportTitle = REPORT_TYPES.find(r => r.id === selected)?.title || "Beach Waste Report";
    const timestamp = new Date().toLocaleDateString("en-IN", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const wasteEntries = Object.entries(stats.aggregateDetections || {}).filter(([_, count]) => count > 0);
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
      <div className="page-heading">
        <h1>Reports</h1>
        <p>Generate, download, and email detailed reports on waste detection.</p>
      </div>

      <div className="cards-grid-2" style={{ marginBottom: "1.5rem" }}>
        {REPORT_TYPES.map((r) => (
          <div
            key={r.id}
            className={`report-card${selected === r.id ? " selected" : ""}`}
            onClick={() => setSelected(r.id)}
          >
            <div className="report-icon">{r.icon}</div>
            <div>
              <div className="report-card-title">{r.title}</div>
              <div className="report-card-desc">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="full-card">
        <div className="full-card-title" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <span>Report Preview</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="export-btn"
              onClick={handleEmailReport}
              disabled={emailing}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "var(--teal)", color: "#fff" }}
            >
              {emailing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={14} />}
              Email to Me
            </button>
            <button
              className="export-btn"
              onClick={handleDownloadReport}
              disabled={downloading}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              {downloading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
              Download PDF Report
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)" }}>{(stats.totalAnalyses || 0).toLocaleString()}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Detections</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)" }}>{(stats.totalWasteAllTime || 0).toLocaleString()}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Waste Items</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)" }}>{stats.locations?.length || 0}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Beaches Monitored</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)" }}>91.3%</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Model Accuracy</div>
          </div>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Click <strong>Download PDF Report</strong> or <strong>Email to Me</strong> to receive the detailed {selected} summary report.
        </p>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
