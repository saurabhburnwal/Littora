/**
 * Integration tests for dataset export routes
 * GET /api/dataset.geojson — Auth-protected GeoJSON export
 * GET /api/dataset.csv     — Auth-protected CSV export
 */
import { jest } from "@jest/globals";
import request from "supertest";

const mockListAnalyses = jest.fn();

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
  listAnalyses: mockListAnalyses,
  uploadImage: jest.fn(),
  saveAnalysis: jest.fn(),
  listAnalysesByUser: jest.fn(),
  listAllAnalysesAdmin: jest.fn(),
  deleteAnalysisForUser: jest.fn(),
  deleteAnalysis: jest.fn(),
  deleteUserAccountAndData: jest.fn(),
  getStats: jest.fn(),
  getAvailableAiModels: jest.fn(),
  getActiveSystemModel: jest.fn(),
  setActiveSystemModel: jest.fn(),
  getWasteTypesCatalog: jest.fn(),
  getLocationsCatalog: jest.fn(),
}));

const { default: app } = await import("../index.js");
const { supabase } = await import("../services/supabaseClient.js");

describe("Dataset Export Routes", () => {
  const sampleAnalyses = [
    {
      id: "a1-uuid",
      location_label: "Bondi Beach, Sydney, Australia",
      latitude: -33.8915,
      longitude: 151.2767,
      severity: "Moderate",
      pollution_score: 25,
      total_waste: 5,
      detections_map: { bottle: 2, can: 3 },
      boxes: [{ class_name: "bottle" }],
      image_url: "https://example.com/bondi.jpg",
      created_at: "2026-08-20T10:00:00Z",
    },
    {
      id: "a2-uuid",
      location_label: "No Coordinates Beach",
      latitude: null,
      longitude: null,
      severity: "Low",
      pollution_score: 5,
      total_waste: 1,
      detections_map: { bag: 1 },
      boxes: [],
      image_url: "https://example.com/nocoords.jpg",
      created_at: "2026-08-21T10:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/dataset.geojson", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/dataset.geojson");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authentication required/i);
    });

    it("returns 200 and valid GeoJSON FeatureCollection when authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "u-123", email: "user@test.com" } },
        error: null,
      });
      mockListAnalyses.mockResolvedValue(sampleAnalyses);

      const res = await request(app)
        .get("/api/dataset.geojson")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("json");
      expect(res.body.type).toBe("FeatureCollection");
      expect(Array.isArray(res.body.features)).toBe(true);
      // Only analyses with valid lat/lon should be features
      expect(res.body.features).toHaveLength(1);
      expect(res.body.features[0].geometry.coordinates).toEqual([151.2767, -33.8915]);
      expect(res.body.features[0].properties.location).toBe("Bondi Beach, Sydney, Australia");
      expect(res.body.features[0].properties.pollution_score).toBe(25);
    });
  });

  describe("GET /api/dataset.csv", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/dataset.csv");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authentication required/i);
    });

    it("returns 200 and formatted CSV when authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "u-123", email: "user@test.com" } },
        error: null,
      });
      mockListAnalyses.mockResolvedValue(sampleAnalyses);

      const res = await request(app)
        .get("/api/dataset.csv")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.text).toContain("id,location,latitude,longitude,severity,pollution_score,total_waste,bottle,can,bag,wrapper,scanned_at");
      expect(res.text).toContain('"Bondi Beach, Sydney, Australia"');
      expect(res.text).toContain("a1-uuid");
      expect(res.text).toContain("a2-uuid");
    });
  });
});
