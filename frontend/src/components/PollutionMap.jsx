import { useState, useEffect, useMemo, useContext } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Layers, MapPin, Search, Calendar, Eye, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { StatsContext } from "../context/StatsContext.jsx";
import AnalysisLightbox from "./AnalysisLightbox.jsx";
import { normalizeSeverity } from "../utils/wasteUtils.js";
import "leaflet/dist/leaflet.css";

const SEVERITY_COLORS = {
  Low:      "#2f6f5e",
  Moderate: "#d97706",
  High:     "#ea580c",
  Severe:   "#dc2626",
};

const SEVERITY_DOT_COLORS = {
  All:      "#64748b",
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
  streets: {
    name: "Streets",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    name: "Dark",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community",
  },
};

const DEFAULT_CENTER = [15.0, 10.0];
const DEFAULT_ZOOM   = 2;


/**
 * Helper component that auto-fits the camera bounds to active filtered locations
 */
function AutoFitBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (!locations || locations.length === 0 || !map) return;
    const validCoords = locations
      .filter((loc) => loc && loc.latitude != null && loc.longitude != null && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude)))
      .map((loc) => [Number(loc.latitude), Number(loc.longitude)]);

    if (validCoords.length === 0) return;

    const fit = () => {
      try {
        if (typeof map?.invalidateSize === "function") {
          map.invalidateSize();
        }
        if (validCoords.length === 1 && typeof map?.setView === "function") {
          map.setView(validCoords[0], 12, { animate: true });
        } else if (validCoords.length > 1 && typeof map?.fitBounds === "function") {
          map.fitBounds(validCoords, { padding: [50, 50], maxZoom: 13, animate: true });
        }
      } catch {
        // Fallback if map unmounts during transition
      }
    };

    fit();
    const timer = setTimeout(fit, 150);
    return () => clearTimeout(timer);
  }, [locations, map]);

  return null;
}

/**
 * Helper component that closes all open Leaflet popups when the lightbox is activated.
 * This prevents the Leaflet popup from bleeding through the lightbox overlay.
 */
function MapPopupCloser({ isOpen }) {
  const map = useMap();
  useEffect(() => {
    if (isOpen && typeof map?.closePopup === "function") {
      map.closePopup();
    }
  }, [isOpen, map]);
  return null;
}

