import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Reusable full-page lock screen for guest (unauthenticated) users.
 * Replaces sensitive content (charts, analytics, reports, recommendations)
 * with a sign-in prompt.
 */
export default function GuestLockScreen({ title, message }) {
  const navigate = useNavigate();

  return (
    <div
      className="result-placeholder"
      style={{ marginTop: "2rem", padding: "3rem 1.5rem", textAlign: "center" }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(47, 111, 94, 0.12)",
          color: "var(--teal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1rem",
        }}
      >
        <Lock size={28} strokeWidth={1.8} />
      </div>

      <h3
        style={{
          fontSize: "1.2rem",
          fontWeight: 700,
          margin: "0 0 0.5rem",
          color: "var(--ink)",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          maxWidth: "480px",
          margin: "0 auto 1.5rem",
          fontSize: "0.88rem",
          color: "var(--muted)",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>

      <button
        className="filter-btn-apply"
        onClick={() => navigate("/login")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1.8rem",
        }}
      >
        Sign In to Access
      </button>
    </div>
  );
}
