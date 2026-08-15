import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import TrendsPage from "../TrendsPage.jsx";

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

function renderTrends({ user = null } = {}) {
  setupAuthMock(user);
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsProvider>
            <TrendsPage />
          </StatsProvider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("TrendsPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders guest lock banner card when unauthenticated", async () => {
    renderTrends({ user: null });
    await vi.waitFor(() => {
      expect(screen.getByText("Historical Trends Are Private to Signed-In Users")).toBeInTheDocument();
    });
    expect(screen.getByText("Sign In to Access")).toBeInTheDocument();
  });

  it("renders trend analytics charts and date range filters when logged in", async () => {
    renderTrends({ user: { id: "u-logged", email: "user@test.com" } });
    await vi.waitFor(() => {
      expect(screen.getByText("Total Detections")).toBeInTheDocument();
    });
    expect(screen.queryByText("Historical Trends Are Private to Signed-In Users")).not.toBeInTheDocument();
    expect(screen.getByText("Total Waste Items")).toBeInTheDocument();
  });
});
