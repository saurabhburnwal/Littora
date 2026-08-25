import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePdfReport, PDF_STYLES } from "../generatePdfReport.js";

// Mock jspdf and html2canvas
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
    default: vi.fn().mockImplementation((container) => {
      return Promise.resolve({
        width: 800,
        height: 1000,
        toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,mockdata"),
      });
    }),
  };
});

describe("generatePdfReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports PDF_STYLES with isolated print definitions", () => {
    expect(PDF_STYLES).toBeDefined();
    expect(PDF_STYLES.page).toContain("background: #ffffff");
    expect(PDF_STYLES.header).toContain("border-bottom: 3px solid #0d9488");
    expect(PDF_STYLES.badgeLow).toContain("#15803d");
    expect(PDF_STYLES.badgeSevere).toContain("#b91c1c");
  });

  it("successfully generates and saves a daily report", async () => {
    const stats = {
      totalAnalyses: 42,
      totalWasteAllTime: 128,
      locations: ["Beach A", "Beach B"],
      avgScore: "6.5",
      severityCounts: { Low: 10, Moderate: 15, High: 12, Severe: 5 },
      aggregateDetections: { plastic_bottle: 50, fishing_net: 20 },
    };
    const user = { email: "tester@littora.org" };

    await generatePdfReport("daily", stats, user);

    expect(mockAddImage).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    const savedFilename = mockSave.mock.calls[0][0];
    expect(savedFilename).toMatch(/^littora_daily_report_\d+\.pdf$/);
  });

  it("successfully generates weekly, monthly, and custom reports", async () => {
    const stats = {
      totalAnalyses: 10,
      totalWasteAllTime: 30,
      locations: ["Marina Beach"],
      avgScore: "4.2",
      severityCounts: { Low: 5, Moderate: 3, High: 2, Severe: 0 },
      aggregateDetections: {},
    };

    await generatePdfReport("weekly", stats);
    expect(mockSave.mock.calls[0][0]).toMatch(/^littora_weekly_report_\d+\.pdf$/);

    await generatePdfReport("monthly", stats);
    expect(mockSave.mock.calls[1][0]).toMatch(/^littora_monthly_report_\d+\.pdf$/);

    await generatePdfReport("custom", stats);
    expect(mockSave.mock.calls[2][0]).toMatch(/^littora_custom_report_\d+\.pdf$/);
  });
});
