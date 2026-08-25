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
    <div className={`filter-toolbar-root flex flex-col gap-2.5 mb-4 ${className}`.trim()}>
      {/* ── Top Bar: Search Input, Filters Trigger, and Extra Controls ── */}
      <div className="filter-toolbar-bar flex items-center justify-between gap-3 flex-wrap">
        {/* Search Input */}
        {onSearchChange && (
          <div className="filter-search-box relative flex-1 min-w-[240px]">
            <Search size={16} className="filter-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              className="filter-search-input w-full pl-9 pr-8 py-2 bg-surface border border-border rounded-pill text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear-btn absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-full hover:bg-bg-secondary transition-colors cursor-pointer"
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
          <div className="filter-popover-wrapper relative" ref={triggerWrapRef}>
            <button
              type="button"
              className={`filter-trigger-btn flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-bg-secondary border border-border rounded-pill text-xs font-semibold text-text-secondary hover:text-text-primary transition-all shadow-sm cursor-pointer ${isOpen ? "is-open border-primary text-primary" : ""} ${hasActiveFilters ? "has-active border-primary/60 text-primary" : ""}`}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              aria-label="Toggle filters panel"
            >
              <SlidersHorizontal size={15} className="filter-trigger-icon" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="filter-count-badge inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold leading-none">{activeFilterCount}</span>
              )}
              <ChevronDown size={14} className={`filter-chevron transition-transform duration-200 ${isOpen ? "is-rotated rotate-180" : ""}`} />
            </button>

            {/* Floating Popover Panel */}
            {isOpen && (
              <div
                className="filter-popover-panel absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-xl p-4 z-50"
                role="dialog"
                aria-label="Filter options"
              >
                <div className="filter-popover-header flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                  <div className="filter-popover-title-wrap flex items-center gap-2">
                    <SlidersHorizontal size={14} className="filter-popover-title-icon text-primary" />
                    <span className="filter-popover-title font-display text-xs font-bold uppercase tracking-wider text-text-primary">Filter Criteria</span>
                  </div>
                  {onClearAll && (
                    <button
                      type="button"
                      className="filter-clear-link text-xs font-semibold text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                      onClick={() => {
                        onClearAll();
                        setIsOpen(false);
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                <div className="filter-popover-content space-y-3">
                  {children}
                </div>

                <div className="filter-popover-footer pt-3 mt-3 border-t border-border/50 flex justify-end">
                  <button
                    type="button"
                    className="filter-apply-btn px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-pill transition-colors shadow-sm cursor-pointer"
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
          <div className="filter-toolbar-extra flex items-center gap-2">
            {extraActions}
          </div>
        )}
      </div>

      {/* ── Active Filter Chips Row ── */}
      {hasActiveFilters && (
        <div className="filter-active-chips-row flex items-center gap-2 flex-wrap pt-1" role="region" aria-label="Active filters">
          <div className="filter-chips-list flex items-center gap-1.5 flex-wrap">
            {activeChips.map((chip) => (
              <span key={chip.id || chip.label} className="filter-active-chip inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-light text-primary text-xs font-semibold rounded-pill">
                <span className="filter-chip-text">{chip.label}</span>
                {chip.onRemove && (
                  <button
                    type="button"
                    className="filter-chip-remove-btn hover:text-primary-hover p-0.5 rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
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
              className="filter-clear-all-btn text-xs font-medium text-text-muted hover:text-rose-500 underline transition-colors cursor-pointer ml-1"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}

          {typeof resultsCount === "number" && (
            <span className="active-results-count text-xs text-text-muted ml-auto font-medium">
              {resultsCount} {resultsCount === 1 ? "detection" : "detections"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
