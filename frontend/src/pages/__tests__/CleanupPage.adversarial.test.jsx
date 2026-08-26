import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    auth: {
      getSession:        vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock("axios");

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import CleanupPage, { synthesizeStatisticalCleanupPlans } from "../CleanupPage.jsx";

const MOCK_LOCATIONS_DATA = [
  {
    beach: "Puri Golden Beach",
    location_label: "Puri Beach, Odisha",
    total_waste: 85,
    pollution_score: 9,
    severity: "Severe",
    scan_count: 12,
  },
  {
    beach: "Calangute Beach",
    location_label: "Calangute Beach, Goa",
    total_waste: 22,
    pollution_score: 5,
    severity: "Moderate",
    scan_count: 4,
  },
  {
    beach: "Radhanagar Beach",
    location_label: "Havelock Island, Andaman",
    total_waste: 4,
    pollution_score: 1,
    severity: "Low",
    scan_count: 2,
  },
];

function setupAuthMock(user = { id: "u-cleanup", email: "cleanup@littora.org" }) {
  const session = user ? { user } : null;
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    cb(user ? "SIGNED_IN" : "SIGNED_OUT", session);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

function renderCleanupPage(customStats = null) {
  setupAuthMock();
  axios.get.mockImplementation((url) => {
    if (url.includes("/api/stats")) {
      return Promise.resolve({
        data: customStats !== null ? customStats : {
          totalAnalyses: 25,
          totalWasteAllTime: 111,
          locations: MOCK_LOCATIONS_DATA,
        },
      });
    }
    return Promise.resolve({ data: {} });
  });

  return render(
    <MemoryRouter>
      <SettingsProvider>
        <AuthProvider>
          <StatsProvider>
            <CleanupPage />
          </StatsProvider>
        </AuthProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

describe("CleanupPage - Adversarial & Edge Case Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("synthesizeStatisticalCleanupPlans handles null, undefined, and empty arrays safely", () => {
    expect(synthesizeStatisticalCleanupPlans([])).toEqual([]);
    expect(synthesizeStatisticalCleanupPlans(null)).toEqual([]);
    expect(synthesizeStatisticalCleanupPlans(undefined)).toEqual([]);
    expect(synthesizeStatisticalCleanupPlans("invalid")).toEqual([]);
  });

  it("renders offline deterministic fallback when AI endpoint returns 500 error", async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 500, data: { error: "Internal Server Error" } },
    });

    renderCleanupPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /cleanup recommendations/i })).toBeInTheDocument();
      expect(screen.getAllByText("Puri Golden Beach").length).toBeGreaterThan(0);
    });

    // Verification of deterministic fallback tiers & equipment
    expect(screen.getAllByText("Tier 1 - Critical").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tier 2 - Moderate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tier 3 - Routine").length).toBeGreaterThan(0);
  });

  it("renders offline fallback when AI endpoint experiences network timeout", async () => {
    axios.post.mockRejectedValueOnce(new Error("ECONNABORTED - timeout of 6000ms exceeded"));

    renderCleanupPage();

    await waitFor(() => {
      expect(screen.getAllByText("Puri Golden Beach").length).toBeGreaterThan(0);
    });

    // Should display volunteer count and equipment recommendations from deterministic synthesis
    expect(screen.getAllByText(/volunteers required/i).length).toBe(3);
    expect(screen.getAllByText(/est\. duration/i).length).toBe(3);
  });

  it("renders zero-state message cleanly when stats.locations is an empty array", async () => {
    renderCleanupPage({
      totalAnalyses: 0,
      totalWasteAllTime: 0,
      locations: [],
    });

    await waitFor(() => {
      expect(screen.getByText(/no pollution records found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/no high-priority cleanups currently scheduled/i)).toBeInTheDocument();
  });

  it("renders zero-state message cleanly when stats.locations is null or missing", async () => {
    renderCleanupPage({
      totalAnalyses: 0,
      totalWasteAllTime: 0,
    });

    await waitFor(() => {
      expect(screen.getByText(/no pollution records found/i)).toBeInTheDocument();
    });
  });

  it("handles manual refresh when backend is offline without crashing and displays toast", async () => {
    axios.post.mockRejectedValue(new Error("Network Error"));

    renderCleanupPage();

    await waitFor(() => {
      expect(screen.getAllByText("Puri Golden Beach").length).toBeGreaterThan(0);
    });
    const refreshBtn = screen.getByRole("button", { name: /refresh ai recommendations/i });

    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText(/synthesized deterministic cleanup plans/i)).toBeInTheDocument();
    });
  });
});
