import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LogIn, UserPlus, Eye, EyeOff, Waves,
  AlertCircle, CheckCircle, User, Mail, Lock, Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { calculatePasswordStrength } from "../utils/wasteUtils.js";
import logo from "../assets/logo.png";

export default function LoginPage() {
  const { login, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  /* ── Shared state ───────────────────────────────────────── */
  const [mode,    setMode]    = useState("login"); // "login" | "signup" | "forgot"
  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  /* ── Sign-up only ───────────────────────────────────────── */
  const [name,      setName]      = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [signedUp,  setSignedUp]  = useState(false);

  /* ── Forgot password only ───────────────────────────────── */
  const [resetSent, setResetSent] = useState(false);

  /* ── Switch tab (reset form state) ─────────────────────── */
  function switchMode(next) {
    setMode(next);
    setError(null);
    setSignedUp(false);
    setResetSent(false);
    setPassword("");
    setConfirm("");
    setShowPw(false);
  }

  /* ── Login submit ───────────────────────────────────────── */
  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Sign-up submit ─────────────────────────────────────── */
  async function handleSignUp(e) {
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
      await signUp(email.trim(), password, name.trim());
      setSignedUp(true);
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Forgot password submit ──────────────────────────────── */
  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(err.message || "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary text-text-primary p-4 sm:p-6 relative overflow-hidden">
      {/* Animated coastal background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-bg-secondary/40 to-sand-gold/10" />
        <div className="absolute -bottom-24 -right-24 text-primary/5 dark:text-primary/10 select-none">
          <Waves size={600} strokeWidth={1} />
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] rounded-3xl overflow-hidden shadow-2xl border border-border bg-surface">
        <div className="p-6 sm:p-10 flex flex-col justify-center">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <img src={logo} alt="Littora" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <div className="font-display text-xl font-extrabold text-text-primary tracking-tight leading-none">LITTORA</div>
              <div className="font-sans text-[10px] text-text-muted tracking-wider uppercase font-semibold mt-0.5">AI Beach Waste Detection</div>
            </div>
          </div>

          {/* ── Tab switcher ── */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-bg-secondary/60 rounded-2xl mb-6" role="tablist">
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-surface text-primary shadow-sm font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => switchMode("login")}
              type="button"
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === "signup"}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-surface text-primary shadow-sm font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => switchMode("signup")}
              type="button"
            >
              <UserPlus size={15} />
              Sign Up
            </button>
          </div>

          {/* ── SIGN-UP SUCCESS state ── */}
          {mode === "signup" && signedUp ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary">Check your inbox!</h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
                We sent a confirmation link to <strong className="text-text-primary font-semibold">{email}</strong>.
                Click the link in the email to activate your account, then come
                back here to sign in.
              </p>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-pill bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                onClick={() => switchMode("login")}
              >
                <LogIn size={15} /> Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* ── Heading ── */}
              {mode === "login" ? (
                <>
                  <h1 className="font-display text-2xl font-bold text-text-primary mb-1">Welcome back</h1>
                  <p className="text-xs sm:text-sm text-text-muted mb-6">
                    Sign in to access your personal beach monitoring dashboard.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-bold text-text-primary mb-1">Create an account</h1>
                  <p className="text-xs sm:text-sm text-text-muted mb-6">
                    Join Littora and start monitoring beach pollution with AI.
                  </p>
                </>
              )}

              {/* ── Error banner ── */}
              {error && (
                <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs sm:text-sm font-medium">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* ══ LOGIN FORM ══ */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="block text-xs font-semibold text-text-primary">
                      Email address
                    </label>
                    <div className="relative flex items-center">
                      <Mail size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="block text-xs font-semibold text-text-primary">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                      <input
                        id="login-password"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                        placeholder="••••••••"
                        disabled={loading}
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

                  {/* Forgot password link */}
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline cursor-pointer font-medium"
                      onClick={() => { setError(null); setResetSent(false); setMode("forgot"); }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    id="login-submit-btn"
                    className="w-full py-3 px-6 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-pill shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                    disabled={loading || !email || !password}
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    ) : (
                      <LogIn size={17} />
                    )}
                    {loading ? "Signing in…" : "Sign in"}
                  </button>

                  <p className="text-center text-xs text-text-muted pt-2">
                    New here?{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline cursor-pointer ml-1"
                      onClick={() => switchMode("signup")}
                    >
                      Create an account
                    </button>
                  </p>
                </form>
              )}

              {/* ══ SIGN-UP FORM ══ */}
              {mode === "signup" && (
                <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                  {/* Full name */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-name" className="block text-xs font-semibold text-text-primary">
                      Full name <span className="text-text-muted font-normal ml-1">(optional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <User size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                        placeholder="Jane Doe"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-email" className="block text-xs font-semibold text-text-primary">
                      Email address
                    </label>
                    <div className="relative flex items-center">
                      <Mail size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-password" className="block text-xs font-semibold text-text-primary">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                      <input
                        id="signup-password"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                        placeholder="Min. 6 characters"
                        disabled={loading}
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

                    {/* Strength bar */}
                    {password.length > 0 && (() => {
                      const pwInfo = calculatePasswordStrength(password);
                      return (
                        <div className="space-y-1.5 pt-1" data-testid="pw-strength-wrap">
                          <div className="grid grid-cols-4 gap-1.5 h-1.5">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="h-full rounded-full transition-all duration-300"
                                data-testid="pw-strength-seg"
                                style={{
                                  background: pwInfo.score >= i
                                    ? pwInfo.color
                                    : "var(--border)",
                                }}
                              />
                            ))}
                          </div>
                          <span
                            className="block text-right text-[11px] font-semibold transition-colors"
                            style={{ color: pwInfo.color }}
                          >
                            {pwInfo.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label htmlFor="signup-confirm" className="block text-xs font-semibold text-text-primary">
                      Confirm password
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                      <input
                        id="signup-confirm"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 bg-bg-secondary/50 border ${
                          confirm && confirm !== password ? "border-rose-500 ring-1 ring-rose-500/30" : "border-border"
                        } rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50`}
                        placeholder="Repeat password"
                        disabled={loading}
                      />
                    </div>
                    {confirm && confirm !== password && (
                      <span className="block text-xs text-rose-500 font-medium mt-1">Passwords don&apos;t match</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="signup-submit-btn"
                    className="w-full py-3 px-6 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-pill shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                    disabled={
                      loading || !email || !password || !confirm || password !== confirm
                    }
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    ) : (
                      <UserPlus size={17} />
                    )}
                    {loading ? "Creating account…" : "Create account"}
                  </button>

                  <p className="text-center text-xs text-text-muted pt-2">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline cursor-pointer ml-1"
                      onClick={() => switchMode("login")}
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}

              {/* ══ FORGOT PASSWORD FORM ══ */}
              {mode === "forgot" && (
                <>
                  {!resetSent ? (
                    <>
                      <h1 className="font-display text-2xl font-bold text-text-primary mb-1">Reset password</h1>
                      <p className="text-xs sm:text-sm text-text-muted mb-6">
                        Enter your email and we&apos;ll send you a link to set a new password.
                      </p>

                      {error && (
                        <div className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs sm:text-sm font-medium">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                        <div className="space-y-1.5">
                          <label htmlFor="forgot-email" className="block text-xs font-semibold text-text-primary">
                            Email address
                          </label>
                          <div className="relative flex items-center">
                            <Mail size={15} className="absolute left-3.5 text-text-muted pointer-events-none shrink-0" />
                            <input
                              id="forgot-email"
                              type="email"
                              autoComplete="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                              placeholder="you@example.com"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 px-6 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-pill shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                          disabled={loading || !email}
                        >
                          {loading ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                          ) : (
                            <Mail size={17} />
                          )}
                          {loading ? "Sending…" : "Send reset link"}
                        </button>

                        <p className="text-center text-xs text-text-muted pt-2">
                          Remember it?{" "}
                          <button
                            type="button"
                            className="font-semibold text-primary hover:underline cursor-pointer ml-1"
                            onClick={() => switchMode("login")}
                          >
                            Sign in
                          </button>
                        </p>
                      </form>
                    </>
                  ) : (
                    /* ── Reset email sent — success state ── */
                    <div className="text-center py-6 space-y-4">
                      <CheckCircle size={48} className="mx-auto text-emerald-500" />
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary">Check your inbox!</h2>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
                        We sent a password reset link to{" "}
                        <strong className="text-text-primary font-semibold">{email}</strong>.
                        Click the link to set a new password, then come back here to sign in.
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-pill bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                        onClick={() => switchMode("login")}
                      >
                        <LogIn size={15} /> Back to Sign In
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Guest option — hidden in forgot-password mode */}
              {mode !== "forgot" && (
                <>
                  <div className="relative flex items-center justify-center my-6">
                    <div className="border-t border-border w-full" />
                    <span className="bg-surface px-3 text-xs text-text-muted shrink-0">or explore without an account</span>
                  </div>

                  <button
                    type="button"
                    id="continue-as-guest-btn"
                    className="w-full py-2.5 px-4 bg-bg-secondary/60 hover:bg-bg-secondary text-text-primary font-semibold text-xs sm:text-sm rounded-pill border border-border transition-all flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <Compass size={17} className="text-primary shrink-0" /> Continue as Guest
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Decorative side panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-linear-to-br from-primary/15 via-sand-gold/10 to-surface border-l border-border relative overflow-hidden">
          <Waves size={400} className="absolute -bottom-16 -right-16 text-primary/10 pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <h2 className="font-display text-3xl font-extrabold text-text-primary leading-tight">
              Protecting our<br />
              <span className="text-primary">coastlines</span><br />
              with AI.
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Upload beach photos, detect waste, track pollution trends — all in one place.
            </p>
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-extrabold text-primary">4+</span>
                <span className="text-xs text-text-secondary font-medium">Waste categories detected</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-extrabold text-primary">AI</span>
                <span className="text-xs text-text-secondary font-medium">Powered inference engine</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-extrabold text-primary">∞</span>
                <span className="text-xs text-text-secondary font-medium">Beaches monitored</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
