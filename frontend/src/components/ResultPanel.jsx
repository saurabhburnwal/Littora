import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Map, Download, FileJson, ShieldCheck, MoreHorizontal, User } from "lucide-react";
import {
  formatWasteType,
  getActionStatus,
  getPerClassConfidences,
} from "../utils/wasteUtils.js";
import { downloadJson, downloadFileUrl } from "../utils/downloadUtils.js";

export default function ResultPanel({ result, showUser = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const {
    id,
    total_waste = 0,
    pollution_score = 0,
    severity = "Low",
    location_label,
    latitude,
    longitude,
    created_at,
    image_url,
    user_name,
    user_email,
    user_id,
    boxes = [],
  } = result || {};

  const actionStatus = getActionStatus(pollution_score, severity);

  const perClassItems = useMemo(() => {
    return getPerClassConfidences(result?.detections, boxes);
  }, [result?.detections, boxes]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleExportJSON = () => {
    downloadJson(result, `littora_analysis_${id || Date.now()}.json`);
    setMenuOpen(false);
  };

  const handleDownloadImage = () => {
    if (!image_url) return;
    downloadFileUrl(image_url, `littora_photo_${id || Date.now()}.jpg`);
    setMenuOpen(false);
  };

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const uploaderText = user_name || user_email || (user_id ? user_id.slice(0, 10) + "…" : null);
  const itemCountLabel = total_waste === 1 ? "1 waste item" : `${total_waste} waste items`;

  return (
    <div className="flex flex-col gap-4 p-5 bg-surface border border-border rounded-2xl shadow-md">
      {/* 1. Header: Location & Date */}
      <div className="flex flex-col gap-1 pb-3 border-b border-border/50">
        <h2 className="font-display text-base font-bold text-text-primary flex items-center gap-1.5 truncate" title={location_label || "Location unavailable"}>
          <MapPin size={16} className="text-primary shrink-0" />
          <span className="truncate">{location_label || "Location unavailable"}</span>
        </h2>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Calendar size={13} />
          <span>{formattedDate}</span>
          {showUser && uploaderText && (
            <>
              <span>·</span>
              <User size={12} />
              <span title={user_email || user_id}>{uploaderText}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Core Metrics: Severity, Score & Action Status */}
      <div className="bg-bg-secondary/40 border border-border/60 rounded-xl p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`severity-badge severity-${severity.toLowerCase()} px-2.5 py-0.5 rounded-pill text-xs font-bold`}>
              {severity}
            </span>
            <span className="text-xs text-text-secondary">
              Score: <strong className="font-bold text-text-primary">{pollution_score}</strong>
            </span>
          </div>
          <span className="text-xs font-semibold text-text-muted">{itemCountLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text-secondary pt-1 border-t border-border/40">
          <ShieldCheck size={13} className="text-primary" />
          <span className="text-text-muted">Action status:</span>
          <span className="font-semibold text-text-primary">{actionStatus}</span>
        </div>
      </div>

      {/* 3. Detected Waste List */}
      <div className="flex flex-col gap-2">
        <div className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">Detected Waste</div>
        {perClassItems.length > 0 ? (
          <div className="space-y-1.5">
            {perClassItems.map((item) => (
              <div key={item.type} className="flex items-center justify-between p-2 rounded-lg bg-bg-secondary/30 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`waste-badge waste-${item.type.toLowerCase()} px-2 py-0.5 rounded-pill text-xs font-semibold`}>
                    {item.label}
                  </span>
                  <span className="font-bold text-text-muted">×{item.count}</span>
                </div>
                <span className="text-text-muted font-medium">
                  {item.confidence != null ? `${Math.round(item.confidence * 100)}% confidence` : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic py-2">No specific debris classes cataloged.</p>
        )}
      </div>

      {/* 4. Action Buttons Bar: Primary Map + Secondary Menu */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
        {latitude && longitude ? (
          <Link
            to="/map"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-pill transition-colors shadow-sm"
            title="View hotspot location on Pollution Map"
          >
            <Map size={14} />
            View on Map
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className={`p-2 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer ${menuOpen ? "active bg-bg-secondary text-text-primary" : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            title="More actions"
            aria-label="More actions"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-44 bg-surface border border-border rounded-xl shadow-xl p-1.5 z-30" role="menu">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer"
                onClick={handleExportJSON}
                role="menuitem"
              >
                <FileJson size={14} />
                Export JSON
              </button>
              {image_url && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer"
                  onClick={handleDownloadImage}
                  role="menuitem"
                >
                  <Download size={14} />
                  Download Photo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
