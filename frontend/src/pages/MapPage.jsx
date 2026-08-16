import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PollutionMap from "../components/PollutionMap.jsx";
import GuestLockScreen from "../components/GuestLockScreen.jsx";

const LEGEND = [
  { label: "Low",      color: "#2f6f5e", desc: "Minimal Risk" },
  { label: "Moderate", color: "#d97706", desc: "Monitor" },
  { label: "High",     color: "#ea580c", desc: "Cleanup Priority" },
  { label: "Severe",   color: "#dc2626", desc: "Urgent Action" },
];

export default function MapPage() {
  const { stats } = useStats();
  const { user, isAdmin } = useAuth();

  if (!user) {
    return (
      <div className="map-page-container">
        <div className="map-page-header" style={{ marginBottom: "1.2rem" }}>
          <h1>Pollution Map</h1>
          <p>Geolocated beach waste hotspots and coastal cleanup zones.</p>
        </div>
        <GuestLockScreen
          title="Beach Pollution Map Is Private to Signed-In Users"
          message="Sign in or create an account to view geolocated pollution hotspots, interactive beach maps, and coastal cleanup zones."
        />
      </div>
    );
  }

  return (
    <div className="map-page-container">
      <div className="map-page-header" style={{ marginBottom: "1.2rem" }}>
        <h1>Pollution Map</h1>
        <p>
          {isAdmin
            ? "Admin View — System-wide geolocated hotspots from all submitted beach waste analyses."
            : "Geolocated hotspots from your submitted beach waste analyses — attach location on upload to populate this map."
          }
        </p>
      </div>

      <div className="map-legend" style={{ marginBottom: "1rem" }}>
        <span className="map-legend-label">Severity Legend:</span>
        {LEGEND.map((l) => (
          <div key={l.label} className="map-legend-item">
            <div className="legend-dot" style={{ background: l.color }} />
            <span><strong>{l.label}</strong> ({l.desc})</span>
          </div>
        ))}
      </div>

      <PollutionMap locations={stats.locations} />
    </div>
  );
}
