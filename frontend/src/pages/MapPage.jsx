import { useStats } from "../context/StatsContext.jsx";
import PollutionMap from "../components/PollutionMap.jsx";

const LEGEND = [
  { label: "Low",      color: "#2f6f5e", desc: "Minimal Risk" },
  { label: "Moderate", color: "#d97706", desc: "Monitor" },
  { label: "High",     color: "#ea580c", desc: "Cleanup Priority" },
  { label: "Severe",   color: "#dc2626", desc: "Urgent Action" },
];

export default function MapPage() {
  const { stats } = useStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Pollution Map</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Geolocated hotspots from submitted beach waste analyses — attach location on upload to populate this map.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap p-3.5 rounded-2xl bg-surface border border-border text-xs text-text-secondary shadow-sm mb-4">
        <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">Severity Legend:</span>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
            <span><strong>{l.label}</strong> ({l.desc})</span>
          </div>
        ))}
      </div>

      <PollutionMap locations={stats.locations} />
    </div>
  );
}
