import { useState, useMemo } from "react";
import axios from "axios";
import { Download, Search, Filter, Database, MapPin, FileSpreadsheet, ExternalLink, Sparkles, Layers } from "lucide-react";
import { useStats } from "../context/StatsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import MetricCard from "../components/ui/MetricCard.jsx";
import Badge from "../components/ui/Badge.jsx";
import { API_BASE } from "../utils/wasteUtils.js";
import { downloadBlob, downloadJson } from "../utils/downloadUtils.js";

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
        name: "Littora Beach Waste YOLO Training Dataset",
        records: 9403,
        size: "1.4 GB",
        format: "ROBOFLOW",
        updated: "Latest (v2)",
        isExternal: true,
        externalUrl: ROBOFLOW_URL,
        description: "Official Roboflow workspace with 9,403 annotated training images (3,933 raw images) formatted for YOLOv8, YOLOv11, and YOLOv26.",
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
        downloadBlob(blob, dataset.filename);
      } else {
        // Local JSON export
        downloadJson(
          {
            dataset: dataset.name,
            user: user?.email,
            exported_at: new Date().toISOString(),
            total_records: stats.totalAnalyses,
            total_waste: stats.totalWasteAllTime,
            history: stats.history || [],
          },
          dataset.filename || "dataset.json"
        );
      }
    } catch (err) {
      console.error("Dataset download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-heading">
        <div className="dataset-heading-title">
          <Database size={22} className="dataset-heading-icon" />
          <h1>Data Explorer</h1>
        </div>
        <p>
          Browse and export research-ready coastal waste datasets with GIS coordinates and Roboflow training data.
        </p>
      </div>

      {/* Dataset Metrics */}
      <div className="kpi-stats-grid">
        <MetricCard
          label="Catalog Records"
          value={(stats.totalAnalyses || 0).toLocaleString()}
          icon={<Database size={18} />}
          subtext="Telemetry Points"
        />
        <MetricCard
          label="Training Images"
          value="9,403"
          icon={<Sparkles size={18} />}
          subtext="YOLO Annotations"
        />
        <MetricCard
          label="Debris Items"
          value={(stats.totalWasteAllTime || 0).toLocaleString()}
          icon={<Layers size={18} />}
          subtext="Classified Objects"
        />
        <MetricCard
          label="Export Formats"
          value="4"
          icon={<FileSpreadsheet size={18} />}
          subtext="GeoJSON, CSV, JSON, YOLO"
        />
      </div>

      {/* Section Header & Toolbar */}
      <div className="section-header-wrap">
        <SectionHeader
          title="Available Datasets"
          subtitle="Machine-learning annotations and geospatial feature collections"
        />
      </div>

      <div className="dataset-toolbar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            className="search-input dataset-search-input"
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="dataset-filter-group">
          <Filter size={14} className="dataset-filter-icon" />
          <select
            className="filter-select dataset-filter-select"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="ALL">All Formats</option>
            <option value="ROBOFLOW">Roboflow / YOLO</option>
            <option value="GEOJSON">GeoJSON</option>
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
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
                <td colSpan={6} className="history-empty-state">
                  No matching datasets found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="dataset-title-row">
                      {d.format === "GEOJSON" && <MapPin size={14} className="dataset-icon--geojson" />}
                      {d.format === "CSV" && <FileSpreadsheet size={14} className="dataset-icon--csv" />}
                      {d.format === "ROBOFLOW" && <Database size={14} className="dataset-icon--roboflow" />}
                      <span>{d.name}</span>
                    </div>
                    {d.description && (
                      <div className="dataset-desc">
                        {d.description}
                      </div>
                    )}
                  </td>
                  <td>{d.records.toLocaleString()}</td>
                  <td className="dataset-table-size">{d.size}</td>
                  <td>
                    <span
                      className={`waste-badge ${
                        d.format === "GEOJSON"
                          ? "waste-badge--geojson"
                          : d.format === "ROBOFLOW"
                          ? "waste-badge--roboflow"
                          : "waste-badge--default"
                      }`}
                    >
                      {d.format}
                    </span>
                  </td>
                  <td className="dataset-table-updated">{d.updated}</td>
                  <td>
                    {d.isExternal ? (
                      <a
                        href={d.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="export-btn dataset-action-btn"
                      >
                        <ExternalLink size={13} /> View
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="export-btn dataset-action-btn"
                        onClick={() => handleDownload(d)}
                        disabled={downloadingId === d.id}
                      >
                        <Download size={13} />
                        {downloadingId === d.id ? "Downloading..." : "Export"}
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
