import { useState, useMemo, useEffect, useContext } from "react";
import { Download, Eye, Trash2, Loader2, User } from "lucide-react";
import AnalysisLightbox from "./AnalysisLightbox.jsx";
import { SettingsContext } from "../context/SettingsContext.jsx";
import { formatWasteType, getDetectionSummary, SEVERITY_RANKS } from "../utils/wasteUtils.js";
import { downloadCsv } from "../utils/downloadUtils.js";

/**
 * HistoryTable — sortable + paginated table of analyses.
 */
export default function HistoryTable({ history, showUser = false, onDeleteRequest, deletingId, onViewRequest }) {
  const settingsCtx = useContext(SettingsContext);
  const pageSize = Number(settingsCtx?.itemsPerPage) || 10;
  const formatDate = settingsCtx?.formatDate || ((d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

  const [sortField, setSortField] = useState("date");
  const [sortDir,   setSortDir]   = useState("desc");
  const [page,      setPage]      = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    setPage(0);
  }, [history, pageSize]);

  const sorted = useMemo(() => {
    const mul = sortDir === "asc" ? 1 : -1;
    return [...(history || [])].sort((a, b) => {
      if (sortField === "date") {
        return mul * (new Date(a.created_at) - new Date(b.created_at));
      }
      if (sortField === "location") {
        return mul * (a.location_label || "").localeCompare(b.location_label || "");
      }
      if (sortField === "wasteType") {
        const typeA = getDetectionSummary(a.detections, a.boxes).topWasteType || "";
        const typeB = getDetectionSummary(b.detections, b.boxes).topWasteType || "";
        return mul * typeA.localeCompare(typeB);
      }
      if (sortField === "confidence") {
        const confA = getDetectionSummary(a.detections, a.boxes).confidence || 0;
        const confB = getDetectionSummary(b.detections, b.boxes).confidence || 0;
        return mul * (confA - confB);
      }
      if (sortField === "score") {
        return mul * ((a.pollution_score || 0) - (b.pollution_score || 0));
      }
      if (sortField === "severity") {
        const rankA = SEVERITY_RANKS[a.severity] ?? 0;
        const rankB = SEVERITY_RANKS[b.severity] ?? 0;
        return mul * (rankA - rankB);
      }
      return 0;
    });
  }, [history, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages - 1);
  const paged      = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setPage(0);
  }

  const sortIcon = (field) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const handleExportCSV = () => {
    const headers = ["ID", "Date", "Location", "Top Waste Type", "Score", "Severity"];
    const rows = sorted.map((r) => {
      const summary = getDetectionSummary(r.detections, r.boxes);
      const topWaste = summary.topWasteType ? formatWasteType(summary.topWasteType) : "Unknown";
      return [
        r.id,
        new Date(r.created_at).toISOString(),
        `"${r.location_label || ''}"`,
        `"${topWaste}"`,
        r.pollution_score || 0,
        r.severity || 'Low'
      ];
    });
    downloadCsv(headers, rows, `littora_analyses_${Date.now()}.csv`);
  };

  const handleDeleteClick = (id) => {
    if (onDeleteRequest) onDeleteRequest(id);
  };

  if (!history || history.length === 0) {
    return (
      <div className="history">
        <div className="empty-state history-empty-state">
          No analyses match the selected filter.
        </div>
      </div>
    );
  }

  return (
    <div className="history bg-surface border border-border rounded-2xl shadow-md overflow-hidden">
      <div className="table-header-row flex items-center justify-between p-4 sm:p-5 border-b border-border/60 flex-wrap gap-3">
        <div>
          <span className="table-title font-display text-base font-bold text-text-primary mr-2">Analysis Records</span>
          <span className="table-count text-xs text-text-muted font-medium">
            {sorted.length} {sorted.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="history-header-actions">
          <button
            type="button"
            className="export-btn flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary hover:text-white rounded-pill text-xs font-semibold transition-colors cursor-pointer"
            onClick={handleExportCSV}
            title="Export filtered records to CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th className="th-photo-col">Photo</th>
            <th
              className="th-sortable"
              onClick={() => toggleSort("date")}
              title="Click to sort by date"
            >
              Date{sortIcon("date")}
            </th>
            <th
              className="th-sortable"
              onClick={() => toggleSort("location")}
              title="Click to sort by location"
            >
              Location{sortIcon("location")}
            </th>
            <th
              className="th-sortable"
              onClick={() => toggleSort("wasteType")}
              title="Click to sort by top waste type"
            >
              Top Waste Type{sortIcon("wasteType")}
            </th>
            <th
              className="th-sortable"
              onClick={() => toggleSort("confidence")}
              title="Click to sort by AI detection confidence"
            >
              Confidence{sortIcon("confidence")}
            </th>
            <th
              className="th-sortable"
              onClick={() => toggleSort("score")}
              title="Click to sort by severity score"
            >
              Score{sortIcon("score")}
            </th>
            <th
              className="th-sortable"
              onClick={() => toggleSort("severity")}
              title="Click to sort by severity tier"
            >
              Severity{sortIcon("severity")}
            </th>
            {showUser && <th>User</th>}
            <th className="th-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((row) => {
            const summary = getDetectionSummary(row.detections, row.boxes);
            const topWasteLabel = summary.topWasteType ? formatWasteType(summary.topWasteType) : "None";
            const confLabel = summary.confidence != null ? `${Math.round(summary.confidence * 100)}%` : "—";

            return (
              <tr key={row.id}>
                <td>
                  {row.image_url ? (
                    <img
                      src={row.image_url}
                      alt="Beach analysis thumbnail"
                      className="thumb"
                      loading="lazy"
                      onClick={() => (onViewRequest ? onViewRequest(row) : setSelectedRow(row))}
                      title="Click to view detection"
                    />
                  ) : (
                    <div className="thumb-placeholder" title="No image">
                      —
                    </div>
                  )}
                </td>
                <td>
                  <span className="td-date">{formatDate(row.created_at)}</span>
                </td>
                <td>
                  <span className="td-location" title={row.location_label || ""}>
                    {row.location_label || "Unknown location"}
                  </span>
                </td>
                <td>
                  {summary.topWasteType ? (
                    <span className={`waste-badge waste-${summary.topWasteType.toLowerCase()}`}>
                      {topWasteLabel}
                    </span>
                  ) : (
                    <span className="table-null-dash">—</span>
                  )}
                </td>
                <td>
                  {summary.confidence != null ? (
                    <span className={summary.confidence >= 0.8 ? "confidence-high" : "confidence-med"}>
                      {confLabel}
                    </span>
                  ) : (
                    <span className="table-null-dash">—</span>
                  )}
                </td>
                <td>{row.pollution_score ?? 0}</td>
                <td>
                  <span className={`severity-badge severity-${(row.severity || "low").toLowerCase()}`}>
                    {row.severity || "Low"}
                  </span>
                </td>
                {showUser && (
                  <td>
                    <span
                      className="admin-card-user history-user-pill"
                      title={row.user_name ? `${row.user_name} (${row.user_email || ""})` : (row.user_email || row.user_id || "Anonymous")}
                    >
                      <User size={12} />
                      {row.user_name || row.user_email || (row.user_id ? row.user_id.slice(0, 8) + "…" : "Anon")}
                    </span>
                  </td>
                )}
                <td className="td-actions">
                  <div className="action-buttons-cell">
                    <button
                      className="action-btn action-view"
                      title="View Detection"
                      aria-label="View Detection"
                      onClick={() => onViewRequest ? onViewRequest(row) : setSelectedRow(row)}
                    >
                      <Eye size={16} />
                    </button>
                    {onDeleteRequest && (
                      <button
                        className="action-btn action-delete"
                        title="Delete Analysis"
                        aria-label="Delete Analysis"
                        disabled={deletingId === row.id}
                        onClick={() => handleDeleteClick(row.id)}
                      >
                        {deletingId === row.id
                          ? <Loader2 size={15} className="is-spinning" />
                          : <Trash2 size={15} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            ← Prev
          </button>
          <span className="page-info">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Detail Modal Preview using universal AnalysisLightbox ── */}
      <AnalysisLightbox
        item={selectedRow}
        showUser={showUser}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}
