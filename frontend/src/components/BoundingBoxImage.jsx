import { useMemo } from "react";

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
 * Renders a full, uncropped image with optional YOLO bounding box overlays.
 *
 * @param {string} src - The image URL
 * @param {string} alt - Alt text for the image
 * @param {Array} boxes - Array of box objects: [{ class_name, confidence, box_normalized: [xmin, ymin, xmax, ymax] }]
 */
export default function BoundingBoxImage({ src, alt = "Beach waste detection", boxes = [] }) {
  const normalizedBoxes = useMemo(() => {
    if (!Array.isArray(boxes)) return [];
    return boxes.filter(
      (b) => b && Array.isArray(b.box_normalized) && b.box_normalized.length === 4
    );
  }, [boxes]);

  if (!src) return null;

  return (
    <div className="modal-img-container">
      <img
        src={src}
        alt={alt}
        className="modal-img-full"
        decoding="async"
      />

      {normalizedBoxes.length > 0 && (
        <div className="bbox-overlay-layer" aria-label="Detection bounding boxes">
          {normalizedBoxes.map((b, idx) => {
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
  );
}
