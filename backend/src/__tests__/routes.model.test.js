import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const mockGetUser = jest.fn();

const mockGetActiveSystemModel = jest.fn().mockResolvedValue("yolov8m");
const mockSetActiveSystemModel = jest.fn().mockImplementation(async (id) => id);

jest.unstable_mockModule("../services/supabaseClient.js", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
  },
  getAvailableAiModels: jest.fn().mockResolvedValue([
    { id: "yolov8m", name: "YOLOv8 Medium", tag: "Baseline" },
    { id: "yolov11m", name: "YOLOv11 Medium", tag: "Precision" },
    { id: "yolov26s", name: "YOLOv26 Small", tag: "Fast" },
  ]),
  getActiveSystemModel: mockGetActiveSystemModel,
  setActiveSystemModel: mockSetActiveSystemModel,
  getWasteTypesCatalog: jest.fn().mockResolvedValue([]),
  getLocationsCatalog:  jest.fn().mockResolvedValue([]),
}));

const { default: modelRouter } = await import("../routes/model.js");

const app = express();
app.use(express.json());
app.use("/api/model", modelRouter);

describe("GET /api/model & POST /api/model", () => {
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@littora.app";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEnv;
  });

  it("GET /api/model returns active model and available models list for all users", async () => {
    const res = await request(app).get("/api/model");

    expect(res.status).toBe(200);
    expect(res.body.activeModel).toBe("yolov8m");
    expect(res.body.activeModelDetails.name).toBe("YOLOv8 Medium");
    expect(res.body.availableModels).toHaveLength(3);
  });

  it("POST /api/model returns 401 when token is missing", async () => {
    const res = await request(app).post("/api/model").send({ modelId: "yolov11m" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("POST /api/model returns 403 when user is not an Admin", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-regular", email: "member@test.com" } },
      error: null,
    });

    const res = await request(app)
      .post("/api/model")
      .set("Authorization", "Bearer token-member")
      .send({ modelId: "yolov11m" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin access required/i);
  });

  it("POST /api/model updates system-wide active model when requested by Admin", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-admin", email: "admin@littora.app" } },
      error: null,
    });

    const res = await request(app)
      .post("/api/model")
      .set("Authorization", "Bearer token-admin")
      .send({ modelId: "yolov11m" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated system-wide/i);
    expect(res.body.activeModel).toBe("yolov11m");
    expect(res.body.activeModelDetails.name).toBe("YOLOv11 Medium");
  });

  it("POST /api/model returns 400 when modelId is missing from request body", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-admin", email: "admin@littora.app" } },
      error: null,
    });

    const res = await request(app)
      .post("/api/model")
      .set("Authorization", "Bearer token-admin")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("modelId is required");
    expect(mockSetActiveSystemModel).not.toHaveBeenCalled();
  });

  it("POST /api/model returns 400 with error details when service rejects modelId", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u-admin", email: "admin@littora.app" } },
      error: null,
    });
    mockSetActiveSystemModel.mockRejectedValueOnce(new Error("Invalid model ID: invalid-model-xyz"));

    const res = await request(app)
      .post("/api/model")
      .set("Authorization", "Bearer token-admin")
      .send({ modelId: "invalid-model-xyz" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid model ID: invalid-model-xyz");
  });

  it("GET /api/model returns 500 when fetching model info fails", async () => {
    mockGetActiveSystemModel.mockRejectedValueOnce(new Error("Database offline"));

    const res = await request(app).get("/api/model");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Could not fetch model info");
  });
});
