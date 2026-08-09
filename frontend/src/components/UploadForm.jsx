import { useState, useContext } from "react";
import { UploadCloud, Camera, MapPin, Cpu, Sparkles, Check } from "lucide-react";
import { StatsContext } from "../context/StatsContext.jsx";

const BBOX_COLORS = {
  bottle:  "#00D4AA",
  can:     "#F59E0B",
  bag:     "#A855F7",
  wrapper: "#F43F5E",
  glass:   "#38BDF8",
  foam:    "#EF4444",
  metal:   "#818CF8",
  other:   "#9CA3AF",
};

export default function UploadForm({
  onUpload,
  loading,
  result,
  onReset,
  modelInfo,
  onUpdateModel,
  isAdmin,
  updatingModel,
  locations: locationsProp,
}) {
  const statsCtx = useContext(StatsContext);
  const dbLocations = locationsProp || statsCtx?.stats?.locations || [];

  const [file,          setFile]          = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const [dragging,      setDragging]      = useState(false);
  const [selectedBeach, setSelectedBeach] = useState("auto");
  // idle | fetching | granted | denied
  const [locStatus,     setLocStatus]     = useState("idle");

  const { activeModel, activeModelDetails, availableModels = [] } = modelInfo || {
    activeModel: "yolov8m",
    activeModelDetails: { name: "YOLOv8 Medium", tag: "Standard Baseline", description: "Balanced speed & precision for general coastal debris detection.", badge: "Default" },
    availableModels: [
      { id: "yolov8m", name: "YOLOv8 Medium", tag: "Standard Baseline", params: "25.9M", description: "Balanced speed & precision for general coastal debris detection.", badge: "Default" },
      { id: "yolov11m", name: "YOLOv11 Medium", tag: "Enhanced Accuracy", params: "20.1M", description: "Enhanced feature extraction & attention mechanisms for complex or occluded waste.", badge: "High Precision" },
      { id: "yolov26s", name: "YOLOv26 Small", tag: "Ultra-Fast Edge", params: "9.6M", description: "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.", badge: "Fastest" },
    ],
  };

  function applyFile(selected) {
    if (!selected || !selected.type.startsWith("image/")) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setLocStatus("idle");
    if (onReset) onReset();
  }

  function handleFileChange(e)  { applyFile(e.target.files[0]); }
  function handleDragOver(e)    { e.preventDefault(); setDragging(true); }
  function handleDragLeave(e)   { e.preventDefault(); setDragging(false); }
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    if (selectedBeach !== "auto") {
      const preset = dbLocations.find((l, idx) => (l.id ? String(l.id) === selectedBeach : `loc_${idx}` === selectedBeach));
      if (preset) {
        onUpload(file, {
          latitude:      preset.latitude ?? null,
          longitude:     preset.longitude ?? null,
          locationLabel: preset.location_label || preset.locationLabel || preset.beach || null,
        });
        return;
      }
    }

    if (!navigator.geolocation) {
      onUpload(file, null);
      return;
    }

    setLocStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocStatus("granted");
        onUpload(file, { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setLocStatus("denied");
        onUpload(file, null);
      },
      { timeout: 6000, maximumAge: 60000 }
    );
  }

  const isBusy   = loading || locStatus === "fetching";
  const btnLabel =
    locStatus === "fetching" ? "Getting location…"
    : loading               ? "Analyzing…"
    :                         "Analyze photo";

  const boxes = result?.boxes || [];

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        htmlFor="image-input"
        className={`upload-label${previewUrl ? " has-preview" : ""}${dragging ? " drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="upload-preview-container">
            <img src={previewUrl} alt="Selected beach photo" className="upload-preview" />

            {/* Bounding box overlays */}
            {boxes.length > 0 && (
              <div className="bbox-overlay-layer">
                {boxes.map((b, idx) => {
                  const norm = b.box_normalized || [0, 0, 0, 0];
                  const xmin = norm[0] * 100;
                  const ymin = norm[1] * 100;
                  const xmax = norm[2] * 100;
                  const ymax = norm[3] * 100;
                  const color = BBOX_COLORS[b.class_name?.toLowerCase()] || "#00D4AA";
                  const label = `${b.class_name} ${(b.confidence * 100).toFixed(0)}%`;

                  return (
                    <div
                      key={idx}
                      className="bbox-box"
                      style={{
                        left: `${xmin}%`,
                        top: `${ymin}%`,
                        width: `${xmax - xmin}%`,
                        height: `${ymax - ymin}%`,
                        borderColor: color,
                        boxShadow: `0 0 10px ${color}80, inset 0 0 8px ${color}25`,
                      }}
                    >
                      <span className="bbox-label" style={{ backgroundColor: color }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon-wrap">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>
            <span className="upload-label-text">
              Drag &amp; drop or click to browse
            </span>
            <span className="upload-hint">Supports: JPG, PNG, JPEG (Max 10MB)</span>
          </div>
        )}
      </label>

      <input
        id="image-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      {/* Multi AI Model Selector Section (Admin Only) */}
      {isAdmin && (
        <div className="model-selector-card" style={{
          margin: "0.85rem 0",
          padding: "0.85rem 1rem",
          borderRadius: "12px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>
              <Cpu size={15} style={{ color: "var(--teal)" }} />
              <span>AI Inference Model</span>
            </label>

            <span style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.2rem 0.55rem",
              borderRadius: "20px",
              background: "rgba(14, 140, 134, 0.12)",
              color: "var(--teal)",
              border: "1px solid rgba(14, 140, 134, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem"
            }}>
              <Sparkles size={11} /> {activeModelDetails?.badge || "Active"}
            </span>
          </div>

          <div>
            <div style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
              <strong>System Admin Control:</strong> Select model for system-wide inference across all users.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
              {availableModels.map((m) => {
                const isSelected = activeModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={updatingModel}
                    onClick={() => onUpdateModel && onUpdateModel(m.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid var(--teal)" : "2px solid var(--border-lt)",
                      background: isSelected ? "rgba(14, 140, 134, 0.08)" : "var(--card-bg)",
                      color: isSelected ? "var(--ink)" : "var(--muted)",
                      cursor: updatingModel ? "wait" : "pointer",
                      textAlign: "left",
                      transition: "all 0.18s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      color: isSelected ? "var(--teal)" : "var(--ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      whiteSpace: "nowrap",
                      gap: "0.3rem"
                    }}>
                      <span>{m.name}</span>
                      {isSelected && <Check size={13} style={{ color: "var(--teal)", flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: "0.68rem", opacity: 0.8, marginTop: "2px", whiteSpace: "nowrap" }}>
                      {m.tag} • {m.params}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Beach Location Selector */}
      <div className="beach-selector-container" style={{ margin: "0.85rem 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.35rem" }}>
          <MapPin size={14} style={{ color: "var(--teal)" }} /> Target Beach Location:
        </label>
        <select
          value={selectedBeach}
          onChange={(e) => setSelectedBeach(e.target.value)}
          className="settings-select"
          style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px" }}
        >
          <option value="auto">Device GPS (Auto-detect)</option>
          {dbLocations.map((item, idx) => {
            const key = item.id ? String(item.id) : `loc_${idx}`;
            const label = item.location_label || item.locationLabel || item.beach || (item.latitude != null && item.longitude != null ? `${item.latitude}, ${item.longitude}` : `Location #${idx + 1}`);
            return (
              <option key={key} value={key}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <button type="submit" className="upload-btn" disabled={!file || isBusy}>
        <UploadCloud size={18} strokeWidth={2} />
        {btnLabel}
      </button>

      <div className="upload-divider">Or capture image</div>
      <button
        type="button"
        className="camera-btn"
        onClick={() => alert('Camera capture coming soon!')}
      >
        <Camera size={16} strokeWidth={1.8} />
        Open Camera
      </button>

      {selectedBeach === "auto" && locStatus === "denied" && (
        <p className="loc-note" style={{ color: "var(--muted)" }}>
          Location access denied — uploaded without coordinates.
        </p>
      )}
      {selectedBeach === "auto" && locStatus === "granted" && (
        <p className="loc-note" style={{ color: "var(--teal)" }}>
          Location attached to this photo.
        </p>
      )}
    </form>
  );
}
