import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LogIn, UserPlus, Eye, EyeOff, Waves,
  AlertCircle, CheckCircle, User, Mail, Lock, Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/logo.png";

/* ── Password strength helper ─────────────────────────────── */
function pwStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4); // 0-4
}
const STRENGTH_COLORS = ["", "#dc2626", "#ea580c", "#e6a545", "#22c55e"];
const STRENGTH_LABELS  = ["", "Weak", "Fair", "Good", "Strong"];

export default function LoginPage() {
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  /* ── Shared state ───────────────────────────────────────── */
  const [mode,    setMode]    = useState("login"); // "login" | "signup"
  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  /* ── Sign-up only ───────────────────────────────────────── */
  const [name,      setName]      = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [signedUp,  setSignedUp]  = useState(false);

  /* ── Switch tab (reset form state) ─────────────────────── */
  function switchMode(next) {
    setMode(next);
    setError(null);
    setSignedUp(false);
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

  const strength = pwStrength(password);

  return (
    <div className="login-page">
      {/* Animated coastal background */}
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-waves">
          <Waves size={600} className="login-bg-wave-icon" />
        </div>
      </div>

      {/* Card */}
      <div className="login-card-wrap">
        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <img src={logo} alt="Littora" className="login-logo" />
            <div>
              <div className="login-brand-name">LITTORA</div>
              <div className="login-brand-sub">AI Beach Waste Detection</div>
            </div>
          </div>

          {/* ── Tab switcher ── */}
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab${mode === "login" ? " active" : ""}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-tab${mode === "signup" ? " active" : ""}`}
              onClick={() => switchMode("signup")}
              type="button"
            >
              <UserPlus size={15} />
              Sign Up
            </button>
          </div>

          {/* ── SIGN-UP SUCCESS state ── */}
          {mode === "signup" && signedUp ? (
            <div className="auth-success-banner">
              <CheckCircle size={36} className="auth-success-icon" />
              <h2 className="auth-success-title">Check your inbox!</h2>
              <p className="auth-success-body">
                We sent a confirmation link to <strong>{email}</strong>.
                Click the link in the email to activate your account, then come
                back here to sign in.
              </p>
              <button
                type="button"
                className="auth-success-switch"
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
                  <h1 className="login-heading">Welcome back</h1>
                  <p className="login-subheading">
                    Sign in to access your personal beach monitoring dashboard.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="login-heading">Create an account</h1>
                  <p className="login-subheading">
                    Join Littora and start monitoring beach pollution with AI.
                  </p>
                </>
              )}

              {/* ── Error banner ── */}
              {error && (
                <div className="login-error-banner">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* ══ LOGIN FORM ══ */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="login-form" noValidate>
                  {/* Email */}
                  <div className="login-field">
                    <label htmlFor="login-email" className="login-label">
                      Email address
                    </label>
                    <div className="login-input-icon-wrap">
                      <Mail size={15} className="login-input-icon" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input login-input-iconed"
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="login-field">
                    <label htmlFor="login-password" className="login-label">
                      Password
                    </label>
                    <div className="login-input-wrap">
                      <Lock size={15} className="login-input-icon login-input-icon-abs" />
                      <input
                        id="login-password"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input login-input-pw login-input-iconed"
                        placeholder="••••••••"
                        disabled={loading}
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

                  <button
                    type="submit"
                    id="login-submit-btn"
                    className="login-submit-btn"
                    disabled={loading || !email || !password}
                  >
                    {loading ? (
                      <span className="login-spinner" aria-hidden="true" />
                    ) : (
                      <LogIn size={17} />
                    )}
                    {loading ? "Signing in…" : "Sign in"}
                  </button>

                  <p className="login-footer-note">
                    New here?{" "}
                    <button
                      type="button"
                      className="login-footer-link"
                      onClick={() => switchMode("signup")}
                    >
                      Create an account
                    </button>
                  </p>
                </form>
              )}

              {/* ══ SIGN-UP FORM ══ */}
              {mode === "signup" && (
                <form onSubmit={handleSignUp} className="login-form" noValidate>
                  {/* Full name */}
                  <div className="login-field">
                    <label htmlFor="signup-name" className="login-label">
                      Full name <span className="login-label-opt">(optional)</span>
                    </label>
                    <div className="login-input-icon-wrap">
                      <User size={15} className="login-input-icon" />
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="login-input login-input-iconed"
                        placeholder="Jane Doe"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="login-field">
                    <label htmlFor="signup-email" className="login-label">
                      Email address
                    </label>
                    <div className="login-input-icon-wrap">
                      <Mail size={15} className="login-input-icon" />
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input login-input-iconed"
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="login-field">
                    <label htmlFor="signup-password" className="login-label">
                      Password
                    </label>
                    <div className="login-input-wrap">
                      <Lock size={15} className="login-input-icon login-input-icon-abs" />
                      <input
                        id="signup-password"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input login-input-pw login-input-iconed"
                        placeholder="Min. 6 characters"
                        disabled={loading}
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

                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="pw-strength-wrap">
                        <div className="pw-strength-bar">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="pw-strength-seg"
                              style={{
                                background: strength >= i
                                  ? STRENGTH_COLORS[strength]
                                  : "rgba(255,255,255,0.1)",
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="pw-strength-label"
                          style={{ color: STRENGTH_COLORS[strength] }}
                        >
                          {STRENGTH_LABELS[strength]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="login-field">
                    <label htmlFor="signup-confirm" className="login-label">
                      Confirm password
                    </label>
                    <div className="login-input-icon-wrap">
                      <Lock size={15} className="login-input-icon" />
                      <input
                        id="signup-confirm"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={`login-input login-input-iconed${
                          confirm && confirm !== password ? " login-input-mismatch" : ""
                        }`}
                        placeholder="Repeat password"
                        disabled={loading}
                      />
                    </div>
                    {confirm && confirm !== password && (
                      <span className="login-field-hint-err">Passwords don&apos;t match</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="signup-submit-btn"
                    className="login-submit-btn"
                    disabled={
                      loading || !email || !password || !confirm || password !== confirm
                    }
                  >
                    {loading ? (
                      <span className="login-spinner" aria-hidden="true" />
                    ) : (
                      <UserPlus size={17} />
                    )}
                    {loading ? "Creating account…" : "Create account"}
                  </button>

                  <p className="login-footer-note">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="login-footer-link"
                      onClick={() => switchMode("login")}
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}

              {/* Guest option */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                margin: "1.25rem 0 1rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
              }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border-lt, rgba(0,0,0,0.1))" }} />
                <span>or explore without an account</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border-lt, rgba(0,0,0,0.1))" }} />
              </div>

              <button
                type="button"
                id="continue-as-guest-btn"
                onClick={() => navigate("/")}
                style={{
                  width: "100%",
                  padding: "0.68rem 1rem",
                  borderRadius: "10px",
                  background: "var(--card-bg, #ffffff)",
                  border: "1px solid var(--border-strong, #bca88e)",
                  color: "var(--text-primary, #0f172a)",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.55rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--sand, #F1E8D8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--card-bg, #ffffff)";
                }}
              >
                <Compass size={17} style={{ color: "var(--teal)" }} /> Continue as Guest
              </button>
            </>
          )}
        </div>

        {/* Decorative side panel */}
        <div className="login-panel-side">
          <div className="login-panel-inner">
            <h2 className="login-panel-title">
              Protecting our<br />
              <span className="login-panel-accent">coastlines</span><br />
              with AI.
            </h2>
            <p className="login-panel-desc">
              Upload beach photos, detect waste, track pollution trends — all in one place.
            </p>
            <div className="login-panel-stats">
              <div className="login-stat-item">
                <span className="login-stat-num">4+</span>
                <span className="login-stat-lbl">Waste categories detected</span>
              </div>
              <div className="login-stat-item">
                <span className="login-stat-num">AI</span>
                <span className="login-stat-lbl">Powered inference engine</span>
              </div>
              <div className="login-stat-item">
                <span className="login-stat-num">∞</span>
                <span className="login-stat-lbl">Beaches monitored</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
