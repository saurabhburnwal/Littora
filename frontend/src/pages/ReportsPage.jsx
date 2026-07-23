import { useState } from "react";
import { FileText, Calendar, BarChart3, Settings, Download } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";

const REPORT_TYPES = [
  { id: "daily",   icon: <FileText size={20} />,   title: "Daily Report",   desc: "Summary of today's detections" },
  { id: "weekly",  icon: <Calendar size={20} />,   title: "Weekly Report",  desc: "Overview of this week" },
  { id: "monthly", icon: <BarChart3 size={20} />,  title: "Monthly Report", desc: "Complete monthly analysis" },
  { id: "custom",  icon: <Settings size={20} />,   title: "Custom Report",  desc: "Select date range & filters" },
];

export default function ReportsPage() {
  const { stats } = useStats();
  const [selected, setSelected] = useState("monthly");

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Reports</h1>
        <p>Generate and download detailed reports on waste detection.</p>
      </div>

      <div className="cards-grid-2" style={{ marginBottom: '1.5rem' }}>
        {REPORT_TYPES.map(r => (
          <div
            key={r.id}
            className={`report-card${selected === r.id ? ' selected' : ''}`}
            onClick={() => setSelected(r.id)}
          >
            <div className="report-icon">{r.icon}</div>
            <div>
              <div className="report-card-title">{r.title}</div>
              <div className="report-card-desc">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="full-card">
        <div className="full-card-title">
          Report Preview
          <button className="export-btn">
            <Download size={14} />
            Download Report
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{(stats.totalAnalyses || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Detections</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{(stats.totalWasteAllTime || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Waste Items</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>{stats.locations?.length || 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beaches Monitored</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ink)' }}>91.3%</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Accuracy</div>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Report includes charts, insights and recommendations based on the selected data.
        </p>
      </div>
    </div>
  );
}
