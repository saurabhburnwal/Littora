import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function TrendChart({ history }) {
  // history is newest-first from the API — reverse to chronological for the chart
  const chartData = useMemo(() => {
    return (history || [])
      .slice()
      .reverse()
      .map((r) => ({
        date: new Date(r.created_at).toLocaleDateString("en-IN", {
          month: "short",
          day:   "numeric",
        }),
        score: r.pollution_score,
      }));
  }, [history]);

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
                <stop offset="5%"  stopColor="var(--teal)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--teal)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border-lt)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }}
              axisLine={{ stroke: "var(--border-lt)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--muted)", fontWeight: 600 }}
              axisLine={{ stroke: "var(--border-lt)" }}
              tickLine={false}
            />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--teal)"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={{ fill: "var(--teal)", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="Pollution Score"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
