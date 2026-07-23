import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// Match the severity-badge palette for visual consistency
const COLORS = {
  Bottle:  "#2f6f5e",
  Can:     "#3d6ea1",
  Bag:     "#c97b3d",
  Wrapper: "#a13d3d",
};

export default function WasteBreakdownChart({ aggregateDetections }) {
  const chartData = Object.entries(aggregateDetections || {}).map(
    ([type, count]) => ({
      type:  type.charAt(0).toUpperCase() + type.slice(1),
      count,
    })
  );

  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="chart-card">
      <p className="chart-card-title">All-Time Waste Breakdown</p>
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
