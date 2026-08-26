import { useState, useEffect, useMemo, useCallback } from "react";
import { ImageOff, RefreshCw, ChevronDown } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import MetricCard from "../components/ui/MetricCard.jsx";
import FilterToolbar from "../components/ui/FilterToolbar.jsx";
import PhotoGallery from "../components/PhotoGallery.jsx";
import HistoryTable from "../components/HistoryTable.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ToastNotification from "../components/ToastNotification.jsx";
import { API_BASE, formatWasteType, normalizeSeverity, SUPPORTED_WASTE_TYPES } from "../utils/wasteUtils.js";

const SEVERITY_OPTIONS = [
  { id: "All",      label: "All",      sub: "" },
  { id: "Low",      label: "Low",      sub: "0–10" },
  { id: "Moderate", label: "Moderate", sub: "11–30" },
  { id: "High",     label: "High",     sub: "31–60" },
  { id: "Severe",   label: "Severe",   sub: ">60" },
];

const DATE_OPTIONS = [
  { id: "all",    label: "All Time" },
  { id: "today",  label: "Today" },
  { id: "7days",  label: "Last 7 Days" },
  { id: "30days", label: "Last 30 Days" },
  { id: "90days", label: "Last 90 Days" },
];

export default function HistoryPage() {
  const { user, getToken, isAdmin } = useAuth();

  const [history,          setHistory]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // Filter states
  const [filterSeverity,   setFilterSeverity]   = useState("All");
  const [filterWasteType,  setFilterWasteType]  = useState("all");
  const [filterDate,       setFilterDate]       = useState("all");
  const [filterLocation,   setFilterLocation]   = useState("all");
  const [searchQuery,      setSearchQuery]      = useState("");

  // Delete state
  const [confirm,  setConfirm]  = useState(null); // analysis id awaiting confirmation
  const [deleting, setDeleting] = useState(null); // id currently being deleted
  const [toast,    setToast]    = useState(null);  // { type, message }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setHistory([]);
        setLoading(false);
        return;
      }
      const endpoint = isAdmin
        ? `${API_BASE}/api/admin/analyses`
        : `${API_BASE}/api/my-analyses`;
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isAdmin]);

  useEffect(() => { loadAnalyses(); }, [loadAnalyses]);

  const handleDeleteConfirm = async () => {
    const id = confirm;
    setConfirm(null);
    setDeleting(id);
    try {
      const token = await getToken();
      const endpoint = isAdmin
        ? `${API_BASE}/api/admin/analyses/${id}`
        : `${API_BASE}/api/my-analyses/${id}`;
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory((prev) => prev.filter((a) => a.id !== id));
      showToast("success", "Analysis deleted successfully.");
    } catch (err) {
      showToast("error", err.response?.data?.error || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  // Distinct locations present in history dataset
  const uniqueLocations = useMemo(() => {
    const set = new Set();
    history.forEach((h) => {
      if (h.location_label) set.add(h.location_label);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [history]);

  // Computed KPI stats
  const totalWaste = useMemo(
    () => history.reduce((s, a) => s + (a.total_waste || 0), 0),
    [history]
  );
  const uniqueUsers = useMemo(
    () => new Set(history.map((a) => a.user_id || a.user_email).filter(Boolean)).size,
    [history]
  );
  const avgScore = useMemo(
    () =>
      history.length
        ? Math.round(
            history.reduce((s, a) => s + (a.pollution_score || 0), 0) /
              history.length
          )
        : 0,
    [history]
  );

  const avgScoreStatus =
    avgScore > 60
      ? "Severe"
      : avgScore >= 31
      ? "High"
      : avgScore >= 11
      ? "Moderate"
      : "Low";

  // Multi-criteria filtering logic
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return history.filter((r) => {
      // 1. Severity Filter
      const itemSeverity = normalizeSeverity(r.severity);
      if (filterSeverity !== "All" && itemSeverity !== filterSeverity) {
        return false;
      }

      // 2. Waste Type Filter
      if (filterWasteType !== "all") {
        const targetType = filterWasteType.toLowerCase();
        let hasType = false;
        if (r.detections && typeof r.detections === "object") {
          if (Array.isArray(r.detections)) {
            hasType = r.detections.some((d) => {
              const k = String(d?.waste_type || d?.type || d?.class_name || "").toLowerCase();
              return k === targetType;
            });
          } else {
            hasType = Boolean(r.detections[targetType]);
          }
        }
        if (!hasType && Array.isArray(r.boxes)) {
          hasType = r.boxes.some((b) => String(b?.class_name || "").toLowerCase() === targetType);
        }
        if (!hasType) return false;
      }

      // 3. Location Filter
      if (filterLocation !== "all" && (r.location_label || "") !== filterLocation) {
        return false;
      }

      // 4. Date Range Filter
      if (filterDate !== "all" && r.created_at) {
        const itemTime = new Date(r.created_at).getTime();
        const diffMs = now - itemTime;
        if (filterDate === "today" && diffMs > 24 * 3600 * 1000) return false;
        if (filterDate === "7days" && diffMs > 7 * 24 * 3600 * 1000) return false;
        if (filterDate === "30days" && diffMs > 30 * 24 * 3600 * 1000) return false;
        if (filterDate === "90days" && diffMs > 90 * 24 * 3600 * 1000) return false;
      }

      // 5. Global Text Search
      if (query) {
        const detectionKeys = Array.isArray(r.detections)
          ? r.detections.map((d) => (typeof d === "object" ? d?.waste_type || d?.type || "" : String(d)))
          : typeof r.detections === "object" && r.detections !== null
          ? Object.keys(r.detections)
          : [];
        const wasteTypesStr = detectionKeys.join(" ").toLowerCase();
        const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString().toLowerCase() : "";

        const matchesSearch =
          (r.location_label && r.location_label.toLowerCase().includes(query)) ||
          (r.severity && r.severity.toLowerCase().includes(query)) ||
          wasteTypesStr.includes(query) ||
          dateStr.includes(query) ||
          (r.user_name && r.user_name.toLowerCase().includes(query)) ||
          (r.user_email && r.user_email.toLowerCase().includes(query)) ||
          (r.user_id && String(r.user_id).toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [history, filterSeverity, filterWasteType, filterLocation, filterDate, searchQuery]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (filterSeverity !== "All") {
      chips.push({ id: "severity", key: "severity", label: `Severity: ${filterSeverity}`, onRemove: () => setFilterSeverity("All") });
    }
    if (filterWasteType !== "all") {
      chips.push({ id: "wasteType", key: "wasteType", label: `Waste: ${formatWasteType(filterWasteType)}`, onRemove: () => setFilterWasteType("all") });
    }
    if (filterLocation !== "all") {
      chips.push({ id: "location", key: "location", label: `Location: ${filterLocation}`, onRemove: () => setFilterLocation("all") });
    }
    if (filterDate !== "all") {
      const dateOption = DATE_OPTIONS.find((d) => d.id === filterDate);
      chips.push({ id: "date", key: "date", label: `Date: ${dateOption?.label || filterDate}`, onRemove: () => setFilterDate("all") });
    }
    if (searchQuery.trim() !== "") {
      chips.push({ id: "search", key: "search", label: `Search: "${searchQuery}"`, onRemove: () => setSearchQuery("") });
    }
    return chips;
  }, [filterSeverity, filterWasteType, filterLocation, filterDate, searchQuery]);

  const clearAllFilters = () => {
    setFilterSeverity("All");
    setFilterWasteType("all");
    setFilterLocation("all");
    setFilterDate("all");
    setSearchQuery("");
  };

  const activeFilterCount = (filterSeverity !== "All" ? 1 : 0) +
    (filterWasteType !== "all" ? 1 : 0) +
    (filterDate !== "all" ? 1 : 0) +
    (filterLocation !== "all" ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Detection History</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {isAdmin
              ? "Administrator view — review, filter, and inspect beach waste analyses submitted by all contributors."
              : "Search, filter, and review all previous beach waste analyses and detection images."}
          </p>
        </div>
        {user && (
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-bg-secondary border border-border text-text-primary rounded-pill text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            onClick={loadAnalyses}
            disabled={loading}
            title="Refresh analyses"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        )}
      </div>

      {/* KPI Section */}
      {!loading && !error && history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Detection Sessions"
            value={history.length}
          />
          <MetricCard
            label="Waste Items"
            value={totalWaste.toLocaleString()}
          />
          <MetricCard
            label="Avg. Severity Score"
            value={avgScore}
            tier={avgScoreStatus}
          />
          <MetricCard
            label="Unique Contributors"
            value={uniqueUsers}
          />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted gap-3 bg-surface border border-dashed border-border rounded-2xl my-6">
          <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs sm:text-sm font-medium">{isAdmin ? "Loading all analyses…" : "Loading your analyses…"}</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium my-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted gap-3 bg-surface border border-dashed border-border rounded-2xl my-6">
          <ImageOff size={48} strokeWidth={1.2} />
          {isAdmin ? (
            <p className="text-xs sm:text-sm">No analyses have been uploaded by any user yet.</p>
          ) : (
            <>
              <p className="text-xs sm:text-sm">You haven&apos;t uploaded any photos yet.</p>
              <p className="text-xs text-text-muted mt-1">
                Head to <strong>Detect Waste</strong> to upload your first beach photo.
              </p>
            </>
          )}
        </div>
      )}

      {/* Main Content & Simplified Toolbar */}
      {user && !loading && !error && history.length > 0 && (
        <>
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search location, waste type, contributor..."
            activeFilterCount={activeFilterCount}
            activeChips={activeChips}
            onClearAll={clearAllFilters}
            resultsCount={filtered.length}
          >
            {/* Severity Filter Group */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Severity Tier</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                      filterSeverity === opt.id
                        ? "border-primary bg-primary text-white font-bold shadow-sm"
                        : "border-border bg-surface text-text-secondary hover:border-primary/50"
                    }`}
                    onClick={() => setFilterSeverity(opt.id)}
                  >
                    <span>{opt.label}</span>
                    {opt.sub && <span className="ml-1 text-[10px] opacity-75 font-normal">{opt.sub}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Waste Type Filter Group */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider" htmlFor="filter-waste-select">Waste Type</label>
              <div className="relative">
                <select
                  id="filter-waste-select"
                  className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
                  aria-label="Filter by waste type"
                  value={filterWasteType}
                  onChange={(e) => setFilterWasteType(e.target.value)}
                >
                  <option value="all">All Waste Types</option>
                  {SUPPORTED_WASTE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatWasteType(type)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Date Filter Group */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider" htmlFor="filter-date-select">Date Range</label>
              <div className="relative">
                <select
                  id="filter-date-select"
                  className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
                  aria-label="Filter by date range"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                >
                  {DATE_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Location Filter Group */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider" htmlFor="filter-loc-select">Beach Location</label>
              <div className="relative">
                <select
                  id="filter-loc-select"
                  className="w-full pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
                  aria-label="Filter by location"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                >
                  <option value="all">All Locations</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </FilterToolbar>

          {/* Photo gallery */}
          <section className="space-y-4">
            <SectionHeader
              title="Photo Gallery"
              subtitle="Visual detection catalog and photo inspection"
            />
            <PhotoGallery
              items={filtered}
              showUser={isAdmin}
              onDeleteRequest={(id) => setConfirm(id)}
              deletingId={deleting}
            />
          </section>

          {/* Detailed records table */}
          <section className="space-y-4">
            <SectionHeader
              title="Analysis Records"
              subtitle="Tabular dataset of past scans and debris classifications"
            />
            <HistoryTable
              history={filtered}
              showUser={isAdmin}
              onDeleteRequest={(id) => setConfirm(id)}
              deletingId={deleting}
            />
          </section>
        </>
      )}

      {/* Confirm delete modal using shared ConfirmModal */}
      <ConfirmModal
        isOpen={confirm !== null}
        title="Delete this analysis?"
        message="This will permanently delete this analysis and all associated records. This action cannot be undone."
        confirmLabel="Yes, delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm(null)}
      />

      {/* Toast notification using shared ToastNotification */}
      <ToastNotification toast={toast} />
    </div>
  );
}
