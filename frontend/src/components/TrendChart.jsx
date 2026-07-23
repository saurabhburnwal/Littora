import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function TrendChart({ history }) {
  // history is newest-first from the API — reverse to chronological for the chart
  const chartData = (history || [])
    .slice()
    .reverse()
    .map((r) => ({
      date:  new Date(r.created_at).toLocaleDateString("en-IN", {
        month: "short",
        day:   "numeric",
      }),
      score: r.pollution_score,
    }));

  return (
    <div className="chart-card">
      <p className="chart-card-title">Detections Over Time</p>
      {chartData.length === 0 ? (
        <div className="chart-empty">
          No analyses yet — upload a photo to see the trend.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2f6f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2f6f5e" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd3bf" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6b7a72" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
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
            <Area
              type="monotone"
              dataKey="score"
              stroke="#2f6f5e"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={{ fill: "#2f6f5e", r: 3 }}
              activeDot={{ r: 5 }}
              name="Pollution Score"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
