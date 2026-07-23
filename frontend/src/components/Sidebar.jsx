import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ScanLine, TrendingUp, MapPin, BarChart3,
  Clock, FileText, Recycle, Database, Settings, LogOut, Waves
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/",         label: "Dashboard",                icon: LayoutDashboard, end: true },
  { to: "/detect",   label: "Detect Waste",             icon: ScanLine,        end: false },
  { to: "/trends",   label: "Historical Trends",        icon: TrendingUp,      end: false },
  { to: "/map",      label: "Beach Map",                icon: MapPin,          end: false },
  { to: "/analytics",label: "Analytics",               icon: BarChart3,       end: false },
  { to: "/history",  label: "Detection History",       icon: Clock,           end: false },
  { to: "/reports",  label: "Reports",                  icon: FileText,        end: false },
  { to: "/cleanup",  label: "Cleanup Recommendations", icon: Recycle,         end: false },
  { to: "/dataset",  label: "Dataset Explorer",         icon: Database,        end: false },
  { to: "/settings", label: "Settings",                 icon: Settings,        end: false },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`sidebar${isOpen ? " open" : ""}`} aria-label="Primary navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <WaveIcon />
          <div>
            <div className="sidebar-wordmark">LITTORA</div>
            <div className="sidebar-tagline">AI Beach Waste Detection</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Sections">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Promo box */}
        <div className="sidebar-promo">
          <div className="sidebar-promo-title">Together for Cleaner Beaches</div>
          <div className="sidebar-promo-text">
            Small actions today, cleaner shores tomorrow.
          </div>
        </div>

        {/* Wave SVG */}
        <div className="sidebar-footer">
          <svg
            className="sidebar-wave"
            viewBox="0 0 260 80"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M0 40 C55 10, 100 65, 145 35 C188 5, 225 55, 260 30 L260 80 L0 80 Z"
              fill="rgba(255,255,255,0.04)"
            />
            <path
              d="M0 55 C48 32, 105 72, 158 50 C202 34, 238 65, 260 45 L260 80 L0 80 Z"
              fill="rgba(255,255,255,0.03)"
            />
            <path
              d="M0 40 C40 20, 80 60, 120 40 C160 20, 200 60, 240 40 L260 38"
              stroke="rgba(240,176,96,0.2)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Logout */}
        <button className="sidebar-logout">
          <LogOut size={16} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}

function WaveIcon() {
  return (
    <svg
      viewBox="0 0 34 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="24"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 16 Q8.5 6 15 16 Q21.5 26 28 16 Q30 12 32 14"
        stroke="#f0b060"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 21 Q7.5 15 13 21 Q18.5 27 24 21 Q26 19 28 20"
        stroke="rgba(240,176,96,0.35)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
