import { useState, useMemo } from "react";
import { useStats } from "../context/StatsContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Trash2, ImageIcon, Target, ChevronDown } from "lucide-react";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import MetricCard from "../components/ui/MetricCard.jsx";
import { formatWasteType } from "../utils/wasteUtils.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"];

const PALETTE = ["#0077B6", "#4CC9F0", "#F8961E", "#90BE6D", "#577590", "#F94144", "#9C89B8", "#ADB5BD"];
const PIE_COLORS = ["#0E8C86", "#D97757", "#C89F65", "#7BB7D9", "#6A994E", "#F8961E"];

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
  const isDark = theme === "dark";

  const linePrimary = isDark ? "#00D4AA" : "#0E8C86";
  const lineWaste   = isDark ? "#F59E0B" : "#D97706";

  const [dateRange, setDateRange] = useState("all");
  const [beach, setBeach] = useState("all");

  const handleClear = () => {
    setDateRange("all");
    setBeach("all");
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

  // Dynamic history filtering based on active dropdown criteria
  const filteredHistory = useMemo(() => {
    let list = Array.isArray(stats.history) ? stats.history : [];
    const now = Date.now();

    if (dateRange === "last7") {
      list = list.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 7 * 24 * 3600 * 1000);
    } else if (dateRange === "last30") {
      list = list.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 30 * 24 * 3600 * 1000);
    } else if (dateRange === "last90") {
      list = list.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 90 * 24 * 3600 * 1000);
    }

    if (beach !== "all") {
      list = list.filter((r) => r.location_label === beach || r.beach === beach);
    }

    return list;
  }, [stats.history, dateRange, beach]);

  const activeFilterCount = (dateRange !== "all" ? 1 : 0) + (beach !== "all" ? 1 : 0);

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

  // Aggregated waste composition breakdown (Pie chart & Table)
  const wasteComposition = useMemo(() => {
    const countMap = {};
    filteredHistory.forEach((r) => {
      if (r.detections_map && typeof r.detections_map === "object") {
        Object.entries(r.detections_map).forEach(([t, c]) => {
          const name = formatWasteType(t);
          countMap[name] = (countMap[name] || 0) + Number(c || 1);
        });
      } else if (Array.isArray(r.detections)) {
        r.detections.forEach((d) => {
          if (d && d.waste_type) {
            const name = formatWasteType(d.waste_type);
            countMap[name] = (countMap[name] || 0) + Number(d.count || 1);
          }
        });
      }
    });

    const entries = Object.entries(countMap);
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1;

    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        pct: `${((count / total) * 100).toFixed(1)}%`,
      }));
  }, [filteredHistory]);

  // Top locations by detections (horizontal bar chart)
  const topLocationsData = useMemo(() => {
    const locMap = {};
    filteredHistory.forEach((r) => {
      const label = r.location_label || r.beach || "Coastal Site";
      locMap[label] = (locMap[label] || 0) + 1;
    });

    return Object.entries(locMap)
      .map(([beachName, detections]) => ({ beach: beachName, detections }))
      .sort((a, b) => b.detections - a.detections)
      .slice(0, 5);
  }, [filteredHistory]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Historical Trends</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">Track changes in coastal waste over time.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Detections"
          value={totalDetections.toLocaleString()}
          icon={<TrendingUp size={18} />}
          subtext="Live DB Scans"
        />
        <MetricCard
          label="Total Waste Items"
          value={totalWasteItems.toLocaleString()}
          icon={<Trash2 size={18} />}
          subtext="Cataloged Items"
        />
        <MetricCard
          label="Avg. Items / Photo"
          value={avgItemsPerPhoto}
          icon={<ImageIcon size={18} />}
          subtext="Real-time Average"
        />
        <MetricCard
          label="AI Accuracy"
          value="91.3%"
          icon={<Target size={18} />}
          trend={{ direction: "up", value: "System Benchmark" }}
        />
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-wrap items-end gap-4 shadow-sm">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider" htmlFor="trend-date-select">
            Date Range
          </label>
          <div className="relative">
            <select
              id="trend-date-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Time</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider" htmlFor="trend-loc-select">
            Beach Location
          </label>
          <div className="relative">
            <select
              id="trend-loc-select"
              value={beach}
              onChange={(e) => setBeach(e.target.value)}
              className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Beaches</option>
              {beachOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center self-end pb-0.5">
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-colors cursor-pointer"
              onClick={handleClear}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Timeline & Activity Trends */}
      <section className="space-y-4">
        <SectionHeader
          title="Timeline & Activity Trends"
          subtitle="Chronological volume of detection scans and categorical waste trends over time"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Detections & Waste Over Time (Line Chart) */}
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
            <div className="font-display text-sm sm:text-base font-bold text-text-primary mb-4">Detections &amp; Waste Over Time</div>
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-center text-xs sm:text-sm text-text-muted italic">No trend data recorded for selected criteria. Upload scans to populate timeline charts.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", fontWeight: 600 }} />
                  <Line type="monotone" dataKey="detections" stroke={linePrimary} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Detections Count" />
                  <Line type="monotone" dataKey="waste" stroke={lineWaste} strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} name="Total Waste Items" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card 2: Waste Category Trend (Stacked Bar Chart) */}
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
            <div className="font-display text-sm sm:text-base font-bold text-text-primary mb-4">Waste Category Trend (by Count)</div>
            {wasteTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-center text-xs sm:text-sm text-text-muted italic">No waste category trends recorded for selected criteria.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={wasteTypeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", fontWeight: 600 }} />
                  {wasteCategoryKeys.map((key, idx) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={PALETTE[idx % PALETTE.length]} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: Composition & Spatial Distribution */}
      <section className="space-y-4">
        <SectionHeader
          title="Composition & Spatial Distribution"
          subtitle="Categorical debris breakdown and top coastal detection hotspots"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 3: Waste Category Composition (Donut Chart) */}
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
            <div className="font-display text-sm sm:text-base font-bold text-text-primary mb-4">Waste Category Composition</div>
            {wasteComposition.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-center text-xs sm:text-sm text-text-muted italic">No waste composition data recorded for selected criteria.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={wasteComposition}
                    dataKey="count"
                    nameKey="name"
                    outerRadius={80}
                    innerRadius={48}
                    paddingAngle={3}
                  >
                    {wasteComposition.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingTop: "4px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card 4: Top Locations by Detections (Horizontal Bar Chart) */}
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
            <div className="font-display text-sm sm:text-base font-bold text-text-primary mb-4">Top Locations by Detections</div>
            {topLocationsData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-center text-xs sm:text-sm text-text-muted italic">No location detections recorded in database.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topLocationsData} layout="vertical" margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis dataKey="beach" type="category" tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} width={100} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="detections" fill="var(--teal)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* HEATMAP SECTION: Pollution by Day / Time */}
      <section className="space-y-4">
        <SectionHeader
          title="Pollution by Day / Time"
          subtitle="Temporal density heatmap of debris sightings throughout the week"
        />
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col">
          <div className="font-display text-sm sm:text-base font-bold text-text-primary mb-4">Heatmap — Detections by Day &amp; Time</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <div className="flex flex-col gap-2 pt-6 shrink-0">
              {DAYS.map((d) => (
                <div key={d} className="h-6 text-xs font-medium text-text-muted flex items-center justify-end pr-2">{d}</div>
              ))}
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-[320px]">
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-semibold text-text-muted pb-1">
                {HOURS.map((h) => (
                  <div key={h} className="text-xs font-semibold text-text-muted">{h}</div>
                ))}
              </div>
              {heatmapData.map((row) => (
                <div key={row.day} className="grid grid-cols-6 gap-2">
                  {row.hours.map((cell) => (
                    <div
                      key={cell.hour}
                      className="h-6 rounded-md border border-border/50 transition-colors"
                      style={{
                        background: getHeatmapColor(cell.value, isDark),
                      }}
                      title={`${row.day} ${cell.hour}: ${cell.value} detections`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
