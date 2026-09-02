import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import AnalysisLightbox from "./AnalysisLightbox.jsx";

export default function PhotoGallery({
  items,
  showUser = false,
  onDeleteRequest,
  deletingId,
  colCount: controlledColCount,
  onColChange,
}) {
  const [modalItem, setModalItem] = useState(null);
  const [internalColCount, setInternalColCount] = useState(() => {
    const saved = parseInt(localStorage.getItem("photoGalleryColCount"), 10);
    return [2, 3, 4].includes(saved) ? saved : 3;
  });

  const isControlled = controlledColCount !== undefined;
  const colCount = isControlled ? controlledColCount : internalColCount;

  const handleColChange = (n) => {
    if (!isControlled) {
      setInternalColCount(n);
    }
    localStorage.setItem("photoGalleryColCount", n);
    onColChange?.(n);
  };

  const gridClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  }[colCount];

  if (!items || items.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-full flex items-center justify-center p-12 text-center text-text-muted text-sm bg-surface border border-dashed border-border rounded-2xl">
          <p>No photos match the selected filter.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Column count toggle (rendered only if not controlled by parent) */}
      {!isControlled && (
        <div className="flex items-center justify-end gap-1.5 mb-3">
          <span className="text-xs text-text-muted mr-1">Columns:</span>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleColChange(n)}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-all cursor-pointer border ${
                colCount === n
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface text-text-muted border-border hover:text-text-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <div className={`grid ${gridClass} gap-4`}>
        {items.map((row) => {
          const formattedDate = row.created_at
            ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "—";

          const totalWasteCount = Number(row.total_waste || 0);
          const itemCountText = totalWasteCount === 1 ? "1 waste item" : `${totalWasteCount.toLocaleString()} waste items`;

          return (
            <div
              key={row.id}
              className="relative rounded-2xl overflow-hidden cursor-pointer border border-border bg-surface shadow-sm hover:shadow-lg transition-all duration-200 group"
              role="button"
              tabIndex={0}
              aria-label={`Analysis from ${formattedDate}, score ${row.pollution_score || 0}`}
              onClick={() => setModalItem(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setModalItem(row);
                }
              }}
            >
              {/* Full-bleed Thumbnail + Scrim Overlay */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-bg-secondary">
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt={`Beach photo — ${row.severity || "Low"} severity`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-text-muted font-bold text-lg">—</div>
                )}

                {/* Subtle gradient scrim */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                {/* Top overlay: severity badge (top-left) + delete button (top-right) */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
                  <span className={`severity-badge severity-${(row.severity || "low").toLowerCase()} px-2.5 py-0.5 rounded-pill text-xs font-bold text-white backdrop-blur-xs`}>
                    {row.severity || "Low"}
                  </span>
                  {onDeleteRequest && (
                    <button
                      type="button"
                      className="p-1.5 rounded-full bg-black/50 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(row.id);
                      }}
                      disabled={deletingId === row.id}
                      title="Delete Analysis"
                      aria-label="Delete Analysis"
                    >
                      {deletingId === row.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  )}
                </div>

                {/* Bottom caption overlay: Location (bottom-left) + Date · X waste items */}
                <div className="absolute bottom-2.5 inset-x-2.5 text-white z-10 flex flex-col gap-0.5">
                  <div className="font-display text-sm font-bold truncate drop-shadow-sm" title={row.location_label || "Location unavailable"}>
                    {row.location_label || "Location unavailable"}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-white/80 font-medium">
                    <span>{formattedDate}</span>
                    <span>·</span>
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

