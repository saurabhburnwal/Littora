import { useState, useMemo } from "react";
import axios from "axios";
import { Download, Search, Filter, Database, MapPin, FileSpreadsheet, ExternalLink } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const ROBOFLOW_URL = "https://app.roboflow.com/kuhelis-workspace-kt5yi/littora-beach-waste-1/2";

export default function DatasetPage() {
  const { stats } = useStats();
  const { user, isAdmin, getToken } = useAuth();
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [downloadingId, setDownloadingId] = useState(null);

  const datasets = useMemo(() => {
    const userRecordsCount = stats.totalAnalyses || 0;
    const userEmail = user?.email || "user";

    const baseList = [
      {
        id: "geojson-export",
        name: "Coastal Debris GeoJSON Map Points",
        records: userRecordsCount,
        size: `${Math.max(0.1, userRecordsCount * 0.18).toFixed(1)} MB`,
        format: "GEOJSON",
        updated: "Live",
        isServerEndpoint: true,
        endpoint: "/api/dataset.geojson",
        filename: "littora_coastal_debris.geojson",
        description: "GIS FeatureCollection format for QGIS, ArcGIS, and Google Earth.",
      },
      {
        id: "csv-export",
        name: "Standardized Marine Litter Dataset (CSV)",
        records: userRecordsCount,
        size: `${Math.max(0.1, userRecordsCount * 0.12).toFixed(1)} MB`,
        format: "CSV",
        updated: "Live",
        isServerEndpoint: true,
        endpoint: "/api/dataset.csv",
        filename: "littora_marine_litter_dataset.csv",
        description: "Tabular dataset with coordinates, severity metrics, and debris counts.",
      },
      {
        id: "roboflow-v2",
        name: "Littora Beach Waste YOLOv8 Training Dataset",
        records: 24820,
        size: "2.1 GB",
        format: "ROBOFLOW",
        updated: "Latest (v2)",
        isExternal: true,
        externalUrl: ROBOFLOW_URL,
        description: "Official Roboflow workspace with 24,820 annotated images, augmentations, and YOLOv8 exports.",
      },
    ];

    if (isAdmin) {
      return [
        ...baseList,
        {
          id: "all-json",
          name: "Global Coastal Waste JSON Export",
          records: userRecordsCount,
          size: `${(userRecordsCount * 0.22).toFixed(1)} MB`,
          format: "JSON",
          updated: "Today",
          isServerEndpoint: false,
          filename: "global_waste_dump.json",
          description: "Raw JSON dump of all platform analyses and detections.",
        },
      ];
    } else {
      return [
        ...baseList,
        {
          id: "my-json",
          name: `Detection History Export (${userEmail})`,
          records: userRecordsCount,
          size: `${(userRecordsCount * 0.18).toFixed(1)} MB`,
          format: "JSON",
          updated: "Today",
          isServerEndpoint: false,
          filename: "my_history.json",
          description: "Personal scan history and detection breakdown.",
        },
      ];
    }
  }, [stats.totalAnalyses, user, isAdmin]);

  const filtered = datasets.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
    const matchesFormat = formatFilter === "ALL" || d.format === formatFilter;
    return matchesSearch && matchesFormat;
  });

  const handleDownload = async (dataset) => {
    if (dataset.isExternal) {
      window.open(dataset.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setDownloadingId(dataset.id);
    try {
      if (dataset.isServerEndpoint) {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}${dataset.endpoint}`, {
          headers,
          responseType: "blob",
        });

        const blob = new Blob([res.data], {
          type: res.headers["content-type"] || "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = dataset.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Fallback local JSON generator
        const content = JSON.stringify(
          {
            dataset: dataset.name,
            user: user?.email,
            exported_at: new Date().toISOString(),
            total_records: stats.totalAnalyses,
            total_waste: stats.totalWasteAllTime,
            history: stats.history || [],
          },
          null,
          2
        );
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = dataset.filename || "dataset.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Dataset download failed:", err);
      alert("Failed to download dataset. Please check your connection and login status.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Database size={22} style={{ color: "var(--teal)" }} />
          <h1 style={{ margin: 0 }}>Dataset Explorer &amp; Open Exports</h1>
        </div>
        <p>
          {isAdmin
            ? "Admin View — Export global coastal research datasets in GeoJSON, CSV, and Roboflow training packages."
            : "Browse and export research-ready coastal waste datasets with GIS coordinates and Roboflow training data."}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "260px" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Filter size={14} style={{ color: "var(--muted)" }} />
          <select
            className="filter-select"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--ink)", fontSize: "0.85rem" }}
          >
            <option value="ALL">All Formats</option>
            <option value="ROBOFLOW">Roboflow / YOLO</option>
            <option value="GEOJSON">GeoJSON</option>
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
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
              <th>Status</th>
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
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      {d.format === "GEOJSON" && <MapPin size={14} style={{ color: "var(--teal)" }} />}
                      {d.format === "CSV" && <FileSpreadsheet size={14} style={{ color: "#F59E0B" }} />}
                      {d.format === "ROBOFLOW" && <Database size={14} style={{ color: "var(--teal)" }} />}
                      <span>{d.name}</span>
                    </div>
                    {d.description && (
                      <div style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: "2px" }}>
                        {d.description}
                      </div>
                    )}
                  </td>
                  <td>{d.records.toLocaleString()}</td>
                  <td style={{ color: "var(--muted)" }}>{d.size}</td>
                  <td>
                    <span
                      className="waste-badge"
                      style={{
                        background:
                          d.format === "GEOJSON"
                            ? "rgba(14, 140, 134, 0.15)"
                            : d.format === "ROBOFLOW"
                            ? "rgba(168, 85, 247, 0.15)"
                            : "var(--sand-dark)",
                        color:
                          d.format === "GEOJSON"
                            ? "var(--teal)"
                            : d.format === "ROBOFLOW"
                            ? "#9333EA"
                            : "var(--ink)",
                        fontWeight: 700,
                      }}
                    >
                      {d.format}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{d.updated}</td>
                  <td>
                    {d.isExternal ? (
                      <a
                        href={d.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="export-btn"
                        style={{
                          fontSize: "0.73rem",
                          padding: "0.35rem 0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={13} />
                        Open in Roboflow
                      </a>
                    ) : (
                      <button
                        className="export-btn"
                        style={{
                          fontSize: "0.73rem",
                          padding: "0.35rem 0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                        disabled={downloadingId === d.id}
                        onClick={() => handleDownload(d)}
                      >
                        <Download size={13} />
                        {downloadingId === d.id ? "Downloading…" : `Export ${d.format}`}
                      </button>
                    )}
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
