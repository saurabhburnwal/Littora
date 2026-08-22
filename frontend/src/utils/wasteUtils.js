/**
 * Waste Management & Formatting Utilities
 * Standardized waste normalizers, severity normalizers, and catalog lookups across Littora.
 */

// Default set of recyclable waste item types (lowercased)
export const DEFAULT_RECYCLABLE_TYPES = new Set([
  "bottle",
  "can",
  "plastic_bottle",
  "glass_bottle",
  "metal_can",
  "aluminum_can",
  "cardboard",
  "paper",
  "glass",
]);

// Standard AI model configuration catalog defaults
export const DEFAULT_AI_MODELS = [
  { id: "yolov8m",  name: "YOLOv8 Medium",  tag: "Standard Baseline", params: "25.9M", description: "Balanced speed & precision for general coastal debris detection.", badge: "Default" },
  { id: "yolov11m", name: "YOLOv11 Medium", tag: "Enhanced Accuracy", params: "20.1M", description: "Enhanced feature extraction & attention mechanisms for complex or occluded waste.", badge: "High Precision" },
  { id: "yolov26s", name: "YOLOv26 Small",  tag: "Ultra-Fast Edge",    params: "9.6M",  description: "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.", badge: "Fastest" },
];

/**
 * Normalizes severity string to standard capitalized Severity ("Low", "Moderate", "High", "Severe")
 */
export function normalizeSeverity(sev) {
  if (!sev) return "Low";
  const s = String(sev).trim().toLowerCase();
  if (s === "severe") return "Severe";
  if (s === "high") return "High";
  if (s === "moderate") return "Moderate";
  return "Low";
}

/**
 * Formats a raw waste type identifier (e.g. "plastic_bottle") into title case ("Plastic Bottle")
 */
export function formatWasteType(type) {
  if (!type) return "Unknown";
  return String(type)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Checks whether a given waste type is recyclable based on the database catalog or default fallback set.
 */
export function isRecyclableWaste(type, wasteCatalog = []) {
  const normalizedType = String(type || "").toLowerCase();
  if (Array.isArray(wasteCatalog) && wasteCatalog.length > 0) {
    const catalogItem = wasteCatalog.find(
      (w) => String(w.id || w.waste_type || "").toLowerCase() === normalizedType
    );
    if (catalogItem) return Boolean(catalogItem.is_recyclable);
  }
  return DEFAULT_RECYCLABLE_TYPES.has(normalizedType);
}

/**
 * Normalizes detection input (array of objects or object map) into a unified object:
 * { [wasteTypeLower]: countNumber }
 */
export function normalizeDetections(rawDetections) {
  const normalized = {};
  if (Array.isArray(rawDetections)) {
    rawDetections.forEach((d) => {
      if (d) {
        const typeKey = String(d.waste_type || d.type || d.class_name || "").toLowerCase();
        if (typeKey) {
          normalized[typeKey] = (normalized[typeKey] || 0) + Number(d.count ?? 1);
        }
      }
    });
  } else if (typeof rawDetections === "object" && rawDetections !== null) {
    Object.entries(rawDetections).forEach(([key, value]) => {
      if (value && typeof value === "object" && (value.waste_type || value.type)) {
        const typeKey = String(value.waste_type || value.type).toLowerCase();
        normalized[typeKey] = (normalized[typeKey] || 0) + Number(value.count ?? 1);
      } else {
        const typeKey = String(key).toLowerCase();
        normalized[typeKey] = (normalized[typeKey] || 0) + Number(value || 0);
      }
    });
  }
  return normalized;
}

/**
 * Converts any raw analysis/location object into standard result shape expected by ResultPanel component
 */
export function toResultShape(item) {
  if (!item) return { detections: {}, total_waste: 0, pollution_score: 0, severity: "Low", boxes: [] };
  return {
    ...item,
    detections: normalizeDetections(item.detections),
    total_waste: item.total_waste ?? 0,
    pollution_score: item.pollution_score ?? 0,
    severity: normalizeSeverity(item.severity),
    boxes: item.boxes || [],
  };
}
