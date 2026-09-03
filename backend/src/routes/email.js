import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import {
  sendEmail,
  sendReportEmail,
  getEmailStatus,
  generateReportEmailHtml,
} from "../services/emailService.js";

const router = Router();

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 email reports per hour
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  message: { error: "Too many email report requests from this IP. Please try again after an hour." },
});

const RFC5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

router.get("/status", (_req, res) => {
  const status = getEmailStatus();
  return res.json(status);
});

router.post("/send-report", emailLimiter, requireAuth, async (req, res) => {
  const { reportType, reportText, recipientEmail, reportData } = req.body || {};
  const recipient = (recipientEmail || req.user?.email || "").trim();

  if (!recipient) {
    return res.status(400).json({ error: "Recipient email is required" });
  }

  if (!RFC5322_EMAIL_REGEX.test(recipient) || recipient.length > 254) {
    return res.status(400).json({ error: "Invalid recipient email address" });
  }

  if (!reportType || typeof reportType !== "string" || !reportType.trim()) {
    return res.status(400).json({ error: "Invalid or missing reportType" });
  }

  const safeReportType = reportType.trim().toUpperCase();
  const safeReportText =
    typeof reportText === "string" && reportText.trim()
      ? reportText
      : "Your Littora beach waste report is ready.";

  const html = generateReportEmailHtml({
    reportType: safeReportType,
    reportText: safeReportText,
    reportData,
  });

  try {
    const result = await sendReportEmail({
      to: recipient,
      subject: `Littora Beach Waste Report (${safeReportType})`,
      text: safeReportText,
      html,
    });
    return res.json({
      message: "Report sent to email successfully",
      recipient,
      messageId: result?.messageId,
    });
  } catch (err) {
    console.error("Email delivery failed:", err.message);
    return res.status(500).json({
      error: "Could not send report email",
      details: err.message,
    });
  }
});

export default router;
