import { NavLink } from "react-router-dom";
import { LayoutDashboard, UploadCloud, MapPin, Clock } from "lucide-react";

const NAV_ITEMS = [
  { to: "/",        label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/upload",  label: "Upload",    icon: UploadCloud,     end: false },
  { to: "/map",     label: "Map",       icon: MapPin,          end: false },
  { to: "/history", label: "History",   icon: Clock,           end: false },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop — renders as visible overlay when sidebar is open */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`sidebar${isOpen ? " open" : ""}`} aria-label="Primary navigation">
        {/* ── Wordmark / Logo ── */}
        <div className="sidebar-logo">
          <WaveIcon />
          <div>
            <div className="sidebar-wordmark">Littora</div>
            <div className="sidebar-tagline">Coastal Monitor</div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav" aria-label="Sections">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Signature coastal moment: layered wave SVG ── */}
        <div className="sidebar-footer">
          <svg
            className="sidebar-wave"
            viewBox="0 0 260 110"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M0 55 C55 18, 100 82, 145 48 C188 14, 225 74, 260 42 L260 110 L0 110 Z"
              fill="rgba(255,255,255,0.045)"
            />
            <path
              d="M0 72 C48 44, 105 90, 158 68 C202 50, 238 84, 260 62 L260 110 L0 110 Z"
              fill="rgba(255,255,255,0.032)"
            />
            <path
              d="M0 88 C62 72, 115 98, 170 84 C214 72, 244 92, 260 80 L260 110 L0 110 Z"
              fill="rgba(255,255,255,0.022)"
            />
            {/* Animated wave line — the one deliberate flourish */}
            <path
              d="M0 50 C40 30, 80 70, 120 50 C160 30, 200 70, 240 50 L260 48"
              stroke="rgba(240,176,96,0.22)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </aside>
    </>
  );
}

/** Wave icon alongside the "Littora" wordmark */
function WaveIcon() {
  return (
    <svg
      viewBox="0 0 34 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="34"
      height="26"
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
        stroke="rgba(240,176,96,0.32)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
