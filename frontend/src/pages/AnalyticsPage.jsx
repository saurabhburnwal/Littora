import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useStats } from "../context/StatsContext.jsx";

const PIE_COLORS = ["#2f6f5e", "#c97b3d", "#a13d3d", "#3d6ea1", "#7c3d8a", "#f0b060"];
const WASTE_TYPES = [
  { name: "Plastic Bottles", count: 6457, pct: "42.2%" },
  { name: "Plastic Bags",    count: 3778, pct: "24.7%" },
  { name: "Foam Pieces",     count: 1908, pct: "12.5%" },
  { name: "Glass Bottles",   count: 1488, pct: "9.7%" },
  { name: "Metal Cans",      count: 984,  pct: "6.4%" },
  { name: "Other Items",     count: 678,  pct: "4.5%" },
];

const BEACH_DATA = [
  { beach: "Marina",    detections: 640 },
  { beach: "Juhu",      detections: 523 },
  { beach: "Goa",       detections: 412 },
  { beach: "Kavalam",   detections: 298 },
  { beach: "Puducherry",detections: 241 },
];

export default function AnalyticsPage() {
  const { stats } = useStats();

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Analytics</h1>
        <p>Deep-dive into waste detection patterns and beach pollution data.</p>
      </div>

      <div className="charts-row" style={{ padding: 0 }}>
        <div className="chart-card">
          <div className="chart-card-title">Top Beaches by Detections</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={BEACH_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="beach" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="detections" fill="#2f6f5e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">Waste Composition</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={WASTE_TYPES}
                dataKey="count"
                nameKey="name"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
              >
                {WASTE_TYPES.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="full-card">
        <div className="full-card-title">Top Waste Types</div>
        <table>
          <thead>
            <tr>
              <th>Waste Type</th>
              <th>Count</th>
              <th>Percentage</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {WASTE_TYPES.map(w => (
              <tr key={w.name}>
                <td style={{ fontWeight: 500 }}>{w.name}</td>
                <td>{w.count.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      height: '6px', borderRadius: '3px',
                      width: `${parseInt(w.pct)}%`,
                      background: 'var(--teal)',
                      maxWidth: '120px'
                    }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{w.pct}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.8rem' }}>↑ Increasing</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
