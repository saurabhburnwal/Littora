import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, Waves } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { calculatePasswordStrength } from "../utils/wasteUtils.js";
import logo from "../assets/logo.png";

/**
 * SetPasswordPage — handles Supabase invite & password-recovery links.
 *
 * Supabase appends #access_token=...&type=invite (or type=recovery)
 * to the redirect URL. The Supabase JS client picks this up via
 * onAuthStateChange and fires a SIGNED_IN event. We detect the type
 * from the URL hash and show the set-password form.
 */
export default function SetPasswordPage() {
  const navigate = useNavigate();

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [done,      setDone]      = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Detect invite / recovery token from the URL hash
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const tokenType  = hashParams.get("type"); // "invite" | "recovery" | null

  useEffect(() => {
    // The Supabase client auto-exchanges the hash token into a session.
    // Listen for that event so we know we're ready to call updateUser.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
          setSessionReady(true);
        }
      }
    );

    // Also check if a session already exists (token already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      // Redirect to the app after a short delay
      setTimeout(() => navigate("/", { replace: true }), 2500);
    } catch (err) {
      setError(err.message || "Failed to set password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isInvite = tokenType === "invite";

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-waves">
          <Waves size={600} className="login-bg-wave-icon" />
        </div>
      </div>

      <div className="login-card-wrap login-card-wrap--narrow">
        <div className="login-card login-card--flat-right">
          {/* Brand */}
          <div className="login-brand">
            <img src={logo} alt="Littora" className="login-logo" />
            <div>
              <div className="login-brand-name">LITTORA</div>
              <div className="login-brand-sub">AI Beach Waste Detection</div>
            </div>
          </div>

          {done ? (
            /* ── Success state ── */
            <div className="setpass-success-wrap">
              <CheckCircle size={52} className="setpass-success-icon" />
              <h1 className="login-heading login-heading--success">
                Password set successfully!
              </h1>
              <p className="login-subheading">
                Redirecting you to the dashboard…
              </p>
            </div>
          ) : (
            <>
              <div className="setpass-header-row">
                <KeyRound size={22} className="setpass-header-icon" />
                <h1 className="login-heading login-heading--flush">
                  {isInvite ? "Set your password" : "Reset your password"}
                </h1>
              </div>
              <p className="login-subheading">
                {isInvite
                  ? "You've been invited to Littora. Create a password to activate your account."
                  : "Enter a new password for your account."}
              </p>

              {!sessionReady && (
                <div className="setpass-verifying-banner">
                  <span className="login-spinner setpass-verifying-spinner" />
                  Verifying your invite link…
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form" noValidate>
                {error && (
                  <div className="login-error-banner">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {/* New password */}
                <div className="login-field">
                  <label htmlFor="sp-password" className="login-label">New password</label>
                  <div className="login-input-wrap">
                    <input
                      id="sp-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input login-input-pw"
                      placeholder="Min. 6 characters"
                      disabled={loading || !sessionReady}
                    />
                    <button
                      type="button"
                      className="login-pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="login-field">
                  <label htmlFor="sp-confirm" className="login-label">Confirm password</label>
                  <input
                    id="sp-confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="login-input"
                    placeholder="Repeat password"
                    disabled={loading || !sessionReady}
                  />
                </div>

                {/* Password strength hint */}
                {password.length > 0 && (() => {
                  const pwInfo = calculatePasswordStrength(password);
                  return (
                    <div className="setpass-strength-wrap">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="setpass-strength-seg"
                          style={{
                            background: pwInfo.score >= i ? pwInfo.color : "rgba(255,255,255,0.1)",
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}

                <button
                  id="set-password-submit-btn"
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading || !sessionReady || !password || !confirm}
                >
                  {loading
                    ? <><span className="login-spinner" /> Setting password…</>
                    : <><KeyRound size={16} /> {isInvite ? "Activate account" : "Reset password"}</>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
