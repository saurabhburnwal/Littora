import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ScanLine, TrendingUp, MapPin,
  Clock, FileText, Recycle, Database, Settings, PanelLeftClose, PanelLeftOpen, Lock
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import logo from "../assets/logo.png";
import navbarEarth from "../assets/navbar_image_earth.jpg";
import navbarDark from "../assets/navbar_image_dark.jpg";

const NAV_ITEMS = [
  { to: "/",          label: "Dashboard",              icon: LayoutDashboard, end: true,  guestLocked: false },
  { to: "/detect",    label: "Detect Waste",           icon: ScanLine,        end: false, guestLocked: false },
  { to: "/trends",    label: "Historical Trends",      icon: TrendingUp,      end: false, guestLocked: true  },
  { to: "/map",       label: "Pollution Map",          icon: MapPin,          end: false, guestLocked: true  },
  { to: "/history",   label: "Detection History",      icon: Clock,           end: false, guestLocked: true  },
  { to: "/reports",   label: "Reports",                icon: FileText,        end: false, guestLocked: true  },
  { to: "/cleanup",   label: "Cleanup Recommendations",icon: Recycle,         end: false, guestLocked: true  },
  { to: "/dataset",   label: "Data Explorer",          icon: Database,        end: false, guestLocked: true  },
  { to: "/settings",  label: "Settings",               icon: Settings,        end: false, guestLocked: false },
];

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const navbarImage = theme === "dark" ? navbarDark : navbarEarth;
  const isGuest = !user;

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`sidebar${isOpen ? " open" : ""}${isCollapsed ? " collapsed" : ""}`}
        aria-label="Primary navigation"
      >
        {/* Logo Header & Collapse Toggle */}
        <div className="sidebar-logo">
          {!isCollapsed ? (
            <>
              <div className="sidebar-logo-brand" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img src={logo} alt="Littora Logo" className="sidebar-logo-img" />
                <div>
                  <div className="sidebar-wordmark">LITTORA</div>
                  <div className="sidebar-tagline">AI Beach Waste Detection</div>
                </div>
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  className="sidebar-collapse-btn"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose size={18} />
                </button>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", width: "100%" }}>
              <img src={logo} alt="Littora Logo" className="sidebar-logo-img" style={{ width: "34px", height: "34px" }} />
              {onToggleCollapse && (
                <button
                  type="button"
                  className="sidebar-collapse-btn"
                  onClick={onToggleCollapse}
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav" aria-label="Sections">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, guestLocked }) => {
            // Locked nav item for guests — renders as a dimmed non-navigable div
            if (isGuest && guestLocked) {
              return (
                <div
                  key={to}
                  className="nav-item"
                  title={isCollapsed ? `${label} (Sign in required)` : "Sign in required"}
                  onClick={() => navigate("/login")}
                  style={{
                    opacity: 0.42,
                    cursor: "pointer",
                    position: "relative",
                  }}
                  role="button"
                  aria-label={`${label} — sign in required`}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{label}</span>
                      <Lock size={12} strokeWidth={2} style={{ opacity: 0.7, flexShrink: 0 }} />
                    </>
                  )}
                </div>
              );
            }

            // Normal navigable link
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                onClick={onClose}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Navbar Image Illustration */}
        {!isCollapsed && (
          <div className="sidebar-navbar-image-container">
            <img src={navbarImage} alt="Coastal Illustration" className="sidebar-navbar-img" />
          </div>
        )}
      </aside>
    </>
  );
}
