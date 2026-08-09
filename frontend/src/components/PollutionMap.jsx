import { useState, useEffect, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Layers, Filter, MapPin, AlertCircle, Compass, Search, Calendar, X, Eye } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { StatsContext } from "../context/StatsContext.jsx";
import ResultPanel from "./ResultPanel.jsx";
import { normalizeSeverity, toResultShape } from "../utils/wasteUtils.js";
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
 * Helper component that auto-fits the camera bounds to active filtered locations
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

export default function PollutionMap({ locations: locationsProp }) {
  const statsCtx = useContext(StatsContext);
  const locations = locationsProp !== undefined ? locationsProp : (statsCtx?.stats?.locations || []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [filterSeverity, setFilterSeverity] = useState("All");
  const [searchQuery, setSearchQuery]       = useState("");
  const [timeframe, setTimeframe]           = useState("All");
  const [selectedModalLoc, setSelectedModalLoc] = useState(null);

  // Filter available tiles based on active global theme
  const availableTileKeys = Object.keys(TILE_LAYERS).filter((key) => {
    if (key === "dark" && !isDark) return false;
    if (key === "light" && isDark) return false;
    return true;
  });

  const [tileMode, setTileModeState] = useState(() => {
    const stored = localStorage.getItem("littora_map_tile_mode");
    if (stored && TILE_LAYERS[stored]) {
      if (stored === "dark" && !isDark) return "satellite";
      if (stored === "light" && isDark) return "satellite";
      return stored;
    }
    return "satellite";
  });

  const setTileMode = (newMode) => {
    setTileModeState(newMode);
    localStorage.setItem("littora_map_tile_mode", newMode);
  };

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

  // Exact severity distribution counts across all mapped locations
  const severityCounts = useMemo(() => {
    const counts = { All: locations.length, Low: 0, Moderate: 0, High: 0, Severe: 0 };
    locations.forEach((loc) => {
      const norm = normalizeSeverity(loc.severity);
      if (norm in counts) counts[norm]++;
    });
    return counts;
  }, [locations]);

  // Robust multi-criteria location filtering logic
  const filteredLocations = useMemo(() => {
    if (!hasLocations) return [];
    const now = Date.now();

    return locations.filter((loc) => {
      const normSev = normalizeSeverity(loc.severity);

      // 1. Severity Filter (Case-insensitive)
      if (filterSeverity !== "All" && normSev !== filterSeverity) {
        return false;
      }

      // 2. Search Query Filter (Beach name, location label, or lat/lng)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const labelStr = (loc.location_label || "").toLowerCase();
        const coordStr = `${loc.latitude || ""}, ${loc.longitude || ""}`;
        if (!labelStr.includes(q) && !coordStr.includes(q)) {
          return false;
        }
      }

      // 3. Timeframe Filter
      if (timeframe !== "All" && loc.created_at) {
        const createdMs = new Date(loc.created_at).getTime();
        const diffDays = (now - createdMs) / (1000 * 60 * 60 * 24);
        if (timeframe === "7d" && diffDays > 7) return false;
        if (timeframe === "30d" && diffDays > 30) return false;
        if (timeframe === "90d" && diffDays > 90) return false;
      }

      return true;
    });
  }, [locations, hasLocations, filterSeverity, searchQuery, timeframe]);

  // Summary Metrics
  const totalMapped   = locations.length;
  const criticalCount = locations.filter((l) => {
    const s = normalizeSeverity(l.severity);
    return s === "High" || s === "Severe";
  }).length;
  const maxScore      = locations.reduce((max, l) => Math.max(max, l.pollution_score || 0), 0);

  const resetFilters = () => {
    setFilterSeverity("All");
    setSearchQuery("");
    setTimeframe("All");
  };

  const isFiltered = filterSeverity !== "All" || searchQuery.trim() !== "" || timeframe !== "All";

  return (
    <div className="map-card">
      {/* ── Top Bar Controls: Search, Severity Chips, Timeframe & Map Tile Style ── */}
      <div className="map-top-bar" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.9rem 1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.75rem" }}>
          {/* Search Input Bar */}
          <div style={{ position: "relative", minWidth: "240px", flex: "1 1 260px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              type="text"
              className="map-search-input"
              placeholder="Search beach hotspot or coordinates…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.4rem 0.75rem 0.4rem 2.1rem",
                borderRadius: "20px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--ink)",
                fontSize: "0.8rem",
                outline: "none",
                transition: "all 0.2s ease"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Timeframe Dropdown Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="map-filter-label"><Calendar size={13} /> Timeframe:</span>
            {["All", "7d", "30d", "90d"].map((tf) => (
              <button
                key={tf}
                type="button"
                className={`map-filter-chip ${timeframe === tf ? "active" : ""}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf === "All" ? "All Time" : tf}
              </button>
            ))}
          </div>

          {/* Map Tile Style Switcher */}
          <div className="map-tile-switcher">
            <span className="map-tile-label"><Layers size={13} /> Style:</span>
            {availableTileKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`map-tile-btn ${tileMode === key ? "active" : ""}`}
                onClick={() => setTileMode(key)}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Filter Chips with Live Count Badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border-lt)" }}>
          <div className="map-severity-filters">
            <span className="map-filter-label"><Filter size={13} /> Severity:</span>
            {["All", "Low", "Moderate", "High", "Severe"].map((sev) => {
              const count = severityCounts[sev] || 0;
              return (
                <button
                  key={sev}
                  type="button"
                  className={`map-filter-chip ${filterSeverity === sev ? "active" : ""}`}
                  onClick={() => setFilterSeverity(sev)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <span>{sev}</span>
                  <span style={{
                    fontSize: "0.68rem",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "10px",
                    background: filterSeverity === sev ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)",
                    color: filterSeverity === sev ? "#fff" : "inherit",
                    fontWeight: 800
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {isFiltered && (
            <button
              type="button"
              className="map-filter-chip"
              onClick={resetFilters}
              style={{ color: "var(--rose)", borderColor: "var(--rose)", fontSize: "0.75rem" }}
            >
              Reset Filters
            </button>
          )}
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
              <span>Showing <strong>{filteredLocations.length}</strong> / {totalMapped} Hotspots</span>
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

          {filteredLocations.length === 0 ? (
            <div className="map-empty-state" style={{ height: "100%", minHeight: "450px" }}>
              <span>🔍</span>
              <p style={{ marginTop: "0.5rem" }}>
                No beach hotspots match your active filter criteria.
              </p>
              <button
                type="button"
                className="map-filter-chip active"
                onClick={resetFilters}
                style={{ marginTop: "1rem" }}
              >
                Clear Map Filters
              </button>
            </div>
          ) : (
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
                const normSev = normalizeSeverity(loc.severity);
                const color   = SEVERITY_COLORS[normSev] || "#2f6f5e";
                const isCritical = normSev === "High" || normSev === "Severe";

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
                              <img src={loc.image_url} alt="Beach analysis preview" decoding="async" />
                            </div>
                          )}
                          <div className="map-popup-header">
                            <strong>
                              {loc.location_label || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                            </strong>
                            <span className={`severity-badge severity-${normSev.toLowerCase()}`}>
                              {normSev} Risk
                            </span>
                          </div>
                          {loc.created_at && (
                            <div className="map-popup-date">
                              {new Date(loc.created_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </div>
                          )}
                          <div className="map-popup-stats">
                            <div className="map-popup-stat-pill">
                              <span>Waste Items:</span> <strong>{loc.total_waste || 0}</strong>
                            </div>
                            <div className="map-popup-stat-pill">
                              <span>Pollution Score:</span> <strong>{loc.pollution_score || 0}</strong>/100
                            </div>
                          </div>

                          <button
                            type="button"
                            className="map-detail-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedModalLoc(loc);
                            }}
                            style={{
                              marginTop: "0.65rem",
                              width: "100%",
                              padding: "0.45rem 0.75rem",
                              borderRadius: "12px",
                              background: "var(--teal)",
                              color: "#ffffff",
                              border: "none",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.35rem",
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <Eye size={14} /> View Analysis Details
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  </div>
                );
              })}
            </MapContainer>
          )}
        </div>
      )}

      {/* ── Interactive Analysis Lightbox Modal (Reusing Detection History .modal-overlay / .modal-content) ── */}
      {selectedModalLoc && createPortal(
        <div
          className="modal-overlay"
          onClick={() => setSelectedModalLoc(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedModalLoc(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {selectedModalLoc.image_url && (
              <img
                src={selectedModalLoc.image_url}
                alt="Full-size beach analysis"
                className="modal-img"
                decoding="async"
              />
            )}

            <div className="modal-body">
              <ResultPanel result={toResultShape(selectedModalLoc)} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
