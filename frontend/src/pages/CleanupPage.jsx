import { Recycle, MapPin, Clock, AlertTriangle, Users, Waves } from "lucide-react";

const RECOMMENDATIONS = [
  {
    beach: "Marina Beach",
    location: "Chennai, India",
    priority: "high",
    action: "Organize a cleanup drive within 48 hours",
    reason: "Detected increase in plastic waste. Plastic bottles are the most detected waste type.",
    estimate: { volunteers: "20-30", time: "4 hours" },
  },
  {
    beach: "Juhu Beach",
    location: "Mumbai, India",
    priority: "high",
    action: "Deploy waste collection bins along the shoreline",
    reason: "High pollution level compared to other beaches",
    estimate: { volunteers: "10-15", time: "2 hours" },
  },
  {
    beach: "Goa Beach",
    location: "Panaji, India",
    priority: "medium",
    action: "Schedule regular weekly monitoring",
    reason: "Moderate pollution with upward trend detected",
    estimate: { volunteers: "5-10", time: "3 hours" },
  },
  {
    beach: "Kavalam Beach",
    location: "Alappuzha, India",
    priority: "low",
    action: "Awareness campaign for local visitors",
    reason: "Low pollution but preventive measures recommended",
    estimate: { volunteers: "5-8", time: "2 hours" },
  },
];

const UPCOMING = [
  { beach: "Marina Beach",  date: "01 Jul 2026, 07:00 AM", priority: "high" },
  { beach: "Juhu Beach",    date: "01 Jul 2026, 07:00 AM", priority: "high" },
  { beach: "Marina Beach",  date: "03 Jul 2026, 07:00 AM", priority: "medium" },
  { beach: "Kavalam Beach", date: "05 Jul 2026, 08:00 AM", priority: "low" },
];

export default function CleanupPage() {
  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Cleanup Recommendations</h1>
        <p>AI-powered recommendations based on waste detection and pollution levels.</p>
      </div>

      <div className="cards-grid-2">
        <div>
          <p className="section-title">Recommended Actions</p>
          {RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="cleanup-card">
              <div className="cleanup-icon" style={{ background: r.priority === 'high' ? 'rgba(239, 68, 68, 0.12)' : r.priority === 'medium' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: r.priority === 'high' ? '#ef4444' : r.priority === 'medium' ? '#f59e0b' : '#10b981' }}>
                <Waves size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>{r.beach}</div>
                  <span className={`cleanup-priority priority-${r.priority}`}>
                    {r.priority.charAt(0).toUpperCase() + r.priority.slice(1)} Priority
                  </span>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>{r.location}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)', marginBottom: '0.4rem' }}>{r.action}</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} /> {r.estimate.volunteers} volunteers
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {r.estimate.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="section-title">Upcoming Cleanups</p>
          <div className="full-card" style={{ marginBottom: 0 }}>
            {UPCOMING.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: i < UPCOMING.length - 1 ? '1px solid var(--border-lt)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{u.beach}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={11} /> {u.date}
                  </div>
                </div>
                <span className={`cleanup-priority priority-${u.priority}`}>
                  {u.priority.charAt(0).toUpperCase() + u.priority.slice(1)} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
