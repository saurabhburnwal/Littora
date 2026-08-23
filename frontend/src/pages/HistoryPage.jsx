import { useState, useEffect, useMemo, useCallback } from "react";
import { ImageOff, RefreshCw } from "lucide-react";
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
    <div className="page-container">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1>Detection History</h1>
          <p>Review recorded coastal waste detections.</p>
        </div>
        {isAdmin && (
          <button
            className="admin-refresh-btn"
            onClick={loadAnalyses}
            disabled={loading}
            title="Refresh analyses"
          >
            <RefreshCw size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        )}
      </div>

      {/* KPI Section */}
      {!loading && !error && history.length > 0 && (
        <div className="kpi-stats-grid">
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
        <div className="result-placeholder">
          <div className="login-spinner" style={{ margin: "0 auto" }} />
          <p>{isAdmin ? "Loading all analyses…" : "Loading your analyses…"}</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="admin-error-banner" style={{ marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="result-placeholder" style={{ marginTop: "3rem" }}>
          <ImageOff size={48} strokeWidth={1.2} />
          {isAdmin ? (
            <p>No analyses have been uploaded by any user yet.</p>
          ) : (
            <>
              <p>You haven&apos;t uploaded any photos yet.</p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
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
            <div className="filter-group">
              <label className="filter-group-label">Severity Tier</label>
              <div className="filter-severity-pills">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`filter-severity-pill ${filterSeverity === opt.id ? "active" : ""}`}
                    onClick={() => setFilterSeverity(opt.id)}
                  >
                    <span>{opt.label}</span>
                    {opt.sub && <span className="filter-pill-sub">{opt.sub}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Waste Type Filter Group */}
            <div className="filter-group">
              <label className="filter-group-label" htmlFor="filter-waste-select">Waste Type</label>
              <select
                id="filter-waste-select"
                className="filter-popover-select"
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
            </div>

            {/* Date Filter Group */}
            <div className="filter-group">
              <label className="filter-group-label" htmlFor="filter-date-select">Date Range</label>
              <select
                id="filter-date-select"
                className="filter-popover-select"
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
            </div>

            {/* Location Filter Group */}
            <div className="filter-group">
              <label className="filter-group-label" htmlFor="filter-loc-select">Beach Location</label>
              <select
                id="filter-loc-select"
                className="filter-popover-select"
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
            </div>
          </FilterToolbar>

          {/* Photo gallery */}
          <section style={{ marginBottom: "2rem" }}>
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
          <section>
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
