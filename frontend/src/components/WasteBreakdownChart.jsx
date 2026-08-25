import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatWasteType, getWasteColor } from "../utils/wasteUtils.js";

export default function WasteBreakdownChart({ aggregateDetections }) {
  const { chartData, total } = useMemo(() => {
    const data = Object.entries(aggregateDetections || {})
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type: formatWasteType(type),
        rawType: type,
        count,
      }));
    const sum = data.reduce((s, d) => s + d.count, 0);
    return { chartData: data, total: sum };
  }, [aggregateDetections]);

  return (
    <div className="chart-card">
      <p className="chart-card-title">Waste Composition</p>
      {total === 0 ? (
        <div className="chart-empty">
          No waste data yet — upload a photo to populate this chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-lt)"
              vertical={false}
            />
            <XAxis dataKey="type" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
            />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Items detected">
              {chartData.map((entry) => (
                <Cell
                  key={entry.type}
                  fill={getWasteColor(entry.rawType)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
