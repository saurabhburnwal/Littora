import { useState } from "react";
import { FileText, Calendar, BarChart3, Settings, Download, Mail, Loader2 } from "lucide-react";
import axios from "axios";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { generatePdfReport } from "../utils/generatePdfReport.js";
import { API_BASE, formatWasteType } from "../utils/wasteUtils.js";
import ToastNotification from "../components/ToastNotification.jsx";

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
- High Severity:      ${stats.severityCounts?.High || 0}
- Severe Severity:    ${stats.severityCounts?.Severe || 0}

3. DETECTED WASTE CATEGORIES (ALL-TIME)
-----------------------------------------------------
${wasteSummary}

=====================================================
Report generated automatically by Littora.
=====================================================`;
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      await generatePdfReport({
        reportType: selected,
        userEmail: user?.email,
        stats,
      });
      showToast("success", "PDF report downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("error", "Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailReport = async () => {
    if (!user?.email) {
      showToast("error", "User email not found. Please log in.");
      return;
    }

    setEmailing(true);
    try {
      const reportTitle = REPORT_TYPES.find(r => r.id === selected)?.title || "Beach Waste Report";
      const reportContent = generateReportText();
      const token = await getToken();

      const response = await axios.post(`${API_BASE}/api/email/send-report`, {
        to: user.email,
        subject: `Littora ${reportTitle} - ${new Date().toLocaleDateString("en-IN")}`,
        reportText: reportContent,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        showToast("success", `Report sent successfully to ${user.email}`);
      } else {
        showToast("error", response.data.message || "Failed to send email");
      }
    } catch (err) {
      console.error("Email send error:", err);
      showToast("error", err.response?.data?.error || err.response?.data?.message || "Failed to dispatch email. Check server configuration.");
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Reports</h1>
        <p>Generate, download, and email structured waste analytics reports.</p>
      </div>

      <div className="reports-grid">
        {REPORT_TYPES.map((r) => (
          <div
            key={r.id}
            className={`report-card ${selected === r.id ? "selected" : ""}`}
            onClick={() => setSelected(r.id)}
          >
            <div className="report-card-icon">{r.icon}</div>
            <div className="report-card-title">{r.title}</div>
            <div className="report-card-desc">{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Selected Report Preview Card */}
      <div className="charts-card" style={{ marginTop: '1.5rem', border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {REPORT_TYPES.find(r => r.id === selected)?.title}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Summary compiled for {user?.email || "Signed-in User"} · Ready for download or email
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="export-btn"
              onClick={handleEmailReport}
              disabled={emailing}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              {emailing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={14} />}
              {emailing ? "Sending…" : "Email to Me"}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{(stats.totalAnalyses || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Detections</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{(stats.totalWasteAllTime || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Waste Items</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{stats.locations?.length || 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beaches Monitored</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>91.3%</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Accuracy</div>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Click <strong>Download PDF Report</strong> or <strong>Email to Me</strong> to receive the detailed {selected} summary report.
        </p>
      </div>

      {/* ── Toast ── */}
      <ToastNotification toast={toast} />
    </div>
  );
}
