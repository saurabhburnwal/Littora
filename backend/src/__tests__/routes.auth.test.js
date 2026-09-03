/**
 * Integration tests for auth routes
 * POST /api/auth/login
 * POST /api/auth/logout
 */
import { jest } from "@jest/globals";
import request from "supertest";

// ── Mock supabaseClient before app import ───────────────────────────────────
const mockSignIn = jest.fn();
const mockResend = jest.fn();
const mockGetUser = jest.fn();
const mockDeleteUserAccountAndData = jest.fn();
jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: {
    auth: {
      getUser:            mockGetUser,
      signInWithPassword: mockSignIn,
      resend:             mockResend,
      admin:              { getUserById: jest.fn() },
    },
  },
  uploadImage:              jest.fn(),
  saveAnalysis:             jest.fn(),
  listAnalysesByUser:       jest.fn(),
  listAllAnalysesAdmin:     jest.fn(),
  deleteAnalysisForUser:    jest.fn(),
  deleteAnalysis:           jest.fn(),
  deleteUserAccountAndData: mockDeleteUserAccountAndData,
  listAnalyses:          jest.fn(),
  getStats:              jest.fn(),
  getAvailableAiModels:  jest.fn().mockResolvedValue([]),
  getActiveSystemModel:  jest.fn().mockResolvedValue("yolov8m"),
  setActiveSystemModel:  jest.fn(),
  getWasteTypesCatalog:  jest.fn().mockResolvedValue([]),
  getLocationsCatalog:   jest.fn().mockResolvedValue([]),
}));

const { default: app } = await import("../index.js");

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "pass123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 when Supabase rejects credentials", async () => {
    mockSignIn.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid login credentials" },
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 200 with tokens on successful login", async () => {
    mockSignIn.mockResolvedValueOnce({
      data: {
        session: {
          access_token:  "access-tok",
          refresh_token: "refresh-tok",
          expires_in:    3600,
        },
        user: { id: "uid-1", email: "user@test.com" },
      },
      error: null,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "correct" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      access_token:  "access-tok",
      refresh_token: "refresh-tok",
      expires_in:    3600,
      user: { id: "uid-1", email: "user@test.com" },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
  it("returns 200 with a success message", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when email is whitespace", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when Supabase resend returns an error", async () => {
    mockResend.mockResolvedValueOnce({
      error: { message: "User not found or rate limited" },
    });

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "missing@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/User not found/i);
  });

  it("returns 200 on successful verification resend", async () => {
    mockResend.mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "valid@test.com" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: expect.stringMatching(/verification email sent/i),
      recipient: "valid@test.com",
    });
    expect(mockResend).toHaveBeenCalledWith({
      type: "signup",
      email: "valid@test.com",
      options: {
        emailRedirectTo: expect.stringContaining("/login?verified=true"),
      },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /api/auth/account", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).delete("/api/auth/account");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("returns 403 when the primary administrator attempts account deletion", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "admin-id", email: "admin@littora.app" } },
      error: null,
    });

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/primary administrator/i);
    expect(mockDeleteUserAccountAndData).not.toHaveBeenCalled();
  });

  it("returns 200 and calls deleteUserAccountAndData for an authenticated member", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "member@example.com" } },
      error: null,
    });
    mockDeleteUserAccountAndData.mockResolvedValueOnce({ success: true });

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/account.*deleted/i);
    expect(mockDeleteUserAccountAndData).toHaveBeenCalledWith("user-123");
  });

  it("returns 500 when deleteUserAccountAndData throws an error", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "member@example.com" } },
      error: null,
    });
    mockDeleteUserAccountAndData.mockRejectedValueOnce(new Error("Database cascade failed"));

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Database cascade failed/i);
  });

  it("returns 401 when Bearer token is expired on account deletion", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer expired-token");

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired token/i);
    expect(mockDeleteUserAccountAndData).not.toHaveBeenCalled();
  });

  it("returns 403 when primary administrator deletion is attempted with uppercase email", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "admin-id", email: "ADMIN@LITTORA.APP" } },
      error: null,
    });

    const res = await request(app)
      .delete("/api/auth/account")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/primary administrator/i);
    expect(mockDeleteUserAccountAndData).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login (Rate Limiting)", () => {
  it("enforces rate limit throttling returning 429 when max login attempts exceeded", async () => {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: { message: "Invalid credentials" } });

    let lastRes;
    for (let i = 0; i < 35; i++) {
      lastRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "spammer@test.com", password: "password123" });
      if (lastRes.status === 429) break;
    }

    expect(lastRes.status).toBe(429);
    expect(lastRes.body.error).toMatch(/too many login attempts/i);
  });
});

