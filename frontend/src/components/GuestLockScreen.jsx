import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Reusable full-page lock screen for guest (unauthenticated) users.
 * Replaces sensitive content (charts, analytics, reports, recommendations)
 * with a polished sign-in prompt.
 */
export default function GuestLockScreen({ title, message }) {
  const navigate = useNavigate();

  return (
    <div className="guest-lock-screen result-placeholder" role="region" aria-label="Restricted preview">
      <div className="guest-lock-icon-wrap">
        <Lock size={26} strokeWidth={2} />
      </div>

      <h3 className="guest-lock-title">{title}</h3>

      {message && <p className="guest-lock-message">{message}</p>}

      <button
        type="button"
        className="guest-lock-cta-btn"
        onClick={() => navigate("/login")}
      >
        Sign In to Access
      </button>
    </div>
  );
}
