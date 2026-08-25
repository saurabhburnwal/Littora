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
    <div className="result-placeholder flex flex-col items-center justify-center p-8 text-center bg-surface border border-dashed border-border rounded-2xl min-h-[280px]" role="region" aria-label="Restricted preview">
      <div className="w-14 h-14 rounded-full bg-primary-light/40 text-primary flex items-center justify-center mb-4" data-testid="guest-lock-icon">
        <Lock size={26} strokeWidth={2} />
      </div>

      <h3 className="font-display text-lg font-bold text-text-primary mb-2">{title}</h3>

      {message && <p className="text-sm text-text-muted max-w-md mb-6">{message}</p>}

      <button
        type="button"
        className="px-6 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-pill text-sm transition-all duration-150 shadow-sm"
        onClick={() => navigate("/login")}
      >
        Sign In to Access
      </button>
    </div>
  );
}
