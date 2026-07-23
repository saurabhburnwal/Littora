import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SEVERITY_COLORS = {
  Low:      "#2f6f5e",
  Moderate: "#c97b3d",
  High:     "#e07020",
  Severe:   "#a13d3d",
};

// India-centered default — adjust if your team's beaches are elsewhere
const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM   = 4;

export default function PollutionMap({ locations }) {
  const hasLocations = locations && locations.length > 0;

  return (
    <div className="map-card">
      {!hasLocations ? (
        <div className="map-empty-state">
          <span>📍</span>
          <p>
            No location data yet — allow location access when uploading
            a photo to start building the pollution map.
          </p>
        </div>
      ) : (
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="map-container"
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {locations.map((loc) => {
            const color = SEVERITY_COLORS[loc.severity] || "#2f6f5e";
            return (
              <CircleMarker
                key={loc.id}
                center={[loc.latitude, loc.longitude]}
                radius={11}
                pathOptions={{
                  fillColor:   color,
                  color:       color,
                  fillOpacity: 0.82,
                  weight:      2,
                }}
              >
                <Popup>
                  <strong>
                    {loc.location_label ||
                      `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                  </strong>
                  <br />
                  <small>
                    {new Date(loc.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </small>
                  <br />
                  Waste: {loc.total_waste} &middot; Score: {loc.pollution_score}
                  <br />
                  <span
                    className={`severity-badge severity-${loc.severity?.toLowerCase()}`}
                  >
                    {loc.severity}
                  </span>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
