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

export async function sendEmail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || `"Littora Systems" <noreply@littora.app>`;
  const transporter = getTransporter();

  if (transporter) {
    return transporter.sendMail({ from, to, subject, text, html });
  } else {
    console.log("[EmailService Simulated Mode] Email payload:", { to, subject, text });
    return { messageId: `simulated-${Date.now()}` };
  }
}
