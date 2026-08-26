/**
 * Waste Management & Formatting Utilities
 * Standardized waste normalizers, severity normalizers, and catalog lookups across Littora.
 */
import { API_BASE, AI_SERVICE_URL, CANONICAL_WASTE_CLASSES, SEVERITY_RANKS } from "./constants.js";

export { API_BASE, AI_SERVICE_URL, CANONICAL_WASTE_CLASSES, SEVERITY_RANKS };

export const SUPPORTED_WASTE_TYPES = CANONICAL_WASTE_CLASSES;

export const BBOX_COLORS = {
  bottle:  "#00D4AA",
  can:     "#F59E0B",
  bag:     "#A855F7",
  wrapper: "#F43F5E",
  glass:   "#38BDF8",
  foam:    "#EF4444",
  metal:   "#818CF8",
  other:   "#9CA3AF",
};

export const WASTE_TYPE_COLORS = {
  bottle:  "#0077B6",
  can:     "#90BE6D",
  bag:     "#4CC9F0",
  wrapper: "#F8961E",
  glass:   "#38BDF8",
  foam:    "#EF4444",
  metal:   "#818CF8",
  other:   "#ADB5BD",
};

export function getWasteColor(type) {
  const norm = String(type || "").toLowerCase();
  return WASTE_TYPE_COLORS[norm] || BBOX_COLORS[norm] || "#0E8C86";
}

// Default set of recyclable waste item types (lowercased)
export const DEFAULT_RECYCLABLE_TYPES = new Set([
  "bottle",
  "can",
  "aluminum_can",
  "cardboard",
  "paper",
  "glass",
]);

const WASTE_TYPE_LABELS = {
  bottle: "Plastic Bottle",
  can: "Metal Can",
  bag: "Plastic Bag",
  wrapper: "Food Wrapper",
};

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
 * Formats a raw waste type identifier (e.g. "bottle") into its display label ("Plastic Bottle")
 */
export function formatWasteType(type) {
  if (!type) return "Unknown";
  const normalized = String(type).trim().toLowerCase();
  return WASTE_TYPE_LABELS[normalized] || normalized
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

const WASTE_TYPE_ALIASES = {
  plastic_bottle: "bottle",
  plastic_bag: "bag",
  metal_can: "can",
  aluminum_can: "can",
  glass_bottle: "glass",
};

/**
 * Normalizes detection input (array of objects or object map) into a unified object:
 * { [wasteTypeLower]: countNumber }
 */
export function normalizeDetections(rawDetections) {
  const normalized = {};
  if (Array.isArray(rawDetections)) {
    rawDetections.forEach((d) => {
      if (d) {
        let typeKey = String(d.waste_type || d.type || d.class_name || "").toLowerCase();
        typeKey = WASTE_TYPE_ALIASES[typeKey] || typeKey;
        if (typeKey) {
          normalized[typeKey] = (normalized[typeKey] || 0) + Number(d.count ?? 1);
        }
      }
    });
  } else if (typeof rawDetections === "object" && rawDetections !== null) {
    Object.entries(rawDetections).forEach(([key, value]) => {
      if (value && typeof value === "object" && (value.waste_type || value.type)) {
        let typeKey = String(value.waste_type || value.type).toLowerCase();
        typeKey = WASTE_TYPE_ALIASES[typeKey] || typeKey;
        normalized[typeKey] = (normalized[typeKey] || 0) + Number(value.count ?? 1);
      } else {
        let typeKey = String(key).toLowerCase();
        typeKey = WASTE_TYPE_ALIASES[typeKey] || typeKey;
        normalized[typeKey] = (normalized[typeKey] || 0) + Number(value || 0);
      }
    });
  }
  return normalized;
}

/**
 * Returns the most frequently detected waste type in an analysis and the
 * average confidence for boxes belonging to that same type.
 */
export function getDetectionSummary(detections, boxes = []) {
  const normalized = normalizeDetections(detections);
  const order = new Map(SUPPORTED_WASTE_TYPES.map((type, index) => [type, index]));
  const entries = Object.entries(normalized)
    .filter(([, count]) => Number(count) > 0)
    .sort(([typeA, countA], [typeB, countB]) => {
      const countDifference = Number(countB) - Number(countA);
      if (countDifference !== 0) return countDifference;
      return (order.get(typeA) ?? Number.MAX_SAFE_INTEGER) - (order.get(typeB) ?? Number.MAX_SAFE_INTEGER)
        || typeA.localeCompare(typeB);
    });

  const topWasteType = entries[0]?.[0] || null;
  if (!topWasteType) return { topWasteType: null, confidence: null };

  const confidences = (Array.isArray(boxes) ? boxes : [])
    .filter((box) => String(box?.class_name || "").toLowerCase() === topWasteType)
    .map((box) => Number(box.confidence))
    .filter(Number.isFinite);

  return {
    topWasteType,
    confidence: confidences.length
      ? Math.round((confidences.reduce((total, value) => total + value, 0) / confidences.length) * 10000) / 10000
      : null,
  };
}

/**
 * Computes actionable response recommendation based on severity score and tier
 * 0–10   → Low       → Routine maintenance
 * 11–30  → Moderate  → Active monitoring
 * 31–60  → High      → Cleanup priority
 * >60    → Severe    → Urgent intervention
 */
export function getActionStatus(score, severity) {
  const numScore = Number(score) || 0;
  const normSev = normalizeSeverity(severity);
  if (numScore > 60 || normSev === "Severe") return "Urgent intervention";
  if (numScore >= 31 || normSev === "High") return "Cleanup priority";
  if (numScore >= 11 || normSev === "Moderate") return "Active monitoring";
  return "Routine maintenance";
}

/**
 * Returns itemized list of detected waste classes with item count, formatted label,
 * and average confidence score calculated from normalized bounding boxes.
 */
export function getPerClassConfidences(detections, boxes = []) {
  const normalized = normalizeDetections(detections);
  const boxArray = Array.isArray(boxes) ? boxes : [];

  return Object.entries(normalized)
    .filter(([, count]) => Number(count) > 0)
    .map(([typeKey, count]) => {
      const classBoxes = boxArray.filter(
        (b) => String(b?.class_name || "").toLowerCase() === typeKey
      );
      const confidences = classBoxes
        .map((b) => Number(b.confidence))
        .filter(Number.isFinite);

      const avgConfidence = confidences.length
        ? Math.round((confidences.reduce((acc, val) => acc + val, 0) / confidences.length) * 10000) / 10000
        : null;

      return {
        type: typeKey,
        label: formatWasteType(typeKey),
        count: Number(count),
        confidence: avgConfidence,
      };
    })
    .sort((a, b) => b.count - a.count || (b.confidence || 0) - (a.confidence || 0));
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

/**
 * Calculates password strength score (0-4) and metadata
 */
export function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: "Empty", color: "#64748b" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Too Weak", color: "#ef4444" },
    { label: "Weak",     color: "#f97316" },
    { label: "Fair",     color: "#eab308" },
    { label: "Good",     color: "#06b6d4" },
    { label: "Strong",   color: "#10b981" },
  ];
  return { score, ...levels[score] };
}
