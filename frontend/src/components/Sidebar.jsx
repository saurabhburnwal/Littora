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
  { to: "/history",   label: "Detection History",      icon: Clock,           end: false, guestLocked: true  },
  { to: "/trends",    label: "Historical Trends",      icon: TrendingUp,      end: false, guestLocked: true  },
  { to: "/map",       label: "Pollution Map",          icon: MapPin,          end: false, guestLocked: true  },
  { to: "/cleanup",   label: "Cleanup Recommendations",icon: Recycle,         end: false, guestLocked: true  },
  { to: "/dataset",   label: "Data Explorer",          icon: Database,        end: false, guestLocked: true  },
  { to: "/reports",   label: "Reports",                icon: FileText,        end: false, guestLocked: true  },
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
        <div
          className="fixed inset-0 bg-black/45 z-40 md:hidden animate-[fadeIn_0.2s_ease]"
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        className={`${isOpen ? "open " : ""}${isCollapsed ? "collapsed w-[72px]" : "w-[240px]"} bg-sidebar border-r border-border flex flex-col sticky top-0 h-screen overflow-y-auto overflow-x-hidden z-50 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[width] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]`}
        aria-label="Primary navigation"
      >
        {/* Logo Header & Collapse Toggle */}
        <div className={`flex items-center ${isCollapsed ? "justify-center p-3" : "justify-between gap-3 p-4.5"} border-b border-border shrink-0`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <img src={logo} alt="Littora Logo" className="w-9 h-9 shrink-0 object-contain" />
                <div className="min-w-0">
                  <div className="font-display text-xl font-extrabold text-text-primary tracking-tight leading-none">LITTORA</div>
                  <div className="font-sans text-[10px] text-text-muted tracking-wider uppercase font-semibold mt-0.5">AI Beach Waste Detection</div>
                </div>
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-text-primary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose size={18} />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img src={logo} alt="Littora Logo" className="w-8 h-8 shrink-0 object-contain" />
              {onToggleCollapse && (
                <button
                  type="button"
                  className="p-1 text-text-muted hover:text-text-primary hover:bg-text-primary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
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
        <nav className={`flex-1 ${isCollapsed ? "p-2 gap-1.5" : "py-4 px-3 gap-1"} flex flex-col overflow-y-auto`} aria-label="Sections">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, guestLocked }) => {
            // Locked nav item for guests — renders as a dimmed non-navigable div
            if (isGuest && guestLocked) {
              return (
                <div
                  key={to}
                  className={`${isCollapsed ? "flex items-center justify-center w-11 h-11 mx-auto p-0 rounded-xl" : "flex items-center gap-3 px-3.5 py-2.5 rounded-xl"} text-text-secondary/70 hover:text-text-primary font-semibold text-sm transition-colors cursor-pointer`}
                  title={isCollapsed ? `${label} (Sign in required)` : "Sign in required"}
                  onClick={() => navigate("/login")}
                  role="button"
                  aria-label={`${label} — sign in required`}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 min-w-0 truncate">{label}</span>
                      <Lock size={12} strokeWidth={2} className="text-text-muted shrink-0" />
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
                className={({ isActive }) => `${isActive ? "text-primary bg-primary/15 font-bold" : "text-text-secondary hover:text-text-primary hover:bg-primary/10"} ${isCollapsed ? "flex items-center justify-center w-11 h-11 mx-auto p-0 rounded-xl" : "flex items-center gap-3 px-3.5 py-2.5 rounded-xl"} font-semibold text-sm transition-colors cursor-pointer`}
                onClick={onClose}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                {!isCollapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Navbar Image Illustration */}
        {!isCollapsed && (
          <div className="p-3 mt-auto shrink-0">
            <img src={navbarImage} alt="Coastal Illustration" className="w-full h-auto rounded-xl object-cover" />
          </div>
        )}
      </aside>
    </>
  );
}
