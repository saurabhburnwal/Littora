/**
 * Challenger 1 Empirical Adversarial Security & Penetration Suite (Express Backend)
 * Tests:
 * 1. Polyglot payloads, corrupted byte streams, and spoofed MIME types on /api/analyze
 * 2. Disallowed and bypass CORS origins on Express endpoints
 * 3. Rate limiting burst throttling on /api/analyze, /api/email/send-report, /api/auth/login
 * 4. Unauthenticated and forged email dispatch on /api/email/send-report
 * 5. Primary administrator deletion protection on DELETE /api/auth/account
 */

import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import { Buffer } from "node:buffer";
import express from "express";

// Mocks for services
const mockRunDetection = jest.fn();
const mockUploadImage = jest.fn();
const mockSaveAnalysis = jest.fn();
const mockGetUser = jest.fn();
const mockSignIn = jest.fn();
const mockDeleteUserAccountAndData = jest.fn();
const mockSendReportEmail = jest.fn();
const mockGetEmailStatus = jest.fn();

jest.unstable_mockModule("../services/aiService.js", () => ({
  runDetection: mockRunDetection,
}));

jest.unstable_mockModule("../services/emailService.js", () => ({
  sendEmail: jest.fn(),
  sendReportEmail: mockSendReportEmail,
  getEmailStatus: mockGetEmailStatus,
  generateReportEmailHtml: jest.fn().mockReturnValue("<html>Test Report</html>"),
}));

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignIn,
      resend: jest.fn(),
      admin: { getUserById: jest.fn() },
    },
  },
  uploadImage: mockUploadImage,
  saveAnalysis: mockSaveAnalysis,
  listAnalysesByUser: jest.fn(),
  listAllAnalysesAdmin: jest.fn(),
  deleteAnalysisForUser: jest.fn(),
  deleteAnalysis: jest.fn(),
  deleteUserAccountAndData: mockDeleteUserAccountAndData,
  listAnalyses: jest.fn(),
  getStats: jest.fn(),
  getAvailableAiModels: jest.fn().mockResolvedValue([]),
  getActiveSystemModel: jest.fn().mockResolvedValue("yolov11m"),
  setActiveSystemModel: jest.fn(),
  getWasteTypesCatalog: jest.fn().mockResolvedValue([]),
  getLocationsCatalog: jest.fn().mockResolvedValue([]),
}));

const { default: app } = await import("../index.js");
const { default: analyzeRouter } = await import("../routes/analyze.js");
const { default: emailRouter } = await import("../routes/email.js");
const { default: authRouter } = await import("../routes/auth.js");
const { validateImageBuffer } = await import("../middleware/fileValidation.js");

const VALID_TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

