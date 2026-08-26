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
    <div className="relative z-40" ref={menuRef}>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="flex items-center gap-2.5 px-3 py-1.5 bg-surface/90 hover:bg-surface border border-border rounded-pill shadow-md backdrop-blur-md transition-all duration-200 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Account Menu"
        aria-expanded={isOpen}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${!user ? "bg-sand-gold text-text-primary" : "bg-primary text-white"}`}>
          {user ? initial : <User size={15} />}
        </div>

        <span className="font-sans text-xs font-semibold text-text-primary max-w-[130px] truncate">
          {displayName}
        </span>

        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-2xl shadow-xl p-4 z-50">
          {/* Header Profile Section */}
          <div className="pb-3 mb-3 border-b border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${!user ? "bg-sand-gold text-text-primary" : "bg-primary text-white"}`}>
                {user ? initial : <User size={20} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-bold text-text-primary truncate">
                  {displayName}
                </div>
                <div className="text-xs text-text-muted truncate">
                  {user ? user.email : "Guest Visitor"}
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="mt-2">
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
          <div className="space-y-1 my-2">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings size={16} className="text-primary" />
                <span>Account Settings</span>
              </div>
              <ChevronRight size={14} className="text-text-muted" />
            </Link>

            {user && (
              <>
                <Link
                  to="/history"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-primary" />
                    <span>Detection History</span>
                  </div>
                  <ChevronRight size={14} className="text-text-muted" />
                </Link>

                <Link
                  to="/trends"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp size={16} className="text-primary" />
                    <span>Historical Trends</span>
                  </div>
                  <ChevronRight size={14} className="text-text-muted" />
                </Link>
              </>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-3 mt-3 border-t border-border/50">
            {user ? (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition-colors cursor-pointer"
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
