import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Moon,
  Leaf,
  Download,
  Trash2,
  Bell,
  Globe,
  CalendarDays,
  List,
  CheckCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SectionHeader from "../components/ui/SectionHeader.jsx";
import Badge from "../components/ui/Badge.jsx";
import { supabase } from "../lib/supabase.js";
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
  const { getToken, logout, user, isAdmin } = useAuth();

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
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    setDeleteError(null);
    try {
      await supabase.auth.signOut();
      await logout();
      navigate("/login");
    } catch (err) {
      setDeleteError(err.message || "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-heading">
        <div>
          <div className="settings-header-wrap">
            <h1 className="settings-title">Settings</h1>
            {user ? (
              <Badge variant="role" type={isAdmin ? "admin" : "member"}>
                {isAdmin ? "Admin" : "Member"}
              </Badge>
            ) : (
              <Badge variant="role" type="guest">Guest</Badge>
            )}
          </div>
          <p>Manage your preferences, notifications and account configuration.</p>
        </div>
        {hasChanges && (
          <div className="settings-unsaved-warning">
            <AlertTriangle size={14} /> Unsaved changes
          </div>
        )}
      </div>

      {!user && (
        <div className="guest-preview-banner settings-guest-banner">
          <div>
            <h4 className="settings-guest-title">
              👋 Guest Preferences Mode
            </h4>
            <p className="settings-guest-desc">
              Theme, language, and display settings are saved locally in your browser. Sign in to sync preferences across devices, export data, and manage account settings.
            </p>
          </div>
          <button
            className="filter-btn-apply settings-guest-btn"
            onClick={() => navigate("/login")}
          >
            Sign In / Register
          </button>
        </div>
      )}

      <div className="settings-grid">
        {/* ── LEFT COLUMN ── */}
        <div className="settings-col">

          {/* General Settings */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Globe size={15} className="settings-title-icon" /> General Settings
            </div>

            {/* Theme */}
            <div className="settings-row">
              <div className="settings-row-info">
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
              <div className="settings-row-info">
                <div className="settings-row-label">Language</div>
                <div className="settings-row-desc">Interface language</div>
              </div>
              <select
                id="settings-language"
                className="filter-select"
                aria-label="Select interface language"
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
              <div className="settings-row-info">
                <div className="settings-row-label">
                  <CalendarDays size={13} className="settings-icon-inline" />
                  Date Format
                </div>
                <div className="settings-row-desc">How dates are displayed across the app</div>
              </div>
              <select
                id="settings-dateformat"
                className="filter-select"
                aria-label="Select date format"
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
              <div className="settings-row-info">
                <div className="settings-row-label">
                  <List size={13} className="settings-icon-inline" />
                  Items per page
                </div>
                <div className="settings-row-desc">Rows shown in history and table views</div>
              </div>
              <select
                id="settings-ipp"
                className="filter-select"
                aria-label="Select items per page"
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
            className="btn-primary settings-save-btn"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : "Save Changes"}
          </button>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="settings-col">
          {user ? (
            <>
              {/* Notification Preferences */}
              <div className="settings-section">
                <div className="settings-section-title">
                  <Bell size={15} className="settings-title-icon" /> Notification Preferences
                </div>

                {[
                  { key: "email",         label: "Email Notifications",  desc: "Receive email updates on new analyses" },
                  { key: "highPollution", label: "High-Pollution Alerts", desc: "Get alerted when severity is High or Severe" },
                  { key: "weekly",        label: "Weekly Reports",        desc: "Receive a weekly summary of beach data" },
                ].map((n) => (
                  <div key={n.key} className="settings-row">
                    <div className="settings-row-info">
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
                <div className="settings-section-title">
                  <Trash2 size={15} className="settings-title-icon--danger" /> Data &amp; Privacy
                </div>

                {/* Export */}
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-label">Export My Data</div>
                    <div className="settings-row-desc">Download all your analyses as JSON</div>
                  </div>
                  <button
                    id="settings-export-btn"
                    className="export-btn settings-export-btn"
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <><span className="login-spinner settings-mini-spinner" /> Exporting…</>
                    ) : exportDone ? (
                      <><CheckCircle size={13} /> Done!</>
                    ) : (
                      <><Download size={13} /> Export</>
                    )}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-label settings-row-label--danger">Delete Account</div>
                    <div className="settings-row-desc">Sign out and request permanent account deletion</div>
                  </div>
                  <button
                    id="settings-delete-btn"
                    className="settings-delete-btn"
                    onClick={() => setDeleteModal(true)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="settings-section settings-lock-card">
              <div className="settings-lock-icon">
                <Bell size={24} strokeWidth={1.8} />
              </div>
              <h3 className="settings-lock-title">
                Account &amp; Notification Settings
              </h3>
              <p className="settings-lock-desc">
                Notification preferences and data export features are available to signed-in accounts. Sign in to enable email notifications and export your detection data.
              </p>
              <button
                className="filter-btn-apply settings-lock-btn"
                onClick={() => navigate("/login")}
              >
                Sign In to Unlock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={() => !deleting && setDeleteModal(false)} role="dialog" aria-modal="true" aria-label="Delete account confirmation">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center mb-4">
              <AlertTriangle size={28} />
            </div>
            <h2 className="font-display text-lg font-bold text-text-primary mb-2">Delete your account?</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              This will sign you out immediately. To permanently delete your account and all data,
              please contact the system administrator after signing out.
              <br /><br />
              <strong className="text-rose-500">This cannot be undone.</strong>
            </p>
            {deleteError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-3 rounded-lg mb-4">{deleteError}</p>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="px-4 py-2.5 rounded-pill text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors flex items-center gap-1.5 cursor-pointer"
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <X size={14} /> Cancel
              </button>
              <button
                id="settings-confirm-delete-btn"
                className="px-5 py-2.5 rounded-pill text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
