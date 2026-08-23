import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, LogIn, Settings, Clock, Shield, ChevronDown, ChevronRight, TrendingUp, User } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import Badge from "./ui/Badge.jsx";

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
  const isAdminUser = Boolean(isAdmin);

  const displayName = user
    ? (rawFullName || (isAdminUser ? "Admin" : (user.email ?? "User")))
    : "Guest Visitor";

  const initial = user
    ? (displayName[0]?.toUpperCase() ?? "U")
    : "G";

  return (
    <div className="floating-account-menu-container" ref={menuRef}>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="floating-account-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Account Menu"
        aria-expanded={isOpen}
      >
        <div className={`floating-account-avatar ${!user ? "guest" : ""}`}>
          {user ? initial : <User size={15} />}
        </div>

        <span className="floating-account-name">
          {displayName}
        </span>

        <ChevronDown
          size={14}
          className={`floating-account-chevron ${isOpen ? "open" : ""}`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="account-dropdown-card">
          {/* Header Profile Section */}
          <div className="account-dropdown-header">
            <div className="account-dropdown-profile">
              <div className={`account-dropdown-avatar ${!user ? "guest" : ""}`}>
                {user ? initial : <User size={20} />}
              </div>

              <div className="account-dropdown-info">
                <div className="account-dropdown-display-name">
                  {displayName}
                </div>
                <div className="account-dropdown-email">
                  {user ? user.email : "Guest Visitor"}
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="account-dropdown-role-wrap">
              {user && isAdminUser ? (
                <Badge variant="role" type="admin" icon={<Shield size={12} />}>
                  Administrator
                </Badge>
              ) : user ? (
                <Badge variant="role" type="member" icon={<User size={12} />}>
                  Account Member
                </Badge>
              ) : (
                <Badge variant="role" type="guest" icon={<User size={12} />}>
                  Preview Guest
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="account-dropdown-links">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="account-dropdown-link"
            >
              <Settings size={16} className="account-dropdown-link-icon" />
              <span>Account Settings</span>
              <ChevronRight size={14} className="account-dropdown-link-arrow" />
            </Link>

            {user && (
              <>
                <Link
                  to="/history"
                  onClick={() => setIsOpen(false)}
                  className="account-dropdown-link"
                >
                  <Clock size={16} className="account-dropdown-link-icon" />
                  <span>Detection History</span>
                  <ChevronRight size={14} className="account-dropdown-link-arrow" />
                </Link>

                <Link
                  to="/trends"
                  onClick={() => setIsOpen(false)}
                  className="account-dropdown-link"
                >
                  <TrendingUp size={16} className="account-dropdown-link-icon" />
                  <span>Historical Trends</span>
                  <ChevronRight size={14} className="account-dropdown-link-arrow" />
                </Link>
              </>
            )}
          </div>

          {/* Footer Action */}
          <div className="account-dropdown-footer">
            {user ? (
              <button
                type="button"
                className="account-dropdown-logout-btn"
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutModal(true);
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                className="account-dropdown-login-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/login");
                }}
              >
                <LogIn size={15} /> Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirm Sign Out"
        message="Are you sure you want to log out of your Littora account?"
        confirmLabel={loggingOut ? "Signing out…" : "Sign Out"}
        confirmVariant="primary"
        icon={LogOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => !loggingOut && setShowLogoutModal(false)}
      />
    </div>
  );
}
