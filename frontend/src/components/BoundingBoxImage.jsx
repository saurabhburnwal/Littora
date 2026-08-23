import { useState, useMemo } from "react";
import { SlidersHorizontal, Eye, EyeOff, Focus, Maximize2 } from "lucide-react";
import { BBOX_COLORS } from "../utils/wasteUtils.js";

/**
 * Renders an uncropped beach waste image with interactive YOLO bounding box overlays,
 * automatic detection-focused viewport, confidence threshold slider, and category filter chips.
 *
 * @param {string} src - The image URL
 * @param {string} alt - Alt text for the image
 * @param {Array} boxes - Array of box objects: [{ class_name, confidence, box_normalized: [xmin, ymin, xmax, ymax] }]
 * @param {boolean} lightbox - Whether component is rendered inside the Analysis Lightbox
 */
export default function BoundingBoxImage({ src, alt = "Beach waste detection", boxes = [], lightbox = false }) {
  const [minConf, setMinConf] = useState(0.25);
  const [hiddenCategories, setHiddenCategories] = useState(() => new Set());
  const [aspectRatio, setAspectRatio] = useState(null);
  const [viewMode, setViewMode] = useState("focus"); // "focus" | "full"

  const validBoxes = useMemo(() => {
    if (!Array.isArray(boxes)) return [];
    return boxes.filter(
      (b) => b && Array.isArray(b.box_normalized) && b.box_normalized.length === 4
    );
  }, [boxes]);

  const allCategories = useMemo(() => {
    const categories = new Set();
    validBoxes.forEach((b) => {
      if (b.class_name) categories.add(b.class_name.toLowerCase());
    });
    return Array.from(categories);
  }, [validBoxes]);

  const visibleBoxes = useMemo(() => {
    return validBoxes.filter((b) => {
      const className = (b.class_name || "other").toLowerCase();
      if (hiddenCategories.has(className)) return false;
      const conf = b.confidence != null ? b.confidence : 1.0;
      return conf >= minConf;
    });
  }, [validBoxes, minConf, hiddenCategories]);

  // Calculate the detection-focused crop viewport bounding box
  const focusViewport = useMemo(() => {
    if (!visibleBoxes || visibleBoxes.length === 0) {
      return null;
    }

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    visibleBoxes.forEach((b) => {
      const [x0, y0, x1, y1] = b.box_normalized;
      if (x0 < minX) minX = x0;
      if (y0 < minY) minY = y0;
      if (x1 > maxX) maxX = x1;
      if (y1 > maxY) maxY = y1;
    });

    const width = Math.max(0.01, maxX - minX);
    const height = Math.max(0.01, maxY - minY);

    // If detections occupy most of the image (>= 85% width & height), no extra zoom needed
    if (width >= 0.85 && height >= 0.85) {
      return null;
    }

    // Expand with 30% padding around the bounding box (25-35% range)
    const padX = Math.max(width * 0.30, 0.05);
    const padY = Math.max(height * 0.30, 0.05);

    let cropX0 = Math.max(0, minX - padX);
    let cropY0 = Math.max(0, minY - padY);
    let cropX1 = Math.min(1, maxX + padX);
    let cropY1 = Math.min(1, maxY + padY);

    let cropW = cropX1 - cropX0;
    let cropH = cropY1 - cropY0;

    // Minimum crop dimension to prevent excessive enlargement of tiny detections (max zoom ~3.2x)
    const minDim = 0.30;
    if (cropW < minDim) {
      const midX = (cropX0 + cropX1) / 2;
      cropX0 = Math.max(0, Math.min(1 - minDim, midX - minDim / 2));
      cropX1 = cropX0 + minDim;
      cropW = minDim;
    }
    if (cropH < minDim) {
      const midY = (cropY0 + cropY1) / 2;
      cropY0 = Math.max(0, Math.min(1 - minDim, midY - minDim / 2));
      cropY1 = cropY0 + minDim;
      cropH = minDim;
    }

    // Calculate scale factor preserving original aspect ratio
    const scale = Math.min(3.2, Math.max(1.0, 1 / Math.max(cropW, cropH)));

    if (scale <= 1.08) {
      return null;
    }

    const centerX = (cropX0 + cropX1) / 2;
    const centerY = (cropY0 + cropY1) / 2;

    // Clamp center so viewport remains strictly within image boundaries
    const halfSpan = 0.5 / scale;
    const clampedCenterX = Math.max(halfSpan, Math.min(1 - halfSpan, centerX));
    const clampedCenterY = Math.max(halfSpan, Math.min(1 - halfSpan, centerY));

    return {
      scale,
      originX: clampedCenterX * 100,
      originY: clampedCenterY * 100,
      cropX0,
      cropY0,
      cropX1,
      cropY1,
    };
  }, [visibleBoxes]);

  const toggleCategory = (cat) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  if (!src) return null;

  const isFocused = lightbox && viewMode === "focus" && Boolean(focusViewport);

  return (
    <div className="bbox-interactive-wrapper">
      <div className={`modal-img-container${lightbox ? " modal-img-container--lightbox" : ""}`}>
        <div
          className="modal-image-frame"
          style={{
            ...(aspectRatio ? { aspectRatio } : {}),
            ...(isFocused ? {
              transformOrigin: `${focusViewport.originX}% ${focusViewport.originY}%`,
              transform: `scale(${focusViewport.scale})`,
              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            } : {
              transform: "none",
              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }),
          }}
        >
          <img
            src={src}
            alt={alt}
            className="modal-img-full"
            decoding="async"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) setAspectRatio(naturalWidth / naturalHeight);
            }}
          />

          {visibleBoxes.length > 0 && (
            <div className="bbox-overlay-layer" aria-label="Detection bounding boxes">
              {visibleBoxes.map((b, idx) => {
                const [xmin, ymin, xmax, ymax] = b.box_normalized;
                const left = Math.max(0, Math.min(100, xmin * 100));
                const top = Math.max(0, Math.min(100, ymin * 100));
                const width = Math.max(0, Math.min(100 - left, (xmax - xmin) * 100));
                const height = Math.max(0, Math.min(100 - top, (ymax - ymin) * 100));
                const color = BBOX_COLORS[b.class_name?.toLowerCase()] || "#00D4AA";
                const confidencePct = b.confidence != null ? `${Math.round(b.confidence * 100)}%` : "";
                const label = [b.class_name || "waste", confidencePct].filter(Boolean).join(" ");

                return (
                  <div
                    key={idx}
                    className="bbox-box"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
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
      </div>

      {/* Detection-Focus Viewport Toggle (Lightbox Mode) */}
      {lightbox && (
        <div className="bbox-view-mode-toggle" role="group" aria-label="Image view mode">
          <button
            type="button"
            className={`bbox-view-btn ${isFocused ? "active" : ""}`}
            onClick={() => setViewMode("focus")}
            disabled={!focusViewport}
            aria-pressed={isFocused}
            title={focusViewport ? "Zoom to detected objects" : "No zoomed crop available for these detections"}
          >
            <Focus size={13} />
            <span>Focus Detections</span>
          </button>
          <button
            type="button"
            className={`bbox-view-btn ${!isFocused ? "active" : ""}`}
            onClick={() => setViewMode("full")}
            aria-pressed={!isFocused}
            title="Show complete original image"
          >
            <Maximize2 size={13} />
            <span>Full Image</span>
          </button>
        </div>
      )}

      {/* Interactive Toolbar — collapsible detection settings with confidence slider & category chips */}
      {validBoxes.length > 0 && (
        <details className="bbox-filter-details" open={!lightbox}>
          <summary className="bbox-filter-summary">
            <SlidersHorizontal size={13} className="bbox-settings-icon" />
            <span>Detection Settings</span>
            <span className="bbox-summary-hint">{Math.round(minConf * 100)}% threshold</span>
          </summary>
          <div className="bbox-filter-toolbar" aria-label="Bounding box filters">
            <div className="bbox-filter-conf">
              <SlidersHorizontal size={14} style={{ color: "var(--teal)", flexShrink: 0 }} />
              <label htmlFor="min-conf-slider" style={{ fontSize: "0.76rem", fontWeight: 600 }}>
                Confidence: <strong>{Math.round(minConf * 100)}%</strong>
              </label>
              <input
                id="min-conf-slider"
                type="range"
                min="5"
                max="90"
                step="5"
                value={Math.round(minConf * 100)}
                onChange={(e) => setMinConf(Number(e.target.value) / 100)}
                aria-label="Minimum detection confidence"
              />
            </div>

            <div className="bbox-filter-chips">
              {allCategories.map((cat) => {
                const isHidden = hiddenCategories.has(cat);
                const color = BBOX_COLORS[cat] || "#00D4AA";
                const count = validBoxes.filter((b) => (b.class_name || "").toLowerCase() === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`bbox-chip ${isHidden ? "bbox-chip--off" : ""}`}
                    style={{
                      "--chip-color": color,
                      borderColor: isHidden ? "var(--border)" : color,
                      color: isHidden ? "var(--muted)" : color,
                      background: isHidden ? "transparent" : `${color}15`,
                    }}
                    title={isHidden ? `Show ${cat} detections` : `Hide ${cat} detections`}
                  >
                    {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                    <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <span className="bbox-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
