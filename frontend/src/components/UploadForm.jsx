import { useState, useContext } from "react";
import { UploadCloud, Camera, MapPin, Cpu, Sparkles, Check, Navigation } from "lucide-react";
import { StatsContext } from "../context/StatsContext.jsx";
import { extractGPS } from "../utils/extractGPS.js";

import { DEFAULT_AI_MODELS, BBOX_COLORS } from "../utils/wasteUtils.js";

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
  const [exifCoords,    setExifCoords]    = useState(null);
  // idle | fetching | granted | denied
  const [locStatus,     setLocStatus]     = useState("idle");

  const { activeModel, activeModelDetails, availableModels = DEFAULT_AI_MODELS } = modelInfo || {
    activeModel: "yolov8m",
    activeModelDetails: DEFAULT_AI_MODELS[0],
    availableModels: DEFAULT_AI_MODELS,
  };

  async function applyFile(selected) {
    if (!selected || !selected.type.startsWith("image/")) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setLocStatus("idle");
    setExifCoords(null);
    if (onReset) onReset();

    // Silently attempt EXIF GPS extraction
    try {
      const gps = await extractGPS(selected);
      if (gps) {
        setExifCoords(gps);
        setSelectedBeach("auto");
      }
    } catch (_) {
      // Non-fatal
    }
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

    // 1. Manual beach selection override
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

    // 2. EXIF GPS extracted directly from image
    if (exifCoords) {
      onUpload(file, {
        latitude:  exifCoords.latitude,
        longitude: exifCoords.longitude,
      });
      return;
    }

    // 3. Fallback to device browser geolocation
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

      {/* Multi AI Model Selector Section (Admin Only - Collapsible) */}
      {isAdmin && (
        <details className="model-selector-details">
          <summary className="model-selector-summary">
            <div className="upload-model-header-title">
              <Cpu size={15} className="upload-model-icon" />
              <span className="upload-model-label">AI Inference Model</span>
            </div>

            <span className="upload-model-badge">
              <Sparkles size={11} /> {activeModelDetails?.name || activeModelDetails?.badge || "Active"}
            </span>
          </summary>

          <div className="model-selector-content">
            <div className="upload-model-desc">
              <strong>System Admin Control:</strong> Select model for system-wide inference across all users.
            </div>
            <div className="upload-model-grid">
              {availableModels.map((m) => {
                const isSelected = activeModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={updatingModel}
                    onClick={() => onUpdateModel && onUpdateModel(m.id)}
                    className={`upload-model-option ${isSelected ? "upload-model-option--selected" : ""}`}
                  >
                    <div className="upload-model-opt-header">
                      <span>{m.name}</span>
                      {isSelected && <Check size={13} className="upload-model-check" />}
                    </div>
                    <div className="upload-model-params">
                      {m.tag} • {m.params}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      )}

      {/* Beach Location Selector */}
      <div className="beach-selector-container">
        <div className="beach-selector-header">
          <label className="beach-selector-label">
            <MapPin size={14} className="beach-selector-pin" /> Target Beach Location:
          </label>
        </div>

        {exifCoords && selectedBeach === "auto" && (
          <div className="upload-gps-badge">
            <Navigation size={13} className="upload-gps-icon" />
            <span>Photo EXIF GPS: <strong>{exifCoords.latitude.toFixed(4)}, {exifCoords.longitude.toFixed(4)}</strong></span>
          </div>
        )}

        <select
          value={selectedBeach}
          onChange={(e) => setSelectedBeach(e.target.value)}
          className="settings-select beach-selector-select"
        >
          <option value="auto">
            {exifCoords ? "Photo EXIF GPS (Auto-detected)" : "Device GPS (Auto-detect)"}
          </option>
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
        <p className="loc-note loc-note--muted">
          Location access denied — uploaded without coordinates.
        </p>
      )}
      {selectedBeach === "auto" && locStatus === "granted" && (
        <p className="loc-note loc-note--teal">
          Location attached to this photo.
        </p>
      )}
    </form>
  );
}
