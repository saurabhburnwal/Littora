/**
 * Isolated PDF report styling definitions for deterministic off-screen rendering.
 * These styles are intentionally isolated from application theme/stylesheet rules
 * so that html2canvas generates consistent, print-ready reports in any environment.
 */
export const PDF_STYLES = {
  // Page container
  page: "padding: 32px 40px; background: #ffffff;",

  // Header Banner
  header: "display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 24px;",
  brandTitle: "font-size: 26px; font-weight: 800; color: #0d9488; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px;",
  brandSubtitle: "font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;",
  headerMeta: "text-align: right;",
  reportTypeBadge: "display: inline-block; background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;",
  timestamp: "font-size: 11px; color: #94a3b8; margin-top: 6px;",

  // Report Metadata Card
  metaCard: "background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; justify-content: space-between; font-size: 13px;",
  metaLabel: "color: #64748b; font-weight: 500;",
  metaValue: "color: #0f172a;",

  // Section Headers
  section: "margin-bottom: 28px;",
  sectionTitle: "font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-left: 4px solid #0d9488; padding-left: 8px;",

  // KPI Grid & Metric Cards
  kpiGrid: "display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;",
  kpiCardDetections: "background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center;",
  kpiValDetections: "font-size: 22px; font-weight: 800; color: #166534;",
  kpiLabelDetections: "font-size: 11px; font-weight: 600; color: #15803d; text-transform: uppercase; margin-top: 2px;",
  kpiCardWaste: "background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; text-align: center;",
  kpiValWaste: "font-size: 22px; font-weight: 800; color: #075985;",
  kpiLabelWaste: "font-size: 11px; font-weight: 600; color: #0369a1; text-transform: uppercase; margin-top: 2px;",
  kpiCardLocations: "background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px; text-align: center;",
  kpiValLocations: "font-size: 22px; font-weight: 800; color: #854d0e;",
  kpiLabelLocations: "font-size: 11px; font-weight: 600; color: #a16207; text-transform: uppercase; margin-top: 2px;",
  kpiCardScore: "background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px; text-align: center;",
  kpiValScore: "font-size: 22px; font-weight: 800; color: #6b21a8;",
  kpiLabelScore: "font-size: 11px; font-weight: 600; color: #7e22ce; text-transform: uppercase; margin-top: 2px;",

  // AI Executive Summary Box
  aiSummaryBox: "margin-bottom: 28px; background: #f0fdfa; border: 1px solid #99f6e4; border-left: 4px solid #0d9488; border-radius: 8px; padding: 16px;",
  aiSummaryHeader: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;",
  aiSummaryTitle: "font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;",
  aiBadge: "display: inline-block; background: #ccfbf1; color: #0f766e; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;",
  aiSummaryText: "font-size: 12px; color: #134e4a; line-height: 1.6; margin: 0 0 8px 0;",
  aiImpactText: "font-size: 11px; color: #0f766e; font-style: italic; margin: 0;",

  // Table Structure & Headers
  table: "width: 100%; border-collapse: collapse; font-size: 13px;",
  tableHeadRow: "background: #f1f5f9; color: #475569; text-align: left;",
  tableThLeft: "padding: 10px 12px; border-radius: 6px 0 0 6px; font-weight: 600;",
  tableThMid: "padding: 10px 12px; font-weight: 600;",
  tableThRight: "padding: 10px 12px; border-radius: 0 6px 6px 0; text-align: right; font-weight: 600;",
  tableRow: "border-bottom: 1px solid #f1f5f9;",
  tableCellName: "padding: 10px 12px; font-weight: 600; color: #1e293b;",
  tableCellBadge: "padding: 10px 12px;",
  tableCellCount: "padding: 10px 12px; text-align: right; font-weight: 700; color: #1e293b;",

  // Severity Badges
  badgeLow: "display: inline-block; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;",
  badgeModerate: "display: inline-block; background: #fef9c3; color: #a16207; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;",
  badgeHigh: "display: inline-block; background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;",
  badgeSevere: "display: inline-block; background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;",

  // Waste Categories
  wasteGrid: "display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;",
  wasteItem: "display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;",
  wasteItemEmpty: "grid-column: span 2; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; text-align: center; color: #64748b;",

  // Action Recommendations Box
  recsBox: "margin-bottom: 32px; background: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #ca8a04; border-radius: 8px; padding: 16px;",
  recsTitle: "font-size: 13px; font-weight: 700; color: #854d0e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;",
  recsList: "margin: 0; padding-left: 20px; color: #713f12; font-size: 12px; line-height: 1.6;",

  // Document Footer
  footer: "border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;",
};

