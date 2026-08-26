import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePdfReport } from "../generatePdfReport.js";

const mockSave = vi.fn();
const mockAddImage = vi.fn();

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        addImage: mockAddImage,
        save: mockSave,
      };
    }),
  };
});

vi.mock("html2canvas", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        width: 800,
        height: 1000,
        toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mockdata"),
      });
    }),
  };
});

describe("generatePdfReport - Adversarial & Edge Case Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles null and undefined aiSummary without crashing", async () => {
    const stats = {
      totalAnalyses: 5,
      totalWaste: 20,
      avgPollutionScore: 4.5,
      severityCounts: { Low: 3, Moderate: 2 },
    };
    const user = { email: "test@domain.com" };

    // Case 1: options with aiSummary = null
    await generatePdfReport("monthly", stats, user, { aiSummary: null });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockAddImage).toHaveBeenCalledTimes(1);

    // Case 2: options with aiSummary = undefined
    await generatePdfReport("monthly", stats, user, { aiSummary: undefined });
    expect(mockSave).toHaveBeenCalledTimes(2);
  });

  it("handles completely empty statistics object gracefully", async () => {
    await generatePdfReport("daily", {});
    expect(mockSave).toHaveBeenCalledTimes(1);
    const savedFilename = mockSave.mock.calls[0][0];
    expect(savedFilename).toMatch(/^littora_daily_report_\d+\.pdf$/);
  });

  it("handles statistics with zero counts and empty detections", async () => {
    const zeroStats = {
      totalAnalyses: 0,
      totalWaste: 0,
      avgPollutionScore: 0,
      severityCounts: { Low: 0, Moderate: 0, High: 0, Severe: 0 },
      aggregateDetections: {},
      locations: [],
    };

    await generatePdfReport("custom", zeroStats, null, {});
    expect(mockSave).toHaveBeenCalledTimes(1);
    const savedFilename = mockSave.mock.calls[0][0];
    expect(savedFilename).toMatch(/^littora_custom_report_\d+\.pdf$/);
  });

  it("handles completely omitted optional parameters (undefined user, undefined options)", async () => {
    await generatePdfReport("weekly");
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][0]).toMatch(/^littora_weekly_report_\d+\.pdf$/);
  });

  it("handles malformed or structured string aiSummary formats", async () => {
    const stats = { totalAnalyses: 2 };
    
    // Plain string summary
    await generatePdfReport("daily", stats, null, { aiSummary: "Plain string summary format." });
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Object with missing fields
    await generatePdfReport("daily", stats, null, {
      aiSummary: {
        executive_summary: "Partial summary",
        priority_actions: ["Single action item"],
      },
    });
    expect(mockSave).toHaveBeenCalledTimes(2);
  });
});
