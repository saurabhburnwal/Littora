import { useState } from "react";
import { X } from "lucide-react";
import ResultPanel from "./ResultPanel.jsx";

/**
 * Reshapes the detections array from /api/stats format
 * [{ waste_type: "bottle", count: 5 }]  →  { bottle: 5, can: 0, ... }
 * so it matches the shape ResultPanel expects.
 */
function toResultShape(row) {
  const detections = { bottle: 0, can: 0, bag: 0, wrapper: 0 };
  for (const d of row.detections || []) {
    if (d.waste_type in detections) detections[d.waste_type] = d.count;
  }
  return { ...row, detections };
}

export default function PhotoGallery({ items }) {
  const [modalItem, setModalItem] = useState(null);

  if (!items || items.length === 0) {
    return (
      <div className="gallery-grid">
        <div className="gallery-empty">
          <span>🏖️</span>
          <p>No photos match the selected filter.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-grid">
        {items.map((row) => (
          <div
            key={row.id}
            className="gallery-card"
            role="button"
            tabIndex={0}
            aria-label={`Analysis from ${new Date(row.created_at).toLocaleDateString()}, score ${row.pollution_score}`}
            onClick={() => setModalItem(row)}
            onKeyDown={(e) => e.key === "Enter" && setModalItem(row)}
          >
            {/* Thumbnail + severity overlay */}
            <div className="gallery-thumb-wrap">
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt={`Beach photo — ${row.severity} severity`}
                  className="gallery-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="gallery-thumb-placeholder">🖼</div>
              )}
              <span
                className={`severity-overlay severity-${row.severity?.toLowerCase()}`}
              >
                {row.severity}
              </span>
            </div>

            {/* Card info */}
            <div className="gallery-info">
              <span className="gallery-score">{row.pollution_score}</span>
              <span className="gallery-score-label">Pollution Score</span>
              <div className="gallery-meta">
                <span className="gallery-date">
                  {new Date(row.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="gallery-loc" title={row.location_label}>
                  {row.location_label || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal lightbox */}
      {modalItem && (
        <div
          className="modal-overlay"
          onClick={() => setModalItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo analysis detail"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setModalItem(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {modalItem.image_url && (
              <img
                src={modalItem.image_url}
                alt="Full-size beach analysis"
                className="modal-img"
              />
            )}

            <div className="modal-body">
              <ResultPanel result={toResultShape(modalItem)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
