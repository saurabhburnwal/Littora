import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar             from "./components/Sidebar.jsx";
import ProtectedRoute      from "./components/ProtectedRoute.jsx";
import FloatingAccountMenu from "./components/FloatingAccountMenu.jsx";
import LoginPage           from "./pages/LoginPage.jsx";
import SetPasswordPage     from "./pages/SetPasswordPage.jsx";

const DashboardPage    = lazy(() => import("./pages/DashboardPage.jsx"));
const UploadPage       = lazy(() => import("./pages/UploadPage.jsx"));
const MapPage          = lazy(() => import("./pages/MapPage.jsx"));
const HistoryPage      = lazy(() => import("./pages/HistoryPage.jsx"));
const TrendsPage       = lazy(() => import("./pages/TrendsPage.jsx"));
const ReportsPage      = lazy(() => import("./pages/ReportsPage.jsx"));
const CleanupPage      = lazy(() => import("./pages/CleanupPage.jsx"));
const DatasetPage      = lazy(() => import("./pages/DatasetPage.jsx"));
const SettingsPage     = lazy(() => import("./pages/SettingsPage.jsx"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px] text-text-muted font-medium text-sm">
      Loading...
    </div>
  );
}

// Layout wrapper: sidebar + content (used for all protected pages)
function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("littora_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("littora_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className={`${isCollapsed ? "grid-cols-[72px_1fr]" : "grid-cols-[240px_1fr]"} grid min-h-screen transition-[grid-template-columns] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] bg-bg-primary text-text-primary`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex flex-col min-h-screen overflow-x-hidden bg-bg-primary">
        {/* Floating Account Icon in Top Right */}
        <div className="fixed top-4 right-4 z-40">
          <FloatingAccountMenu />
        </div>

        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      {/* Protected routes — require authentication */}
      <Route
        path="/*"
        element={
          <ProtectedRoute allowGuest={true}>
            <AppShell>
              <Routes>
                {/* Guest-accessible routes */}
                <Route path="/"          element={<DashboardPage />} />
                <Route path="/detect"    element={<UploadPage />} />
                <Route path="/settings"  element={<SettingsPage />} />

                {/* Authenticated-only routes (redirects unauthenticated guests to /login) */}
                <Route path="/trends"    element={<ProtectedRoute allowGuest={false}><TrendsPage /></ProtectedRoute>} />
                <Route path="/map"       element={<ProtectedRoute allowGuest={false}><MapPage /></ProtectedRoute>} />
                <Route path="/analytics" element={<Navigate to="/trends" replace />} />
                <Route path="/history"   element={<ProtectedRoute allowGuest={false}><HistoryPage /></ProtectedRoute>} />
                <Route path="/reports"   element={<ProtectedRoute allowGuest={false}><ReportsPage /></ProtectedRoute>} />
                <Route path="/cleanup"   element={<ProtectedRoute allowGuest={false}><CleanupPage /></ProtectedRoute>} />
                <Route path="/dataset"   element={<ProtectedRoute allowGuest={false}><DatasetPage /></ProtectedRoute>} />

                {/* Legacy redirect */}
                <Route path="/upload" element={<Navigate to="/detect" replace />} />
                <Route path="*"       element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
