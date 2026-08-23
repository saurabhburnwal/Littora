import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock("../../assets/dashboard_bg.png", () => ({ default: "bg.png" }));

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import DashboardPage from "../DashboardPage.jsx";

function renderDashboard({ user = null } = {}) {
  if (user) {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user } },
    });
  }
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsProvider>
            <DashboardPage />
          </StatsProvider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("DashboardPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("renders hero banner title, subtitle, and feature trio cards", async () => {
    renderDashboard();
    await vi.waitFor(() => {
      expect(screen.getByText(/AI-Powered/i)).toBeInTheDocument();
      expect(screen.getByText("Beach Waste")).toBeInTheDocument();
    });
    expect(screen.getByText(/Smart Detection/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-time Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Data for Impact/i)).toBeInTheDocument();
    expect(document.querySelector(".dashboard-light-container")).toHaveStyle({
      "--dashboard-image": "url(bg.png)",
    });
  });

  it("renders Guest Preview banner when user is not logged in", async () => {
    renderDashboard();
    await vi.waitFor(() => {
      expect(screen.getByText(/👋 Welcome to Guest Preview Mode/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Platform Overview & Preview Analytics/i)).toBeInTheDocument();
  });

  it("renders personal analytics heading when logged in as regular user", async () => {
    renderDashboard({ user: { id: "u1", email: "user@test.com" } });
    await vi.waitFor(() => {
      expect(screen.getByText("Your Personal Beach Waste Analytics")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Welcome to Guest Preview Mode/i)).not.toBeInTheDocument();
  });

  it("scrolls smoothly to analytics section when View Dashboard is clicked", async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    renderDashboard();
    await vi.waitFor(() => screen.getByRole("button", { name: /view dashboard/i }));

    fireEvent.click(screen.getByRole("button", { name: /view dashboard/i }));
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
  });
});
