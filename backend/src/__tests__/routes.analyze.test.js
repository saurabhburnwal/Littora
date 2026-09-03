/**
 * Integration tests for the analyze route
 * POST /api/analyze — multipart image upload + AI inference
 */
import { jest } from "@jest/globals";
import request from "supertest";
import { Buffer } from "node:buffer";

const mockRunDetection = jest.fn();
const mockUploadImage  = jest.fn();
const mockSaveAnalysis = jest.fn();
const mockGetUser      = jest.fn();

jest.unstable_mockModule("../services/aiService.js", () => ({
  runDetection: mockRunDetection,
}));

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase:              { auth: { getUser: mockGetUser, admin: { getUserById: jest.fn() } } },
  uploadImage:           mockUploadImage,
  saveAnalysis:          mockSaveAnalysis,
  listAnalysesByUser:    jest.fn(),
  listAllAnalysesAdmin:  jest.fn(),
  deleteAnalysisForUser:    jest.fn(),
  deleteAnalysis:           jest.fn(),
  deleteUserAccountAndData: jest.fn(),
  listAnalyses:             jest.fn(),
  getStats:              jest.fn(),
  getAvailableAiModels:  jest.fn().mockResolvedValue([]),
  getActiveSystemModel:  jest.fn().mockResolvedValue("yolov8m"),
  setActiveSystemModel:  jest.fn(),
  getWasteTypesCatalog:  jest.fn().mockResolvedValue([]),
  getLocationsCatalog:   jest.fn().mockResolvedValue([]),
}));

const { default: app } = await import("../index.js");

// A minimal 1×1 pixel PNG buffer
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const FAKE_DETECTION = {
  detections:     { bottle: 2, can: 1, bag: 0, wrapper: 0 },
  total_waste:    3,
  pollution_score: 45,
  severity:       "Moderate",
  model_used:     "yolov11m",
};

const FAKE_ANALYSIS = {
  id:             "analysis-uuid-1",
  created_at:     "2026-08-01T10:00:00Z",
  latitude:       null,
  longitude:      null,
  location_label: null,
  user_id:        null,
};

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/analyze", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when no image file is provided", async () => {
    const res = await request(app).post("/api/analyze");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no image/i);
  });

  it("returns 200 with full result on successful upload + detection", async () => {
    mockRunDetection.mockResolvedValueOnce(FAKE_DETECTION);
    mockUploadImage.mockResolvedValueOnce("https://storage.example.com/img.jpg");
    mockSaveAnalysis.mockResolvedValueOnce({
      ...FAKE_ANALYSIS,
      image_url: "https://storage.example.com/img.jpg",
    });

    const res = await request(app)
      .post("/api/analyze")
      .attach("image", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id:              "analysis-uuid-1",
      image_url:       "https://storage.example.com/img.jpg",
      total_waste:     3,
      pollution_score: 45,
      severity:        "Moderate",
    });
    expect(mockSaveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ modelUsed: "yolov11m" })
    );
  });

  it("passes latitude and longitude when provided", async () => {
    mockRunDetection.mockResolvedValueOnce(FAKE_DETECTION);
    mockUploadImage.mockResolvedValueOnce("https://storage.example.com/img.jpg");
    mockSaveAnalysis.mockResolvedValueOnce({
      ...FAKE_ANALYSIS,
      latitude:  19.0760,
      longitude: 72.8777,
    });

    await request(app)
      .post("/api/analyze")
      .field("latitude",  "19.0760")
      .field("longitude", "72.8777")
      .attach("image", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(mockSaveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 19.0760, longitude: 72.8777 })
    );
  });

  it("passes location_label when provided", async () => {
    mockRunDetection.mockResolvedValueOnce(FAKE_DETECTION);
    mockUploadImage.mockResolvedValueOnce("https://storage.example.com/img.jpg");
    mockSaveAnalysis.mockResolvedValueOnce({ ...FAKE_ANALYSIS, location_label: "Juhu Beach" });

    await request(app)
      .post("/api/analyze")
      .field("location_label", "Juhu Beach")
      .attach("image", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(mockSaveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ locationLabel: "Juhu Beach" })
    );
  });

  it("returns 500 when AI service throws", async () => {
    mockRunDetection.mockRejectedValueOnce(new Error("AI service down"));

    const res = await request(app)
      .post("/api/analyze")
      .attach("image", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/analysis failed/i);
  });

  it("returns 500 when storage upload throws", async () => {
    mockRunDetection.mockResolvedValueOnce(FAKE_DETECTION);
    mockUploadImage.mockRejectedValueOnce(new Error("Storage quota exceeded"));

    const res = await request(app)
      .post("/api/analyze")
      .attach("image", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(500);
  });

  it("proceeds without user_id when no auth header is present", async () => {
    mockRunDetection.mockResolvedValueOnce(FAKE_DETECTION);
    mockUploadImage.mockResolvedValueOnce("https://storage.example.com/img.jpg");
    mockSaveAnalysis.mockResolvedValueOnce(FAKE_ANALYSIS);

    const res = await request(app)
      .post("/api/analyze")
      .attach("image", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(mockSaveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null })
    );
  });

  it("returns 413 Payload Too Large when file size exceeds 10MB limit", async () => {
    const OVERSIZED_BUFFER = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB

    const res = await request(app)
      .post("/api/analyze")
      .attach("image", OVERSIZED_BUFFER, { filename: "large.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/exceeds 10mb limit|file too large/i);
    expect(mockRunDetection).not.toHaveBeenCalled();
  });

  it("returns 400 Bad Request when unexpected field name is provided in multipart form", async () => {
    const res = await request(app)
      .post("/api/analyze")
      .attach("wrong_field", TINY_PNG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unexpected field|invalid/i);
    expect(mockRunDetection).not.toHaveBeenCalled();
  });
});
