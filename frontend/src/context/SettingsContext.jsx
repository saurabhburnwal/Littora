import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { AuthContext } from "./AuthContext.jsx";

export const SettingsContext = createContext(null);

const DEFAULTS = {
  language: "en",
  dateFormat: "DD MMM YYYY",
  itemsPerPage: 10,
  notifications: { email: true, highPollution: true, weekly: false },
};

function getKey(prefix, userId) {
  const scope = userId ? `user_${userId}` : "guest";
  return `${prefix}_${scope}`;
}

function readLocal(prefix, userId, fallback) {
  try {
    const raw = localStorage.getItem(getKey(prefix, userId));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function SettingsProvider({ children }) {
  const authCtx = useContext(AuthContext);
  const userId = authCtx?.user?.id || null;

  const [language, setLanguageState] = useState(() =>
    readLocal("littora_language", userId, DEFAULTS.language)
  );
  const [dateFormat, setDateFormatState] = useState(() =>
    readLocal("littora_dateformat", userId, DEFAULTS.dateFormat)
  );
  const [itemsPerPage, setItemsPerPageState] = useState(() =>
    readLocal("littora_ipp", userId, DEFAULTS.itemsPerPage)
  );
  const [notifications, setNotificationsState] = useState(() =>
    readLocal("littora_notifs", userId, DEFAULTS.notifications)
  );

  // Sync state whenever the active user changes (e.g. login / logout / switch user)
  useEffect(() => {
    setLanguageState(readLocal("littora_language", userId, DEFAULTS.language));
    setDateFormatState(readLocal("littora_dateformat", userId, DEFAULTS.dateFormat));
    setItemsPerPageState(readLocal("littora_ipp", userId, DEFAULTS.itemsPerPage));
    setNotificationsState(readLocal("littora_notifs", userId, DEFAULTS.notifications));
  }, [userId]);

  const setLanguage = useCallback((v) => {
    setLanguageState(v);
    localStorage.setItem(getKey("littora_language", userId), JSON.stringify(v));
  }, [userId]);

  const setDateFormat = useCallback((v) => {
    setDateFormatState(v);
    localStorage.setItem(getKey("littora_dateformat", userId), JSON.stringify(v));
  }, [userId]);

  const setItemsPerPage = useCallback((v) => {
    const num = Number(v);
    setItemsPerPageState(num);
    localStorage.setItem(getKey("littora_ipp", userId), JSON.stringify(num));
  }, [userId]);

  const setNotifications = useCallback((v) => {
    setNotificationsState(v);
    localStorage.setItem(getKey("littora_notifs", userId), JSON.stringify(v));
  }, [userId]);

  /**
   * Format a date string or Date according to the active dateFormat setting.
   */
  const formatDate = useCallback((dateInput) => {
    if (!dateInput) return "—";
    const d = new Date(dateInput);
    if (isNaN(d)) return String(dateInput);
    const day   = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en", { month: "short" });
    const year  = d.getFullYear();
    const mm    = String(d.getMonth() + 1).padStart(2, "0");
    switch (dateFormat) {
      case "MM/DD/YYYY": return `${mm}/${day}/${year}`;
      case "YYYY-MM-DD": return `${year}-${mm}-${day}`;
      default:           return `${day} ${month} ${year}`;
    }
  }, [dateFormat]);

  const value = useMemo(
    () => ({
      language, setLanguage,
      dateFormat, setDateFormat,
      itemsPerPage, setItemsPerPage,
      notifications, setNotifications,
      formatDate,
    }),
    [
      language, setLanguage,
      dateFormat, setDateFormat,
      itemsPerPage, setItemsPerPage,
      notifications, setNotifications,
      formatDate,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
