import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import AnalysisLightbox from "./AnalysisLightbox.jsx";

export default function PhotoGallery({ items, showUser = false, onDeleteRequest, deletingId }) {
  const [modalItem, setModalItem] = useState(null);

  if (!items || items.length === 0) {
    return (
      <div className="gallery-grid">
        <div className="gallery-empty">
          <p>No photos match the selected filter.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-grid">
        {items.map((row) => {
          const formattedDate = row.created_at
            ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "—";

          const totalWasteCount = Number(row.total_waste || 0);
          const itemCountText = totalWasteCount === 1 ? "1 waste item" : `${totalWasteCount.toLocaleString()} waste items`;

          return (
            <div
              key={row.id}
              className="gallery-card"
              role="button"
              tabIndex={0}
              aria-label={`Analysis from ${formattedDate}, score ${row.pollution_score || 0}`}
              onClick={() => setModalItem(row)}
              onKeyDown={(e) => e.key === "Enter" && setModalItem(row)}
            >
              {/* Media-first Thumbnail + Clean Overlays */}
              <div className="gallery-thumb-wrap">
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt={`Beach photo — ${row.severity || "Low"} severity`}
                    className="gallery-thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="gallery-thumb-placeholder">—</div>
                )}

                {/* Top overlay: severity badge + delete button */}
                <div className="gallery-thumb-overlay-top">
                  <span className={`severity-overlay severity-${(row.severity || "low").toLowerCase()}`}>
                    {row.severity || "Low"}
                  </span>
                  {onDeleteRequest && (
                    <button
                      type="button"
                      className="gallery-delete-btn"
                      onClick={(e) => { e.stopPropagation(); onDeleteRequest(row.id); }}
                      disabled={deletingId === row.id}
                      title="Delete Analysis"
                      aria-label="Delete Analysis"
                    >
                      {deletingId === row.id
                        ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                        : <Trash2 size={13} />
                      }
                    </button>
                  )}
                </div>

                {/* Bottom overlay: date */}
                <div className="gallery-thumb-overlay-bottom">
                  <span className="gallery-pill">{formattedDate}</span>
                </div>
              </div>

              {/* Card Footer: Location & Item Count */}
              <div className="gallery-card-footer">
                <div className="gallery-card-meta">
                  <span className="gallery-card-loc" title={row.location_label || "Location unavailable"}>
                    {row.location_label || "Location unavailable"}
                  </span>
                  <span className="gallery-card-count">
                    {itemCountText}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnalysisLightbox item={modalItem} showUser={showUser} onClose={() => setModalItem(null)} />
    </>
  );
}
