/**
 * Unit tests for supabaseClient service functions
 * Covers all data access methods, admin email enrichment, storage ops, and error paths.
 */
import { jest } from "@jest/globals";

const mockFrom  = jest.fn();
const mockAdmin = { getUserById: jest.fn() };
const mockStorageFrom = jest.fn();

jest.unstable_mockModule("@supabase/supabase-js", () => ({
  createClient: jest.fn().mockReturnValue({
    from:    mockFrom,
    storage: { from: mockStorageFrom },
    auth:    { getUser: jest.fn(), admin: mockAdmin },
  }),
}));

jest.unstable_mockModule("ws", () => ({ default: class MockWS {} }));

const {
  getStats,
  listAnalyses,
  listAnalysesByUser,
  listAllAnalysesAdmin,
  deleteAnalysis,
  deleteAnalysisForUser,
  uploadImage,
  saveAnalysis,
} = await import("../services/supabaseClient.js");

// ─────────────────────────────────────────────────────────────────────────────
describe("uploadImage", () => {
  it("uploads image buffer to bucket and returns public URL", async () => {
    const mockUpload = jest.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: "https://example.com/test.jpg" } });
    mockStorageFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });

    const url = await uploadImage(Buffer.from("fake-img"), "test.jpg", "image/jpeg");
    expect(url).toBe("https://example.com/test.jpg");
    expect(mockUpload).toHaveBeenCalled();
  });

  it("throws error when upload fails", async () => {
    const mockUpload = jest.fn().mockResolvedValue({ error: new Error("Storage full") });
    mockStorageFrom.mockReturnValue({ upload: mockUpload });

    await expect(uploadImage(Buffer.from("img"), "pic.png", "image/png")).rejects.toThrow("Storage full");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("saveAnalysis", () => {
  it("saves analysis row and child detections rows successfully", async () => {
    const fakeAnalysis = { id: "a-100", total_waste: 5 };
    const fakeEnriched = { id: "a-100", total_waste: 5, latitude: 18.9, longitude: 72.8, location_label: "Girgaon Beach" };

    const mockLocationUpsert = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "loc-1" }, error: null }),
    };
    const mockInsertAnalysis = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeAnalysis, error: null }),
    };
    const mockInsertDetections = jest.fn().mockResolvedValue({ error: null });
    const mockViewFetch = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeEnriched, error: null }),
    };

    mockFrom.mockImplementation((table) => {
      if (table === "locations")           return { upsert: () => mockLocationUpsert };
      if (table === "analyses")            return { insert: () => mockInsertAnalysis };
      if (table === "detections")          return { insert: mockInsertDetections };
      if (table === "vw_analysis_details") return mockViewFetch;
      if (table === "system_settings")     return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      if (table === "ai_models")           return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const res = await saveAnalysis({
      imageUrl: "https://example.com/a.jpg",
      totalWaste: 5,
      pollutionScore: 40,
      severity: "Moderate",
      detections: { bottle: 3, can: 2 },
      latitude: 18.9,
      longitude: 72.8,
      locationLabel: "Girgaon Beach",
      userId: "u-123",
    });

    expect(res).toEqual(fakeEnriched);
    expect(mockInsertDetections).toHaveBeenCalledWith([
      { analysis_id: "a-100", waste_type: "bottle", count: 3 },
      { analysis_id: "a-100", waste_type: "can", count: 2 },
    ]);
  });

  it("throws when analysis insert returns an error", async () => {
    const mockLocationUpsert = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "loc-1" }, error: null }),
    };
    const mockInsertAnalysis = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error("DB Constraint Fail") }),
    };

    mockFrom.mockImplementation((table) => {
      if (table === "locations")       return { upsert: () => mockLocationUpsert };
      if (table === "analyses")        return { insert: () => mockInsertAnalysis };
      if (table === "system_settings") return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      if (table === "ai_models")       return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });

    await expect(saveAnalysis({
      imageUrl: "https://example.com/a.jpg",
      totalWaste: 1,
      pollutionScore: 10,
      severity: "Low",
      detections: {},
      latitude: 18.9,
      longitude: 72.8,
      locationLabel: "Girgaon Beach",
    })).rejects.toThrow("DB Constraint Fail");
  });

  it("throws when detections insert returns an error", async () => {
    const fakeAnalysis = { id: "a-101", total_waste: 1 };
    const mockLocationUpsert = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "loc-2" }, error: null }),
    };
    const mockInsertAnalysis = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeAnalysis, error: null }),
    };
    const mockInsertDetections = jest.fn().mockResolvedValue({ error: new Error("Detections FK error") });

    mockFrom.mockImplementation((table) => {
      if (table === "locations")       return { upsert: () => mockLocationUpsert };
      if (table === "analyses")        return { insert: () => mockInsertAnalysis };
      if (table === "detections")      return { insert: mockInsertDetections };
      if (table === "system_settings") return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
      if (table === "ai_models")       return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });

    await expect(saveAnalysis({
      imageUrl: "https://example.com/a.jpg",
      totalWaste: 1,
      pollutionScore: 10,
      severity: "Low",
      detections: { bottle: 1 },
      latitude: 18.9,
      longitude: 72.8,
      locationLabel: "Girgaon Beach",
    })).rejects.toThrow("Detections FK error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listAnalysesByUser", () => {
  it("fetches analyses scoped to given user_id", async () => {
    const mockData = [{ id: "a1", user_id: "u-1" }];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await listAnalysesByUser("u-1", { limit: 10, offset: 0 });
    expect(res).toEqual(mockData);
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u-1");
  });

  it("throws when Supabase query errors out", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: new Error("Network error") }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(listAnalysesByUser("u-1")).rejects.toThrow("Network error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listAllAnalysesAdmin", () => {
  it("fetches all analyses and enriches with user email and full_name from Auth API", async () => {
    const rawAnalyses = [
      { id: "a1", user_id: "u-1", total_waste: 2 },
      { id: "a2", user_id: "u-2", total_waste: 5 },
      { id: "a3", user_id: null,  total_waste: 0 },
    ];
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: rawAnalyses, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    mockAdmin.getUserById
      .mockResolvedValueOnce({ data: { user: { id: "u-1", email: "user1@test.com", user_metadata: { full_name: "User One" } } }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: "u-2", email: "user2@test.com" } }, error: null });

    const res = await listAllAnalysesAdmin();
    expect(res).toHaveLength(3);
    expect(res[0].user_email).toBe("user1@test.com");
    expect(res[0].user_name).toBe("User One");
    expect(res[1].user_email).toBe("user2@test.com");
    expect(res[1].user_name).toBe("user2@test.com");
    expect(res[2].user_email).toBeNull();
    expect(res[2].user_name).toBeNull();
  });

  it("handles user lookup failure gracefully without crashing listAllAnalysesAdmin", async () => {
    const rawAnalyses = [{ id: "a1", user_id: "u-dead" }];
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: rawAnalyses, error: null }),
    };
    mockFrom.mockReturnValue(chain);
    mockAdmin.getUserById.mockRejectedValueOnce(new Error("Auth API timeout"));

    const res = await listAllAnalysesAdmin();
    expect(res[0].user_email).toBeNull();
    expect(res[0].user_name).toBeNull();
  });

  it("throws when analyses query fails", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error("Admin query failed") }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(listAllAnalysesAdmin()).rejects.toThrow("Admin query failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteAnalysis & deleteAnalysisForUser", () => {
  it("successfully deletes analysis, child detections, and storage image", async () => {
    const analysisRow = { id: "a-delete-1", image_url: "https://example.com/bucket/123-pic.png" };
    const mockRemove = jest.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({ remove: mockRemove });

    mockFrom.mockImplementation((table) => {
      if (table === "analyses") {
        return {
          select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: analysisRow, error: null }) }) }),
          delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "detections") {
        return {
          delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        };
      }
    });

    await deleteAnalysis("a-delete-1");
    expect(mockRemove).toHaveBeenCalledWith(["123-pic.png"]);
  });

  it("throws when analysis fetch fails in deleteAnalysis", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: null, error: new Error("NotFound") }) }) }),
    });

    await expect(deleteAnalysis("a-missing")).rejects.toThrow("NotFound");
  });

  it("successfully deletes for authorized owner in deleteAnalysisForUser", async () => {
    const analysisRow = { id: "a-my-1", user_id: "user-me", image_url: "https://example.com/b/my.png" };
    const mockRemove = jest.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({ remove: mockRemove });

    mockFrom.mockImplementation((table) => {
      if (table === "analyses") {
        return {
          select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: analysisRow, error: null }) }) }),
          delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "detections") {
        return {
          delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        };
      }
    });

    await deleteAnalysisForUser("a-my-1", "user-me");
    expect(mockRemove).toHaveBeenCalledWith(["my.png"]);
  });

  it("throws 'Not found or not yours' when analysis does not exist", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: null, error: new Error("not found") }) }) }),
    });

    await expect(deleteAnalysisForUser("id-1", "user-abc")).rejects.toThrow("Not found or not yours");
  });

  it("throws 'Not found or not yours' when user ID does not match", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: { id: "id-1", user_id: "user-other" }, error: null }) }) }),
    });

    await expect(deleteAnalysisForUser("id-1", "user-abc")).rejects.toThrow("Not found or not yours");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getStats — JS aggregation logic", () => {
  it("calculates totals and severity counts correctly", async () => {
    // Rows now come from vw_analysis_details which JOINs locations.
    // detections_map is a JSONB object; raw arrays are also handled for backward compat.
    const rows = [
      {
        id: "1", total_waste: 5, pollution_score: 30, severity: "Low",
        latitude: null, longitude: null, location_label: null,
        detections_map: { bottle: 3, can: 2 },
      },
      {
        id: "2", total_waste: 10, pollution_score: 70, severity: "High",
        latitude: 19.076, longitude: 72.877, location_label: "Juhu",
        detections_map: { bag: 5, wrapper: 5 },
      },
      {
        id: "3", total_waste: 0, pollution_score: 0, severity: "Low",
        latitude: null, longitude: null, location_label: null,
        detections_map: {},
      },
    ];

    const chain = {
      select: jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: rows, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const stats = await getStats();

    expect(stats.totalAnalyses).toBe(3);
    expect(stats.totalWasteAllTime).toBe(15);
    expect(stats.avgScore).toBe(Math.round((30 + 70 + 0) / 3));
    expect(stats.severityCounts).toEqual({ Low: 2, Moderate: 0, High: 1, Severe: 0 });
    expect(stats.aggregateDetections).toEqual({ bottle: 3, can: 2, bag: 5, wrapper: 5 });
    expect(stats.locations).toHaveLength(1);
    expect(stats.locations[0].location_label).toBe("Juhu");
    expect(stats.history[0].id).toBe("3");
  });

  it("returns zero stats when DB has no rows", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const stats = await getStats();

    expect(stats.totalAnalyses).toBe(0);
    expect(stats.totalWasteAllTime).toBe(0);
    expect(stats.avgScore).toBe(0);
    expect(stats.locations).toHaveLength(0);
    expect(stats.history).toHaveLength(0);
  });

  it("queries stats filtered by user_id when userId parameter is provided", async () => {
    const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue({ eq: mockEq }),
    };
    mockFrom.mockReturnValue(chain);

    await getStats("u-user-specific");
    expect(mockEq).toHaveBeenCalledWith("user_id", "u-user-specific");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listAnalyses", () => {
  it("throws when Supabase returns an error", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      range:  jest.fn().mockResolvedValue({ data: null, error: new Error("connection failed") }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(listAnalyses()).rejects.toThrow("connection failed");
  });

  it("returns data array on success", async () => {
    const fakeData = [{ id: "a1" }, { id: "a2" }];
    const chain = {
      select: jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      range:  jest.fn().mockResolvedValue({ data: fakeData, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await listAnalyses({ limit: 10, offset: 0 });
    expect(result).toEqual(fakeData);
  });
});
