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
              className="gallery-card gallery-tile"
              role="button"
              tabIndex={0}
              aria-label={`Analysis from ${formattedDate}, score ${row.pollution_score || 0}`}
              onClick={() => setModalItem(row)}
              onKeyDown={(e) => e.key === "Enter" && setModalItem(row)}
            >
              {/* Full-bleed Thumbnail + Scrim Overlay */}
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

                {/* Subtle gradient scrim */}
                <div className="gallery-tile-scrim" />

                {/* Top overlay: severity badge (top-left) + delete button (top-right) */}
                <div className="gallery-tile-header">
                  <span className={`severity-overlay severity-${(row.severity || "low").toLowerCase()}`}>
                    {row.severity || "Low"}
                  </span>
                  {onDeleteRequest && (
                    <button
                      type="button"
                      className="gallery-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(row.id);
                      }}
                      disabled={deletingId === row.id}
                      title="Delete Analysis"
                      aria-label="Delete Analysis"
                    >
                      {deletingId === row.id ? (
                        <Loader2 size={13} className="is-spinning" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  )}
                </div>

                {/* Bottom caption overlay: Location (bottom-left) + Date · X waste items */}
                <div className="gallery-tile-footer">
                  <div className="gallery-tile-loc" title={row.location_label || "Location unavailable"}>
                    {row.location_label || "Location unavailable"}
                  </div>
                  <div className="gallery-tile-sub">
                    <span>{formattedDate}</span>
                    <span className="gallery-tile-dot">·</span>
                    <span>{itemCountText}</span>
                  </div>
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
