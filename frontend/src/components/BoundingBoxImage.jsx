import { useState, useMemo } from "react";
import { SlidersHorizontal, Eye, EyeOff } from "lucide-react";

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

/**
 * Renders a full, uncropped image with interactive YOLO bounding box overlays,
 * confidence threshold slider, and category filter chips.
 *
 * @param {string} src - The image URL
 * @param {string} alt - Alt text for the image
 * @param {Array} boxes - Array of box objects: [{ class_name, confidence, box_normalized: [xmin, ymin, xmax, ymax] }]
 */
export default function BoundingBoxImage({ src, alt = "Beach waste detection", boxes = [] }) {
  const [minConf, setMinConf] = useState(0.25);
  const [hiddenCategories, setHiddenCategories] = useState(() => new Set());

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

  return (
    <div className="bbox-interactive-wrapper">
      <div className="modal-img-container">
        <img
          src={src}
          alt={alt}
          className="modal-img-full"
          decoding="async"
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

      {/* Interactive Toolbar — confidence slider & category toggle chips */}
      {validBoxes.length > 0 && (
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
      )}
    </div>
  );
}
