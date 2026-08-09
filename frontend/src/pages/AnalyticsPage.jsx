import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useStats } from "../context/StatsContext.jsx";
import { formatWasteType } from "../utils/wasteUtils.js";

const PIE_COLORS = ["#2f6f5e", "#c97b3d", "#a13d3d", "#3d6ea1", "#7c3d8a", "#f0b060"];

export default function AnalyticsPage() {
  const { stats } = useStats();

  const wasteComposition = useMemo(() => {
    const aggregate = stats.aggregateDetections || {};
    const entries = Object.entries(aggregate).filter(([_, count]) => count > 0);
    const total = entries.reduce((s, [_, v]) => s + v, 0) || 1;

    if (entries.length === 0) {
      return [
        { name: "No Active Detections", count: 0, pct: "0.0%" }
      ];
    }

    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        name: formatWasteType(type),
        count: count,
        pct: `${((count / total) * 100).toFixed(1)}%`
      }));
  }, [stats.aggregateDetections]);

  const beachData = useMemo(() => {
    const locMap = {};
    (stats.locations || []).forEach(loc => {
      const label = loc.location_label || "Coastal Site";
      locMap[label] = (locMap[label] || 0) + 1;
    });

    const entries = Object.entries(locMap).map(([beach, detections]) => ({ beach, detections }));
    if (entries.length === 0) {
      return [];
    }
    return entries.slice(0, 5);
  }, [stats.locations]);

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Analytics</h1>
        <p>Deep-dive into waste detection patterns and beach pollution data.</p>
      </div>

      <div className="charts-row" style={{ padding: 0 }}>
        <div className="chart-card">
          <div className="chart-card-title">Top Locations by Detections</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={beachData} layout="vertical" margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border-lt)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
              <YAxis dataKey="beach" type="category" tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} width={95} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
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
              <Bar dataKey="detections" fill="var(--teal)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">Waste Composition</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={wasteComposition}
                dataKey="count"
                nameKey="name"
                outerRadius={90}
                innerRadius={55}
                paddingAngle={3}
              >
                {wasteComposition.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
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
              <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingTop: "6px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="full-card" style={{ border: "1px solid var(--border-lt)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div className="full-card-title" style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1rem" }}>
          Top Waste Types &amp; Breakdown
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Waste Type</th>
              <th style={{ fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Count</th>
              <th style={{ fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Percentage</th>
              <th style={{ fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {wasteComposition.map(w => (
              <tr key={w.name}>
                <td style={{ fontWeight: 600, color: "var(--ink)" }}>{w.name}</td>
                <td style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{w.count.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      height: '6px', borderRadius: '3px',
                      width: `${Math.min(parseFloat(w.pct) || 5, 100)}%`,
                      background: 'var(--teal)',
                      minWidth: '6px',
                      maxWidth: '120px'
                    }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{w.pct}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.78rem' }}>Active Tracking</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
