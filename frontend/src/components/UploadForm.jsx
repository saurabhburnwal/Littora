import { useState, useContext, useRef, useEffect } from "react";
import { UploadCloud, Camera, MapPin, Cpu, Sparkles, Check, Navigation, ChevronDown } from "lucide-react";
import { StatsContext } from "../context/StatsContext.jsx";
import { extractGPS } from "../utils/extractGPS.js";
import ToastNotification from "./ToastNotification.jsx";

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
  const [toast,         setToast]         = useState(null);

  const previewUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const { activeModel, activeModelDetails, availableModels = DEFAULT_AI_MODELS } = modelInfo || {
    activeModel: "yolov8m",
    activeModelDetails: DEFAULT_AI_MODELS[0],
    availableModels: DEFAULT_AI_MODELS,
  };

  async function applyFile(selected) {
    if (!selected || !selected.type.startsWith("image/")) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const newPreviewUrl = URL.createObjectURL(selected);
    previewUrlRef.current = newPreviewUrl;

    setFile(selected);
    setPreviewUrl(newPreviewUrl);
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
    <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
      <label
        htmlFor="image-input"
        className={`relative flex flex-col items-center justify-center min-h-[280px] sm:min-h-[360px] w-full border-2 border-border hover:border-primary/60 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
          previewUrl ? "p-0 border-solid bg-black/5 dark:bg-black/20" : "p-6 border-dashed bg-surface"
        } ${dragging ? "drag-over border-primary bg-primary/5" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <div className="relative w-full flex items-center justify-center">
            <img src={previewUrl} alt="Selected beach photo" className="w-full h-auto max-h-[680px] rounded-2xl object-contain block" />

            {/* Bounding box overlays */}
            {boxes.length > 0 && (
              <div className="bbox-overlay-layer absolute inset-0">
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
                      className="bbox-box absolute border-2 pointer-events-none transition-all"
                      style={{
                        left: `${xmin}%`,
                        top: `${ymin}%`,
                        width: `${xmax - xmin}%`,
                        height: `${ymax - ymin}%`,
                        borderColor: color,
                        boxShadow: `0 0 10px ${color}80, inset 0 0 8px ${color}25`,
                      }}
                    >
                      <span className="bbox-label absolute bottom-full left-0 px-1.5 py-0.5 text-[10px] font-bold text-white rounded-t leading-none" style={{ backgroundColor: color }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <div className="w-14 h-14 rounded-full bg-primary-light/50 text-primary flex items-center justify-center mb-1">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>
            <span className="font-display text-sm font-bold text-text-primary">
              Drag &amp; drop or click to browse
            </span>
            <span className="text-xs text-text-muted">Supports: JPG, PNG, JPEG (Max 10MB)</span>
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
        <details className="bg-surface border border-border rounded-xl p-3.5">
          <summary className="flex items-center justify-between cursor-pointer font-semibold text-xs text-text-primary">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-primary" />
              <span>AI Inference Model</span>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-primary-light text-primary text-[11px] font-bold">
              <Sparkles size={11} /> {activeModelDetails?.name || activeModelDetails?.badge || "Active"}
            </span>
          </summary>

          <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
            <div className="text-xs text-text-muted">
              <strong className="text-text-primary">System Admin Control:</strong> Select model for system-wide inference across all users.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {availableModels.map((m) => {
                const isSelected = activeModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={updatingModel}
                    onClick={() => onUpdateModel && onUpdateModel(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-text-primary">
                      <span>{m.name}</span>
                      {isSelected && <Check size={13} className="text-primary" />}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
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
      <div className="bg-surface border border-border rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <MapPin size={14} className="text-primary" /> Target Beach Location:
          </label>
        </div>

        {exifCoords && selectedBeach === "auto" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-light text-primary text-xs font-medium">
            <Navigation size={13} className="shrink-0" />
            <span>Photo EXIF GPS: <strong>{exifCoords.latitude.toFixed(4)}, {exifCoords.longitude.toFixed(4)}</strong></span>
          </div>
        )}

        <div className="relative">
          <select
            value={selectedBeach}
            onChange={(e) => setSelectedBeach(e.target.value)}
            className="w-full pl-3.5 pr-9 py-2 bg-bg-secondary text-text-primary border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
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
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-pill shadow-md transition-all cursor-pointer"
        disabled={!file || isBusy}
      >
        <UploadCloud size={18} strokeWidth={2} />
        {btnLabel}
      </button>

      <div className="text-center text-xs text-text-muted my-1">Or capture image</div>
      <button
        type="button"
        className="flex items-center justify-center gap-2 w-full py-2.5 px-6 bg-surface hover:bg-bg-secondary border border-border text-text-primary font-medium text-xs rounded-pill transition-colors cursor-pointer"
        onClick={() => showToast("info", "Camera capture coming soon!")}
      >
        <Camera size={16} strokeWidth={1.8} />
        Open Camera
      </button>

      {selectedBeach === "auto" && locStatus === "denied" && (
        <p className="text-xs text-text-muted italic">
          Location access denied — uploaded without coordinates.
        </p>
      )}
      {selectedBeach === "auto" && locStatus === "granted" && (
        <p className="text-xs text-primary font-medium">
          Location attached to this photo.
        </p>
      )}

      <ToastNotification toast={toast} />
    </form>
  );
}
