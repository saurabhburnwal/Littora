import { useStats } from "../context/StatsContext.jsx";
import PollutionMap from "../components/PollutionMap.jsx";

const LEGEND = [
  { label: "Low",      color: "#2f6f5e" },
  { label: "Moderate", color: "#c97b3d" },
  { label: "High",     color: "#e07020" },
  { label: "Severe",   color: "#a13d3d" },
];

export default function MapPage() {
  const { stats } = useStats();

  return (
    <div className="map-page-container">
      <div className="map-page-header">
        <h1>Pollution Map</h1>
        <p>Geolocated hotspots from all submitted beach analyses — allow location access on upload to populate this map.</p>
      </div>

      <div className="map-legend">
        <span className="map-legend-label">Severity</span>
        {LEGEND.map((l) => (
          <div key={l.label} className="map-legend-item">
            <div className="legend-dot" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      <PollutionMap locations={stats.locations} />
    </div>
  );
}
