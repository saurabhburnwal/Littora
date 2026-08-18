import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Leaf, Download, Trash2, Bell, Globe, CalendarDays, List, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const {
    language,    setLanguage,
    dateFormat,  setDateFormat,
    itemsPerPage, setItemsPerPage,
    notifications, setNotifications,
  } = useSettings();
  const { getToken, logout, user } = useAuth();

  // --- Pending (unsaved) local state ---
  const [pendingTheme,       setPendingTheme]       = useState(theme);
  const [pendingLanguage,    setPendingLanguage]     = useState(language);
  const [pendingDateFormat,  setPendingDateFormat]   = useState(dateFormat);
  const [pendingIPP,         setPendingIPP]          = useState(String(itemsPerPage));
  const [pendingNotifs,      setPendingNotifs]       = useState({ ...notifications });

  // --- UI state ---
  const [saved,          setSaved]          = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [exportDone,     setExportDone]     = useState(false);
  const [deleteModal,    setDeleteModal]    = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState(null);
  const [toast,          setToast]          = useState(null); // { type, message }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const hasChanges =
    pendingTheme      !== theme                          ||
    pendingLanguage   !== language                       ||
    pendingDateFormat !== dateFormat                     ||
    Number(pendingIPP) !== Number(itemsPerPage)          ||
    JSON.stringify(pendingNotifs) !== JSON.stringify(notifications);

  const handleSave = () => {
    setTheme(pendingTheme);
    setLanguage(pendingLanguage);
    setDateFormat(pendingDateFormat);
    setItemsPerPage(Number(pendingIPP));
    setNotifications(pendingNotifs);
    setSaved(true);
    showToast("success", "Settings saved successfully!");
    setTimeout(() => setSaved(false), 3000);
  };

  // --- Export: download all user analyses as JSON ---
  const handleExport = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setExporting(true);
    setExportDone(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/my-analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `littora-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDone(true);
      showToast("success", "Data exported successfully!");
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      showToast("error", "Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // --- Delete Account ---
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Sign out client-side; actual deletion requires server-side admin action
      await supabase.auth.signOut();
      await logout();
    } catch (err) {
      setDeleteError(err.message || "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your preferences, notifications and account.</p>
        </div>
        {hasChanges && (
          <div style={{ fontSize: "0.78rem", color: "var(--amber)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <AlertTriangle size={14} /> Unsaved changes
          </div>
        )}
      </div>

      {!user && (
        <div className="guest-preview-banner" style={{
          background: "linear-gradient(135deg, rgba(47, 111, 94, 0.12) 0%, rgba(212, 146, 75, 0.12) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div>
            <h4 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
              👋 Guest Preferences Mode
            </h4>
            <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--muted)" }}>
              Theme, language, and display settings are saved locally in your browser. Sign in to sync preferences across devices, export data, and manage account settings.
            </p>
          </div>
          <button
            className="filter-btn-apply"
            onClick={() => navigate("/login")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
          >
            Sign In / Register
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* General Settings */}
          <div className="settings-section">
            <div className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Globe size={15} /> General Settings
            </div>

            {/* Theme */}
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Theme</div>
                <div className="settings-row-desc">Choose your preferred interface theme</div>
              </div>
              <div className="theme-options">
                <button
                  type="button"
                  className={`theme-option${pendingTheme === "earth" ? " active" : ""}`}
                  onClick={() => setPendingTheme("earth")}
                  aria-label="Select Earth theme"
                >
                  <Leaf size={14} /> Earth
                </button>
                <button
                  type="button"
                  className={`theme-option${pendingTheme === "dark" ? " active" : ""}`}
                  onClick={() => setPendingTheme("dark")}
                  aria-label="Select Dark theme"
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Language</div>
                <div className="settings-row-desc">Interface language</div>
              </div>
              <select
                id="settings-language"
                className="filter-select"
                value={pendingLanguage}
                onChange={(e) => setPendingLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            {/* Date Format */}
            <div className="settings-row">
              <div>
                <div className="settings-row-label">
                  <CalendarDays size={13} style={{ marginRight: "0.3rem", verticalAlign: "middle" }} />
                  Date Format
                </div>
                <div className="settings-row-desc">How dates are displayed across the app</div>
              </div>
              <select
                id="settings-dateformat"
                className="filter-select"
                value={pendingDateFormat}
                onChange={(e) => setPendingDateFormat(e.target.value)}
              >
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            {/* Items per page */}
            <div className="settings-row">
              <div>
                <div className="settings-row-label">
                  <List size={13} style={{ marginRight: "0.3rem", verticalAlign: "middle" }} />
                  Items per page
                </div>
                <div className="settings-row-desc">Rows shown in history and table views</div>
              </div>
              <select
                id="settings-ipp"
                className="filter-select"
                value={pendingIPP}
                onChange={(e) => setPendingIPP(e.target.value)}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          {/* Save button */}
          <button
            id="settings-save-btn"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : "Save Changes"}
          </button>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {user ? (
            <>
              {/* Notification Preferences */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Bell size={15} /> Notification Preferences
                </div>

                {[
                  { key: "email",         label: "Email Notifications",  desc: "Receive email updates on new analyses" },
                  { key: "highPollution", label: "High-Pollution Alerts", desc: "Get alerted when severity is High or Severe" },
                  { key: "weekly",        label: "Weekly Reports",        desc: "Receive a weekly summary of beach data" },
                ].map((n) => (
                  <div key={n.key} className="settings-row">
                    <div>
                      <div className="settings-row-label">{n.label}</div>
                      <div className="settings-row-desc">{n.desc}</div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={pendingNotifs[n.key]}
                        onChange={(e) =>
                          setPendingNotifs((prev) => ({ ...prev, [n.key]: e.target.checked }))
                        }
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              {/* Data & Privacy */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Trash2 size={15} /> Data &amp; Privacy
                </div>

                {/* Export */}
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Export My Data</div>
                    <div className="settings-row-desc">Download all your analyses as JSON</div>
                  </div>
                  <button
                    id="settings-export-btn"
                    className="export-btn"
                    onClick={handleExport}
                    disabled={exporting}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {exporting ? (
                      <><span className="login-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Exporting…</>
                    ) : exportDone ? (
                      <><CheckCircle size={13} /> Done!</>
                    ) : (
                      <><Download size={13} /> Export</>
                    )}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label" style={{ color: "var(--rose)" }}>Delete Account</div>
                    <div className="settings-row-desc">Sign out and request permanent account deletion</div>
                  </div>
                  <button
                    id="settings-delete-btn"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--rose)",
                      color: "var(--rose)",
                      borderRadius: "8px",
                      padding: "0.35rem 0.85rem",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      transition: "background 0.15s",
                    }}
                    onClick={() => setDeleteModal(true)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="settings-section" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                background: "rgba(47, 111, 94, 0.12)", color: "var(--teal)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1rem"
              }}>
                <Bell size={24} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ink)" }}>
                Account &amp; Notification Settings
              </h3>
              <p style={{ margin: "0 auto 1.25rem", fontSize: "0.85rem", color: "var(--muted)", maxWidth: "340px" }}>
                Notification preferences and data export features are available to signed-in accounts. Sign in to enable email notifications and export your detection data.
              </p>
              <button
                className="filter-btn-apply"
                onClick={() => navigate("/login")}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                Sign In to Unlock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal && (
        <div className="admin-modal-backdrop" onClick={() => !deleting && setDeleteModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-icon">
              <AlertTriangle size={36} style={{ color: "#dc2626" }} />
            </div>
            <h2 className="admin-modal-title">Delete your account?</h2>
            <p className="admin-modal-body">
              This will sign you out immediately. To permanently delete your account and all data,
              please contact the system administrator after signing out.
              <br /><br />
              <strong>This cannot be undone.</strong>
            </p>
            {deleteError && (
              <p style={{ color: "var(--rose)", fontSize: "0.82rem", marginBottom: "1rem" }}>{deleteError}</p>
            )}
            <div className="admin-modal-actions">
              <button
                className="admin-modal-cancel"
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <X size={14} /> Cancel
              </button>
              <button
                id="settings-confirm-delete-btn"
                className="admin-modal-delete"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Signing out…" : <><Trash2 size={14} /> Yes, delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
