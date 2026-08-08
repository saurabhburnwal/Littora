/**
 * Generates and downloads a styled PDF report for Littora Beach Waste Detection.
 * @param {string} reportType - "daily" | "weekly" | "monthly" | "custom"
 * @param {object} stats - Analytics data from StatsContext
 * @param {object} user - Current logged in user
 */
export async function generatePdfReport(reportType, stats = {}, user = null) {
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

  const totalDetections = (stats.totalAnalyses || 0).toLocaleString();
  const totalWaste = (stats.totalWasteAllTime || 0).toLocaleString();
  const locationsCount = stats.locations?.length || 0;
  const avgScore = stats.avgScore || 0;

  const lowCount = stats.severityCounts?.Low || 0;
  const modCount = stats.severityCounts?.Moderate || 0;
  const highCount = stats.severityCounts?.High || 0;
  const severeCount = stats.severityCounts?.Severe || 0;

  const bottleCount = stats.aggregateDetections?.bottle || 0;
  const canCount = stats.aggregateDetections?.can || 0;
  const bagCount = stats.aggregateDetections?.bag || 0;
  const wrapperCount = stats.aggregateDetections?.wrapper || 0;

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
    <div style="padding: 32px 40px; background: #ffffff;">
      <!-- Header Banner -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 26px; font-weight: 800; color: #0d9488; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px;">
            LITTORA
          </div>
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
            AI Beach Waste Detection & Monitoring System
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">
            ${reportType} Report
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
            Generated: ${timestamp}
          </div>
        </div>
      </div>

      <!-- Report Metadata -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; justify-content: space-between; font-size: 13px;">
        <div>
          <span style="color: #64748b; font-weight: 500;">Report Scope:</span> 
          <strong style="color: #0f172a;">${reportTitle}</strong>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 500;">Generated For:</span> 
          <strong style="color: #0f172a;">${user?.email || "Authenticated User"}</strong>
        </div>
      </div>

      <!-- Summary KPI Grid -->
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-left: 4px solid #0d9488; padding-left: 8px;">
          1. Summary Metrics
        </h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #166534;">${totalDetections}</div>
            <div style="font-size: 11px; font-weight: 600; color: #15803d; text-transform: uppercase; margin-top: 2px;">Analyses Performed</div>
          </div>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #075985;">${totalWaste}</div>
            <div style="font-size: 11px; font-weight: 600; color: #0369a1; text-transform: uppercase; margin-top: 2px;">Total Waste Items</div>
          </div>
          <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #854d0e;">${locationsCount}</div>
            <div style="font-size: 11px; font-weight: 600; color: #a16207; text-transform: uppercase; margin-top: 2px;">Beaches Monitored</div>
          </div>
          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #6b21a8;">${avgScore} / 10</div>
            <div style="font-size: 11px; font-weight: 600; color: #7e22ce; text-transform: uppercase; margin-top: 2px;">Avg Pollution Index</div>
          </div>
        </div>
      </div>

      <!-- Severity Distribution -->
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-left: 4px solid #0d9488; padding-left: 8px;">
          2. Pollution Severity Breakdown
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; text-align: left;">
              <th style="padding: 10px 12px; border-radius: 6px 0 0 6px; font-weight: 600;">Severity Level</th>
              <th style="padding: 10px 12px; font-weight: 600;">Status Indicator</th>
              <th style="padding: 10px 12px; border-radius: 0 6px 6px 0; text-align: right; font-weight: 600;">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">Low</td>
              <td style="padding: 10px 12px;"><span style="display: inline-block; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">Minimal Risk</span></td>
              <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1e293b;">${lowCount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">Moderate</td>
              <td style="padding: 10px 12px;"><span style="display: inline-block; background: #fef9c3; color: #a16207; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">Monitor Closely</span></td>
              <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1e293b;">${modCount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">High</td>
              <td style="padding: 10px 12px;"><span style="display: inline-block; background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">Cleanup Priority</span></td>
              <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1e293b;">${highCount}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">Severe</td>
              <td style="padding: 10px 12px;"><span style="display: inline-block; background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">Urgent Action Required</span></td>
              <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1e293b;">${severeCount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Waste Categories -->
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; border-left: 4px solid #0d9488; padding-left: 8px;">
          3. Waste Category Counts
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
            <span>🍼 Plastic Bottles</span>
            <strong>${bottleCount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
            <span>🥫 Metal Cans</span>
            <strong>${canCount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
            <span>🛍️ Plastic Bags</span>
            <strong>${bagCount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
            <span>🍫 Food Wrappers</span>
            <strong>${wrapperCount}</strong>
          </div>
        </div>
      </div>

      <!-- Recommended Action Items -->
      <div style="margin-bottom: 32px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">
          💡 Actionable Recommendations
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #134e4a; font-size: 12px; line-height: 1.6;">
          <li>Prioritize community cleanup drives at beaches exhibiting High or Severe pollution indices.</li>
          <li>Deploy additional waste disposal & recycling bins in areas with high plastic bottle counts.</li>
          <li>Maintain automated surveillance schedules to monitor trend dynamics over time.</li>
        </ul>
      </div>

      <!-- Document Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
        <div>Littora Coastal Monitoring & AI Waste Detection Platform</div>
        <div>Confidential & System Generated</div>
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
