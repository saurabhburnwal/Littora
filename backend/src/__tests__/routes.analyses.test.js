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
  deleteAnalysisForUser:    jest.fn(),
  deleteAnalysis:           jest.fn(),
  deleteUserAccountAndData: jest.fn(),
  listAnalyses:             mockListAnalyses,
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

  it("passes default limit=50, offset=0, and userId to service for regular user", async () => {
    mockListAnalyses.mockResolvedValueOnce([]);
    await request(app).get("/api/analyses").set("Authorization", "Bearer mock-token");
    expect(mockListAnalyses).toHaveBeenCalledWith({ limit: 50, offset: 0, userId: "u1" });
  });

  it("passes custom limit, offset, and userId query params for regular user", async () => {
    mockListAnalyses.mockResolvedValueOnce([]);
    await request(app).get("/api/analyses?limit=10&offset=20").set("Authorization", "Bearer mock-token");
    expect(mockListAnalyses).toHaveBeenCalledWith({ limit: 10, offset: 20, userId: "u1" });
  });

  it("calls listAnalyses without userId scoping when caller is admin", async () => {
    const { supabase } = await import("../services/supabaseClient.js");
    supabase.auth.getUser = jest.fn().mockResolvedValueOnce({
      data: { user: { id: "admin-1", email: "admin@littora.app" } },
    });
    mockListAnalyses.mockResolvedValueOnce([]);
    await request(app).get("/api/analyses").set("Authorization", "Bearer admin-token");
    expect(mockListAnalyses).toHaveBeenCalledWith({ limit: 50, offset: 0 });
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

  it("returns strictly user-scoped locations for regular authenticated member", async () => {
    const { supabase } = await import("../services/supabaseClient.js");
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: "u-member-123", email: "member@littora.org" } },
    });

    const globalStats = {
      totalAnalyses: 100,
      totalWasteAllTime: 500,
      avgScore: 5.5,
      severityCounts: { Low: 50, Moderate: 30, High: 15, Severe: 5 },
      aggregateDetections: { bottle: 250, can: 150 },
      locations: [
        { name: "Public Beach A", latitude: 12.0, longitude: 80.0 },
        { name: "Foreign User Beach", latitude: 13.0, longitude: 80.5 },
      ],
      history: [],
      wasteTypesCatalog: ["bottle", "can"],
      locationsCatalog: ["Public Beach A", "Foreign User Beach"],
    };

    const userStats = {
      totalAnalyses: 5,
      totalWasteAllTime: 20,
      avgScore: 3.2,
      severityCounts: { Low: 4, Moderate: 1, High: 0, Severe: 0 },
      aggregateDetections: { bottle: 15, can: 5 },
      locations: [
        { name: "My Scanned Beach", latitude: 12.0, longitude: 80.0 },
      ],
      history: [{ id: "analysis-1" }],
    };

    mockGetStats.mockImplementation(async (userId) => {
      if (userId === null) return globalStats;
      if (userId === "u-member-123") return userStats;
      return globalStats;
    });

    const res = await request(app)
      .get("/api/stats")
      .set("Authorization", "Bearer member-token");

    expect(res.status).toBe(200);
    expect(res.body.isGuest).toBe(false);
    expect(res.body.isAdmin).toBe(false);
    expect(res.body.locations).toEqual(userStats.locations);
    expect(res.body.locations).not.toEqual(globalStats.locations);
    expect(res.body.totalAnalyses).toBe(5);
    expect(res.body.locationsCatalog).toEqual(globalStats.locationsCatalog);
    expect(res.body.wasteTypesCatalog).toEqual(globalStats.wasteTypesCatalog);
  });
});
