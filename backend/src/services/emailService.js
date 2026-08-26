import nodemailer from "nodemailer";

let _cachedTransporter = null;
let _cachedKey = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    const key = `${host}:${port}:${user}:${pass}`;
    if (_cachedTransporter && _cachedKey === key) {
      return _cachedTransporter;
    }
    _cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });
    _cachedKey = key;
    return _cachedTransporter;
  }

  _cachedTransporter = null;
  _cachedKey = null;
  return null;
}

export function getEmailStatus() {
  const host = process.env.SMTP_HOST || null;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || null;
  const pass = process.env.SMTP_PASS || null;
  const configured = Boolean(host && user && pass);
  const secure = port === 465;

  return {
    status: "healthy",
    mode: configured ? "smtp" : "simulated",
    configured,
    transport: {
      host: host ? String(host) : null,
      port: isNaN(port) ? 587 : port,
      secure,
      authConfigured: Boolean(user && pass),
    },
  };
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateReportEmailHtml({ reportType = "Environmental", reportText = "", reportData = {} } = {}) {
  const safeType = String(reportType || "Environmental").toUpperCase();
  const safeText = String(reportText || "");
  const data = reportData || {};

  const totalScans = data.totalScans ?? data.totalAnalyses ?? data.total_detections ?? data.scans ?? "—";
  const totalWaste = data.totalWaste ?? data.total_waste ?? data.wasteCount ?? "—";
  const rawScore = data.avgPollutionScore ?? data.avg_pollution_score ?? data.pollutionScore;
  const avgScore = rawScore !== undefined && rawScore !== null ? (typeof rawScore === "number" ? Math.round(rawScore) : rawScore) : "—";

  const severityCounts = data.severityCounts || data.severity_counts || {};
  const lowCount = severityCounts.Low ?? severityCounts.low ?? 0;
  const modCount = severityCounts.Moderate ?? severityCounts.moderate ?? 0;
  const highCount = severityCounts.High ?? severityCounts.high ?? 0;
  const sevCount = severityCounts.Severe ?? severityCounts.severe ?? 0;

  const executiveSummary = data.executiveSummary || data.summary || data.aiSummary || "";
  const dateRange = data.dateRange || data.period || "";
  const location = data.location || "";
  const recommendations = Array.isArray(data.recommendations || data.priorityActions)
    ? (data.recommendations || data.priorityActions)
    : [];

  const topWasteTypes = data.topWasteTypes || data.top_waste_types || data.wasteComposition || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Littora Beach Waste Report - ${escapeHtml(safeType)}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: left; border-bottom: 3px solid #0d9488;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <div style="font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #2dd4bf; margin: 0; text-transform: uppercase;">LITTORA</div>
              <div style="color: #94a3b8; font-size: 12px; font-weight: 500; letter-spacing: 0.5px; margin-top: 4px;">AI Coastal Waste Monitoring & Environmental Intelligence</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="display: inline-block; padding: 6px 14px; background-color: rgba(45, 212, 191, 0.12); border: 1px solid rgba(45, 212, 191, 0.4); border-radius: 20px; color: #2dd4bf; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                ${escapeHtml(safeType)} REPORT
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px;">
        ${dateRange || location ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #475569;">
          ${dateRange ? `<strong>Period:</strong> ${escapeHtml(dateRange)} &nbsp;&bull;&nbsp; ` : ""}
          ${location ? `<strong>Location:</strong> ${escapeHtml(location)} &nbsp;&bull;&nbsp; ` : ""}
          <strong>Generated:</strong> ${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC
        </div>` : ""}

        <!-- KPI Summary Cards -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #166534;">Total Scans</div>
              <div style="font-size: 24px; font-weight: 800; color: #14532d; margin-top: 4px;">${escapeHtml(String(totalScans))}</div>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0369a1;">Total Waste</div>
              <div style="font-size: 24px; font-weight: 800; color: #0c4a6e; margin-top: 4px;">${escapeHtml(String(totalWaste))}</div>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #7e22ce;">Pollution Score</div>
              <div style="font-size: 24px; font-weight: 800; color: #581c87; margin-top: 4px;">${escapeHtml(String(avgScore))}</div>
            </td>
          </tr>
        </table>

        <!-- Severity Breakdown -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px;">Severity Breakdown</div>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="24%" style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 10px 8px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: #15803d; text-transform: uppercase;">Low</div>
                <div style="font-size: 16px; font-weight: 800; color: #166534; margin-top: 2px;">${escapeHtml(String(lowCount))}</div>
              </td>
              <td width="1.3%">&nbsp;</td>
              <td width="24%" style="background-color: #fef9c3; border: 1px solid #fde047; border-radius: 6px; padding: 10px 8px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: #a16207; text-transform: uppercase;">Moderate</div>
                <div style="font-size: 16px; font-weight: 800; color: #854d0e; margin-top: 2px;">${escapeHtml(String(modCount))}</div>
              </td>
              <td width="1.3%">&nbsp;</td>
              <td width="24%" style="background-color: #ffedd5; border: 1px solid #fdba74; border-radius: 6px; padding: 10px 8px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: #c2410c; text-transform: uppercase;">High</div>
                <div style="font-size: 16px; font-weight: 800; color: #9a3412; margin-top: 2px;">${escapeHtml(String(highCount))}</div>
              </td>
              <td width="1.3%">&nbsp;</td>
              <td width="24%" style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 8px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Severe</div>
                <div style="font-size: 16px; font-weight: 800; color: #991b1b; margin-top: 2px;">${escapeHtml(String(sevCount))}</div>
              </td>
            </tr>
          </table>
        </div>

        ${topWasteTypes && typeof topWasteTypes === "object" && Object.keys(topWasteTypes).length > 0 ? `
        <!-- Top Waste Types -->
        <div style="margin-bottom: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px;">Waste Composition</div>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            ${Object.entries(topWasteTypes).map(([type, count]) => `
              <tr>
                <td style="padding: 4px 0; font-size: 13px; color: #334155; text-transform: capitalize;"><strong>${escapeHtml(type)}</strong></td>
                <td style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">${escapeHtml(String(count))} items</td>
              </tr>
            `).join("")}
          </table>
        </div>` : ""}

        ${executiveSummary ? `
        <!-- AI Executive Summary -->
        <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #0f766e; text-transform: uppercase; margin-bottom: 6px;">AI Executive Summary</div>
          <div style="font-size: 13px; line-height: 1.6; color: #134e4a;">${escapeHtml(executiveSummary)}</div>
        </div>` : ""}

        ${recommendations.length > 0 ? `
        <!-- Action Recommendations -->
        <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #854d0e; text-transform: uppercase; margin-bottom: 8px;">Priority Actions</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #713f12;">
            ${recommendations.map(r => `<li>${escapeHtml(String(r))}</li>`).join("")}
          </ul>
        </div>` : ""}

        <!-- Full Report Text -->
        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Full Report Summary</div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-family: inherit;">${escapeHtml(safeText)}</div>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f5f9; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 12px; font-weight: 600; color: #475569;">Littora Environmental Coastal Intelligence Platform</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Automated certified environmental audit report. Empowering cleaner coastlines worldwide.</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || "Littora Environmental <reports@littora.org>";
  const transporter = getTransporter();

  if (transporter) {
    return transporter.sendMail({ from, to, subject, text, html });
  } else {
    console.log("[EmailService Simulated Mode] Email payload:", { to, subject, text, hasHtml: Boolean(html) });
    return { messageId: `simulated-${Date.now()}` };
  }
}

export async function sendReportEmail({ to, subject, text, html, reportType, reportData }) {
  const finalHtml = html || generateReportEmailHtml({ reportType: reportType || "Environmental", reportText: text, reportData });
  const finalSubject = subject || `Littora Beach Waste Report (${(reportType || "Environmental").toUpperCase()})`;
  return sendEmail({
    to,
    subject: finalSubject,
    text: text || "Your Littora beach waste report is ready.",
    html: finalHtml,
  });
}
