import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockGetUser = jest.fn();
const mockSendEmail = jest.fn();
const mockSendReportEmail = jest.fn();
const mockGetEmailStatus = jest.fn();
const mockGenerateReportEmailHtml = jest.fn();

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
  },
}));

jest.unstable_mockModule("../services/emailService.js", () => ({
  sendEmail: mockSendEmail,
  sendReportEmail: mockSendReportEmail,
  getEmailStatus: mockGetEmailStatus,
  generateReportEmailHtml: mockGenerateReportEmailHtml,
}));

const { default: emailRouter } = await import("../routes/email.js");

const app = express();
app.use(express.json());
app.use("/api/email", emailRouter);

describe("Email Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailStatus.mockReturnValue({
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
    mockGenerateReportEmailHtml.mockReturnValue("<html><body>Sample Email</body></html>");
    mockSendReportEmail.mockResolvedValue({ messageId: "msg-12345" });
  });

  describe("GET /api/email/status", () => {
    it("returns 200 OK with transport health and configuration status", async () => {
      const res = await request(app).get("/api/email/status");

      expect(res.status).toBe(200);
      expect(mockGetEmailStatus).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual({
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
  });

  describe("POST /api/email/send-report", () => {
    it("successfully sends report for unauthenticated/guest user with recipientEmail", async () => {
      const res = await request(app)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "guest.analyst@example.com",
          reportType: "weekly",
          reportText: "Weekly analysis report details",
          reportData: { totalScans: 10, totalWaste: 40 },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Report sent to email successfully");
      expect(res.body.recipient).toBe("guest.analyst@example.com");
      expect(mockGenerateReportEmailHtml).toHaveBeenCalledWith({
        reportType: "WEEKLY",
        reportText: "Weekly analysis report details",
        reportData: { totalScans: 10, totalWaste: 40 },
      });
      expect(mockSendReportEmail).toHaveBeenCalledWith({
        to: "guest.analyst@example.com",
        subject: "Littora Beach Waste Report (WEEKLY)",
        text: "Weekly analysis report details",
        html: "<html><body>Sample Email</body></html>",
      });
    });

    it("successfully delivers report to authenticated user default email when recipientEmail omitted", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123", email: "auth.user@example.com" } },
        error: null,
      });

      const res = await request(app)
        .post("/api/email/send-report")
        .set("Authorization", "Bearer valid-token")
        .send({
          reportType: "pdf",
          reportText: "Detailed PDF audit",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Report sent to email successfully");
      expect(res.body.recipient).toBe("auth.user@example.com");
      expect(mockSendReportEmail).toHaveBeenCalledWith({
        to: "auth.user@example.com",
        subject: "Littora Beach Waste Report (PDF)",
        text: "Detailed PDF audit",
        html: "<html><body>Sample Email</body></html>",
      });
    });

    it("allows authenticated user to specify custom recipientEmail override", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123", email: "auth.user@example.com" } },
        error: null,
      });

      const res = await request(app)
        .post("/api/email/send-report")
        .set("Authorization", "Bearer valid-token")
        .send({
          recipientEmail: "custom.recipient@example.com",
          reportType: "daily",
        });

      expect(res.status).toBe(200);
      expect(res.body.recipient).toBe("custom.recipient@example.com");
      expect(mockSendReportEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: "custom.recipient@example.com",
        subject: "Littora Beach Waste Report (DAILY)",
      }));
    });

    it("returns 400 Bad Request if recipient email is missing (unauthenticated guest without recipientEmail)", async () => {
      const res = await request(app)
        .post("/api/email/send-report")
        .send({ reportType: "pdf", reportText: "Test report body" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Recipient email is required");
      expect(mockSendReportEmail).not.toHaveBeenCalled();
    });

    it("returns 400 Bad Request if recipient email is invalid according to RFC 5322", async () => {
      const invalidEmails = [
        "not-an-email",
        "user@",
        "@domain.com",
        "user@domain",
        "user @domain.com",
        "user@.com",
      ];

      for (const invalid of invalidEmails) {
        const res = await request(app)
          .post("/api/email/send-report")
          .send({
            recipientEmail: invalid,
            reportType: "monthly",
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid recipient email address");
        expect(mockSendReportEmail).not.toHaveBeenCalled();
      }
    });

    it("returns 400 Bad Request if reportType is missing from payload", async () => {
      const res = await request(app)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "valid@example.com",
          reportText: "Some report",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid or missing reportType");
      expect(mockSendReportEmail).not.toHaveBeenCalled();
    });

    it("returns 400 Bad Request if reportType is non-string or whitespace", async () => {
      const resNum = await request(app)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "valid@example.com",
          reportType: 12345,
        });

      expect(resNum.status).toBe(400);
      expect(resNum.body.error).toBe("Invalid or missing reportType");

      const resSpace = await request(app)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "valid@example.com",
          reportType: "   ",
        });

      expect(resSpace.status).toBe(400);
      expect(resSpace.body.error).toBe("Invalid or missing reportType");
      expect(mockSendReportEmail).not.toHaveBeenCalled();
    });

    it("uses default report text when reportText is omitted", async () => {
      const res = await request(app)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "analyst@example.com",
          reportType: "monthly",
        });

      expect(res.status).toBe(200);
      expect(mockSendReportEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: "analyst@example.com",
        subject: "Littora Beach Waste Report (MONTHLY)",
        text: "Your Littora beach waste report is ready.",
      }));
    });

    it("handles sendReportEmail exceptions and returns 500 error", async () => {
      mockSendReportEmail.mockRejectedValueOnce(new Error("SMTP Connection Failed"));

      const res = await request(app)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "target@example.com",
          reportType: "csv",
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Could not send report email");
      expect(res.body.details).toBe("SMTP Connection Failed");
    });
  });
});
