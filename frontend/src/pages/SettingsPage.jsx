import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Leaf, Download, Trash2, Bell, Globe, CalendarDays, List, CheckCircle, AlertTriangle } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ToastNotification from "../components/ToastNotification.jsx";
import { API_BASE } from "../utils/constants.js";
import { downloadJson } from "../utils/downloadUtils.js";

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
      downloadJson(data, `littora-data-${new Date().toISOString().slice(0, 10)}.json`);
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
    try {
      await supabase.auth.signOut();
      logout();
      navigate("/login");
    } catch (err) {
      showToast("error", err.message || "Failed to sign out.");
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Preferences &amp; Settings</h1>
        <p>Manage your display preferences, notifications, data export, and account.</p>
      </div>

      {!user && (
        <div className="guest-preference-banner" style={{ background: "rgba(14, 140, 134, 0.08)", border: "1px solid rgba(14, 140, 134, 0.2)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--teal)" }}>👋 Guest Preferences Mode</h3>
          <p style={{ fontSize: "0.84rem", color: "var(--muted)", margin: "0.35rem 0 0" }}>
            <span>Account &amp; Notification Settings</span> are stored locally in your browser. <button type="button" onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "var(--teal)", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Sign in to unlock</button> cloud synchronization and data backup.
          </p>
        </div>
      )}

      <div className="settings-grid">
        {/* ── 1. Theme ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Moon size={18} className="settings-icon" />
            <div>
              <h3>General Settings</h3>
              <p>Choose your visual theme and interface appearance.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="theme-options">
              <label
                className={`theme-option ${pendingTheme === "earth" ? "active" : ""}`}
                onClick={() => setPendingTheme("earth")}
              >
                <div className="theme-preview theme-preview-earth">
                  <div className="theme-preview-sidebar" />
                  <div className="theme-preview-body">
                    <div className="theme-preview-card" />
                    <div className="theme-preview-card" />
                  </div>
                </div>
                <div className="theme-option-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Leaf size={13} style={{ color: "#2f6f5e" }} />
                    <span className="theme-option-name">Earth Theme</span>
                  </div>
                  <span className="theme-option-desc">Warm sand, sage, terracotta accents</span>
                </div>
                <input
                  type="radio"
                  name="theme"
                  value="earth"
                  aria-label="Select Earth Theme"
                  checked={pendingTheme === "earth"}
                  onChange={() => setPendingTheme("earth")}
                  className="theme-radio"
                />
              </label>

              <label
                className={`theme-option ${pendingTheme === "dark" ? "active" : ""}`}
                onClick={() => setPendingTheme("dark")}
              >
                <div className="theme-preview theme-preview-dark">
                  <div className="theme-preview-sidebar" />
                  <div className="theme-preview-body">
                    <div className="theme-preview-card" />
                    <div className="theme-preview-card" />
                  </div>
                </div>
                <div className="theme-option-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Moon size={13} style={{ color: "#00D4AA" }} />
                    <span className="theme-option-name">Midnight Ocean</span>
                  </div>
                  <span className="theme-option-desc">Deep navy, bioluminescent neon teal</span>
                </div>
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  aria-label="Select Dark Theme"
                  checked={pendingTheme === "dark"}
                  onChange={() => setPendingTheme("dark")}
                  className="theme-radio"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── 2. Localization ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Globe size={18} className="settings-icon" />
            <div>
              <h3>Language &amp; Region</h3>
              <p>Display language and format preferences.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-field">
              <label htmlFor="language-select" className="settings-label">
                <Globe size={14} /> Language
              </label>
              <select
                id="language-select"
                className="settings-select"
                value={pendingLanguage}
                onChange={(e) => setPendingLanguage(e.target.value)}
              >
                <option value="en">English (US / IN)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="es">Español</option>
              </select>
              <span className="settings-hint">UI translation will be applied across the app.</span>
            </div>

            <div className="settings-field" style={{ marginTop: "1.2rem" }}>
              <label htmlFor="date-format-select" className="settings-label">
                <CalendarDays size={14} /> Date Format
              </label>
              <select
                id="date-format-select"
                className="settings-select"
                value={pendingDateFormat}
                onChange={(e) => setPendingDateFormat(e.target.value)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 17/08/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/17/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 3. Table Preferences ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <List size={18} className="settings-icon" />
            <div>
              <h3>Data Display</h3>
              <p>Pagination and table view settings.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-field">
              <label htmlFor="ipp-select" className="settings-label">
                <List size={14} /> Records per page
              </label>
              <select
                id="ipp-select"
                className="settings-select"
                value={pendingIPP}
                onChange={(e) => setPendingIPP(e.target.value)}
              >
                <option value="10">10 records</option>
                <option value="25">25 records</option>
                <option value="50">50 records</option>
                <option value="100">100 records</option>
              </select>
              <span className="settings-hint">Applied to the Detection History table view.</span>
            </div>
          </div>
        </div>

        {/* ── 4. Notifications ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Bell size={18} className="settings-icon" />
            <div>
              <h3>Notification Preferences</h3>
              <p>Manage alert preferences.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-toggle-list">
              <label className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-label">Severe Pollution Alerts</div>
                  <div className="settings-toggle-desc">Notify when a scan detects Severe-tier beach pollution</div>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={pendingNotifs.severeAlerts}
                  onChange={(e) =>
                    setPendingNotifs((prev) => ({ ...prev, severeAlerts: e.target.checked }))
                  }
                />
              </label>

              <label className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-label">Weekly Cleanup Digest</div>
                  <div className="settings-toggle-desc">Summary of monitored hotspots and recent submissions</div>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={pendingNotifs.weeklyDigest}
                  onChange={(e) =>
                    setPendingNotifs((prev) => ({ ...prev, weeklyDigest: e.target.checked }))
                  }
                />
              </label>

              <label className="settings-toggle-row">
                <div>
                  <div className="settings-toggle-label">Email Notifications</div>
                  <div className="settings-toggle-desc">Receive reports and alerts to your registered email</div>
                </div>
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={pendingNotifs.emailNotifications}
                  onChange={(e) =>
                    setPendingNotifs((prev) => ({ ...prev, emailNotifications: e.target.checked }))
                  }
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── 5. Data & Privacy ── */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Download size={18} className="settings-icon" />
            <div>
              <h3>Data &amp; Privacy</h3>
              <p>Download your detection history or export data.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Export all your uploaded analyses, bounding box detections, severity scores, and location metadata in standard JSON format.
            </p>
            <button
              className="btn-export-data"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <span className="login-spinner" style={{ width: 14, height: 14 }} />
              ) : exportDone ? (
                <CheckCircle size={15} style={{ color: "var(--teal)" }} />
              ) : (
                <Download size={15} />
              )}
              {exporting ? "Preparing export…" : exportDone ? "Exported!" : "Export My Data (JSON)"}
            </button>
          </div>
        </div>

        {/* ── 6. Account & Danger Zone ── */}
        <div className="settings-card settings-card-danger">
          <div className="settings-card-header">
            <Trash2 size={18} className="settings-icon settings-icon-danger" />
            <div>
              <h3>Account</h3>
              <p>Account identity and sign-out actions.</p>
            </div>
          </div>
          <div className="settings-card-body">
            {user ? (
              <div>
                <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                  Signed in as: <strong style={{ color: "var(--ink)" }}>{user.email}</strong>
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem", lineHeight: 1.4 }}>
                  Deleting your account will immediately sign you out and request permanent deletion of your recorded data.
                </p>
                <button
                  className="btn-danger-action"
                  onClick={() => setDeleteModal(true)}
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginBottom: "1rem" }}>
                  You are currently using Littora as a guest.
                </p>
                <button
                  className="btn-guest-signin"
                  onClick={() => navigate("/login")}
                >
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Save Bar ── */}
      <div className={`settings-save-bar ${hasChanges ? "visible" : ""}`}>
        <span>You have unsaved changes.</span>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            className="settings-cancel-btn"
            onClick={() => {
              setPendingTheme(theme);
              setPendingLanguage(language);
              setPendingDateFormat(dateFormat);
              setPendingIPP(String(itemsPerPage));
              setPendingNotifs({ ...notifications });
            }}
          >
            Discard
          </button>
          <button className="settings-save-btn" onClick={handleSave} disabled={!hasChanges}>
            {saved ? <CheckCircle size={14} /> : null}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={deleteModal}
        title="Delete your account?"
        message="This will sign you out immediately. To permanently delete your account and all data, please contact the system administrator."
        confirmLabel={deleting ? "Signing out…" : "Yes, delete"}
        confirmVariant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => !deleting && setDeleteModal(false)}
      />

      {/* ── Toast ── */}
      <ToastNotification toast={toast} />
    </div>
  );
}
