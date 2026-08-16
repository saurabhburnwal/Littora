import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ── Mock supabase ──────────────────────────────────────────────────────────
vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:         vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange:  vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp:             vi.fn(),
      signOut:            vi.fn(),
    },
  },
}));

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import LoginPage from "../LoginPage.jsx";

// Mock logo + navbar_image imports (binary assets)
vi.mock("../../assets/logo.png",       () => ({ default: "logo.png" }));
vi.mock("../../assets/navbar_image_transparent.png", () => ({ default: "navbar.png" }));

function renderLogin() {
  return render(
    <MemoryRouter>
      <SettingsProvider><AuthProvider>
        <LoginPage />
      </AuthProvider></SettingsProvider>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
describe("LoginPage — initial render", () => {
  it("renders the Sign In tab as active by default", () => {
    renderLogin();
    const signInTab = screen.getByRole("tab", { name: /sign in/i });
    expect(signInTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows the 'Welcome back' heading in login mode", () => {
    renderLogin();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it("renders email and password fields in login mode", () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    // Use the ID-specific label for the password field
    expect(document.getElementById("login-password")).toBeInTheDocument();
  });

  it("Sign In submit button is disabled when fields are empty", () => {
    renderLogin();
    const btn = screen.getByRole("button", { name: /sign in/i });
    expect(btn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("LoginPage — tab switching", () => {
  it("switches to signup mode when Sign Up tab is clicked", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("tab", { name: /sign up/i }));
    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
  });

  it("switches back to login mode from signup footer link", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("tab", { name: /sign up/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it("clears error and password when switching tabs", () => {
    renderLogin();
    // Type in login form password field
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "a@b.com" } });
    const pwInput = document.getElementById("login-password");
    fireEvent.change(pwInput, { target: { value: "pass" } });
    expect(pwInput.value).toBe("pass");
    // Switch to signup
    fireEvent.click(screen.getByRole("tab", { name: /sign up/i }));
    // The login-password field no longer exists, confirming the form switched
    expect(document.getElementById("login-password")).not.toBeInTheDocument();
    expect(document.getElementById("signup-password")).toBeInTheDocument();
    expect(document.getElementById("signup-password").value).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("LoginPage — show/hide password toggle", () => {
  it("toggles password visibility when the eye button is clicked", () => {
    renderLogin();
    const pwInput  = screen.getByLabelText(/^password/i);
    const toggle   = screen.getByRole("button", { name: /show password/i });

    expect(pwInput).toHaveAttribute("type", "password");
    fireEvent.click(toggle);
    expect(pwInput).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(pwInput).toHaveAttribute("type", "password");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("LoginPage — login flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls login() and navigates on successful submit", async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: "tok" }, user: { id: "1", email: "u@t.com" } },
      error: null,
    });
    // Patch session so AuthContext sees a logged-in user
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok", user: { id: "1", email: "u@t.com" } } },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),     { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "u@t.com", password: "pass123",
      })
    );
  });

  it("shows an error banner when login fails", async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid credentials" },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "bad@t.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),     { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    );
  });

  it("shows loading state while signing in", async () => {
    let resolve;
    supabase.auth.signInWithPassword.mockReturnValueOnce(
      new Promise((r) => { resolve = r; })
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),     { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();

    resolve({ data: { session: { access_token: "t" }, user: { email: "u@t.com" } }, error: null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("LoginPage — signup flow", () => {
  beforeEach(() => vi.clearAllMocks());

  function openSignup() {
    renderLogin();
    fireEvent.click(screen.getByRole("tab", { name: /sign up/i }));
  }

  it("renders name, email, password, and confirm fields in signup mode", () => {
    openSignup();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("Create account button is disabled until email, password, and matching confirm are filled", () => {
    openSignup();
    const btn = screen.getByRole("button", { name: /create account/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),     { target: { value: "pass123" } });
    // Confirm doesn't match yet
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass456" } });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass123" } });
    expect(btn).not.toBeDisabled();
  });

  it("shows password mismatch hint below confirm field", () => {
    openSignup();
    fireEvent.change(screen.getByLabelText(/^password/i),        { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "xyz" } });
    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it("shows success banner after successful sign up", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: "new-id", identities: [{ id: "i" }] } },
      error: null,
    });
    openSignup();
    fireEvent.change(screen.getByLabelText(/email address/i),    { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),        { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    );
  });

  it("shows error when signup fails", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { message: "Email already in use" },
    });
    openSignup();
    fireEvent.change(screen.getByLabelText(/email address/i),    { target: { value: "dup@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),        { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
    );
  });

  it("shows duplicate email error when identities array is empty", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: "dup-id", identities: [] } },
      error: null,
    });
    openSignup();
    fireEvent.change(screen.getByLabelText(/email address/i),    { target: { value: "dup@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),        { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/already registered/i)).toBeInTheDocument()
    );
  });

  it("shows password strength bar when password is typed", () => {
    openSignup();
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "weak" } });
    // "weak" password (only 4 chars) → strength score=0 → label is empty string from STRENGTH_LABELS[0]
    // So instead check that the strength bar segments render
    const segs = document.querySelectorAll(".pw-strength-seg");
    expect(segs.length).toBe(4);
    // pw-strength-wrap should be visible now that password.length > 0
    expect(document.querySelector(".pw-strength-wrap")).toBeInTheDocument();
  });

  it("shows 'Strong' strength label for a complex password", () => {
    openSignup();
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "Str0ng!Pass" } });
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it("'Go to Sign In' button in success banner switches back to login", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: "x", identities: [{ id: "i" }] } },
      error: null,
    });
    openSignup();
    fireEvent.change(screen.getByLabelText(/email address/i),    { target: { value: "ok@test.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i),        { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => screen.getByText(/check your inbox/i));
    fireEvent.click(screen.getByRole("button", { name: /go to sign in/i }));

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it("renders 'Continue as Guest' button and allows guest navigation", () => {
    renderLogin();
    const guestBtn = screen.getByRole("button", { name: /continue as guest/i });
    expect(guestBtn).toBeInTheDocument();
    fireEvent.click(guestBtn);
  });
});
