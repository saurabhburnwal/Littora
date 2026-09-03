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
  supabase: {
    auth: { getUser: mockGetUser, admin: { getUserById: jest.fn() } },
  },
  uploadImage:              jest.fn(),
  saveAnalysis:             jest.fn(),
  listAnalysesByUser:       jest.fn(),
  listAllAnalysesAdmin:     jest.fn(),
  deleteAnalysisForUser:    jest.fn(),
  deleteAnalysis:           jest.fn(),
  deleteUserAccountAndData: jest.fn(),
  listAnalyses:             jest.fn().mockResolvedValue([]),
  getStats:                 jest.fn().mockResolvedValue({}),
  getAvailableAiModels:     jest.fn().mockResolvedValue([]),
  getActiveSystemModel:     jest.fn().mockResolvedValue("yolov8m"),
  setActiveSystemModel:     jest.fn(),
  getWasteTypesCatalog:     jest.fn().mockResolvedValue([]),
  getLocationsCatalog:      jest.fn().mockResolvedValue([]),
}));

const { requireAuth, requireAdmin } = await import("../middleware/auth.js");
const { default: app } = await import("../index.js");

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

  beforeAll(() => {
    const testRouter = express.Router();
    testRouter.get("/trigger-500", (_req, _res, next) => {
      next(new Error("Sensitive DB query syntax error at line 42"));
    });
    testRouter.get("/trigger-multer-size", (_req, _res, next) => {
      const err = new multer.MulterError("LIMIT_FILE_SIZE");
      next(err);
    });
    testRouter.get("/trigger-multer-field", (_req, _res, next) => {
      const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
      next(err);
    });

    const errorIdx = app._router.stack.findIndex((l) => l.handle.length === 4);
    const targetIdx = errorIdx > 0 ? errorIdx - 1 : app._router.stack.length;
    app.use(testRouter);
    const newLayer = app._router.stack.pop();
    app._router.stack.splice(targetIdx, 0, newLayer);
  });

  it("enforces production security headers (Helmet)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("returns 404 with error message for unmatched routes", async () => {
    const res = await request(app).get("/api/unknown-unmatched-route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Route not found" });
  });

  it("masks 500 internal error details in production mode", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app).get("/trigger-500");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(res.body.error).not.toContain("Sensitive DB query");
  });

  it("exposes detailed error message in non-production mode", async () => {
    process.env.NODE_ENV = "development";

    const res = await request(app).get("/trigger-500");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Sensitive DB query syntax error at line 42");
  });

  it("maps Multer LIMIT_FILE_SIZE to 413 Payload Too Large", async () => {
    const res = await request(app).get("/trigger-multer-size");
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("File size exceeds 10MB limit");
  });

  it("maps Multer form error to 400 Bad Request", async () => {
    const res = await request(app).get("/trigger-multer-field");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unexpected file|unexpected field/i);
  });
});
