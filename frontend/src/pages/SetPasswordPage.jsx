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
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary text-text-primary p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-bg-secondary/40 to-sand-gold/10" />
        <div className="absolute -bottom-24 -right-24 text-primary/5 dark:text-primary/10 select-none">
          <Waves size={600} strokeWidth={1} />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-border bg-surface">
        <div className="p-6 sm:p-10 flex flex-col justify-center">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <img src={logo} alt="Littora" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <div className="font-display text-xl font-extrabold text-text-primary tracking-tight leading-none">LITTORA</div>
              <div className="font-sans text-[10px] text-text-muted tracking-wider uppercase font-semibold mt-0.5">AI Beach Waste Detection</div>
            </div>
          </div>

          {done ? (
            /* ── Success state ── */
            <div className="text-center py-6 space-y-4">
              <CheckCircle size={52} className="mx-auto text-emerald-500" />
              <h1 className="font-display text-2xl font-bold text-text-primary">
                Password set successfully!
              </h1>
              <p className="text-xs sm:text-sm text-text-muted">
                Redirecting you to the dashboard…
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-1">
                <KeyRound size={22} className="text-primary shrink-0" />
                <h1 className="font-display text-2xl font-bold text-text-primary">
                  {isInvite ? "Set your password" : "Reset your password"}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mb-6">
                {isInvite
                  ? "You've been invited to Littora. Create a password to activate your account."
                  : "Enter a new password for your account."}
              </p>

              {!sessionReady && (
                <div className="flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium">
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  Verifying your invite link…
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs sm:text-sm font-medium">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <label htmlFor="sp-password" className="block text-xs font-semibold text-text-primary">New password</label>
                  <div className="relative flex items-center">
                    <input
                      id="sp-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                      placeholder="Min. 6 characters"
                      disabled={loading || !sessionReady}
                    />
                    <button
                      type="button"
                      className="absolute right-3 text-text-muted hover:text-text-primary p-1 cursor-pointer transition-colors"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label htmlFor="sp-confirm" className="block text-xs font-semibold text-text-primary">Confirm password</label>
                  <input
                    id="sp-confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                    placeholder="Repeat password"
                    disabled={loading || !sessionReady}
                  />
                </div>

                {/* Password strength hint */}
                {password.length > 0 && (() => {
                  const pwInfo = calculatePasswordStrength(password);
                  return (
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              background: pwInfo.score >= i ? pwInfo.color : "var(--border)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <button
                  id="set-password-submit-btn"
                  type="submit"
                  className="w-full py-3 px-6 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-pill shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                  disabled={loading || !sessionReady || !password || !confirm}
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting password…</>
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
