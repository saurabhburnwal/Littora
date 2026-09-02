import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PollutionMap from "../components/PollutionMap.jsx";

export default function MapPage() {
  const { stats } = useStats();
  const { isAdmin } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Pollution Map
        </h1>
        <p className="text-xs sm:text-sm text-text-muted">
          {isAdmin
            ? "Community pollution map — all geolocated beach waste scan hotspots across all users."
            : "Your geolocated beach waste scan hotspots — attach location on upload to populate this map."}
        </p>
      </div>

      <PollutionMap locations={stats?.locations} />
    </div>
  );
}

