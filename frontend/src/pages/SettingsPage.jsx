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
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Badge from "../components/ui/Badge.jsx";
import ToastNotification from "../components/ToastNotification.jsx";
import axios from "axios";
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
  const { getToken, logout, deleteAccount, user, isAdmin } = useAuth();

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
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.get(`${API_BASE}/api/my-analyses`, { headers });
      downloadJson(data, `littora-data-${new Date().toISOString().slice(0, 10)}.json`);
      setExportDone(true);
      showToast("success", "Data exported successfully!");
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      showToast("error", "Export failed: " + (err.response?.data?.error || err.message));
    } finally {
      setExporting(false);
    }
  };

  // --- Delete Account ---
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      if (isAdmin) {
        throw new Error("Primary administrator account cannot be deleted.");
      }
      await deleteAccount();
      navigate("/login?deleted=true");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Settings</h1>
            {user ? (
              <Badge variant="role" type={isAdmin ? "admin" : "member"}>
                {isAdmin ? "Admin" : "Member"}
              </Badge>
            ) : (
              <Badge variant="role" type="guest">Guest</Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-muted">Manage your preferences, notifications and account configuration.</p>
        </div>
        {hasChanges && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/15 text-secondary border border-secondary/30 rounded-pill text-xs font-bold animate-pulse">
            <AlertTriangle size={14} /> Unsaved changes
          </div>
        )}
      </div>

      {!user && (
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="font-display text-sm sm:text-base font-bold text-text-primary mb-1">
              👋 Guest Preferences Mode
            </h4>
            <p className="text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
              Theme, language, and display settings are saved locally in your browser. Sign in to sync preferences across devices, export data, and manage account settings.
            </p>
          </div>
          <button
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-pill shadow-sm transition-colors shrink-0 cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Sign In / Register
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* General Settings */}
          <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="font-display text-sm font-bold text-text-primary flex items-center gap-2 pb-3 border-b border-border/50">
              <Globe size={15} className="text-primary shrink-0" /> General Settings
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-text-primary">Theme</div>
                <div className="text-xs text-text-muted mt-0.5">Choose your preferred interface theme</div>
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-bg-secondary rounded-pill">
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-all cursor-pointer ${
                    pendingTheme === "earth"
                      ? "bg-surface text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  onClick={() => setPendingTheme("earth")}
                  aria-label="Select Earth theme"
                >
                  <Leaf size={14} /> Earth
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-all cursor-pointer ${
                    pendingTheme === "dark"
                      ? "bg-surface text-primary shadow-xs font-bold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  onClick={() => setPendingTheme("dark")}
                  aria-label="Select Dark theme"
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-text-primary">Language</div>
                <div className="text-xs text-text-muted mt-0.5">Interface language</div>
              </div>
              <div className="relative">
                <select
                  id="settings-language"
                  className="pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
                  aria-label="Select interface language"
                  value={pendingLanguage}
                  onChange={(e) => setPendingLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Date Format */}
            <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-text-muted" />
                  Date Format
                </div>
                <div className="text-xs text-text-muted mt-0.5">How dates are displayed across the app</div>
              </div>
              <div className="relative">
                <select
                  id="settings-dateformat"
                  className="pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
                  aria-label="Select date format"
                  value={pendingDateFormat}
                  onChange={(e) => setPendingDateFormat(e.target.value)}
                >
                  <option value="DD MMM YYYY">DD MMM YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Items per page */}
            <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <List size={13} className="text-text-muted" />
                  Items per page
                </div>
                <div className="text-xs text-text-muted mt-0.5">Rows shown in history and table views</div>
              </div>
              <div className="relative">
                <select
                  id="settings-ipp"
                  className="pl-3.5 pr-9 py-2 text-xs sm:text-sm bg-bg-secondary text-text-primary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer appearance-none"
                  aria-label="Select items per page"
                  value={pendingIPP}
                  onChange={(e) => setPendingIPP(e.target.value)}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            id="settings-save-btn"
            className="w-full py-3 px-6 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-bold text-sm rounded-pill shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : "Save Changes"}
          </button>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {user ? (
            <>
              {/* Notification Preferences */}
              <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="font-display text-sm font-bold text-text-primary flex items-center gap-2 pb-3 border-b border-border/50">
                  <Bell size={15} className="text-primary shrink-0" /> Notification Preferences
                </div>

                {[
                  { key: "email",         label: "Email Notifications",  desc: "Receive email updates on new analyses" },
                  { key: "highPollution", label: "High-Pollution Alerts", desc: "Get alerted when severity is High or Severe" },
                  { key: "weekly",        label: "Weekly Reports",        desc: "Receive a weekly summary of beach data" },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-text-primary">{n.label}</div>
                      <div className="text-xs text-text-muted mt-0.5">{n.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={pendingNotifs[n.key]}
                        onChange={(e) =>
                          setPendingNotifs((prev) => ({ ...prev, [n.key]: e.target.checked }))
                        }
                      />
                      <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Data & Privacy */}
              <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="font-display text-sm font-bold text-text-primary flex items-center gap-2 pb-3 border-b border-border/50">
                  <Trash2 size={15} className="text-rose-500 shrink-0" /> Data &amp; Privacy
                </div>

                {/* Export */}
                <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-text-primary">Export My Data</div>
                    <div className="text-xs text-text-muted mt-0.5">Download all your analyses as JSON</div>
                  </div>
                  <button
                    id="settings-export-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/30 transition-colors disabled:opacity-50 cursor-pointer shrink-0 disabled:cursor-not-allowed"
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <><Loader2 size={13} className="animate-spin" /> Exporting…</>
                    ) : exportDone ? (
                      <><CheckCircle size={13} /> Done!</>
                    ) : (
                      <><Download size={13} /> Export</>
                    )}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-rose-500">Delete Account</div>
                    <div className="text-xs text-text-muted mt-0.5">Sign out and request permanent account deletion</div>
                  </div>
                  <button
                    id="settings-delete-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer shrink-0"
                    onClick={() => setDeleteModal(true)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Bell size={24} strokeWidth={1.8} />
              </div>
              <h3 className="font-display text-base font-bold text-text-primary">
                Account &amp; Notification Settings
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-sm">
                Notification preferences and data export features are available to signed-in accounts. Sign in to enable email notifications and export your detection data.
              </p>
              <button
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-pill shadow-sm transition-colors cursor-pointer"
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
              This will permanently delete your account, your uploaded coastal scans, and all associated analytics data from Littora.
              <br /><br />
              <strong className="text-rose-500">This action is irreversible and cannot be undone.</strong>
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
                className="px-5 py-2.5 rounded-pill text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting account…
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Yes, delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <ToastNotification toast={toast} />
    </div>
  );
}
