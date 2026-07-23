import { useState } from "react";
import { useStats } from "../context/StatsContext.jsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { TrendingUp, Trash2, ImageIcon, Target } from "lucide-react";

const MONTHLY_DATA = [
  { month: "Jan", detections: 5124, waste: 7245 },
  { month: "Feb", detections: 3842, waste: 6653 },
  { month: "Mar", detections: 4102, waste: 9812 },
  { month: "Apr", detections: 4650, waste: 8420 },
  { month: "May", detections: 5411, waste: 12161 },
  { month: "Jun", detections: 6842, waste: 15293 },
];

const WASTE_TYPE_DATA = [
  { month: "01 Jun", Plastic: 400, Bags: 240, Foam: 180, Glass: 80, Metal: 60, Other: 40 },
  { month: "08 Jun", Plastic: 520, Bags: 280, Foam: 200, Glass: 100, Metal: 75, Other: 55 },
  { month: "15 Jun", Plastic: 610, Bags: 320, Foam: 220, Glass: 115, Metal: 85, Other: 60 },
  { month: "22 Jun", Plastic: 740, Bags: 380, Foam: 260, Glass: 130, Metal: 95, Other: 70 },
  { month: "30 Jun", Plastic: 890, Bags: 430, Foam: 300, Glass: 150, Metal: 110, Other: 85 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"];

function generateHeatmap() {
  return DAYS.map(day => ({
    day,
    hours: HOURS.map(hour => ({
      hour,
      value: Math.floor(Math.random() * 100)
    }))
  }));
}
const HEATMAP_DATA = generateHeatmap();

const WASTE_COLORS = {
  Plastic: "#2f6f5e",
  Bags: "#c97b3d",
  Foam: "#7c3d8a",
  Glass: "#3d6ea1",
  Metal: "#a13d3d",
  Other: "#6b7a72",
};

export default function TrendsPage() {
  const { stats } = useStats();
  const [dateRange, setDateRange] = useState("last30");
  const [beach, setBeach] = useState("all");
  const [wasteType, setWasteType] = useState("all");

  const totalDetections = stats.totalAnalyses || 6842;
  const totalWaste = stats.totalWasteAllTime || 15293;

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Historical Trends</h1>
        <p>Explore waste detection trends over time and across different locations.</p>
      </div>

      {/* Filters */}
      <div className="filter-controls">
        <select className="filter-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
          <option value="last30">01 Jun 2026 – 30 Jun 2026</option>
          <option value="last90">Last 3 months</option>
          <option value="last365">Last 12 months</option>
        </select>
        <select className="filter-select" value={beach} onChange={e => setBeach(e.target.value)}>
          <option value="all">All Beaches</option>
          <option value="marina">Marina Beach</option>
          <option value="juhu">Juhu Beach</option>
          <option value="goa">Goa Beach</option>
        </select>
        <select className="filter-select" value={wasteType} onChange={e => setWasteType(e.target.value)}>
          <option value="all">All Waste Types</option>
          <option value="plastic">Plastic Bottles</option>
          <option value="bags">Plastic Bags</option>
          <option value="foam">Foam Pieces</option>
        </select>
        <button className="filter-btn filter-btn-apply">Apply Filters</button>
        <button className="filter-btn filter-btn-clear">Clear Filters</button>
      </div>

      {/* Metric Cards */}
      <div className="trend-metric-cards">
        <div className="trend-metric-card">
          <div className="trend-metric-icon" style={{ background: 'rgba(47,111,94,0.12)' }}>
            <TrendingUp size={20} color="var(--teal)" />
          </div>
          <div>
            <div className="trend-metric-value">{totalDetections.toLocaleString()}</div>
            <div className="trend-metric-label">Total Detections</div>
            <div className="trend-metric-delta positive" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>↑ 19% from last month</div>
          </div>
        </div>
        <div className="trend-metric-card">
          <div className="trend-metric-icon" style={{ background: 'rgba(201,123,61,0.12)' }}>
            <Trash2 size={20} color="var(--clay)" />
          </div>
          <div>
            <div className="trend-metric-value">{totalWaste.toLocaleString()}</div>
            <div className="trend-metric-label">Total Waste Items</div>
            <div className="trend-metric-delta" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>↑ 21.4% from last month</div>
          </div>
        </div>
        <div className="trend-metric-card">
          <div className="trend-metric-icon" style={{ background: 'rgba(240,176,96,0.12)' }}>
            <ImageIcon size={20} color="var(--amber)" />
          </div>
          <div>
            <div className="trend-metric-value">
              {totalDetections > 0 ? (totalWaste / totalDetections).toFixed(1) : '2.23'}
            </div>
            <div className="trend-metric-label">Avg. Waste / Image</div>
            <div className="trend-metric-delta" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>↑ 3.2% from last month</div>
          </div>
        </div>
        <div className="trend-metric-card">
          <div className="trend-metric-icon" style={{ background: 'rgba(194,90,90,0.12)' }}>
            <Target size={20} color="var(--rose)" />
          </div>
          <div>
            <div className="trend-metric-value">91.3%</div>
            <div className="trend-metric-label">Accuracy</div>
            <div className="trend-metric-delta" style={{ color: 'var(--green)', fontSize: '0.68rem', fontWeight: 600 }}>↑ 2.1% from last month</div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-row" style={{ padding: 0 }}>
        <div className="chart-card">
          <div className="chart-card-title">Detections Over Time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="detections" stroke="#2f6f5e" strokeWidth={2} dot={{ r: 4 }} name="Total Detections" />
              <Line type="monotone" dataKey="waste" stroke="#c97b3d" strokeWidth={2} dot={{ r: 4 }} name="Total Waste Items" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-card-title">Waste Type Trend (by Count)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WASTE_TYPE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {Object.entries(WASTE_COLORS).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-card-title">Heatmap — Detections by Day &amp; Time</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '20px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ height: '28px', display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: 'var(--muted)', width: '28px' }}>{day}</div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              {HOURS.map(h => (
                <div key={h} style={{ flex: 1, fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center' }}>{h}</div>
              ))}
            </div>
            {HEATMAP_DATA.map(row => (
              <div key={row.day} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {row.hours.map(cell => (
                  <div
                    key={cell.hour}
                    style={{
                      flex: 1,
                      height: '28px',
                      borderRadius: '4px',
                      background: `rgba(47,111,94,${cell.value / 100})`,
                    }}
                    title={`${row.day} ${cell.hour}: ${cell.value}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '4px', gap: '2px' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>High</span>
            <div style={{ width: '12px', height: '60px', borderRadius: '4px', background: 'linear-gradient(to bottom, rgba(47,111,94,1), rgba(47,111,94,0.1))' }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>Low</span>
          </div>
        </div>
      </div>

      {/* Monthly comparison table */}
      <div className="full-card">
        <div className="full-card-title">Monthly Comparison</div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Detections</th>
              <th>Waste Items</th>
            </tr>
          </thead>
          <tbody>
            {MONTHLY_DATA.map(row => (
              <tr key={row.month}>
                <td>{row.month} 2026</td>
                <td>{row.detections.toLocaleString()}</td>
                <td>{row.waste.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
