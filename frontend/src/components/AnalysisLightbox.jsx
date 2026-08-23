import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import BoundingBoxImage from "./BoundingBoxImage.jsx";
import ResultPanel from "./ResultPanel.jsx";
import { toResultShape } from "../utils/wasteUtils.js";

export default function AnalysisLightbox({ item, showUser = false, onClose }) {
  const closeButtonRef = useRef(null);

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
      className="modal-overlay analysis-lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo analysis detail"
    >
      <section className="analysis-lightbox" onClick={(event) => event.stopPropagation()}>
        <button
          ref={closeButtonRef}
          className="analysis-lightbox-close"
          onClick={onClose}
          aria-label="Close photo analysis detail"
        >
          <X size={16} />
        </button>

        <div className="analysis-lightbox-stage">
          <div className="analysis-lightbox-media">
            <BoundingBoxImage
              src={item.image_url}
              alt="Full-size beach analysis"
              boxes={item.boxes || []}
              lightbox
            />
          </div>
        </div>

        <aside className="analysis-lightbox-details">
          <ResultPanel result={toResultShape(item)} showUser={showUser} />
        </aside>
      </section>
    </div>,
    document.body
  );
}