export default function PollutionMap({ locations: locationsProp }) {
  const statsCtx = useContext(StatsContext);
  const locations = Array.isArray(locationsProp)
    ? locationsProp
    : (Array.isArray(statsCtx?.stats?.locations) ? statsCtx.stats.locations : []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [filterSeverity, setFilterSeverity] = useState("All");
  const [searchQuery, setSearchQuery]       = useState("");
  const [timeframe, setTimeframe]           = useState("All");
  const [selectedModalLoc, setSelectedModalLoc] = useState(null);

  // Filter available tiles based on active global theme
  const availableTileKeys = Object.keys(TILE_LAYERS).filter((key) => {
    if (key === "dark" && !isDark) return false;
    if (key === "streets" && isDark) return false;
    return true;
  });

  const [tileMode, setTileModeState] = useState(() => {
    try {
      const stored = localStorage.getItem("littora_map_tile_mode");
      if (stored && TILE_LAYERS[stored]) {
        if (stored === "dark" && !isDark) return "satellite";
        if (stored === "streets" && isDark) return "satellite";
        return stored;
      }
    } catch {
      // ignore
    }
    return "satellite";
  });

  const setTileMode = (newMode) => {
    setTileModeState(newMode);
    try {
      localStorage.setItem("littora_map_tile_mode", newMode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isDark && tileMode === "streets") {
      setTileMode("dark");
    } else if (!isDark && tileMode === "dark") {
      setTileMode("streets");
    }
  }, [isDark, tileMode]);

  // Valid locations that have valid geographic coordinates
  const validLocations = useMemo(() => {
    return locations.filter(
      (loc) => loc && loc.latitude != null && loc.longitude != null && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude))
    );
  }, [locations]);

  const hasLocations = validLocations.length > 0;

  // Exact severity distribution counts across all validly mapped locations
  const severityCounts = useMemo(() => {
    const counts = { All: validLocations.length, Low: 0, Moderate: 0, High: 0, Severe: 0 };
    validLocations.forEach((loc) => {
      const norm = normalizeSeverity(loc.severity);
      if (norm in counts) counts[norm]++;
    });
    return counts;
  }, [validLocations]);

  // Robust multi-criteria location filtering logic
  const filteredLocations = useMemo(() => {
    if (!hasLocations) return [];
    const now = Date.now();

    return validLocations.filter((loc) => {
      const normSev = normalizeSeverity(loc.severity);

      // 1. Severity Filter (Case-insensitive)
      if (filterSeverity !== "All" && normSev !== filterSeverity) {
        return false;
      }

      // 2. Search Query Filter (Beach name, location label, city, country, or lat/lng)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const searchTarget = [
          loc.location_label,
          loc.locationLabel,
          loc.beach,
          loc.city,
          loc.country,
          `${loc.latitude}, ${loc.longitude}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchTarget.includes(q)) {
          return false;
        }
      }

      // 3. Timeframe Filter
      if (timeframe !== "All") {
        if (!loc.created_at) return false;
        const createdMs = new Date(loc.created_at).getTime();
        if (isNaN(createdMs)) return false;
        const diffDays = (now - createdMs) / (1000 * 60 * 60 * 24);
        // Allow clock skew of up to 1 day into the future
        if (diffDays < -1) return false;
        if (timeframe === "7d" && diffDays > 7) return false;
        if (timeframe === "30d" && diffDays > 30) return false;
        if (timeframe === "90d" && diffDays > 90) return false;
      }

      return true;
    });
  }, [validLocations, hasLocations, filterSeverity, searchQuery, timeframe]);

  // Summary Metrics
  const totalMapped   = validLocations.length;
  const criticalCount = validLocations.filter((l) => {
    const s = normalizeSeverity(l.severity);
    return s === "High" || s === "Severe";
  }).length;
  const maxScore      = validLocations.reduce((max, l) => Math.max(max, Number(l.pollution_score) || 0), 0);

  const resetFilters = () => {
    setFilterSeverity("All");
    setSearchQuery("");
    setTimeframe("All");
  };

  const isFiltered = filterSeverity !== "All" || searchQuery.trim() !== "" || timeframe !== "All";

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-md overflow-hidden flex flex-col">
      {/* ── Unified GIS Control Bar: Search, Severity Pills, Timeframe & Map Style ── */}
      <div className="p-3 sm:p-3.5 border-b border-border/60 bg-surface flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Left / Primary: Search & Severity Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
          {/* Search Input Bar */}
          <div className="relative min-w-[200px] sm:min-w-[240px] max-w-xs flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border/80 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-primary/40 placeholder:text-text-muted transition-all"
              placeholder="Search beach hotspot or coordinates…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search beach hotspot or coordinates"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-full cursor-pointer transition-colors"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Compact Severity Filter Pills with Colored Dots & Counts */}
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Severity filters">
            {["All", "Low", "Moderate", "High", "Severe"].map((sev) => {
              const count = severityCounts[sev] || 0;
              const isSelected = filterSeverity === sev;
              const dotColor = SEVERITY_DOT_COLORS[sev];
              return (
                <button
                  key={sev}
                  type="button"
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary text-white font-bold shadow-xs"
                      : "border-border/80 bg-bg-secondary/70 text-text-secondary hover:text-text-primary hover:border-border hover:bg-bg-secondary"
                  }`}
                  onClick={() => setFilterSeverity(sev)}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? "ring-1 ring-white/60" : "ring-1 ring-black/10 dark:ring-white/20"
                    }`}
                    style={{ backgroundColor: isSelected && sev === "All" ? "#ffffff" : dotColor }}
                    aria-hidden="true"
                  />
                  <span>{sev}</span>
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected ? "text-white/90" : "text-text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right / Secondary: Timeframe, Map Tile Style & Reset Filters */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-bg-secondary/70 border border-border/60 rounded-pill" role="group" aria-label="Timeframe selector">
            <span className="text-text-muted pl-2 pr-0.5 text-xs flex items-center" title="Timeframe">
              <Calendar size={12} />
            </span>
            {["All", "7d", "30d", "90d"].map((tf) => (
              <button
                key={tf}
                type="button"
                aria-pressed={timeframe === tf}
                className={`px-2.5 py-1 rounded-pill text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === tf
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Map Tile Style Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-bg-secondary/70 border border-border/60 rounded-pill" role="group" aria-label="Map style switcher">
            <span className="text-text-muted pl-2 pr-0.5 text-xs flex items-center" title="Map Layer Style">
              <Layers size={12} />
            </span>
            {availableTileKeys.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={tileMode === key}
                className={`px-2.5 py-1 rounded-pill text-xs font-semibold transition-all cursor-pointer ${
                  tileMode === key
                    ? "bg-surface text-primary shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
                onClick={() => setTileMode(key)}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-pill text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 transition-colors cursor-pointer"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {!hasLocations ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted text-sm gap-2 min-h-[400px]">
          <span className="text-2xl">📍</span>
          <p>
            No location data yet — attach location access when uploading a beach photo to populate this interactive map.
          </p>
        </div>
      ) : (
        <div className="relative w-full h-[600px] lg:h-[calc(100vh-13rem)] min-h-[580px] bg-bg-secondary overflow-hidden">
          {/* Consolidated GIS Status Overlay */}
          <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface/85 backdrop-blur-md border border-border/70 shadow-sm text-xs text-text-secondary pointer-events-auto">
              <span className="font-semibold text-text-primary">
                {filteredLocations.length !== totalMapped
                  ? `${filteredLocations.length}/${totalMapped} hotspots`
                  : `${totalMapped} ${totalMapped === 1 ? "hotspot" : "hotspots"}`}
              </span>
              <span className="text-border-strong select-none">·</span>
              <span className={criticalCount > 0 ? "text-rose-500 font-semibold" : "text-text-muted font-medium"}>
                {criticalCount} critical
              </span>
              {maxScore > 0 && (
                <>
                  <span className="text-border-strong select-none">·</span>
                  <span className="text-text-muted">
                    peak {maxScore}
                  </span>
                </>
              )}
            </div>
          </div>

          {filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted text-sm gap-3 w-full h-full bg-surface">
              <span className="text-2xl">🔍</span>
              <p className="text-xs sm:text-sm">
                No beach hotspots match your active filter criteria.
              </p>
              <button
                type="button"
                className="px-4 py-2 rounded-pill bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                onClick={resetFilters}
              >
                Clear Map Filters
              </button>
            </div>
          ) : (
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              className="w-full h-full"
              scrollWheelZoom={true}
            >
              <AutoFitBounds locations={filteredLocations} />
              <MapPopupCloser isOpen={selectedModalLoc !== null} />

              <TileLayer
                key={tileMode}
                attribution={TILE_LAYERS[tileMode].attribution}
                url={TILE_LAYERS[tileMode].url}
              />

              {filteredLocations.map((loc) => {
                // normSev = worst-ever severity → drives pin COLOUR and aura ring
                const normSev    = normalizeSeverity(loc.severity);
                const color      = SEVERITY_COLORS[normSev] || "#2f6f5e";
                const isCritical = normSev === "High" || normSev === "Severe";
                const latNum     = Number(loc.latitude);
                const lngNum     = Number(loc.longitude);

                // peakSev = the scan that earned the pin colour → shown in popup badge & stats
                const ps       = loc.peak_scan || loc;

                return (
                  <div key={loc.id || `${loc.latitude}-${loc.longitude}`}>
                    {/* Outer Pulsing Aura Ring for High/Severe risks */}
                    {isCritical && (
                      <CircleMarker
                        center={[latNum, lngNum]}
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
                      center={[latNum, lngNum]}
                      radius={isCritical ? 12 : 9}
                      pathOptions={{
                        fillColor: color,
                        color: "#ffffff",
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Popup className="custom-map-popup">
                        <div className="p-3 min-w-[240px] max-w-[300px] flex flex-col gap-2 font-sans">
                          {/* ── Location header: name · worst severity · scan count ── */}
                          <div className="flex items-start justify-between gap-2">
                            <strong className="text-xs font-bold text-text-primary leading-snug flex-1">
                              {loc.location_label || `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`}
                            </strong>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span className={`severity-badge severity-${normSev.toLowerCase()} px-2 py-0.5 rounded-pill text-[10px] font-bold`}>
                                {normSev} Risk
                              </span>
                              <span className="text-[9px] text-text-muted font-medium">
                                {(loc.scans?.length || loc.scan_count || 1)}{" "}
                                scan{(loc.scans?.length || loc.scan_count || 1) !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* ── Scan list — one compact row per analysis ── */}
                          <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
                            {(loc.scans?.length > 0 ? loc.scans : [ps]).map((scan, i) => {
                              const scanSev   = normalizeSeverity(scan.severity);
                              const scanColor = SEVERITY_COLORS[scanSev] || "#2f6f5e";
                              return (
                                <div
                                  key={scan.id || i}
                                  className="flex items-center gap-2 p-1.5 rounded-xl bg-bg-secondary/50 border border-border/50 hover:border-primary/30 transition-colors"
                                >
                                  {/* Thumbnail */}
                                  {scan.image_url ? (
                                    <img
                                      src={scan.image_url}
                                      alt=""
                                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-bg-secondary"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-bg-secondary shrink-0 flex items-center justify-center">
                                      <MapPin size={14} className="text-text-muted" />
                                    </div>
                                  )}

                                  {/* Scan metadata */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
                                        style={{ backgroundColor: scanColor }}
                                      >
                                        {scanSev}
                                      </span>
                                      <span className="text-[10px] font-semibold text-text-primary">
                                        Score {scan.pollution_score || 0}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-text-muted truncate">
                                      {scan.created_at && !isNaN(new Date(scan.created_at).getTime())
                                        ? new Date(scan.created_at).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : "—"}
                                    </div>
                                  </div>

                                  {/* Per-scan View button */}
                                  <button
                                    type="button"
                                    className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-semibold transition-colors cursor-pointer shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setSelectedModalLoc({
                                        ...scan,
                                        location_label: loc.location_label,
                                        locationLabel:  loc.location_label,
                                        latitude:       loc.latitude,
                                        longitude:      loc.longitude,
                                      });
                                    }}
                                  >
                                    <Eye size={11} /> View
                                  </button>
                                </div>
                              );
                            })}
                          </div>
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

      {/* ── Universal Analysis Lightbox Modal ── */}
      <AnalysisLightbox
        item={selectedModalLoc}
        showUser={false}
        onClose={() => setSelectedModalLoc(null)}
      />
    </div>
  );
}
