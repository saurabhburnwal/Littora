import { describe, it, expect } from "vitest";
import {
  formatWasteType,
  normalizeSeverity,
  isRecyclableWaste,
  normalizeDetections,
  getDetectionSummary,
  getActionStatus,
  getPerClassConfidences,
  toResultShape,
  SUPPORTED_WASTE_TYPES,
} from "../wasteUtils.js";

describe("wasteUtils — formatWasteType & normalizeSeverity", () => {
  it("formats canonical waste types properly", () => {
    expect(formatWasteType("bottle")).toBe("Plastic Bottle");
    expect(formatWasteType("can")).toBe("Metal Can");
    expect(formatWasteType("bag")).toBe("Plastic Bag");
    expect(formatWasteType("wrapper")).toBe("Food Wrapper");
    expect(formatWasteType("unknown_debris")).toBe("Unknown Debris");
    expect(formatWasteType(null)).toBe("Unknown");
  });

  it("normalizes severity levels", () => {
    expect(normalizeSeverity("severe")).toBe("Severe");
    expect(normalizeSeverity("HIGH")).toBe("High");
    expect(normalizeSeverity("moderate")).toBe("Moderate");
    expect(normalizeSeverity("low")).toBe("Low");
    expect(normalizeSeverity(null)).toBe("Low");
    expect(normalizeSeverity("unknown")).toBe("Low");
  });
});

describe("wasteUtils — normalizeDetections", () => {
  it("normalizes array of detection objects and aliases", () => {
    const raw = [
      { waste_type: "bottle", count: 3 },
      { type: "plastic_bag", count: 2 },
      { class_name: "metal_can", count: 1 },
    ];
    const result = normalizeDetections(raw);
    expect(result).toEqual({
      bottle: 3,
      bag: 2,
      can: 1,
    });
  });

  it("normalizes detections object map and aliases", () => {
    const raw = {
      bottle: 2,
      plastic_bottle: 3,
      wrapper: 4,
    };
    const result = normalizeDetections(raw);
    expect(result).toEqual({
      bottle: 5,
      wrapper: 4,
    });
  });

  it("handles null or undefined detections gracefully", () => {
    expect(normalizeDetections(null)).toEqual({});
    expect(normalizeDetections(undefined)).toEqual({});
  });
});

describe("wasteUtils — getDetectionSummary", () => {
  it("selects the top waste type with the highest count", () => {
    const detections = {
      bottle: 2,
      bag: 5,
      can: 1,
    };
    const boxes = [
      { class_name: "bag", confidence: 0.95 },
      { class_name: "bag", confidence: 0.85 },
      { class_name: "bottle", confidence: 0.99 },
    ];
    const summary = getDetectionSummary(detections, boxes);
    expect(summary.topWasteType).toBe("bag");
    expect(summary.confidence).toBe(0.9);
  });

  it("resolves ties according to canonical model order (bottle > can > bag > wrapper)", () => {
    // Both bottle and bag have count 4
    const detections = {
      bag: 4,
      bottle: 4,
    };
    const summary = getDetectionSummary(detections, []);
    expect(summary.topWasteType).toBe("bottle");

    // Both can and wrapper have count 2
    const detections2 = {
      wrapper: 2,
      can: 2,
    };
    const summary2 = getDetectionSummary(detections2, []);
    expect(summary2.topWasteType).toBe("can");
  });

  it("returns null confidence when no matching bounding boxes exist", () => {
    const detections = { bottle: 3 };
    const boxes = [
      { class_name: "bag", confidence: 0.90 },
    ];
    const summary = getDetectionSummary(detections, boxes);
    expect(summary.topWasteType).toBe("bottle");
    expect(summary.confidence).toBeNull();
  });

  it("returns null when detections are empty", () => {
    const summary = getDetectionSummary({}, []);
    expect(summary.topWasteType).toBeNull();
    expect(summary.confidence).toBeNull();
  });
});

describe("wasteUtils — isRecyclableWaste", () => {
  it("identifies recyclable waste items", () => {
    expect(isRecyclableWaste("bottle")).toBe(true);
    expect(isRecyclableWaste("can")).toBe(true);
    expect(isRecyclableWaste("bag")).toBe(false);
    expect(isRecyclableWaste("wrapper")).toBe(false);
  });

  it("uses database catalog when provided", () => {
    const catalog = [
      { id: "custom_item", is_recyclable: true },
    ];
    expect(isRecyclableWaste("custom_item", catalog)).toBe(true);
  });
});

describe("wasteUtils — getActionStatus", () => {
  it("maps severity score and tier to standard action status", () => {
    expect(getActionStatus(5, "Low")).toBe("Routine maintenance");
    expect(getActionStatus(10, "Low")).toBe("Routine maintenance");
    expect(getActionStatus(15, "Moderate")).toBe("Active monitoring");
    expect(getActionStatus(30, "Moderate")).toBe("Active monitoring");
    expect(getActionStatus(45, "High")).toBe("Cleanup priority");
    expect(getActionStatus(60, "High")).toBe("Cleanup priority");
    expect(getActionStatus(75, "Severe")).toBe("Urgent intervention");
    expect(getActionStatus(0, null)).toBe("Routine maintenance");
  });
});

describe("wasteUtils — getPerClassConfidences", () => {
  it("computes item count and average confidence per class", () => {
    const detections = { bottle: 2, bag: 1 };
    const boxes = [
      { class_name: "bottle", confidence: 0.90 },
      { class_name: "bottle", confidence: 0.80 },
      { class_name: "bag", confidence: 0.95 },
    ];
    const result = getPerClassConfidences(detections, boxes);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: "bottle",
      label: "Plastic Bottle",
      count: 2,
      confidence: 0.85,
    });
    expect(result[1]).toEqual({
      type: "bag",
      label: "Plastic Bag",
      count: 1,
      confidence: 0.95,
    });
  });

  it("handles classes without bounding boxes gracefully", () => {
    const detections = { can: 3 };
    const result = getPerClassConfidences(detections, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "can",
      label: "Metal Can",
      count: 3,
      confidence: null,
    });
  });
});
