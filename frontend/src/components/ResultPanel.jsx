import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Simple recyclable/non-recyclable split for the pie chart.
// Refine this once Member 1's research settles on a proper reference.
const RECYCLABLE_TYPES = new Set(["bottle", "can"]);

const COLORS = ["#2f6f5e", "#c97b3d", "#a13d3d", "#3d6ea1"];

export default function ResultPanel({ result }) {
  const { detections, total_waste, pollution_score, severity } = result;

  const barData = Object.entries(detections).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count,
  }));

  let recyclable = 0;
  let nonRecyclable = 0;
  for (const [type, count] of Object.entries(detections)) {
    if (RECYCLABLE_TYPES.has(type)) recyclable += count;
    else nonRecyclable += count;
  }
  const pieData = [
    { name: "Recyclable", value: recyclable },
    { name: "Non-recyclable", value: nonRecyclable },
  ];

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
          <span className={`severity-badge severity-${severity.toLowerCase()}`}>{severity}</span>
        </div>
      </div>

      <div className="charts">
        <div className="chart-box">
          <h3>By waste type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="type" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2f6f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Recyclable vs non-recyclable</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
