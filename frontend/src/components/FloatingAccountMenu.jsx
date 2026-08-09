import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, LogOut, LogIn, Settings, Clock, Shield, ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function FloatingAccountMenu() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      setShowLogoutModal(false);
      setIsOpen(false);
      await logout();
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
  };

  const rawFullName = user?.user_metadata?.full_name?.trim() || user?.user_metadata?.name?.trim();
  const isAdminUser = isAdmin || user?.email?.toLowerCase() === "admin@littora.app";

  const displayName = user
    ? (rawFullName || (isAdminUser ? "Admin" : (user.email ?? "User")))
    : "Guest Visitor";

  const initial = user
    ? (displayName[0]?.toUpperCase() ?? "U")
    : "G";

  return (
    <div className="floating-account-menu-container" ref={menuRef} style={{ position: "relative", zIndex: 1000 }}>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="floating-account-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Account Menu"
        aria-expanded={isOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.55rem",
          padding: "0.45rem 0.85rem",
          borderRadius: "30px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          color: "var(--ink)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: user
            ? "linear-gradient(135deg, var(--teal) 0%, #0B746F 100%)"
            : "rgba(14, 140, 134, 0.15)",
          color: user ? "#fff" : "var(--teal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.85rem",
          boxShadow: user ? "0 2px 8px rgba(14, 140, 134, 0.4)" : "none",
        }}>
          {user ? initial : <User size={15} />}
        </div>

        <span style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          maxWidth: "135px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em"
        }}>
          {displayName}
        </span>

        <ChevronDown
          size={14}
          style={{
            opacity: 0.65,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        />
      </button>

      {/* Redesigned Glassmorphic Popover Card */}
      {isOpen && (
        <div className="account-dropdown-card" style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          right: 0,
          width: "270px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "0 18px 42px -8px rgba(0, 0, 0, 0.28)",
          padding: "0.9rem",
          backdropFilter: "blur(20px)",
          animation: "fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 1001,
        }}>
          {/* Header Profile Section */}
          <div style={{
            padding: "0.6rem 0.6rem 0.85rem",
            borderBottom: "1px solid var(--border-lt)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: user
                  ? "linear-gradient(135deg, var(--teal) 0%, #095E5A 100%)"
                  : "rgba(14, 140, 134, 0.15)",
                color: user ? "#fff" : "var(--teal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: user ? "0 4px 12px rgba(14, 140, 134, 0.35)" : "none",
                flexShrink: 0,
              }}>
                {user ? initial : <User size={20} />}
              </div>

              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {displayName}
                </div>
                <div style={{
                  fontSize: "0.76rem",
                  color: "var(--muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: "1px"
                }}>
                  {user ? user.email : "Guest Visitor"}
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div style={{ marginTop: "0.65rem" }}>
              {user && isAdmin ? (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "20px",
                  background: "rgba(245, 158, 11, 0.14)",
                  color: "#d97706",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em"
                }}>
                  <Shield size={11} /> Administrator
                </span>
              ) : user ? (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "20px",
                  background: "rgba(14, 140, 134, 0.12)",
                  color: "var(--teal)",
                  border: "1px solid rgba(14, 140, 134, 0.25)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em"
                }}>
                  <User size={11} /> Account Member
                </span>
              ) : (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "20px",
                  background: "rgba(148, 163, 184, 0.12)",
                  color: "var(--muted)",
                  border: "1px solid rgba(148, 163, 184, 0.25)",
                  fontSize: "0.72rem",
                  fontWeight: 600
                }}>
                  <User size={11} /> Preview Guest
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Navigation Links */}
          <div style={{ padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "10px",
                color: "var(--ink)",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--border-lt)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Settings size={16} style={{ opacity: 0.75 }} />
              <span>Account Settings</span>
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </Link>

            <Link
              to="/history"
              onClick={() => setIsOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "10px",
                color: "var(--ink)",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--border-lt)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Clock size={16} style={{ opacity: 0.75 }} />
              <span>Detection History</span>
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </Link>

            <Link
              to="/analytics"
              onClick={() => setIsOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "10px",
                color: "var(--ink)",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--border-lt)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <BarChart3 size={16} style={{ opacity: 0.75 }} />
              <span>Analytics & Trends</span>
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </Link>
          </div>

          {/* Footer Auth Action */}
          <div style={{ borderTop: "1px solid var(--border-lt)", paddingTop: "0.6rem" }}>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutModal(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.55rem",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "10px",
                  color: "#f43f5e",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  cursor: "pointer",
                  transition: "all 0.18s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f43f5e";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)";
                  e.currentTarget.style.color = "#f43f5e";
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/login");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.55rem",
                  padding: "0.65rem 0.8rem",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, var(--teal) 0%, #0B746F 100%)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(14, 140, 134, 0.3)",
                  transition: "all 0.18s ease"
                }}
              >
                <LogIn size={15} /> Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="admin-modal-backdrop" onClick={() => !loggingOut && setShowLogoutModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-icon">
              <LogOut size={36} style={{ color: "var(--teal)" }} />
            </div>
            <h2 className="admin-modal-title">Confirm Sign Out</h2>
            <p className="admin-modal-body">
              Are you sure you want to log out of your Littora account?
            </p>
            <div className="admin-modal-actions">
              <button
                className="admin-modal-cancel"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                id="confirm-logout-btn"
                className="filter-btn-apply"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
                style={{ padding: "0.55rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                {loggingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
