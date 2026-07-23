import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const UploadPage    = lazy(() => import("./pages/UploadPage.jsx"));
const MapPage       = lazy(() => import("./pages/MapPage.jsx"));
const HistoryPage   = lazy(() => import("./pages/HistoryPage.jsx"));
const TrendsPage    = lazy(() => import("./pages/TrendsPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const ReportsPage   = lazy(() => import("./pages/ReportsPage.jsx"));
const CleanupPage   = lazy(() => import("./pages/CleanupPage.jsx"));
const DatasetPage   = lazy(() => import("./pages/DatasetPage.jsx"));
const SettingsPage  = lazy(() => import("./pages/SettingsPage.jsx"));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '300px', color: 'var(--muted)', fontSize: '0.88rem'
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="content-area">
        {/* Mobile topbar */}
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <span className="topbar-title">LITTORA</span>
        </div>

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"          element={<DashboardPage />} />
              <Route path="/detect"    element={<UploadPage />} />
              <Route path="/trends"    element={<TrendsPage />} />
              <Route path="/map"       element={<MapPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/history"   element={<HistoryPage />} />
              <Route path="/reports"   element={<ReportsPage />} />
              <Route path="/cleanup"   element={<CleanupPage />} />
              <Route path="/dataset"   element={<DatasetPage />} />
              <Route path="/settings"  element={<SettingsPage />} />
              {/* Keep old /upload route working */}
              <Route path="/upload"    element={<Navigate to="/detect" replace />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
