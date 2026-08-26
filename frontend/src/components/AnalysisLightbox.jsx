import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Info } from "lucide-react";
import BoundingBoxImage from "./BoundingBoxImage.jsx";
import ResultPanel from "./ResultPanel.jsx";
import { toResultShape } from "../utils/wasteUtils.js";

export default function AnalysisLightbox({ item, showUser = false, onClose }) {
  const closeButtonRef = useRef(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (!item) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/50 dark:bg-black/70 backdrop-blur-md overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo analysis detail"
    >
      {/* Full-screen ambient atmospheric glow */}
      {item.image_url && (
        <img
          src={item.image_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-[90px] scale-125 opacity-40 dark:opacity-30 pointer-events-none"
        />
      )}

      <section
        className="relative w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-white/25 dark:border-white/10 bg-surface/15 dark:bg-black/30 backdrop-blur-2xl flex items-center justify-center"
        data-testid="lightbox-container"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Ambient Background Glow from Image inside modal ── */}
        {item.image_url && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <img
              src={item.image_url}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover blur-[75px] scale-125 opacity-80 dark:opacity-70 saturate-150"
            />
            <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/30 dark:to-black/50" />
          </div>
        )}

        {/* ── Top Floating Action Controls (Close + Details Toggle) ── */}
        <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className={`flex items-center justify-center w-8 h-8 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
              showDetails
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-black/40 hover:bg-black/60 text-white border-white/20"
            }`}
            title={showDetails ? "Hide analysis details" : "Show analysis details"}
            aria-label={showDetails ? "Hide analysis details" : "Show analysis details"}
          >
            <Info size={15} />
          </button>
          <button
            ref={closeButtonRef}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-sm transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Close photo analysis detail"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Full-Canvas Image Stage (occupies 100% of the lightbox canvas) ── */}
        <div
          className="relative z-10 w-full h-full flex items-center justify-center p-2 sm:p-4 md:p-6"
          data-testid="lightbox-stage"
        >
          <BoundingBoxImage
            src={item.image_url}
            alt="Full-size beach analysis"
            boxes={item.boxes || []}
            lightbox
          />
        </div>

        {/* ── Floating Glass Overlay Metadata Panel ── */}
        {showDetails && (
          <aside
            className="absolute top-14 right-3.5 sm:right-5 z-30 w-72 sm:w-80 max-h-[calc(90vh-4.5rem)] overflow-y-auto bg-surface/90 backdrop-blur-2xl border border-border/70 rounded-2xl p-4 shadow-2xl animate-in fade-in duration-200"
            data-testid="lightbox-details"
          >
            <ResultPanel result={toResultShape(item)} showUser={showUser} naked />
          </aside>
        )}
      </section>
    </div>,
    document.body
  );
}


