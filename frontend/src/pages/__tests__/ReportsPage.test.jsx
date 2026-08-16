import { render, screen, fireEvent } from "@testing-library/react";
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

vi.mock("../../utils/generatePdfReport.js", () => ({
  generatePdfReport: vi.fn().mockResolvedValue(true),
}));

import { supabase } from "../../lib/supabase.js";
import { generatePdfReport } from "../../utils/generatePdfReport.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import ReportsPage from "../ReportsPage.jsx";

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

function renderReports({ user = null } = {}) {
  setupAuthMock(user);
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsProvider>
            <ReportsPage />
          </StatsProvider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("ReportsPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Reports title and report option cards", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: /^reports$/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Daily Report")).toBeInTheDocument();
    expect(screen.getByText("Monthly Report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf report/i })).toBeInTheDocument();
  });

  it("triggers generatePdfReport when logged-in user clicks Download PDF Report", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await vi.waitFor(() => screen.getByRole("button", { name: /download pdf report/i }));

    fireEvent.click(screen.getByRole("button", { name: /download pdf report/i }));
    await vi.waitFor(() => {
      expect(generatePdfReport).toHaveBeenCalled();
    });
  });
});
