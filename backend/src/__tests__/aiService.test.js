/**
 * Unit tests for aiService.js
 */
import { jest } from "@jest/globals";

const mockAxiosPost = jest.fn();
jest.unstable_mockModule("axios", () => ({
  default: { post: mockAxiosPost },
}));

jest.unstable_mockModule("form-data", () => ({
  default: class MockFormData {
    append()     {}
    getHeaders() { return { "content-type": "multipart/form-data" }; }
  },
}));

const { runDetection } = await import("../services/aiService.js");

// ─────────────────────────────────────────────────────────────────────────────
describe("runDetection", () => {
  const buffer      = Buffer.from("fake-image");
  const name        = "test.jpg";
  const mimeType    = "image/jpeg";

  beforeEach(() => jest.clearAllMocks());

  it("calls the AI service /detect endpoint and returns result", async () => {
    const fakeResult = {
      detections:     { bottle: 2, can: 1, bag: 0, wrapper: 0 },
      total_waste:    3,
      pollution_score: 42,
      severity:       "Moderate",
    };
    mockAxiosPost.mockResolvedValueOnce({ data: fakeResult });

    const result = await runDetection(buffer, name, mimeType);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    const [url, _form, options] = mockAxiosPost.mock.calls[0];
    expect(url).toMatch(/\/detect$/);
    expect(options.timeout).toBe(120000);
    expect(result).toEqual(fakeResult);
  });

  it("throws when the AI service returns an error", async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error("AI service unavailable"));

    await expect(runDetection(buffer, name, mimeType)).rejects.toThrow(
      "AI service unavailable"
    );
  });

  it("uses the correct AI_SERVICE_URL from env", async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { detections: {}, total_waste: 0, pollution_score: 0, severity: "Low" },
    });

    await runDetection(buffer, name, mimeType);

    const [url] = mockAxiosPost.mock.calls[0];
    expect(url).toContain(process.env.AI_SERVICE_URL || "http://localhost:8000");
  });
});
