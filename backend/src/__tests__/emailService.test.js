import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const {
  sendEmail,
  sendReportEmail,
  getEmailStatus,
  generateReportEmailHtml,
} = await import("../services/emailService.js");

describe("EmailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getEmailStatus", () => {
    it("returns simulated status when SMTP environment variables are missing", () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const status = getEmailStatus();
      expect(status).toEqual({
        status: "healthy",
        mode: "simulated",
        configured: false,
        transport: {
          host: null,
          port: 587,
          secure: false,
          authConfigured: false,
        },
      });
    });

    it("returns smtp status with transport details when SMTP is fully configured", () => {
      process.env.SMTP_HOST = "smtp.resend.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_USER = "resend";
      process.env.SMTP_PASS = "re_secret_key";

      const status = getEmailStatus();
      expect(status).toEqual({
        status: "healthy",
        mode: "smtp",
        configured: true,
        transport: {
          host: "smtp.resend.com",
          port: 465,
          secure: true,
          authConfigured: true,
        },
      });
    });
  });

  describe("generateReportEmailHtml", () => {
    it("generates rich HTML with Littora branding, KPI cards, and severity pills", () => {
      const html = generateReportEmailHtml({
        reportType: "weekly",
        reportText: "Weekly analysis overview for coastal zone 4.",
        reportData: {
          totalScans: 15,
          totalWaste: 68,
          avgPollutionScore: 54,
          severityCounts: { Low: 5, Moderate: 6, High: 3, Severe: 1 },
          topWasteTypes: { bottle: 25, bag: 20, can: 15, wrapper: 8 },
          executiveSummary: "High concentration of recyclable plastics observed along the north shore.",
          recommendations: [
            "Deploy volunteer cleanup crew to North Beach",
            "Install additional recycling receptacles",
          ],
          dateRange: "Aug 19, 2026 – Aug 26, 2026",
          location: "Goa Coastal Zone",
        },
      });

      expect(typeof html).toBe("string");
      expect(html).toContain("LITTORA");
      expect(html).toContain("WEEKLY REPORT");
      expect(html).toContain("Total Scans");
      expect(html).toContain("15");
      expect(html).toContain("Total Waste");
      expect(html).toContain("68");
      expect(html).toContain("Pollution Score");
      expect(html).toContain("54");
      expect(html).toContain("Low");
      expect(html).toContain("Moderate");
      expect(html).toContain("High");
      expect(html).toContain("Severe");
      expect(html).toContain("High concentration of recyclable plastics");
      expect(html).toContain("Deploy volunteer cleanup crew to North Beach");
      expect(html).toContain("Weekly analysis overview for coastal zone 4.");
      expect(html).toContain("Aug 19, 2026 – Aug 26, 2026");
      expect(html).toContain("Goa Coastal Zone");
      expect(html).toContain("bottle");
      expect(html).toContain("25 items");
    });

    it("escapes unsafe HTML content in user inputs", () => {
      const html = generateReportEmailHtml({
        reportType: "<script>alert('xss')</script>",
        reportText: "<b>Injected</b> & Unescaped 'test'",
        reportData: {
          executiveSummary: '<img src=x onerror="alert(1)">',
        },
      });

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;SCRIPT&gt;ALERT(&#039;XSS&#039;)&lt;/SCRIPT&gt;");
      expect(html).toContain("&lt;b&gt;Injected&lt;/b&gt; &amp; Unescaped &#039;test&#039;");
      expect(html).not.toContain('<img src=x onerror="alert(1)">');
      expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    });

    it("handles missing or empty arguments gracefully with clean fallbacks", () => {
      const html = generateReportEmailHtml();
      expect(typeof html).toBe("string");
      expect(html).toContain("LITTORA");
      expect(html).toContain("ENVIRONMENTAL REPORT");
      expect(html).toContain("—");
    });
  });

  describe("sendEmail", () => {
    it("sends email in simulated mode when SMTP credentials are absent", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test body text",
        html: "<p>Test HTML</p>",
      });

      expect(result).toHaveProperty("messageId");
      expect(result.messageId).toContain("simulated-");
    });

    it("sends email via nodemailer transporter when SMTP env vars are present", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "secretpass";
      process.env.SMTP_FROM = '"Littora" <info@littora.app>';

      mockSendMail.mockResolvedValueOnce({ messageId: "smtp-12345" });

      const result = await sendEmail({
        to: "recipient@example.com",
        subject: "Real Report",
        text: "Content text",
        html: "<h1>Report</h1>",
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
        host: "smtp.example.com",
        port: 465,
        secure: true,
        auth: { user: "user@example.com", pass: "secretpass" },
      }));
      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Littora" <info@littora.app>',
        to: "recipient@example.com",
        subject: "Real Report",
        text: "Content text",
        html: "<h1>Report</h1>",
      });
      expect(result).toEqual({ messageId: "smtp-12345" });
    });

    it("uses port 587 default and non-secure setting when SMTP_PORT is not 465", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      delete process.env.SMTP_PORT;
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "pass";
      delete process.env.SMTP_FROM;

      mockSendMail.mockResolvedValueOnce({ messageId: "smtp-587" });

      await sendEmail({ to: "target@example.com", subject: "Port 587" });

      expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "user@example.com", pass: "pass" },
      }));
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: "Littora Environmental <reports@littora.org>",
        to: "target@example.com",
      }));
    });
  });

  describe("sendReportEmail", () => {
    it("generates HTML from reportData and dispatches email", async () => {
      delete process.env.SMTP_HOST;

      const result = await sendReportEmail({
        to: "analyst@littora.org",
        reportType: "daily",
        text: "Daily summary",
        reportData: { totalScans: 4, totalWaste: 12 },
      });

      expect(result).toHaveProperty("messageId");
      expect(result.messageId).toContain("simulated-");
    });
  });
});
