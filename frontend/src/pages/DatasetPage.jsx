import { useState, useMemo } from "react";
import axios from "axios";
import { Download, Search, Filter, Database, MapPin, FileSpreadsheet, ExternalLink, Sparkles, Layers, ChevronDown } from "lucide-react";
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <Database size={24} className="text-primary shrink-0" />
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Data Explorer</h1>
        </div>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Browse and export research-ready coastal waste datasets with GIS coordinates and Roboflow training data.
        </p>
      </div>

      {/* Dataset Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div>
        <SectionHeader
          title="Available Datasets"
          subtitle="Machine-learning annotations and geospatial feature collections"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-surface text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-text-muted transition-all"
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative flex items-center">
          <select
            className="w-full sm:w-auto pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-surface text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-all appearance-none"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="ALL">All Formats</option>
            <option value="ROBOFLOW">Roboflow / YOLO</option>
            <option value="GEOJSON">GeoJSON</option>
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-md">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-bg-secondary/50 text-text-secondary border-b border-border text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 font-semibold">Dataset Name</th>
                <th className="px-4 py-3 font-semibold">Records</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Format</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs sm:text-sm text-text-muted">
                    No matching datasets found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-bg-secondary/30 transition-colors">
                    <td className="px-4 py-3.5 text-text-primary align-middle">
                      <div className="flex items-center gap-2 font-bold text-text-primary text-xs sm:text-sm font-display">
                        {d.format === "GEOJSON" && <MapPin size={14} className="text-sky-500 shrink-0" />}
                        {d.format === "CSV" && <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />}
                        {d.format === "ROBOFLOW" && <Database size={14} className="text-purple-500 shrink-0" />}
                        <span>{d.name}</span>
                      </div>
                      {d.description && (
                        <div className="text-xs text-text-muted mt-1 max-w-lg leading-relaxed">
                          {d.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-text-primary align-middle font-mono text-xs">{d.records.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-text-secondary align-middle font-mono text-xs">{d.size}</td>
                    <td className="px-4 py-3.5 text-text-primary align-middle">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-[11px] font-bold ${
                          d.format === "GEOJSON"
                            ? "bg-sky-500/15 text-sky-500 border border-sky-500/30"
                            : d.format === "ROBOFLOW"
                            ? "bg-purple-500/15 text-purple-500 border border-purple-500/30"
                            : "bg-primary/15 text-primary border border-primary/30"
                        }`}
                      >
                        {d.format}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted align-middle text-xs font-medium">{d.updated}</td>
                    <td className="px-4 py-3.5 text-text-primary align-middle">
                      {d.isExternal ? (
                        <a
                          href={d.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <ExternalLink size={13} /> View
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
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
    </div>
  );
}
