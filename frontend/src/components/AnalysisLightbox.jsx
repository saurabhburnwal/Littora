import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import BoundingBoxImage from "./BoundingBoxImage.jsx";
import ResultPanel from "./ResultPanel.jsx";
import { toResultShape } from "../utils/wasteUtils.js";

const MIN_SPLIT = 45;
const MAX_SPLIT = 70;

const getDefaultSplit = () => {
  if (typeof window !== "undefined" && window.innerWidth >= 1024 && window.innerWidth < 1280) {
    return 50;
  }
  return 60;
};

export default function AnalysisLightbox({ item, showUser = false, onClose }) {
  const closeButtonRef = useRef(null);
  const containerRef = useRef(null);
  const [splitPercent, setSplitPercent] = useState(getDefaultSplit);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!item) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  // Handle dragging to resize panels
  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX == null) return;

      const newPercent = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, newPercent));
      setSplitPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove, { passive: false });
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDoubleClick = () => {
    setSplitPercent(getDefaultSplit());
  };

  const handleDividerKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSplitPercent((prev) => Math.max(MIN_SPLIT, prev - 2));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSplitPercent((prev) => Math.min(MAX_SPLIT, prev + 2));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSplitPercent(MIN_SPLIT);
    } else if (e.key === "End") {
      e.preventDefault();
      setSplitPercent(MAX_SPLIT);
    }
  };

  if (!item) return null;

  return createPortal(
    <div
      className="modal-overlay analysis-lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo analysis detail"
    >
      <section
        ref={containerRef}
        className={`analysis-lightbox ${isDragging ? "is-resizing" : ""}`}
        data-testid="lightbox-container"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="analysis-lightbox-close"
          onClick={onClose}
          aria-label="Close photo analysis detail"
        >
          <X size={16} />
        </button>

        {/* LEFT: Image / BoundingBoxImage Stage */}
        <div
          className="analysis-lightbox-stage"
          data-testid="lightbox-stage"
          style={{ flex: `0 0 ${splitPercent}%`, width: `${splitPercent}%`, maxWidth: `${splitPercent}%` }}
        >
          <div className="analysis-lightbox-media">
            <BoundingBoxImage
              src={item.image_url}
              alt="Full-size beach analysis"
              boxes={item.boxes || []}
              lightbox
            />
          </div>
        </div>

        {/* DRAGGABLE DIVIDER / SPLITTER */}
        <div
          className={`analysis-lightbox-divider ${isDragging ? "dragging" : ""}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize image and details panels"
          aria-valuenow={Math.round(splitPercent)}
          aria-valuemin={MIN_SPLIT}
          aria-valuemax={MAX_SPLIT}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleDividerKeyDown}
        >
          <div className="analysis-lightbox-divider-line" />
        </div>

        {/* RIGHT: Detection Metadata Panel */}
        <aside
          className="analysis-lightbox-details"
          data-testid="lightbox-details"
          style={{ flex: `0 0 ${100 - splitPercent}%`, width: `${100 - splitPercent}%`, maxWidth: `${100 - splitPercent}%` }}
        >
          <ResultPanel result={toResultShape(item)} showUser={showUser} />
        </aside>
      </section>
    </div>,
    document.body
  );
}
