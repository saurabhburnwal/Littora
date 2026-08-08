/**
 * Integration tests for myAnalyses routes
 * GET  /api/my-analyses       — list user's own analyses
 * DELETE /api/my-analyses/:id — delete one of the user's analyses
 */
import { jest } from "@jest/globals";
import request from "supertest";

const mockGetUser        = jest.fn();
const mockListByUser     = jest.fn();
const mockDeleteForUser  = jest.fn();

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase:              { auth: { getUser: mockGetUser, admin: { getUserById: jest.fn() } } },
  uploadImage:           jest.fn(),
  saveAnalysis:          jest.fn(),
  listAnalysesByUser:    mockListByUser,
  listAllAnalysesAdmin:  jest.fn(),
  deleteAnalysisForUser: mockDeleteForUser,
  deleteAnalysis:        jest.fn(),
  listAnalyses:          jest.fn(),
  getStats:              jest.fn(),
  AVAILABLE_MODELS:      [],
  getActiveSystemModel:  jest.fn().mockResolvedValue("yolov8m"),
  setActiveSystemModel:  jest.fn(),
}));

const { default: app } = await import("../index.js");

const VALID_USER  = { id: "user-abc", email: "user@test.com" };
const VALID_TOKEN = "Bearer valid-jwt";

function authUser(user = VALID_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/my-analyses", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/my-analyses");
    expect(res.status).toBe(401);
  });

  it("returns 401 for an invalid token", async () => {
    mockGetUser.mockResolvedValueOnce({ data: null, error: new Error("bad") });
    const res = await request(app)
      .get("/api/my-analyses")
      .set("Authorization", "Bearer bad-token");
    expect(res.status).toBe(401);
  });

  it("returns 200 with user's analyses on success", async () => {
    authUser();
    const fakeData = [
      { id: 1, pollution_score: 30, severity: "Low" },
      { id: 2, pollution_score: 70, severity: "High" },
    ];
    mockListByUser.mockResolvedValueOnce(fakeData);

    const res = await request(app)
      .get("/api/my-analyses")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeData);
    expect(mockListByUser).toHaveBeenCalledWith(VALID_USER.id, expect.any(Object));
  });

  it("respects limit and offset query params", async () => {
    authUser();
    mockListByUser.mockResolvedValueOnce([]);

    await request(app)
      .get("/api/my-analyses?limit=5&offset=10")
      .set("Authorization", VALID_TOKEN);

    expect(mockListByUser).toHaveBeenCalledWith(
      VALID_USER.id,
      expect.objectContaining({ limit: 5, offset: 10 })
    );
  });

  it("returns 500 when the DB call throws", async () => {
    authUser();
    mockListByUser.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/api/my-analyses")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/could not fetch/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /api/my-analyses/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 without auth header", async () => {
    const res = await request(app).delete("/api/my-analyses/1");
    expect(res.status).toBe(401);
  });

  it("returns 200 on successful deletion of own analysis", async () => {
    authUser();
    mockDeleteForUser.mockResolvedValueOnce();

    const res = await request(app)
      .delete("/api/my-analyses/42")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: "Analysis deleted", id: "42" });
    expect(mockDeleteForUser).toHaveBeenCalledWith("42", VALID_USER.id);
  });

  it("returns 403 when the analysis does not belong to the user", async () => {
    authUser();
    mockDeleteForUser.mockRejectedValueOnce(new Error("Not found or not yours"));

    const res = await request(app)
      .delete("/api/my-analyses/99")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not found or not yours/i);
  });

  it("returns 500 on unexpected DB error", async () => {
    authUser();
    mockDeleteForUser.mockRejectedValueOnce(new Error("DB exploded"));

    const res = await request(app)
      .delete("/api/my-analyses/7")
      .set("Authorization", VALID_TOKEN);

    expect(res.status).toBe(500);
  });
});
