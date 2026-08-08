import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Layers, Filter, MapPin, AlertCircle, Compass } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import "leaflet/dist/leaflet.css";

const SEVERITY_COLORS = {
  Low:      "#2f6f5e",
  Moderate: "#d97706",
  High:     "#ea580c",
  Severe:   "#dc2626",
};

const TILE_LAYERS = {
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  light: {
    name: "Clean Light",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CARTO &copy; OpenStreetMap",
  },
  dark: {
    name: "Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CARTO &copy; OpenStreetMap",
  },
  street: {
    name: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
};

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM   = 4;

/**
 * Helper component that auto-fits the camera bounds to all active locations
 */
function AutoFitBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (!locations || locations.length === 0) return;
    const validCoords = locations
      .filter((loc) => loc.latitude != null && loc.longitude != null)
      .map((loc) => [loc.latitude, loc.longitude]);

    if (validCoords.length === 1) {
      map.setView(validCoords[0], 12, { animate: true });
    } else if (validCoords.length > 1) {
      map.fitBounds(validCoords, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  }, [locations, map]);

  return null;
}

export default function PollutionMap({ locations = [] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Filter available tiles — Dark Matter exclusive to Dark mode, Clean Light exclusive to Light mode
  const availableTileKeys = Object.keys(TILE_LAYERS).filter((key) => {
    if (key === "dark" && !isDark) return false;
    if (key === "light" && isDark) return false;
    return true;
  });

  // Default to "satellite" for both themes; restore from localStorage if valid
  const [tileMode, setTileModeState] = useState(() => {
    const stored = localStorage.getItem("littora_map_tile_mode");
    if (stored && TILE_LAYERS[stored]) {
      if (stored === "dark" && !isDark) return "satellite";
      if (stored === "light" && isDark) return "satellite";
      return stored;
    }
    return "satellite"; // Default for both themes
  });

  const [filterSeverity, setFilterSeverity] = useState("All");

  const setTileMode = (newMode) => {
    setTileModeState(newMode);
    localStorage.setItem("littora_map_tile_mode", newMode);
  };

  // Keep tile mode compatible when user toggles global app theme
  useEffect(() => {
    if (isDark && tileMode === "light") {
      setTileModeState("dark");
      localStorage.setItem("littora_map_tile_mode", "dark");
    } else if (!isDark && tileMode === "dark") {
      setTileModeState("light");
      localStorage.setItem("littora_map_tile_mode", "light");
    }
  }, [isDark, tileMode]);

  const hasLocations = locations && locations.length > 0;

  // Filter locations based on severity tab
  const filteredLocations = hasLocations
    ? locations.filter((loc) => filterSeverity === "All" || loc.severity === filterSeverity)
    : [];

  // Summary Metrics
  const totalMapped = locations.length;
  const criticalCount = locations.filter((l) => l.severity === "High" || l.severity === "Severe").length;
  const maxScore = locations.reduce((max, l) => Math.max(max, l.pollution_score || 0), 0);

  return (
    <div className="map-card">
      {/* ── Top Bar Controls: Filters & Map Mode Switcher ── */}
      <div className="map-top-bar">
        <div className="map-severity-filters">
          <span className="map-filter-label"><Filter size={14} /> Filter:</span>
          {["All", "Low", "Moderate", "High", "Severe"].map((sev) => (
            <button
              key={sev}
              className={`map-filter-chip ${filterSeverity === sev ? "active" : ""}`}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="map-controls-right">
          {/* Tile Layer Selector */}
          <div className="map-tile-switcher">
            <span className="map-tile-label"><Layers size={14} /> Style:</span>
            {availableTileKeys.map((key) => (
              <button
                key={key}
                className={`map-tile-btn ${tileMode === key ? "active" : ""}`}
                onClick={() => setTileMode(key)}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasLocations ? (
        <div className="map-empty-state">
          <span>📍</span>
          <p>
            No location data yet — attach location access when uploading a beach photo to populate this interactive map.
          </p>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", flex: 1, minHeight: "650px" }}>
          {/* Floating On-Map Stats Overlay */}
          <div className="map-floating-stats">
            <div className="map-stat-item">
              <MapPin size={13} style={{ color: "#0d9488" }} />
              <span><strong>{totalMapped}</strong> Mapped Hotspots</span>
            </div>
            <div className="map-stat-item">
              <AlertCircle size={13} style={{ color: "#dc2626" }} />
              <span><strong>{criticalCount}</strong> Critical Risks</span>
            </div>
            <div className="map-stat-item">
              <Compass size={13} style={{ color: "#d97706" }} />
              <span>Peak Score: <strong>{maxScore}</strong>/100</span>
            </div>
          </div>

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="map-container"
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <AutoFitBounds locations={filteredLocations} />

            <TileLayer
              key={tileMode}
              attribution={TILE_LAYERS[tileMode].attribution}
              url={TILE_LAYERS[tileMode].url}
            />

            {filteredLocations.map((loc) => {
              const color = SEVERITY_COLORS[loc.severity] || "#2f6f5e";
              const isCritical = loc.severity === "High" || loc.severity === "Severe";

              return (
                <div key={loc.id || `${loc.latitude}-${loc.longitude}`}>
                  {/* Outer Pulsing Aura Ring for High/Severe risks */}
                  {isCritical && (
                    <CircleMarker
                      center={[loc.latitude, loc.longitude]}
                      radius={18}
                      pathOptions={{
                        fillColor: color,
                        color: color,
                        fillOpacity: 0.25,
                        weight: 1,
                      }}
                    />
                  )}

                  {/* Main Marker */}
                  <CircleMarker
                    center={[loc.latitude, loc.longitude]}
                    radius={isCritical ? 12 : 9}
                    pathOptions={{
                      fillColor: color,
                      color: "#ffffff",
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup className="custom-map-popup">
                      <div className="map-popup-card">
                        {loc.image_url && (
                          <div className="map-popup-image">
                            <img src={loc.image_url} alt="Beach analysis preview" />
                          </div>
                        )}
                        <div className="map-popup-header">
                          <strong>
                            {loc.location_label || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                          </strong>
                          <span className={`severity-badge severity-${loc.severity?.toLowerCase()}`}>
                            {loc.severity} Risk
                          </span>
                        </div>
                        <div className="map-popup-date">
                          {new Date(loc.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                        <div className="map-popup-stats">
                          <div className="map-popup-stat-pill">
                            <span>Waste Items:</span> <strong>{loc.total_waste}</strong>
                          </div>
                          <div className="map-popup-stat-pill">
                            <span>Pollution Score:</span> <strong>{loc.pollution_score}</strong>/100
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </div>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
