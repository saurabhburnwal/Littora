import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext.jsx";

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
  const { user, getToken } = useAuth();

  const loadStats = useCallback(async () => {
    try {
      const headers = {};
      if (user) {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const { data } = await axios.get(`${API_BASE}/api/stats`, { headers });
      setStats(data);
    } catch (err) {
      if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
        console.error("Failed to load stats:", err);
      }
    }
  }, [user, getToken]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const value = useMemo(() => ({ stats, loadStats }), [stats, loadStats]);

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used inside <StatsProvider>");
  return ctx;
}