/**
 * Escapes unsafe characters for secure HTML injection into off-screen containers.
 * Prevents DOM injection / XSS from unescaped dynamic strings.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates and downloads a styled PDF report for Littora Beach Waste Detection.
 * @param {string} reportType - "daily" | "weekly" | "monthly" | "custom"
 * @param {object} stats - Analytics data from StatsContext or scoped telemetry
 * @param {object} user - Current logged in user
 * @param {object} options - Optional AI summary and scope overrides
 */
export async function generatePdfReport(reportType, stats = {}, user = null, options = {}) {
  // Dynamically load heavy PDF generation libraries on demand
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const titleMap = {
    daily: "Daily Beach Waste Report",
    weekly: "Weekly Beach Waste Report",
    monthly: "Monthly Beach Waste Report",
    custom: "Custom Range Beach Waste Report",
  };

  const reportTitle = titleMap[reportType] || "Beach Waste Analysis Report";
  const timestamp = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalDetections = (stats.totalAnalyses ?? stats.totalScans ?? 0).toLocaleString();
  const totalWaste = (stats.totalWaste ?? stats.totalWasteAllTime ?? 0).toLocaleString();
  const locationsCount = stats.locationsCount ?? stats.locations?.length ?? 0;
  const avgScore = stats.avgScore ?? stats.avgPollutionScore ?? 0;

  const severityCounts = stats.severityCounts || {};
  const lowCount = severityCounts.Low ?? severityCounts.low ?? 0;
  const modCount = severityCounts.Moderate ?? severityCounts.moderate ?? 0;
  const highCount = severityCounts.High ?? severityCounts.high ?? 0;
  const severeCount = severityCounts.Severe ?? severityCounts.severe ?? 0;

  const wasteEntries = Object.entries(stats.aggregateDetections || {}).filter(([_, count]) => count > 0);
  const formatWasteName = (t) => String(t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const wasteCategoryHtml = wasteEntries.length > 0
    ? wasteEntries.map(([type, count]) => `
        <div style="${PDF_STYLES.wasteItem}">
          <span>📦 ${escapeHtml(formatWasteName(type))}</span>
          <strong>${escapeHtml(count.toLocaleString())}</strong>
        </div>
      `).join("")
    : `<div style="${PDF_STYLES.wasteItemEmpty}">No waste items recorded.</div>`;

  // Process AI Summary if provided
  const aiSummaryObj = options.aiSummary || options.summary || null;
  let summaryText = "";
  let riskText = "";
  let impactText = "";
  let dynamicRecs = [];

  if (aiSummaryObj) {
    if (typeof aiSummaryObj === "string") {
      summaryText = aiSummaryObj;
    } else {
      summaryText = aiSummaryObj.executive_summary || aiSummaryObj.summary || "";
      riskText = aiSummaryObj.risk_assessment || "";
      impactText = typeof aiSummaryObj.impact_analysis === "string"
        ? aiSummaryObj.impact_analysis
        : aiSummaryObj.impact_analysis?.ecosystem_risk || aiSummaryObj.impact || "";
      
      const rawRecs = aiSummaryObj.priority_actions || aiSummaryObj.actionable_takeaways || aiSummaryObj.recommendations;
      if (Array.isArray(rawRecs)) {
        dynamicRecs = rawRecs.map((r) => {
          if (typeof r === "string") return r;
          if (r && typeof r === "object") return r.action ? `${r.urgency ? `[${r.urgency}] ` : ""}${r.action}` : JSON.stringify(r);
          return String(r);
        });
      }
    }
  }

  if (dynamicRecs.length === 0) {
    dynamicRecs = [
      "Prioritize community cleanup drives at beaches exhibiting High or Severe pollution indices.",
      "Deploy additional waste disposal & recycling bins in areas with high plastic bottle counts.",
      "Maintain automated surveillance schedules to monitor trend dynamics over time.",
    ];
  }

  const scopeLabel = options.dateRangeLabel || options.dateRange || reportTitle;
  const locationScope = options.locationLabel || options.location || "All Monitored Sites";

  // Temporary off-screen container for rendering styled HTML template
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "800px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#1e293b";
  container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  container.style.padding = "0";
  container.style.boxSizing = "border-box";

  container.innerHTML = `
    <div style="${PDF_STYLES.page}">
      <!-- Header Banner -->
      <div style="${PDF_STYLES.header}">
        <div>
          <div style="${PDF_STYLES.brandTitle}">
            LITTORA
          </div>
          <div style="${PDF_STYLES.brandSubtitle}">
            AI Beach Waste Detection & Monitoring System
          </div>
        </div>
        <div style="${PDF_STYLES.headerMeta}">
          <div style="${PDF_STYLES.reportTypeBadge}">
            ${escapeHtml(reportType)} Report
          </div>
          <div style="${PDF_STYLES.timestamp}">
            Generated: ${escapeHtml(timestamp)}
          </div>
        </div>
      </div>

      <!-- Report Metadata -->
      <div style="${PDF_STYLES.metaCard}">
        <div>
          <span style="${PDF_STYLES.metaLabel}">Scope:</span> 
          <strong style="${PDF_STYLES.metaValue}">${escapeHtml(scopeLabel)} (${escapeHtml(locationScope)})</strong>
        </div>
        <div>
          <span style="${PDF_STYLES.metaLabel}">Generated For:</span> 
          <strong style="${PDF_STYLES.metaValue}">${escapeHtml(user?.email || "Authenticated User")}</strong>
        </div>
      </div>

      <!-- Summary KPI Grid -->
      <div style="${PDF_STYLES.section}">
        <h3 style="${PDF_STYLES.sectionTitle}">
          1. Summary Metrics
        </h3>
        <div style="${PDF_STYLES.kpiGrid}">
          <div style="${PDF_STYLES.kpiCardDetections}">
            <div style="${PDF_STYLES.kpiValDetections}">${escapeHtml(totalDetections)}</div>
            <div style="${PDF_STYLES.kpiLabelDetections}">Analyses Performed</div>
          </div>
          <div style="${PDF_STYLES.kpiCardWaste}">
            <div style="${PDF_STYLES.kpiValWaste}">${escapeHtml(totalWaste)}</div>
            <div style="${PDF_STYLES.kpiLabelWaste}">Total Waste Items</div>
          </div>
          <div style="${PDF_STYLES.kpiCardLocations}">
            <div style="${PDF_STYLES.kpiValLocations}">${escapeHtml(locationsCount)}</div>
            <div style="${PDF_STYLES.kpiLabelLocations}">Beaches Monitored</div>
          </div>
          <div style="${PDF_STYLES.kpiCardScore}">
            <div style="${PDF_STYLES.kpiValScore}">${escapeHtml(avgScore)} / 10</div>
            <div style="${PDF_STYLES.kpiLabelScore}">Avg Pollution Index</div>
          </div>
        </div>
      </div>

      ${summaryText ? `
      <!-- AI Executive Environmental Summary -->
      <div style="${PDF_STYLES.aiSummaryBox}">
        <div style="${PDF_STYLES.aiSummaryHeader}">
          <h3 style="${PDF_STYLES.aiSummaryTitle}">🤖 AI Executive Environmental Summary</h3>
          <span style="${PDF_STYLES.aiBadge}">Certified AI Audit</span>
        </div>
        <p style="${PDF_STYLES.aiSummaryText}">${escapeHtml(summaryText)}</p>
        ${riskText ? `<p style="${PDF_STYLES.aiImpactText}"><strong>Risk Assessment:</strong> ${escapeHtml(riskText)}</p>` : ""}
        ${impactText ? `<p style="${PDF_STYLES.aiImpactText}; margin-top: 4px;"><strong>Impact Analysis:</strong> ${escapeHtml(impactText)}</p>` : ""}
      </div>
      ` : ""}

      <!-- Severity Distribution -->
      <div style="${PDF_STYLES.section}">
        <h3 style="${PDF_STYLES.sectionTitle}">
          2. Pollution Severity Breakdown
        </h3>
        <table style="${PDF_STYLES.table}">
          <thead>
            <tr style="${PDF_STYLES.tableHeadRow}">
              <th style="${PDF_STYLES.tableThLeft}">Severity Level</th>
              <th style="${PDF_STYLES.tableThMid}">Status Indicator</th>
              <th style="${PDF_STYLES.tableThRight}">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr style="${PDF_STYLES.tableRow}">
              <td style="${PDF_STYLES.tableCellName}">Low</td>
              <td style="${PDF_STYLES.tableCellBadge}"><span style="${PDF_STYLES.badgeLow}">Minimal Risk</span></td>
              <td style="${PDF_STYLES.tableCellCount}">${escapeHtml(lowCount)}</td>
            </tr>
            <tr style="${PDF_STYLES.tableRow}">
              <td style="${PDF_STYLES.tableCellName}">Moderate</td>
              <td style="${PDF_STYLES.tableCellBadge}"><span style="${PDF_STYLES.badgeModerate}">Monitor Closely</span></td>
              <td style="${PDF_STYLES.tableCellCount}">${escapeHtml(modCount)}</td>
            </tr>
            <tr style="${PDF_STYLES.tableRow}">
              <td style="${PDF_STYLES.tableCellName}">High</td>
              <td style="${PDF_STYLES.tableCellBadge}"><span style="${PDF_STYLES.badgeHigh}">Cleanup Priority</span></td>
              <td style="${PDF_STYLES.tableCellCount}">${escapeHtml(highCount)}</td>
            </tr>
            <tr>
              <td style="${PDF_STYLES.tableCellName}">Severe</td>
              <td style="${PDF_STYLES.tableCellBadge}"><span style="${PDF_STYLES.badgeSevere}">Urgent Action Required</span></td>
              <td style="${PDF_STYLES.tableCellCount}">${escapeHtml(severeCount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Waste Categories -->
      <div style="${PDF_STYLES.section}">
        <h3 style="${PDF_STYLES.sectionTitle}">
          3. Waste Category Counts
        </h3>
        <div style="${PDF_STYLES.wasteGrid}">
          ${wasteCategoryHtml}
        </div>
      </div>

      <!-- Action Recommendations Box -->
      <div style="${PDF_STYLES.recsBox}">
        <h3 style="${PDF_STYLES.recsTitle}">
          💡 Actionable Recommendations
        </h3>
        <ul style="${PDF_STYLES.recsList}">
          ${dynamicRecs.map((rec) => `<li>${escapeHtml(rec)}</li>`).join("")}
        </ul>
      </div>

      <!-- Document Footer -->
      <div style="${PDF_STYLES.footer}">
        <div>Littora Coastal Monitoring &amp; AI Waste Detection Platform</div>
        <div>Confidential &amp; System Generated</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Use compressed JPEG instead of uncompressed PNG (reduces ~9MB file to ~200KB)
    const imgData = canvas.toDataURL("image/jpeg", 0.75);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
    pdf.save(`littora_${reportType}_report_${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
