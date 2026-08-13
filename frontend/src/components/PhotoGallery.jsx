import { useState } from "react";
import { User, Trash2, Loader2, X } from "lucide-react";
import ResultPanel from "./ResultPanel.jsx";
import { toResultShape } from "../utils/wasteUtils.js";

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
            {/* Thumbnail + severity overlay + delete button */}
            <div className="gallery-thumb-wrap">
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt={`Beach photo — ${row.severity} severity`}
                  className="gallery-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="gallery-thumb-placeholder">—</div>
              )}
              <span
                className={`severity-overlay severity-${row.severity?.toLowerCase()}`}
              >
                {row.severity}
              </span>
              {/* Delete button — only shown when onDeleteRequest is provided */}
              {onDeleteRequest && (
                <button
                  className="gallery-delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDeleteRequest(row.id); }}
                  disabled={deletingId === row.id}
                  title="Delete this analysis"
                  aria-label="Delete analysis"
                >
                  {deletingId === row.id
                    ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    : <Trash2 size={14} />
                  }
                </button>
              )}
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
              {showUser && (
                <div className="gallery-user-chip" title={row.user_name ? `${row.user_name} (${row.user_email || ""})` : (row.user_email || row.user_id || "Anonymous")}>
                  <User size={10} />
                  {row.user_name || row.user_email || (row.user_id ? row.user_id.slice(0, 8) + "…" : "Anon")}
                </div>
              )}
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
                decoding="async"
              />
            )}

            <div className="modal-body">
              {showUser && (modalItem.user_name || modalItem.user_email || modalItem.user_id) && (
                <div className="admin-card-user" style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                  <User size={14} style={{ display: "inline", marginRight: "4px" }} />
                  Uploaded by: <strong title={modalItem.user_email || modalItem.user_id}>
                    {modalItem.user_name || modalItem.user_email || (modalItem.user_id?.slice(0, 12) + "…")}
                  </strong>
                </div>
              )}
              <ResultPanel result={toResultShape(modalItem)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
