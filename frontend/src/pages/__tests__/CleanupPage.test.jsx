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
import CleanupPage from "../CleanupPage.jsx";

const MOCK_LOCATIONS = [
  {
    beach: "Marina Beach",
    location_label: "Marina Beach, Chennai",
    total_waste: 45,
    pollution_score: 8,
    severity: "Severe",
    scan_count: 5,
  },
  {
    beach: "Kovalam Beach",
    location_label: "Kovalam Beach, Chennai",
    total_waste: 18,
    pollution_score: 4,
    severity: "Moderate",
    scan_count: 2,
  },
];

function setupAuthMock(user = { id: "u1", email: "user@test.com" }) {
  const session = user ? { user } : null;
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    cb(user ? "SIGNED_IN" : "SIGNED_OUT", session);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

function renderCleanup(customStats = null) {
  setupAuthMock();
  axios.get.mockImplementation((url) => {
    if (url.includes("/api/stats")) {
      return Promise.resolve({
        data: customStats || {
          totalAnalyses: 10,
          totalWasteAllTime: 63,
          locations: MOCK_LOCATIONS,
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

describe("CleanupPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockImplementation((url) => {
      if (url.includes("/cleanup/recommendations")) {
        return Promise.resolve({
          data: {
            source: "ollama_ministral-3:3b",
            recommendations: [
              {
                beach: "Marina Beach",
                location: "Marina Beach, Chennai",
                priority: "high",
                priority_tier: "Tier 1 - Critical",
                urgency: "Immediate",
                action: "Deploy rapid intervention volunteer team along the shoreline.",
                rationale: "Critical pollution score detected with dense plastic accumulation.",
                estimate: { volunteers: "25-40", time: "4 hours" },
                equipment: ["Cut-resistant gloves", "Heavy-duty grabbers", "Biohazard containers"],
                targeted_zones: ["High-tide waterline", "Boardwalk drainage"],
                suggested_schedule: "Within 48 hours",
                totalWaste: 45,
                score: 8,
              },
              {
                beach: "Kovalam Beach",
                location: "Kovalam Beach, Chennai",
                priority: "medium",
                priority_tier: "Tier 2 - Moderate",
                urgency: "Moderate",
                action: "Organize weekend community collection drive.",
                rationale: "Moderate accumulation with upward trend observed.",
                estimate: { volunteers: "10-18", time: "3 hours" },
                equipment: ["Puncture-resistant gloves", "Sorting tarps"],
                targeted_zones: ["Main beach access path"],
                suggested_schedule: "Within 7 days",
                totalWaste: 18,
                score: 4,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("renders Cleanup Recommendations title, subtitle, and refresh button", async () => {
    renderCleanup();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /cleanup recommendations/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Recommended Actions")).toBeInTheDocument();
    expect(screen.getByText("Suggested Schedule")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh ai recommendations/i })).toBeInTheDocument();
  });

  it("renders AI synthesized recommendations with priority tiers, equipment, and targeted zones", async () => {
    renderCleanup();
    await waitFor(() => {
      expect(screen.getAllByText("Marina Beach").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Kovalam Beach").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/tier 1 - critical/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tier 2 - moderate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/cut-resistant gloves/i)).toBeInTheDocument();
    expect(screen.getByText(/high-tide waterline/i)).toBeInTheDocument();
    expect(screen.getByText(/25-40 volunteers required/i)).toBeInTheDocument();
  });

  it("allows user to trigger manual refresh of recommendations", async () => {
    renderCleanup();
    await waitFor(() => screen.getByRole("button", { name: /refresh ai recommendations/i }));

    const refreshBtn = screen.getByRole("button", { name: /refresh ai recommendations/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/cleanup/recommendations"),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it("gracefully falls back to deterministic rule-based calculation if AI endpoint is offline", async () => {
    axios.post.mockRejectedValueOnce(new Error("AI Service Offline"));

    renderCleanup();
    await waitFor(() => {
      expect(screen.getAllByText("Marina Beach").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Kovalam Beach").length).toBeGreaterThan(0);
    });

    // Should still render priority badges and equipment without crashing
    expect(screen.getAllByText(/tier 1 - critical/i).length).toBeGreaterThan(0);
  });

  it("renders zero-state message when no locations or pollution records exist", async () => {
    renderCleanup({
      totalAnalyses: 0,
      totalWasteAllTime: 0,
      locations: [],
    });

    await waitFor(() => {
      expect(screen.getByText(/no pollution records found/i)).toBeInTheDocument();
    });
  });
});