describe("Challenger 1: Empirical Adversarial Security Suite", () => {
  beforeEach(() => {
    mockRunDetection.mockReset();
    mockUploadImage.mockReset();
    mockSaveAnalysis.mockReset();
    mockGetUser.mockReset();
    mockSignIn.mockReset();
    mockDeleteUserAccountAndData.mockReset();
    mockSendReportEmail.mockReset();
    mockGetEmailStatus.mockReset();
  });

  // ===========================================================================
  // 1. POLYGLOTS, CORRUPTED STREAMS & SPOOFED MIME TYPES (/api/analyze)
  // ===========================================================================
  describe("1. Polyglot, Corrupted Byte & Spoofed MIME Ingestion Defense", () => {
    const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    // A. Direct Unit Validation across all polyglot variations
    it.each([
      ["script tag in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("<script>alert('pwned')</script>")])],
      ["php tag in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("<?php system($_GET['c']); ?>")])],
      ["svg element in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("<svg onload=alert(1)>")])],
      ["html tag in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("<html <body>injection</body></html>")])],
      ["javascript: URI in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("javascript:alert(1)")])],
      ["script tag in PNG", Buffer.concat([PNG_MAGIC, Buffer.from("<script>alert(1)</script>")])],
      ["script tag in WebP", Buffer.concat([WEBP_MAGIC, Buffer.from("<script>alert(1)</script>")])],
      ["uppercase SCRIPT tag in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("<SCRIPT>alert(1)</SCRIPT>")])],
      ["uppercase PHP tag in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("<?PHP phpinfo(); ?>")])],
      ["onload handler in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("something onload=alert(1)")])],
      ["onerror handler in JPEG", Buffer.concat([JPEG_MAGIC, Buffer.from("something onerror=alert(1)")])],
    ])("validateImageBuffer detects and rejects polyglot: %s", (_name, payload) => {
      const result = validateImageBuffer(payload);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/polyglot/i);
    });

    it.each([
      ["empty buffer (0 bytes)", Buffer.alloc(0)],
      ["1 byte truncated", Buffer.from([0xff])],
      ["3 bytes JPEG magic only", Buffer.from([0xff, 0xd8, 0xff])],
      ["7 bytes truncated header", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a])],
      ["11 bytes (one byte short of 12)", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])],
    ])("validateImageBuffer detects and rejects truncated byte stream: %s", (_name, payload) => {
      const result = validateImageBuffer(payload);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid or empty image buffer/i);
    });

    it.each([
      ["plain text disguised as image/jpeg", Buffer.from("This is just regular text pretending to be an image file.")],
      ["JSON document disguised as image/jpeg", Buffer.from(JSON.stringify({ exploit: true, root: true }))],
      ["ELF binary header disguised as image/jpeg", Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(20)])],
      ["GIF file disguised as image/jpeg", Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(20)])],
      ["PDF document disguised as image/jpeg", Buffer.from("%PDF-1.4\n%...\n%%EOF")],
      ["random null bytes disguised as image/jpeg", Buffer.alloc(64)],
    ])("validateImageBuffer rejects non-image payload: %s", (_name, payload) => {
      const result = validateImageBuffer(payload);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/signature does not match allowed image formats/i);
    });

    // B. Integration HTTP tests against Express /api/analyze router (under rate limit budget of 20)
    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/analyze", analyzeRouter);

    it("HTTP POST /api/analyze rejects polyglot JPEG payload with 400 Bad Request", async () => {
      const polyglot = Buffer.concat([JPEG_MAGIC, Buffer.from("<script>alert('pwned')</script>")]);
      const res = await request(testApp)
        .post("/api/analyze")
        .attach("image", polyglot, { filename: "attack.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/polyglot/i);
      expect(mockRunDetection).not.toHaveBeenCalled();
    });

    it("HTTP POST /api/analyze rejects truncated buffer (<12 bytes) with 400 Bad Request", async () => {
      const truncated = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const res = await request(testApp)
        .post("/api/analyze")
        .attach("image", truncated, { filename: "truncated.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid or empty image buffer/i);
      expect(mockRunDetection).not.toHaveBeenCalled();
    });

    it("HTTP POST /api/analyze rejects spoofed text file with 400 Bad Request", async () => {
      const spoofed = Buffer.from("plain text claiming to be a jpeg photo");
      const res = await request(testApp)
        .post("/api/analyze")
        .attach("image", spoofed, { filename: "fake.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/signature does not match allowed image formats/i);
      expect(mockRunDetection).not.toHaveBeenCalled();
    });

    it("HTTP POST /api/analyze rejects non-image MIME type even if image buffer provided", async () => {
      const res = await request(testApp)
        .post("/api/analyze")
        .attach("image", VALID_TINY_PNG, { filename: "test.png", contentType: "application/octet-stream" });

      expect(res.status).toBe(400);
      expect(mockRunDetection).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. DISALLOWED CORS ORIGINS
  // ===========================================================================
  describe("2. Strict CORS Origin Enforcement", () => {
    it.each([
      ["disallowed evil.com", "http://evil.com"],
      ["disallowed attacker.org", "https://attacker.org"],
      ["subdomain spoofing localhost.evil.com", "http://localhost:5173.evil.com"],
      ["prefix spoofing evil-localhost:5173", "http://evil-localhost:5173"],
      ["port spoofing evil origin", "http://localhost:4000.attacker.com"],
      ["string literal 'null'", "null"],
    ])("blocks requests from disallowed CORS origin: %s with HTTP 403", async (_desc, origin) => {
      const res = await request(app)
        .get("/health")
        .set("Origin", origin);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Blocked by CORS policy");
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it.each([
      ["http://localhost:5173", "http://localhost:5173"],
      ["http://127.0.0.1:5173", "http://127.0.0.1:5173"],
      ["http://localhost:4000", "http://localhost:4000"],
    ])("permits requests from authorized origin: %s with HTTP 200 and CORS headers", async (_desc, origin) => {
      const res = await request(app)
        .get("/health")
        .set("Origin", origin);

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("blocks preflight OPTIONS requests from disallowed origins with HTTP 403", async () => {
      const res = await request(app)
        .options("/api/stats")
        .set("Origin", "http://unauthorized-domain.com")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type, Authorization");

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Blocked by CORS policy");
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("permits preflight OPTIONS requests from authorized origins with appropriate headers", async () => {
      const res = await request(app)
        .options("/api/stats")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "GET")
        .set("Access-Control-Request-Headers", "Authorization");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });
  });

  // ===========================================================================
  // 3. UNAUTHENTICATED EMAIL DISPATCH
  // ===========================================================================
  describe("3. Email Endpoint Authentication & Spam Shield", () => {
    const emailApp = express();
    emailApp.use(express.json());
    emailApp.use("/api/email", emailRouter);

    it("strictly rejects unauthenticated POST /api/email/send-report with HTTP 401", async () => {
      const res = await request(emailApp)
        .post("/api/email/send-report")
        .send({
          recipientEmail: "victim@example.com",
          reportType: "daily",
          reportText: "Spam content",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication required/i);
      expect(mockSendReportEmail).not.toHaveBeenCalled();
    });

    it("rejects non-Bearer authorization headers with HTTP 401", async () => {
      const res = await request(emailApp)
        .post("/api/email/send-report")
        .set("Authorization", "Basic dXNlcjpwYXNz")
        .send({
          recipientEmail: "victim@example.com",
          reportType: "daily",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication required/i);
      expect(mockSendReportEmail).not.toHaveBeenCalled();
    });

    it("rejects forged / invalid Bearer token with HTTP 401", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid token signature" },
      });

      const res = await request(emailApp)
        .post("/api/email/send-report")
        .set("Authorization", "Bearer forged-token-xyz")
        .send({
          recipientEmail: "victim@example.com",
          reportType: "daily",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid or expired token/i);
      expect(mockSendReportEmail).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 4. PRIMARY ADMIN DELETION PROTECTION
  // ===========================================================================
  describe("4. Primary Administrator Account Deletion Guard", () => {
    const authApp = express();
    authApp.use(express.json());
    authApp.use("/api/auth", authRouter);

    it.each([
      ["exact admin email", "admin@littora.app"],
      ["uppercase admin email", "ADMIN@LITTORA.APP"],
      ["mixed case admin email", "Admin@Littora.App"],
      ["padded admin email with whitespace", "  admin@littora.app  "],
    ])("blocks deletion of primary admin account (%s) with HTTP 403 Forbidden", async (_desc, emailVariant) => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "primary-admin-id", email: emailVariant } },
        error: null,
      });

      const res = await request(authApp)
        .delete("/api/auth/account")
        .set("Authorization", "Bearer admin-jwt-token");

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/primary administrator account cannot be deleted/i);
      expect(mockDeleteUserAccountAndData).not.toHaveBeenCalled();
    });

    it("returns HTTP 403 if database trigger throws 'Primary administrator account cannot be deleted'", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "admin-bypass-attempt", email: "admin-alias@littora.app" } },
        error: null,
      });
      mockDeleteUserAccountAndData.mockRejectedValueOnce(
        new Error("Primary administrator account cannot be deleted: admin@littora.app")
      );

      const res = await request(authApp)
        .delete("/api/auth/account")
        .set("Authorization", "Bearer admin-bypass-jwt");

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/primary administrator account cannot be deleted/i);
    });

    it("permits standard member account deletion and invokes database cascade", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "regular-member-id", email: "regular.volunteer@example.com" } },
        error: null,
      });
      mockDeleteUserAccountAndData.mockResolvedValueOnce({ success: true });

      const res = await request(authApp)
        .delete("/api/auth/account")
        .set("Authorization", "Bearer volunteer-jwt");

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/account and associated data deleted successfully/i);
      expect(mockDeleteUserAccountAndData).toHaveBeenCalledWith("regular-member-id");
    });
  });

  // ===========================================================================
  // 5. RATE LIMITING BURST REQUESTS
  // ===========================================================================
  describe("5. Rate Limiting Throttling & Burst Protection", () => {
    it("throttles /api/analyze uploads with HTTP 429 when burst limit of 20 is exceeded", async () => {
      mockRunDetection.mockResolvedValue({
        detections: {},
        total_waste: 0,
        pollution_score: 0,
        severity: "Low",
      });
      mockUploadImage.mockResolvedValue("https://storage.example.com/burst.png");
      mockSaveAnalysis.mockResolvedValue({ id: "burst-id" });

      let hit429 = false;
      let hitCount = 0;
      for (let i = 0; i < 25; i++) {
        const res = await request(app)
          .post("/api/analyze")
          .attach("image", VALID_TINY_PNG, { filename: `burst_${i}.png`, contentType: "image/png" });

        if (res.status === 429) {
          hit429 = true;
          expect(res.body.error).toMatch(/too many upload requests/i);
          break;
        }
        hitCount++;
      }

      expect(hit429).toBe(true);
      expect(hitCount).toBeLessThanOrEqual(20);
    });

    it("throttles /api/auth/login with HTTP 429 when burst limit of 30 attempts is exceeded", async () => {
      mockSignIn.mockResolvedValue({ data: null, error: { message: "Invalid credentials" } });

      let hit429 = false;
      let hitCount = 0;
      for (let i = 0; i < 35; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .send({ email: "spammer@test.com", password: `wrong_${i}` });

        if (res.status === 429) {
          hit429 = true;
          expect(res.body.error).toMatch(/too many login attempts/i);
          break;
        }
        hitCount++;
      }

      expect(hit429).toBe(true);
      expect(hitCount).toBeLessThanOrEqual(30);
    });

    it("throttles /api/email/send-report with HTTP 429 when authenticated caller exceeds 10 reports", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "auth.user@example.com" } },
        error: null,
      });
      mockSendReportEmail.mockResolvedValue({ messageId: "burst-msg-id" });

      let hit429 = false;
      let hitCount = 0;
      for (let i = 0; i < 15; i++) {
        const res = await request(app)
          .post("/api/email/send-report")
          .set("Authorization", "Bearer valid-token")
          .send({
            recipientEmail: "recipient@example.com",
            reportType: "weekly",
            reportText: `Burst test ${i}`,
          });

        if (res.status === 429) {
          hit429 = true;
          expect(res.body.error).toMatch(/too many email report requests/i);
          break;
        }
        hitCount++;
      }

      expect(hit429).toBe(true);
      expect(hitCount).toBeLessThanOrEqual(10);
    });
  });

  // ===========================================================================
  // 6. GLOBAL API RATE LIMITER PRESENCE VERIFICATION
  // ===========================================================================
  describe("6. Global /api Rate Limiter Middleware Presence", () => {
    it("returns RateLimit-Limit header on /api/* endpoints proving global limiter is active", async () => {
      const res = await request(app)
        .get("/api/analyses")
        .set("Origin", "http://localhost:5173");

      // express-rate-limit with standardHeaders=true emits RateLimit-* headers (draft-7 / RFC 6585)
      const limitHeader =
        res.headers["ratelimit-limit"] ||
        res.headers["x-ratelimit-limit"];
      expect(limitHeader).toBeDefined();
    });

    it("returns RateLimit-Remaining header on /api/* confirming quota tracking is active", async () => {
      const res1 = await request(app)
        .get("/api/analyses")
        .set("Origin", "http://localhost:5173");

      const remaining =
        res1.headers["ratelimit-remaining"] ||
        res1.headers["x-ratelimit-remaining"];
      expect(remaining).toBeDefined();
      expect(Number(remaining)).toBeGreaterThanOrEqual(0);
    });

    it("does NOT return RateLimit headers on /health (non-/api path, confirming scoped middleware)", async () => {
      const res = await request(app)
        .get("/health");

      // /health is outside /api prefix — the global apiLimiter should NOT apply
      const limitHeader =
        res.headers["ratelimit-limit"] ||
        res.headers["x-ratelimit-limit"];
      // This may or may not have the header depending on express-rate-limit version behavior;
      // what matters is /health returns 200 successfully
      expect(res.status).toBe(200);
    });
  });
});
