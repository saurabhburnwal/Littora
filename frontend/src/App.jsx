import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import UploadPage    from "./pages/UploadPage.jsx";
import MapPage       from "./pages/MapPage.jsx";
import HistoryPage   from "./pages/HistoryPage.jsx";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="content-area">
        {/* Shown only on mobile */}
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <span className="topbar-title">Littora</span>
        </div>

        <main className="main-content">
          <Routes>
            <Route path="/"        element={<DashboardPage />} />
            <Route path="/upload"  element={<UploadPage />} />
            <Route path="/map"     element={<MapPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*"        element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
