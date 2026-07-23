import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const EMPTY_STATS = {
  totalAnalyses:       0,
  totalWasteAllTime:   0,
  avgScore:            0,
  severityCounts:      { Low: 0, Moderate: 0, High: 0, Severe: 0 },
  aggregateDetections: { bottle: 0, can: 0, bag: 0, wrapper: 0 },
  locations:           [],
  history:             [],
};

export const StatsContext = createContext(null);

export function StatsProvider({ children }) {
  const [stats, setStats] = useState(EMPTY_STATS);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/stats`);
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <StatsContext.Provider value={{ stats, loadStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used inside <StatsProvider>");
  return ctx;
}
