export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
export const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export const CANONICAL_WASTE_CLASSES = ["bottle", "bag", "can", "wrapper"];

export const SEVERITY_RANKS = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Severe: 3,
};

