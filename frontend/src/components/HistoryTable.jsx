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
      <div className="bg-surface border border-border rounded-2xl shadow-md overflow-hidden p-8 text-center text-sm text-text-muted">
        No analyses match the selected filter.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-md overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 flex-wrap gap-3">
        <div>
          <span className="font-display text-base font-bold text-text-primary mr-2">Analysis Records</span>
          <span className="text-xs text-text-muted font-medium">
            {sorted.length} {sorted.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary hover:text-white rounded-pill text-xs font-semibold transition-colors cursor-pointer"
            onClick={handleExportCSV}
            title="Export filtered records to CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="bg-bg-secondary/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3 font-semibold">Photo</th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                onClick={() => toggleSort("date")}
                title="Click to sort by date"
              >
                Date{sortIcon("date")}
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                onClick={() => toggleSort("location")}
                title="Click to sort by location"
              >
                Location{sortIcon("location")}
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                onClick={() => toggleSort("wasteType")}
                title="Click to sort by top waste type"
              >
                Top Waste Type{sortIcon("wasteType")}
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                onClick={() => toggleSort("confidence")}
                title="Click to sort by AI detection confidence"
              >
                Confidence{sortIcon("confidence")}
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                onClick={() => toggleSort("score")}
                title="Click to sort by severity score"
              >
                Score{sortIcon("score")}
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                onClick={() => toggleSort("severity")}
                title="Click to sort by severity tier"
              >
                Severity{sortIcon("severity")}
              </th>
              {showUser && <th className="px-4 py-3 font-semibold">User</th>}
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paged.map((row) => {
              const summary = getDetectionSummary(row.detections, row.boxes);
              const topWasteLabel = summary.topWasteType ? formatWasteType(summary.topWasteType) : "None";
              const confLabel = summary.confidence != null ? `${Math.round(summary.confidence * 100)}%` : "—";

              return (
                <tr key={row.id} className="hover:bg-bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-text-primary align-middle">
                    {row.image_url ? (
                      <img
                        src={row.image_url}
                        alt="Beach analysis thumbnail"
                        className="w-12 h-12 rounded-xl object-cover border border-border/60 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                        loading="lazy"
                        onClick={() => (onViewRequest ? onViewRequest(row) : setSelectedRow(row))}
                        title="Click to view detection"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-text-muted text-xs border border-border/60" title="No image">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-primary align-middle">
                    <span className="text-xs text-text-muted font-mono">{formatDate(row.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-text-primary align-middle">
                    <span className="font-medium text-text-primary max-w-[180px] truncate block" title={row.location_label || ""}>
                      {row.location_label || "Unknown location"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-primary align-middle">
                    {summary.topWasteType ? (
                      <span className={`waste-badge waste-${summary.topWasteType.toLowerCase()} px-2 py-0.5 rounded-pill text-xs font-semibold`}>
                        {topWasteLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-primary align-middle">
                    {summary.confidence != null ? (
                      <span className={summary.confidence >= 0.8 ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                        {confLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-primary align-middle font-medium">{row.pollution_score ?? 0}</td>
                  <td className="px-4 py-3 text-text-primary align-middle">
                    <span className={`severity-badge severity-${(row.severity || "low").toLowerCase()} px-2.5 py-0.5 rounded-pill text-xs font-bold`}>
                      {row.severity || "Low"}
                    </span>
                  </td>
                  {showUser && (
                    <td className="px-4 py-3 text-text-primary align-middle">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-bg-secondary/70 text-text-secondary text-xs border border-border/50 max-w-[140px] truncate"
                        title={row.user_name ? `${row.user_name} (${row.user_email || ""})` : (row.user_email || row.user_id || "Anonymous")}
                      >
                        <User size={12} />
                        {row.user_name || row.user_email || (row.user_id ? row.user_id.slice(0, 8) + "…" : "Anon")}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-text-primary align-middle">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="View Detection"
                        aria-label="View Detection"
                        onClick={() => onViewRequest ? onViewRequest(row) : setSelectedRow(row)}
                      >
                        <Eye size={16} />
                      </button>
                      {onDeleteRequest && (
                        <button
                          className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Delete Analysis"
                          aria-label="Delete Analysis"
                          disabled={deletingId === row.id}
                          onClick={() => handleDeleteClick(row.id)}
                        >
                          {deletingId === row.id
                            ? <Loader2 size={15} className="animate-spin" />
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
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-bg-secondary/20">
          <button
            type="button"
            className="px-3 py-1.5 rounded-pill text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            ← Prev
          </button>
          <span className="text-xs text-text-muted font-medium">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="px-3 py-1.5 rounded-pill text-xs font-semibold bg-surface border border-border text-text-primary hover:bg-bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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
