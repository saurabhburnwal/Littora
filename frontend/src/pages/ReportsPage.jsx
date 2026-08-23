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
      <section style={{ marginBottom: "2rem" }}>
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
      <section style={{ marginBottom: "2rem" }}>
        <div className="full-card" style={{ padding: "1.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)" }}>
          {/* Header Action Row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid var(--border)",
            marginBottom: "1.5rem"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  {selectedReport.title}
                </h2>
                <Badge variant="status" type="active">Certified AI Audit</Badge>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                Generated for <strong>{user?.email || "Littora User"}</strong> on {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="export-btn"
                onClick={handleEmailReport}
                disabled={emailing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: "var(--teal)",
                  color: "#ffffff",
                  padding: "0.52rem 0.95rem",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {emailing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={14} />}
                Email to Me
              </button>
              <button
                type="button"
                className="export-btn"
                onClick={handleDownloadReport}
                disabled={downloading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  padding: "0.52rem 0.95rem",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                {downloading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
                Download PDF Report
              </button>
            </div>
          </div>

          {/* 1. Summary Metrics Cards */}
          <div className="kpi-stats-grid" style={{ marginBottom: "1.75rem" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "1.75rem" }}>
            {/* Severity Distribution Card */}
            <div style={{ padding: "1.25rem", background: "var(--bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <ShieldAlert size={15} style={{ color: "var(--teal)" }} />
                <span>Severity Distribution</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="severity" type="low">Low Severity</Badge>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{stats.severityCounts?.Low || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="severity" type="moderate">Moderate Severity</Badge>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{stats.severityCounts?.Moderate || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="severity" type="high">High Severity</Badge>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{stats.severityCounts?.High || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant="severity" type="severe">Severe Pollution</Badge>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{stats.severityCounts?.Severe || 0}</span>
                </div>
              </div>
            </div>

            {/* Waste Composition Breakdown Card */}
            <div style={{ padding: "1.25rem", background: "var(--bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Trash2 size={15} style={{ color: "var(--teal)" }} />
                <span>Top Waste Types</span>
              </div>
              {wasteEntries.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>No waste items cataloged yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {wasteEntries.slice(0, 4).map(([type, count]) => (
                    <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Badge variant="waste" type={type}>{formatWasteType(type)}</Badge>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{count.toLocaleString()} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Action Recommendations */}
          <div style={{ padding: "1.25rem", background: "color-mix(in srgb, var(--teal) 6%, var(--card-bg))", borderRadius: "var(--radius-lg)", border: "1px solid color-mix(in srgb, var(--teal) 25%, transparent)", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--teal)", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Check size={16} />
              <span>Recommended Environmental Actions</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <li>Deploy targeted community cleanup drives for high-severity beaches identified in this report.</li>
              <li>Increase smart waste receptacle placement near high-traffic coastal hotspots.</li>
              <li>Maintain ongoing automated surveillance and real-time YOLO debris classification.</li>
            </ul>
          </div>

          {/* 4. Raw Report Text (Disclosure Control) */}
          <details className="raw-report-details" style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--teal)", userSelect: "none" }}>
              View raw report
            </summary>
            <pre style={{
              marginTop: "0.85rem",
              padding: "1rem 1.15rem",
              background: "var(--bg)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              whiteSpace: "pre-wrap",
              color: "var(--text-secondary)",
              lineHeight: 1.45,
              maxHeight: "300px",
              overflowY: "auto"
            }}>
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
