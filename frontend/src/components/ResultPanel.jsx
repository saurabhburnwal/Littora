import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useTheme } from "../context/ThemeContext.jsx";
import { normalizeDetections, formatWasteType, isRecyclableWaste } from "../utils/wasteUtils.js";

const PIE_COLORS = {
  earth: {
    Recyclable: "#0d9488",
    "Non-recyclable": "#d97706",
  },
  dark: {
    Recyclable: "#00d4aa",
    "Non-recyclable": "#f43f5e",
  },
};

export default function ResultPanel({ result }) {
  const { theme } = useTheme();
  const activePalette = theme === "dark" ? PIE_COLORS.dark : PIE_COLORS.earth;
  const { total_waste = 0, pollution_score = 0, severity = "Low" } = result || {};

  const normalizedDetections = normalizeDetections(result?.detections);
  const wasteCatalog = result?.wasteTypesCatalog || [];

  const barData = Object.entries(normalizedDetections).map(([type, count]) => ({
    type: formatWasteType(type),
    count,
  }));

  let recyclable = 0;
  let nonRecyclable = 0;

  for (const [type, count] of Object.entries(normalizedDetections)) {
    if (isRecyclableWaste(type, wasteCatalog)) recyclable += count;
    else nonRecyclable += count;
  }

  const pieData = [
    { name: "Recyclable",     value: recyclable },
    { name: "Non-recyclable", value: nonRecyclable },
  ];

  const totalPieItems = recyclable + nonRecyclable;

  return (
    <section className="result-panel">
      <div className="result-summary">
        <div>
          <span className="stat-label">Total waste</span>
          <span className="stat-value">{total_waste}</span>
        </div>
        <div>
          <span className="stat-label">Pollution score</span>
          <span className="stat-value">{pollution_score}</span>
        </div>
        <div>
          <span className="stat-label">Severity</span>
          <span className={`severity-badge severity-${severity.toLowerCase()}`}>
            {severity}
          </span>
        </div>
      </div>

      <div className="charts">
        <div className="chart-box">
          <h3>This Photo — Waste Breakdown</h3>
          <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={220} debounce={50}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="type" tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }} axisLine={{ stroke: "var(--border-lt)" }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-lt)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  fontSize: "12px",
                  color: "var(--ink)",
                }}
                itemStyle={{ color: "var(--ink)" }}
                labelStyle={{ color: "var(--ink)" }}
              />
              <Bar dataKey="count" fill="var(--teal)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Recyclable vs Non-recyclable</h3>
          <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={220} debounce={50}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="44%"
                outerRadius={68}
                innerRadius={40}
                paddingAngle={4}
                stroke="var(--card-bg)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={activePalette[entry.name] || "#0d9488"} />
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
                itemStyle={{ color: "var(--ink)" }}
                labelStyle={{ color: "var(--ink)" }}
                formatter={(val, name) => {
                  const pct = totalPieItems > 0 ? Math.round((val / totalPieItems) * 100) : 0;
                  return [`${val} items (${pct}%)`, name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", fontWeight: 600, color: "var(--ink)", paddingTop: "4px" }}
                formatter={(value) => {
                  const item = pieData.find((p) => p.name === value);
                  const count = item ? item.value : 0;
                  const pct = totalPieItems > 0 ? Math.round((count / totalPieItems) * 100) : 0;
                  return `${value}: ${count} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
