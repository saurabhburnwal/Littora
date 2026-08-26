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

function renderDashboardPage({ user = null } = {}) {
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

describe("DashboardPage - Adversarial & Edge Case Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("scrolls smoothly to #dashboard-analytics when View Live Analytics button is clicked", async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    renderDashboardPage();
    await vi.waitFor(() => screen.getByRole("button", { name: /view live analytics/i }));

    const viewAnalyticsBtn = screen.getByRole("button", { name: /view live analytics/i });
    fireEvent.click(viewAnalyticsBtn);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("handles repeated rapid clicks on View Live Analytics without errors", async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    renderDashboardPage();
    await vi.waitFor(() => screen.getByRole("button", { name: /view live analytics/i }));

    const viewAnalyticsBtn = screen.getByRole("button", { name: /view live analytics/i });
    
    // Rapid clicks
    fireEvent.click(viewAnalyticsBtn);
    fireEvent.click(viewAnalyticsBtn);
    fireEvent.click(viewAnalyticsBtn);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(3);
  });

  it("does not throw an error if the target analytics container is not in DOM", async () => {
    const originalGetElementById = document.getElementById;
    // Mock getElementById to return null
    vi.spyOn(document, "getElementById").mockReturnValue(null);

    renderDashboardPage();
    await vi.waitFor(() => screen.getByRole("button", { name: /view live analytics/i }));

    const viewAnalyticsBtn = screen.getByRole("button", { name: /view live analytics/i });

    // Should not throw even when element is missing
    expect(() => fireEvent.click(viewAnalyticsBtn)).not.toThrow();

    document.getElementById = originalGetElementById;
  });
});
