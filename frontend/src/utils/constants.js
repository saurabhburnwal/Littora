export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
export const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

export const CANONICAL_WASTE_CLASSES = ["bottle", "bag", "can", "wrapper"];

export const SEVERITY_RANKS = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Severe: 3,
};

export const STANDARD_TIMEFRAMES = [
  { id: "all", label: "All Time",      shortLabel: "All Time", days: null },
  { id: "7d",  label: "Last 7 Days",   shortLabel: "7d",       days: 7 },
  { id: "30d", label: "Last 30 Days",  shortLabel: "30d",      days: 30 },
  { id: "90d", label: "Last 90 Days",  shortLabel: "90d",      days: 90 },
];

