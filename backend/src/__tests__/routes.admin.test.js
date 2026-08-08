/**
 * Integration tests for admin routes
 * GET    /api/admin/analyses
 * DELETE /api/admin/analyses/:id
 */
import { jest } from "@jest/globals";
import request from "supertest";

const mockGetUser           = jest.fn();
const mockListAllAdmin      = jest.fn();
const mockDeleteAnalysis    = jest.fn();

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: { auth: { getUser: mockGetUser, admin: { getUserById: jest.fn() } } },
  uploadImage:           jest.fn(),
  saveAnalysis:          jest.fn(),
  listAnalysesByUser:    jest.fn(),
  listAllAnalysesAdmin:  mockListAllAdmin,
  deleteAnalysisForUser: jest.fn(),
  deleteAnalysis:        mockDeleteAnalysis,
  listAnalyses:          jest.fn(),
  getStats:              jest.fn(),
  AVAILABLE_MODELS:      [],
  getActiveSystemModel:  jest.fn().mockResolvedValue("yolov8m"),
  setActiveSystemModel:  jest.fn(),
}));

const { default: app } = await import("../index.js");

const ADMIN_USER   = { id: "admin-1",  email: "admin@littora.app" };
const REGULAR_USER = { id: "user-99",  email: "regular@test.com" };

function authAs(user) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/admin/analyses", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/admin/analyses");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    authAs(REGULAR_USER);
    const res = await request(app)
      .get("/api/admin/analyses")
      .set("Authorization", "Bearer regular-token");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it("returns 200 with all analyses for admin", async () => {
    authAs(ADMIN_USER);
    const fakeData = [
      { id: 1, user_email: "user@test.com", pollution_score: 40 },
      { id: 2, user_email: null,            pollution_score: 20 },
    ];
    mockListAllAdmin.mockResolvedValueOnce(fakeData);

    const res = await request(app)
      .get("/api/admin/analyses")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeData);
    expect(mockListAllAdmin).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the DB throws", async () => {
    authAs(ADMIN_USER);
    mockListAllAdmin.mockRejectedValueOnce(new Error("DB failure"));

    const res = await request(app)
      .get("/api/admin/analyses")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/could not fetch/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /api/admin/analyses/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).delete("/api/admin/analyses/1");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    authAs(REGULAR_USER);
    const res = await request(app)
      .delete("/api/admin/analyses/1")
      .set("Authorization", "Bearer regular-token");
    expect(res.status).toBe(403);
  });

  it("returns 200 on successful admin deletion", async () => {
    authAs(ADMIN_USER);
    mockDeleteAnalysis.mockResolvedValueOnce();

    const res = await request(app)
      .delete("/api/admin/analyses/55")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: "Analysis deleted successfully", id: "55" });
    expect(mockDeleteAnalysis).toHaveBeenCalledWith("55");
  });

  it("returns 500 when deletion fails", async () => {
    authAs(ADMIN_USER);
    mockDeleteAnalysis.mockRejectedValueOnce(new Error("Storage error"));

    const res = await request(app)
      .delete("/api/admin/analyses/7")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/could not delete/i);
  });
});
