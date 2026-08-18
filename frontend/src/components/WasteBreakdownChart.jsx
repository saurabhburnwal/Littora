import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatWasteType } from "../utils/wasteUtils.js";

const COLORS = {
  Bottle:          "#0077B6",
  "Plastic Bottle": "#0077B6",
  Bag:             "#4CC9F0",
  "Plastic Bag":    "#4CC9F0",
  Wrapper:         "#F8961E",
  Can:             "#90BE6D",
  Glass:           "#577590",
  Foam:            "#F94144",
  Metal:           "#9C89B8",
  Other:           "#ADB5BD",
};

export default function WasteBreakdownChart({ aggregateDetections }) {
  const { chartData, total } = useMemo(() => {
    const data = Object.entries(aggregateDetections || {})
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type: formatWasteType(type),
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
              stroke="#ddd3bf"
              vertical={false}
            />
            <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#6b7a72" }} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#6b7a72" }}
            />
            <Tooltip
              contentStyle={{
                background:   "#fff",
                border:       "1px solid #ddd3bf",
                borderRadius: 8,
                fontSize:     13,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Items detected">
              {chartData.map((entry) => (
                <Cell
                  key={entry.type}
                  fill={COLORS[entry.type] || "#2f6f5e"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
