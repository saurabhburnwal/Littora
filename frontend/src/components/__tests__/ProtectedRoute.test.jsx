import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ── Mock supabase ──────────────────────────────────────────────────────────
vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock("../../assets/logo.png",         () => ({ default: "logo.png" }));
vi.mock("../../assets/navbar_image.png", () => ({ default: "navbar.png" }));

import { AuthProvider } from "../../context/AuthContext.jsx";
import ProtectedRoute from "../ProtectedRoute.jsx";

function renderRoute({ user = null, loading = false, isAdmin = false, adminOnly = false } = {}) {
  // Override AuthContext internals via a wrapper that provides mock context
  const MockAuthProvider = ({ children }) => {
    const ctx = {
      user, loading, isAdmin,
      login: vi.fn(), logout: vi.fn(), signUp: vi.fn(), getToken: vi.fn(),
    };
    const { createContext, useContext } = require("react");
    // We can't easily inject, so use AuthProvider + supabase mock instead
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  };

  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <ProtectedRoute adminOnly={adminOnly}>
        <div data-testid="protected-content">Protected!</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
describe("ProtectedRoute", () => {
  it("shows loading indicator while auth is loading", async () => {
    // supabase getSession never resolves → loading stays true
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockReturnValueOnce(new Promise(() => {}));

    const { unmount } = render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="content">Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    unmount();
  });

  it("redirects to /login when user is not authenticated", async () => {
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="content">Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for async session check
    await vi.waitFor(() => {
      expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });
  });

  it("renders children when user is authenticated", async () => {
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "u1", email: "user@test.com" } } },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="content">Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("content")).toBeInTheDocument();
    });
  });

  it("redirects to /login when user is unauthenticated and allowGuest={false}", async () => {
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute allowGuest={false}>
                  <div data-testid="content">Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("renders children when user is unauthenticated but allowGuest={true}", async () => {
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute allowGuest={true}>
                  <div data-testid="guest-content">Guest Allowed Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("guest-content")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("redirects non-admin user to / when adminOnly={true}", async () => {
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "u-regular", email: "member@test.com" } } },
    });

    render(
      <MemoryRouter initialEntries={["/admin-only"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
            <Route
              path="/admin-only"
              element={
                <ProtectedRoute adminOnly={true}>
                  <div data-testid="admin-content">Admin Secret</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("renders children for administrator when adminOnly={true}", async () => {
    const { supabase } = await import("../../lib/supabase.js");
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "u-admin", email: "admin@littora.app" } } },
    });

    render(
      <MemoryRouter initialEntries={["/admin-only"]}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
            <Route
              path="/admin-only"
              element={
                <ProtectedRoute adminOnly={true}>
                  <div data-testid="admin-content">Admin Secret</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });
});
