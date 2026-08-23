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
    <div className="detection-detail-panel">
      {/* 1. Header: Location & Date */}
      <div className="detail-header-block">
        <h2 className="detail-location-title" title={location_label || "Location unavailable"}>
          <MapPin size={16} className="detail-loc-icon" />
          {location_label || "Location unavailable"}
        </h2>
        <div className="detail-date-line">
          <Calendar size={13} />
          <span>{formattedDate}</span>
          {showUser && uploaderText && (
            <>
              <span className="detail-dot-separator">·</span>
              <User size={12} />
              <span title={user_email || user_id}>{uploaderText}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Core Metrics: Severity, Score & Action Status */}
      <div className="detail-metrics-card">
        <div className="detail-metrics-row">
          <div className="detail-severity-pill-wrap">
            <span className={`severity-badge severity-${severity.toLowerCase()}`}>
              {severity}
            </span>
            <span className="detail-score-text">
              Score: <strong>{pollution_score}</strong>
            </span>
          </div>
          <span className="detail-item-count">{itemCountLabel}</span>
        </div>

        <div className="detail-action-status-line">
          <ShieldCheck size={13} className="detail-shield-icon" />
          <span className="detail-action-lbl">Action status:</span>
          <span className="detail-action-val">{actionStatus}</span>
        </div>
      </div>

      {/* 3. Detected Waste List */}
      <div className="detail-waste-section">
        <div className="detail-waste-title">Detected Waste</div>
        {perClassItems.length > 0 ? (
          <div className="detail-waste-list">
            {perClassItems.map((item) => (
              <div key={item.type} className="detail-waste-row">
                <div className="detail-waste-name-wrap">
                  <span className={`waste-badge waste-${item.type.toLowerCase()}`}>
                    {item.label}
                  </span>
                  <span className="detail-waste-count">×{item.count}</span>
                </div>
                <span className="detail-waste-confidence">
                  {item.confidence != null ? `${Math.round(item.confidence * 100)}% confidence` : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="detail-empty-detections">No specific debris classes cataloged.</p>
        )}
      </div>

      {/* 4. Action Buttons Bar: Primary Map + Secondary Menu */}
      <div className="detail-actions-footer">
        {latitude && longitude ? (
          <Link
            to="/map"
            className="detail-primary-action-btn"
            title="View hotspot location on Pollution Map"
          >
            <Map size={14} />
            View on Map
          </Link>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        <div className="detail-more-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className={`detail-more-trigger ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            title="More actions"
            aria-label="More actions"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="detail-more-dropdown" role="menu">
              <button
                type="button"
                className="detail-dropdown-item"
                onClick={handleExportJSON}
                role="menuitem"
              >
                <FileJson size={14} />
                Export JSON
              </button>
              {image_url && (
                <button
                  type="button"
                  className="detail-dropdown-item"
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
