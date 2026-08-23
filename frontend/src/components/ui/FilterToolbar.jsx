import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
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
    if (onSearchChange) onSearchChange("");
  };

  return (
    <div className={`filter-toolbar-root ${className}`.trim()}>
      <div className="filter-toolbar-main">
        {/* Left: Search Input */}
        <div className="filter-search-wrap">
          <Search size={16} className="filter-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="filter-search-input"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            aria-label={searchPlaceholder}
          />
          {searchQuery && (
            <button
              type="button"
              className="filter-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right: Filters Button + Popover */}
        <div className="filter-actions-wrap">
          {children && (
            <div className="filter-popover-anchor" ref={triggerWrapRef}>
              <button
                type="button"
                className={`filter-trigger-btn ${isOpen || activeFilterCount > 0 ? "active" : ""}`}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Toggle filters"
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="filter-count-badge">{activeFilterCount}</span>
                )}
                <ChevronDown
                  size={14}
                  className={`filter-chevron ${isOpen ? "open" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {/* Popover Filter Panel */}
              {isOpen && (
                <div
                  className="filter-popover-panel"
                  role="dialog"
                  aria-label="Filter options"
                >
                  <div className="filter-popover-header">
                    <span className="filter-popover-title">Filters</span>
                    {activeFilterCount > 0 && onClearAll && (
                      <button
                        type="button"
                        className="filter-popover-reset"
                        onClick={onClearAll}
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  <div className="filter-popover-body">{children}</div>
                </div>
              )}
            </div>
          )}

          {extraActions && <div className="filter-extra-actions">{extraActions}</div>}
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {activeChips && activeChips.length > 0 && (
        <div className="filter-chips-row" aria-label="Active filters">
          <span className="active-filters-label">Active filters:</span>
          {activeChips.map((chip) => (
            <span key={chip.id || chip.label} className="filter-chip">
              <span>{chip.label}</span>
              {chip.onRemove && (
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={chip.onRemove}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}

          {onClearAll && (
            <button
              type="button"
              className="filter-chip-clear-all"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}

          {resultsCount !== undefined && (
            <span className="active-results-count">
              {resultsCount} {resultsCount === 1 ? "detection" : "detections"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

FilterToolbar.propTypes = {
  searchQuery: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  activeFilterCount: PropTypes.number,
  activeChips: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string.isRequired,
      onRemove: PropTypes.func,
    })
  ),
  onClearAll: PropTypes.func,
  children: PropTypes.node,
  extraActions: PropTypes.node,
  className: PropTypes.string,
};
