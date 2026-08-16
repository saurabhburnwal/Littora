import { useState, useMemo } from "react";
import { Download, Search, Filter, Database } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DatasetPage() {
  const { stats } = useStats();
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("ALL");

  const datasets = useMemo(() => {
    const userRecordsCount = stats.totalAnalyses || 0;
    const userWasteCount = stats.totalWasteAllTime || 0;
    const userEmail = user?.email || "user";

    if (isAdmin) {
      return [
        { id: "1", name: "All System Uploads Dataset", records: userRecordsCount, size: `${(userRecordsCount * 0.15).toFixed(1)} MB`, format: "CSV", updated: "Today", isMyData: true },
        { id: "2", name: "Global Coastal Waste JSON Export", records: userRecordsCount, size: `${(userRecordsCount * 0.22).toFixed(1)} MB`, format: "JSON", updated: "Today", isMyData: true },
        { id: "3", name: "Public Training Dataset v2", records: 24820, size: "2.1 GB", format: "ZIP", updated: "15 Jun 2026", isMyData: false },
      ];
    } else {
      return [
        { id: "1", name: `My Uploads Dataset (${userEmail})`, records: userRecordsCount, size: `${(userRecordsCount * 0.12).toFixed(1)} MB`, format: "CSV", updated: "Today", isMyData: true },
        { id: "2", name: `My Detection History Export`, records: userRecordsCount, size: `${(userRecordsCount * 0.18).toFixed(1)} MB`, format: "JSON", updated: "Today", isMyData: true },
      ];
    }
  }, [stats.totalAnalyses, stats.totalWasteAllTime, user, isAdmin]);

  const filtered = datasets.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesFormat = formatFilter === "ALL" || d.format === formatFilter;
    return matchesSearch && matchesFormat;
  });

  const handleExport = (dataset) => {
    let content = "";
    let mimeType = "text/plain";
    let extension = "txt";

    if (dataset.format === "JSON") {
      content = JSON.stringify({
        dataset: dataset.name,
        user: user?.email,
        exported_at: new Date().toISOString(),
        total_records: stats.totalAnalyses,
        total_waste: stats.totalWasteAllTime,
        history: stats.history || []
      }, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      content = `Analysis_ID,Created_At,Total_Waste,Pollution_Score,Severity,Location\n`;
      (stats.history || []).forEach(row => {
        content += `"${row.id}","${row.created_at}",${row.total_waste || 0},${row.pollution_score || 0},"${row.severity || 'Low'}","${row.location_label || 'Beach Site'}"\n`;
      });
      if (!stats.history || stats.history.length === 0) {
        content += `Sample_1,"${new Date().toISOString()}",5,12,"Moderate","Sample Beach Zone A"\n`;
      }
      mimeType = "text/csv";
      extension = "csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Database size={22} style={{ color: "var(--teal)" }} />
          <h1 style={{ margin: 0 }}>Dataset Explorer</h1>
        </div>
        <p>
          {isAdmin
            ? "Admin View — Browse and export global system-wide waste datasets."
            : "Browse and export datasets of your uploaded beach waste detections."
          }
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '260px' }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Filter size={14} style={{ color: "var(--muted)" }} />
          <select
            className="filter-select"
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value)}
            style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--ink)", fontSize: "0.85rem" }}
          >
            <option value="ALL">All Formats</option>
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
            <option value="ZIP">ZIP</option>
          </select>
        </div>
      </div>

      <div className="history">
        <table>
          <thead>
            <tr>
              <th>Dataset Name</th>
              <th>Records</th>
              <th>Size</th>
              <th>Format</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  No matching datasets found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td>{d.records.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted)' }}>{d.size}</td>
                  <td>
                    <span className="waste-badge waste-plastic" style={{ background: 'var(--sand-dark)', color: 'var(--ink)' }}>
                      {d.format}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{d.updated}</td>
                  <td>
                    <button
                      className="export-btn"
                      style={{ fontSize: '0.73rem', padding: '0.3rem 0.7rem', display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      onClick={() => handleExport(d)}
                    >
                      <Download size={12} />
                      Export My Dataset
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
