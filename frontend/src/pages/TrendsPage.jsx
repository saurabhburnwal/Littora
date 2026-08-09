import { useState, useMemo } from "react";
import { useStats } from "../context/StatsContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth }  from "../context/AuthContext.jsx";
import AuthRequiredModal from "../components/AuthRequiredModal.jsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { TrendingUp, Trash2, ImageIcon, Target, LogIn } from "lucide-react";
import { formatWasteType } from "../utils/wasteUtils.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"];

const PALETTE = ["#0077B6", "#4CC9F0", "#F8961E", "#90BE6D", "#577590", "#F94144", "#9C89B8", "#ADB5BD"];

function getHeatmapColor(val, isDark) {
  if (!val || val === 0) return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const alpha = Math.max(0.15, Math.min(1.0, val / 10)).toFixed(2);
  return isDark
    ? `rgba(0, 212, 170, ${alpha})`
    : `rgba(14, 140, 134, ${alpha})`;
}

export default function TrendsPage() {
  const { stats } = useStats();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const [showAuthModal, setShowAuthModal] = useState(false);

  const linePrimary = isDark ? "#00D4AA" : "#0E8C86";
  const lineWaste   = isDark ? "#F59E0B" : "#D97706";

  const [dateRange, setDateRange] = useState("all");
  const [beach, setBeach] = useState("all");
  const [wasteType, setWasteType] = useState("all");

  const [activeDateRange, setActiveDateRange] = useState("all");
  const [activeBeach, setActiveBeach] = useState("all");
  const [activeWasteType, setActiveWasteType] = useState("all");

  const handleApply = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setActiveDateRange(dateRange);
    setActiveBeach(beach);
    setActiveWasteType(wasteType);
  };

  const handleClear = () => {
    setDateRange("all");
    setBeach("all");
    setWasteType("all");
    setActiveDateRange("all");
    setActiveBeach("all");
    setActiveWasteType("all");
  };

  // Dynamic location list from database
  const beachOptions = useMemo(() => {
    const set = new Set();
    (stats.locations || []).forEach((l) => {
      const label = l.location_label || l.beach;
      if (label) set.add(label);
    });
    (stats.history || []).forEach((h) => {
      if (h.location_label) set.add(h.location_label);
    });
    return Array.from(set);
  }, [stats.locations, stats.history]);

  // Dynamic waste category list from database
  const wasteTypeOptions = useMemo(() => {
    if (Array.isArray(stats.wasteTypesCatalog) && stats.wasteTypesCatalog.length > 0) {
      return stats.wasteTypesCatalog.map((w) => ({
        id: w.id,
        name: w.name || formatWasteType(w.id),
      }));
    }
    const aggregateKeys = Object.keys(stats.aggregateDetections || {});
    return aggregateKeys.map((key) => ({
      id: key,
      name: formatWasteType(key),
    }));
  }, [stats.wasteTypesCatalog, stats.aggregateDetections]);

  // Dynamic history filtering based on active dropdown criteria
  const filteredHistory = useMemo(() => {
    let list = Array.isArray(stats.history) ? stats.history : [];
    const now = Date.now();

    if (activeDateRange === "last30") {
      list = list.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 30 * 24 * 3600 * 1000);
    } else if (activeDateRange === "last90") {
      list = list.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 90 * 24 * 3600 * 1000);
    } else if (activeDateRange === "last365") {
      list = list.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 365 * 24 * 3600 * 1000);
    }

    if (activeBeach !== "all") {
      list = list.filter((r) => r.location_label === activeBeach || r.beach === activeBeach);
    }

    if (activeWasteType !== "all") {
      const typeKey = activeWasteType.toLowerCase();
      list = list.filter((r) => {
        if (r.detections_map && typeof r.detections_map === "object") {
          return Boolean(r.detections_map[typeKey]);
        }
        if (Array.isArray(r.detections)) {
          return r.detections.some((d) => String(d.waste_type || "").toLowerCase() === typeKey);
        }
        return false;
      });
    }

    return list;
  }, [stats.history, activeDateRange, activeBeach, activeWasteType]);

  // Detections & Waste Over Time computed dynamically from database
  const monthlyData = useMemo(() => {
    if (!filteredHistory || filteredHistory.length === 0) return [];

    const monthGroups = {};
    filteredHistory.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const monthKey = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = { month: monthKey, detections: 0, waste: 0, dateObj: d };
      }
      monthGroups[monthKey].detections += 1;
      monthGroups[monthKey].waste += Number(r.total_waste || 0);
    });

    return Object.values(monthGroups).sort((a, b) => a.dateObj - b.dateObj);
  }, [filteredHistory]);

  // Waste category composition over time computed dynamically
  const wasteTypeData = useMemo(() => {
    if (!filteredHistory || filteredHistory.length === 0) return [];

    const dateGroups = {};
    filteredHistory.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const dateKey = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = { month: dateKey, dateObj: d };
      }

      if (r.detections_map && typeof r.detections_map === "object") {
        Object.entries(r.detections_map).forEach(([type, count]) => {
          const typeName = formatWasteType(type);
          dateGroups[dateKey][typeName] = (dateGroups[dateKey][typeName] || 0) + Number(count || 1);
        });
      } else if (Array.isArray(r.detections)) {
        r.detections.forEach((d) => {
          if (d && d.waste_type) {
            const typeName = formatWasteType(d.waste_type);
            dateGroups[dateKey][typeName] = (dateGroups[dateKey][typeName] || 0) + Number(d.count || 1);
          }
        });
      }
    });

    return Object.values(dateGroups).sort((a, b) => a.dateObj - b.dateObj);
  }, [filteredHistory]);

  // Dynamic waste category keys for bar chart
  const wasteCategoryKeys = useMemo(() => {
    const keys = new Set();
    wasteTypeData.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (k !== "month" && k !== "dateObj") keys.add(k);
      });
    });
    return Array.from(keys);
  }, [wasteTypeData]);

  // Dynamic Heatmap computed from real database record timestamps
  const heatmapData = useMemo(() => {
    const grid = DAYS.map((day) => ({
      day,
      hours: HOURS.map((hour) => ({ hour, value: 0 })),
    }));

    if (!filteredHistory || filteredHistory.length === 0) return grid;

    filteredHistory.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
      const hour = d.getHours();
      let hourIdx = 0;
      if (hour >= 4 && hour < 8) hourIdx = 1;
      else if (hour >= 8 && hour < 12) hourIdx = 2;
      else if (hour >= 12 && hour < 16) hourIdx = 3;
      else if (hour >= 16 && hour < 20) hourIdx = 4;
      else if (hour >= 20 || hour < 4) hourIdx = 5;

      grid[dayIdx].hours[hourIdx].value += 1;
    });

    return grid;
  }, [filteredHistory]);

  const totalDetections = filteredHistory.length;
  const totalWasteItems = filteredHistory.reduce((s, r) => s + (r.total_waste || 0), 0);
  const avgItemsPerPhoto = totalDetections > 0 ? (totalWasteItems / totalDetections).toFixed(1) : "0.0";

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div className="page-heading">
        <h1>Historical Trends &amp; Analytics</h1>
        <p>Monitor seasonal pollution shifts, waste category composition, and day/time detection density.</p>
      </div>

      {!user ? (
        <div className="result-placeholder" style={{ marginTop: "2rem", padding: "3rem 1.5rem", textAlign: "center" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "rgba(47, 111, 94, 0.12)", color: "var(--teal)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem"
          }}>
            <LogIn size={28} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ink)" }}>
            Historical Trends are Private to Signed-In Users
          </h3>
          <p style={{ maxWidth: "480px", margin: "0 auto 1.5rem", fontSize: "0.88rem", color: "var(--muted)" }}>
            Guest visitors can preview the main dashboard and beach map. Please sign in or create an account to view trend analytics, seasonal pollution shifts, and waste category breakdowns.
          </p>
          <button
            className="filter-btn-apply"
            onClick={() => window.location.href = "/login"}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.8rem" }}
          >
            <LogIn size={16} />
            Sign In to Access Trends
          </button>
        </div>
      ) : (
        <>
          {/* Dynamic Database Filter Bar */}
          <div className="filter-bar-card">
            <div className="filter-group">
              <label className="filter-label">Date Range</label>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="filter-select">
                <option value="all">All Time</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="last365">Last 1 Year</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Beach Location</label>
              <select value={beach} onChange={e => setBeach(e.target.value)} className="filter-select">
                <option value="all">All Beaches</option>
                {beachOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Waste Type</label>
              <select value={wasteType} onChange={e => setWasteType(e.target.value)} className="filter-select">
                <option value="all">All Categories</option>
                {wasteTypeOptions.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              <button className="filter-btn filter-btn-apply" onClick={handleApply}>Apply Filters</button>
              <button className="filter-btn filter-btn-clear" onClick={handleClear}>Reset</button>
            </div>
          </div>

          {/* Dynamic Metric Cards Row */}
          <div className="trend-metric-cards">
            <div className="trend-metric-card">
              <div className="trend-metric-icon" style={{ background: 'rgba(14,140,134,0.12)' }}>
                <TrendingUp size={20} color="var(--primary)" />
              </div>
              <div>
                <div className="trend-metric-value">{totalDetections.toLocaleString()}</div>
                <div className="trend-metric-label">Total Detections</div>
                <div className="trend-metric-delta" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>Live DB Scans</div>
              </div>
            </div>

            <div className="trend-metric-card">
              <div className="trend-metric-icon" style={{ background: 'rgba(200,159,101,0.12)' }}>
                <Trash2 size={20} color="var(--sand-gold)" />
              </div>
              <div>
                <div className="trend-metric-value">{totalWasteItems.toLocaleString()}</div>
                <div className="trend-metric-label">Total Waste Items</div>
                <div className="trend-metric-delta" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>Cataloged Items</div>
              </div>
            </div>

            <div className="trend-metric-card">
              <div className="trend-metric-icon" style={{ background: 'rgba(123,183,217,0.12)' }}>
                <ImageIcon size={20} color="var(--sky)" />
              </div>
              <div>
                <div className="trend-metric-value">{avgItemsPerPhoto}</div>
                <div className="trend-metric-label">Avg. Items / Photo</div>
                <div className="trend-metric-delta" style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 600 }}>Real-time Average</div>
              </div>
            </div>

            <div className="trend-metric-card">
              <div className="trend-metric-icon" style={{ background: 'rgba(217,119,87,0.12)' }}>
                <Target size={20} color="var(--coral)" />
              </div>
              <div>
                <div className="trend-metric-value">91.3%</div>
                <div className="trend-metric-label">AI Accuracy</div>
                <div className="trend-metric-delta" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>↑ System Benchmark</div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="charts-row" style={{ padding: 0 }}>
            <div className="chart-card">
              <div className="chart-card-title">Detections &amp; Waste Over Time</div>
              {monthlyData.length === 0 ? (
                <div className="chart-empty">No trend data recorded for selected criteria. Upload scans to populate timeline charts.</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--border-lt)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--border-lt)",
                        borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        fontSize: "12px",
                        color: "var(--ink)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", fontWeight: 600 }} />
                    <Line type="monotone" dataKey="detections" stroke={linePrimary} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Detections Count" />
                    <Line type="monotone" dataKey="waste" stroke={lineWaste} strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} name="Total Waste Items" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Waste Category Trend (by Count)</div>
              {wasteTypeData.length === 0 ? (
                <div className="chart-empty">No waste category trends recorded for selected criteria.</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={wasteTypeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--border-lt)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--border-lt)",
                        borderRadius: "10px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        fontSize: "12px",
                        color: "var(--ink)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", fontWeight: 600 }} />
                    {wasteCategoryKeys.map((key, idx) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={PALETTE[idx % PALETTE.length]} radius={[0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Dynamic Heatmap */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-card-title">Heatmap — Detections by Day &amp; Time</div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', paddingTop: '0.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '22px' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ height: '26px', display: 'flex', alignItems: 'center', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', width: '30px' }}>{d}</div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                  {HOURS.map(h => (
                    <div key={h} style={{ flex: 1, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>{h}</div>
                  ))}
                </div>
                {heatmapData.map(row => (
                  <div key={row.day} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                    {row.hours.map(cell => (
                      <div
                        key={cell.hour}
                        style={{
                          flex: 1,
                          height: '26px',
                          borderRadius: '6px',
                          background: getHeatmapColor(cell.value, isDark),
                          border: '1px solid rgba(0,0,0,0.03)',
                          transition: 'transform 0.15s ease',
                        }}
                        title={`${row.day} ${cell.hour}: ${cell.value} detections`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        featureName="filter historical trend analytics"
      />
    </div>
  );
}
