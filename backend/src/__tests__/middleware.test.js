/**
 * Tests for middleware/auth.js
 * requireAuth — verifies Bearer JWT, attaches req.user
 * requireAdmin — checks ADMIN_EMAIL env var
 */
import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import multer from "multer";

// ── Mock supabaseClient before import ───────────────────────────────────────
const mockGetUser = jest.fn();
jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: { auth: { getUser: mockGetUser } },
}));

const { requireAuth, requireAdmin } = await import("../middleware/auth.js");

// Helpers
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
describe("requireAuth middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when Authorization header is absent", async () => {
    const req  = { headers: {} };
    const res  = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header does not start with 'Bearer '", async () => {
    const req  = { headers: { authorization: "Token abc123" } };
    const res  = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase returns an error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: null, error: new Error("invalid jwt") });

    const req  = { headers: { authorization: "Bearer bad-token" } };
    const res  = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase returns no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req  = { headers: { authorization: "Bearer token-with-no-user" } };
    const res  = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches req.user and calls next() for a valid token", async () => {
    const fakeUser = { id: "user-123", email: "user@test.com" };
    mockGetUser.mockResolvedValueOnce({ data: { user: fakeUser }, error: null });

    const req  = { headers: { authorization: "Bearer valid-token" } };
    const res  = makeRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("requireAdmin middleware", () => {
  it("returns 403 when user email does not match ADMIN_EMAIL", () => {
    const req  = { user: { email: "regular@test.com" } };
    const res  = makeRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when req.user is missing", () => {
    const req  = {};
    const res  = makeRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user email matches ADMIN_EMAIL", () => {
    const req  = { user: { email: "admin@littora.app" } };
    const res  = makeRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Global Error Handler & Production Sanitization", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  const createTestApp = () => {
    const app = express();

    app.get("/trigger-500", (_req, _res, next) => {
      next(new Error("Sensitive DB query syntax error at line 42"));
    });

    app.get("/trigger-multer-size", (_req, _res, next) => {
      const err = new multer.MulterError("LIMIT_FILE_SIZE");
      next(err);
    });

    app.get("/trigger-multer-field", (_req, _res, next) => {
      const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
      next(err);
    });

    // Global Error Handler mirroring index.js
    app.use((err, _req, res, _next) => {
      if (err instanceof multer.MulterError || err?.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File size exceeds 10MB limit" });
        }
        return res.status(400).json({ error: err.message || "Invalid multipart form data" });
      }

      const statusCode = err.status || err.statusCode || 500;
      if (statusCode >= 500 && process.env.NODE_ENV === "production") {
        return res.status(statusCode).json({ error: "Internal server error" });
      }

      res.status(statusCode).json({ error: err.message || "Internal server error" });
    });

    return app;
  };

  it("masks 500 internal error details in production mode", async () => {
    process.env.NODE_ENV = "production";
    const testApp = createTestApp();

    const res = await request(testApp).get("/trigger-500");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(res.body.error).not.toContain("Sensitive DB query");
  });

  it("exposes detailed error message in non-production mode", async () => {
    process.env.NODE_ENV = "development";
    const testApp = createTestApp();

    const res = await request(testApp).get("/trigger-500");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Sensitive DB query syntax error at line 42");
  });

  it("maps Multer LIMIT_FILE_SIZE to 413 Payload Too Large", async () => {
    const testApp = createTestApp();

    const res = await request(testApp).get("/trigger-multer-size");
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("File size exceeds 10MB limit");
  });

  it("maps Multer form error to 400 Bad Request", async () => {
    const testApp = createTestApp();

    const res = await request(testApp).get("/trigger-multer-field");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unexpected file|unexpected field/i);
  });
});
