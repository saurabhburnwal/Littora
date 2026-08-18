/**
 * Integration tests for analyses routes
 * GET /api/analyses        — public paginated history
 * GET /api/stats           — aggregated dashboard stats
 * GET /health              — health check
 */
import { jest } from "@jest/globals";
import request from "supertest";

const mockListAnalyses = jest.fn();
const mockGetStats     = jest.fn().mockResolvedValue({
  totalAnalyses: 0,
  totalWasteAllTime: 0,
  avgScore: 0,
  severityCounts: { Low: 0, Moderate: 0, High: 0, Severe: 0 },
  aggregateDetections: { bottle: 0, can: 0, bag: 0, wrapper: 0 },
  locations: [],
  history: [],
  wasteTypesCatalog: [],
  locationsCatalog: [],
});

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase:              { auth: { getUser: jest.fn(), admin: { getUserById: jest.fn() } } },
  uploadImage:           jest.fn(),
  saveAnalysis:          jest.fn(),
  listAnalysesByUser:    jest.fn(),
  listAllAnalysesAdmin:  jest.fn(),
  deleteAnalysisForUser: jest.fn(),
  deleteAnalysis:        jest.fn(),
  listAnalyses:          mockListAnalyses,
  getStats:              mockGetStats,
  getAvailableAiModels:  jest.fn().mockResolvedValue([]),
  getActiveSystemModel:  jest.fn().mockResolvedValue("yolov8m"),
  setActiveSystemModel:  jest.fn(),
  getWasteTypesCatalog:  jest.fn().mockResolvedValue([
    { id: "bottle" }, { id: "can" }, { id: "bag" }, { id: "wrapper" }
  ]),
  getLocationsCatalog:   jest.fn().mockResolvedValue([]),
}));

const { default: app } = await import("../index.js");
const { supabase } = await import("../services/supabaseClient.js");

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/analyses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "user@test.com" } },
      error: null,
    });
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = await request(app).get("/api/analyses");
    expect(res.status).toBe(401);
  });

  it("returns 200 with analyses array", async () => {
    const fakeData = [{ id: 1, severity: "Low" }, { id: 2, severity: "High" }];
    mockListAnalyses.mockResolvedValueOnce(fakeData);

    const res = await request(app).get("/api/analyses").set("Authorization", "Bearer mock-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeData);
  });

  it("passes default limit=50 and offset=0 to service", async () => {
    mockListAnalyses.mockResolvedValueOnce([]);
    await request(app).get("/api/analyses").set("Authorization", "Bearer mock-token");
    expect(mockListAnalyses).toHaveBeenCalledWith({ limit: 50, offset: 0 });
  });

  it("passes custom limit and offset query params", async () => {
    mockListAnalyses.mockResolvedValueOnce([]);
    await request(app).get("/api/analyses?limit=10&offset=20").set("Authorization", "Bearer mock-token");
    expect(mockListAnalyses).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });

  it("returns 500 when listAnalyses throws", async () => {
    mockListAnalyses.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).get("/api/analyses").set("Authorization", "Bearer mock-token");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/could not fetch/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/stats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with empty guest stats for unauthenticated calls", async () => {
    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalAnalyses: 0,
      totalWasteAllTime: 0,
      avgScore: 0,
      severityCounts: { Low: 0, Moderate: 0, High: 0, Severe: 0 },
      aggregateDetections: { bottle: 0, can: 0, bag: 0, wrapper: 0 },
      locations: [],
      history: [],
      wasteTypesCatalog: [],
      locationsCatalog: [],
      isGuest: true,
      isAdmin: false,
    });
  });

  it("returns 500 when getStats throws for authenticated user", async () => {
    const { supabase } = await import("../services/supabaseClient.js");
    supabase.auth.getUser = jest.fn().mockResolvedValueOnce({
      data: { user: { id: "u1", email: "user@test.com" } }
    });
    mockGetStats.mockRejectedValueOnce(new Error("DB failure"));
    const res = await request(app).get("/api/stats").set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/could not fetch stats/i);
  });
});
