import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

router.post("/send-report", requireAuth, async (req, res) => {
  const { reportType, reportText } = req.body || {};
  const recipient = req.user?.email;

  if (!recipient) {
    return res.status(400).json({ error: "User email not found" });
  }

  if (!reportType || typeof reportType !== "string" || !reportType.trim()) {
    return res.status(400).json({ error: "Invalid or missing reportType" });
  }

  const safeReportType = reportType.trim().toUpperCase();
  const safeReportText = typeof reportText === "string" && reportText.trim()
    ? reportText
    : "Your Littora beach waste report is ready.";

  try {
    await sendEmail({
      to: recipient,
      subject: `Littora Beach Waste Report (${safeReportType})`,
      text: safeReportText,
    });
    res.json({ message: "Report sent to email successfully", recipient });
  } catch (err) {
    console.error("Email delivery failed:", err.message);
    res.status(500).json({ error: "Could not send report email", details: err.message });
  }
});

export default router;
