import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const { sendEmail } = await import("../services/emailService.js");

describe("EmailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("sends email in simulated mode when SMTP credentials are absent", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      text: "Test body text",
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
      html: undefined,
    });
    expect(result).toEqual({ messageId: "smtp-12345" });
  });

  it("uses port 587 default and non-secure setting when SMTP_PORT is not 465", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    delete process.env.SMTP_PORT;
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "pass";

    mockSendMail.mockResolvedValueOnce({ messageId: "smtp-587" });

    await sendEmail({ to: "target@example.com", subject: "Port 587" });

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "user@example.com", pass: "pass" },
    }));
  });
});
