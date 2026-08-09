import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut:           vi.fn(),
    },
  },
}));

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import FloatingAccountMenu from "../FloatingAccountMenu.jsx";

function setupAuthMock(user = null) {
  sessionStorage.clear();
  localStorage.clear();
  supabase.auth.getSession.mockReset();
  supabase.auth.onAuthStateChange.mockReset();

  const session = user ? { user } : null;
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    cb(user ? "SIGNED_IN" : "SIGNED_OUT", session);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

function renderMenu({ user = null } = {}) {
  setupAuthMock(user);
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <FloatingAccountMenu />
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("FloatingAccountMenu component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.signOut.mockResolvedValue({});
  });

  it("renders trigger button with Guest Visitor when unauthenticated", async () => {
    renderMenu({ user: null });
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Guest Visitor")).toBeInTheDocument();
  });

  it("renders trigger button with user email or full_name when authenticated", async () => {
    renderMenu({ user: { id: "u1", email: "saurabh@test.com" } });
    await vi.waitFor(() => {
      expect(screen.getByText("saurabh@test.com")).toBeInTheDocument();
    });
  });

  it("renders full_name when present in user metadata", async () => {
    renderMenu({ user: { id: "u1", email: "admin@littora.app", user_metadata: { full_name: "Admin" } } });
    await vi.waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("toggles popover dropdown menu when clicked and shows Preview Guest badge", async () => {
    renderMenu({ user: null });
    await vi.waitFor(() => screen.getByRole("button", { name: /account menu/i }));

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.getByText("Preview Guest")).toBeInTheDocument();
    expect(screen.getByText("Account Settings")).toBeInTheDocument();
    expect(screen.getByText("Detection History")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders Account Member role badge when logged in as regular user", async () => {
    renderMenu({ user: { id: "u1", email: "member@test.com" } });
    await vi.waitFor(() => screen.getByRole("button", { name: /account menu/i }));

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Account Member")).toBeInTheDocument();
  });

  it("renders Administrator role badge when logged in as admin", async () => {
    renderMenu({ user: { id: "admin-1", email: import.meta.env.VITE_ADMIN_EMAIL || "admin@littora.app" } });
    await vi.waitFor(() => screen.getByRole("button", { name: /account menu/i }));

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  it("opens confirmation dialog when Sign Out is clicked, cancels when Cancel is clicked", async () => {
    renderMenu({ user: { id: "u1", email: "saurabh@test.com" } });
    await vi.waitFor(() => screen.getByRole("button", { name: /account menu/i }));

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to log out of your Littora account?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Confirm Sign Out")).not.toBeInTheDocument();
  });

  it("executes sign out when Sign Out modal action is confirmed", async () => {
    renderMenu({ user: { id: "u1", email: "saurabh@test.com" } });
    await vi.waitFor(() => screen.getByRole("button", { name: /account menu/i }));

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    const confirmBtns = screen.getAllByRole("button", { name: /sign out/i });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await vi.waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    });
  });

  it("closes dropdown popover when clicking outside the menu element", async () => {
    renderMenu({ user: null });
    await vi.waitFor(() => screen.getByRole("button", { name: /account menu/i }));

    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Preview Guest")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Preview Guest")).not.toBeInTheDocument();
  });
});
