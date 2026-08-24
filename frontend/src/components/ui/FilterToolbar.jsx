import { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";

/**
 * Reusable FilterToolbar component providing search, filter popover,
 * active filter chips, and clear actions.
 *
 * @param {Object} props
 * @param {string} [props.searchQuery=''] - Current search text
 * @param {Function} props.onSearchChange - Callback when search text changes (receives new string value)
 * @param {string} [props.searchPlaceholder='Search detections...'] - Placeholder for search input
 * @param {number} [props.activeFilterCount=0] - Number of currently active filter criteria
 * @param {Array<{ id: string, label: string, onRemove: Function }>} [props.activeChips=[]] - Active filter chips
 * @param {Function} [props.onClearAll] - Callback to clear all active filters
 * @param {React.ReactNode} [props.children] - Filter panel content (rendered inside the popover)
 * @param {React.ReactNode} [props.extraActions] - Optional extra controls on the right (e.g., view toggles)
 * @param {string} [props.className=''] - Custom container class
 */
export default function FilterToolbar({
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search detections...",
  activeFilterCount = 0,
  activeChips = [],
  onClearAll,
  resultsCount,
  children,
  extraActions,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerWrapRef = useRef(null);

  // Close popover on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (triggerWrapRef.current && !triggerWrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange("");
    }
  };

  const hasActiveFilters = (activeFilterCount > 0 || (activeChips && activeChips.length > 0));

  return (
    <div className={`filter-toolbar-root ${className}`.trim()}>
      {/* ── Top Bar: Search Input, Filters Trigger, and Extra Controls ── */}
      <div className="filter-toolbar-bar">
        {/* Search Input */}
        {onSearchChange && (
          <div className="filter-search-box">
            <Search size={16} className="filter-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="filter-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear-btn"
                onClick={handleClearSearch}
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Filter Popover Trigger */}
        {children && (
          <div className="filter-popover-wrapper" ref={triggerWrapRef}>
            <button
              type="button"
              className={`filter-trigger-btn ${isOpen ? "is-open" : ""} ${hasActiveFilters ? "has-active" : ""}`}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              aria-label="Toggle filters panel"
            >
              <SlidersHorizontal size={15} className="filter-trigger-icon" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="filter-count-badge">{activeFilterCount}</span>
              )}
              <ChevronDown size={14} className={`filter-chevron ${isOpen ? "is-rotated" : ""}`} />
            </button>

            {/* Floating Popover Panel */}
            {isOpen && (
              <div
                className="filter-popover-panel"
                role="dialog"
                aria-label="Filter options"
              >
                <div className="filter-popover-header">
                  <div className="filter-popover-title-wrap">
                    <SlidersHorizontal size={14} style={{ color: "var(--teal)" }} />
                    <span className="filter-popover-title">Filter Criteria</span>
                  </div>
                  {onClearAll && (
                    <button
                      type="button"
                      className="filter-clear-link"
                      onClick={() => {
                        onClearAll();
                        setIsOpen(false);
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                <div className="filter-popover-content">
                  {children}
                </div>

                <div className="filter-popover-footer">
                  <button
                    type="button"
                    className="filter-apply-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional Extra Actions on the Right */}
        {extraActions && (
          <div className="filter-toolbar-extra">
            {extraActions}
          </div>
        )}
      </div>

      {/* ── Active Filter Chips Row ── */}
      {hasActiveFilters && (
        <div className="filter-active-chips-row" role="region" aria-label="Active filters">
          <div className="filter-chips-list">
            {activeChips.map((chip) => (
              <span key={chip.id || chip.label} className="filter-active-chip">
                <span className="filter-chip-text">{chip.label}</span>
                {chip.onRemove && (
                  <button
                    type="button"
                    className="filter-chip-remove-btn"
                    onClick={chip.onRemove}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>

          {onClearAll && (
            <button
              type="button"
              className="filter-clear-all-btn"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}

          {typeof resultsCount === "number" && (
            <span className="active-results-count">
              {resultsCount} {resultsCount === 1 ? "detection" : "detections"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
