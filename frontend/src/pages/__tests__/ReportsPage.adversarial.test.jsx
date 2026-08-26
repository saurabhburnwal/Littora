import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

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

vi.mock("../../utils/downloadUtils.js", () => ({
  downloadMarkdown: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock("axios");

import { supabase } from "../../lib/supabase.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import ReportsPage from "../ReportsPage.jsx";

const MOCK_STATS_WITH_HISTORY = {
  totalAnalyses: 15,
  totalWasteAllTime: 50,
  avgScore: 5.0,
  severityCounts: { Low: 5, Moderate: 5, High: 3, Severe: 2 },
  aggregateDetections: { plastic_bottle: 25, fishing_net: 15, aluminium_can: 10 },
  locations: [
    { beach: "Marina Beach", location_label: "Marina Beach, Chennai", total_waste: 30, pollution_score: 6 },
    { beach: "Kovalam Beach", location_label: "Kovalam Beach, Chennai", total_waste: 20, pollution_score: 4 },
  ],
  history: [
    {
      id: "scan-1",
      created_at: "2026-06-15T10:00:00Z",
      beach: "Marina Beach",
      location_label: "Marina Beach, Chennai",
      total_waste: 12,
      pollution_score: 7,
      severity: "High",
      detections: { plastic_bottle: 8, fishing_net: 4 },
    },
    {
      id: "scan-2",
      created_at: "2026-06-20T14:00:00Z",
      beach: "Kovalam Beach",
      location_label: "Kovalam Beach, Chennai",
      total_waste: 8,
      pollution_score: 3,
      severity: "Low",
      detections: { aluminium_can: 8 },
    },
  ],
};

function setupAuthMock(user = { id: "u-tester", email: "tester@littora.org" }) {
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

function renderReportsPageWithStats(statsData = MOCK_STATS_WITH_HISTORY) {
  setupAuthMock();
  axios.get.mockImplementation((url) => {
    if (url.includes("/api/stats")) {
      return Promise.resolve({ data: statsData });
    }
    if (url.includes("/api/email/status")) {
      return Promise.resolve({ data: { status: "healthy", mode: "smtp", configured: true } });
    }
    return Promise.resolve({ data: {} });
  });

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

describe("ReportsPage - Adversarial & Edge Case Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockImplementation((url) => {
      if (url.includes("/report/generate")) {
        return Promise.resolve({
          data: {
            executive_summary: "AI generated environmental analysis.",
            risk_assessment: "Low ecological disturbance.",
            impact_analysis: "Routine monitoring suggested.",
            priority_actions: ["Action 1", "Action 2"],
            source: "ollama_ministral-3:3b",
          },
        });
      }
      if (url.includes("/api/email/send-report")) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("handles completely empty stats.history (empty array, null, undefined) without throwing errors", async () => {
    const emptyStats = {
      totalAnalyses: 0,
      totalWasteAllTime: 0,
      avgScore: 0,
      severityCounts: { Low: 0, Moderate: 0, High: 0, Severe: 0 },
      aggregateDetections: {},
      locations: [],
      history: [],
    };

    renderReportsPageWithStats(emptyStats);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^reports$/i })).toBeInTheDocument();
    });

    expect(screen.getByText("No waste items cataloged in this period.")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("handles inverted custom dates (customStart > customEnd) gracefully with 0 matching records", async () => {
    renderReportsPageWithStats();

    await waitFor(() => screen.getByRole("button", { name: /select custom report/i }));
    fireEvent.click(screen.getByRole("button", { name: /select custom report/i }));

    await waitFor(() => {
      expect(screen.getByText("Custom Filter Criteria")).toBeInTheDocument();
    });

    const dateInputs = screen.getAllByDisplayValue("");
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];

    // Inverted dates: Start in Dec 2026, End in Jan 2026
    fireEvent.change(startDateInput, { target: { value: "2026-12-31" } });
    fireEvent.change(endDateInput, { target: { value: "2026-01-01" } });

    await waitFor(() => {
      expect(screen.getByText("No waste items cataloged in this period.")).toBeInTheDocument();
    });
  });

  it("handles future date range selections with 0 records gracefully", async () => {
    renderReportsPageWithStats();

    await waitFor(() => screen.getByRole("button", { name: /select custom report/i }));
    fireEvent.click(screen.getByRole("button", { name: /select custom report/i }));

    const dateInputs = screen.getAllByDisplayValue("");
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];

    fireEvent.change(startDateInput, { target: { value: "2035-01-01" } });
    fireEvent.change(endDateInput, { target: { value: "2035-12-31" } });

    await waitFor(() => {
      expect(screen.getByText("No waste items cataloged in this period.")).toBeInTheDocument();
    });
  });

  it("handles non-matching location filter cleanly", async () => {
    renderReportsPageWithStats();

    await waitFor(() => screen.getByRole("button", { name: /select custom report/i }));
    fireEvent.click(screen.getByRole("button", { name: /select custom report/i }));

    const selectEl = screen.getByRole("combobox");
    expect(selectEl).toBeInTheDocument();

    // Select a location that has 0 scans in the period
    fireEvent.change(selectEl, { target: { value: "Marina Beach" } });
    expect(selectEl.value).toBe("Marina Beach");
  });

  it("survives rapid multi-period tab clicking without state corruption or race conditions", async () => {
    renderReportsPageWithStats();

    await waitFor(() => screen.getByRole("button", { name: /select daily report/i }));

    const dailyBtn = screen.getByRole("button", { name: /select daily report/i });
    const weeklyBtn = screen.getByRole("button", { name: /select weekly report/i });
    const monthlyBtn = screen.getByRole("button", { name: /select monthly report/i });
    const customBtn = screen.getByRole("button", { name: /select custom report/i });

    // Rapid sequential clicks
    fireEvent.click(dailyBtn);
    fireEvent.click(weeklyBtn);
    fireEvent.click(monthlyBtn);
    fireEvent.click(customBtn);
    fireEvent.click(dailyBtn);
    fireEvent.click(monthlyBtn);

    await waitFor(() => {
      expect(monthlyBtn.className).toContain("selected");
    });
  });

  it("handles repeated email modal openings and closings properly", async () => {
    renderReportsPageWithStats();

    await waitFor(() => screen.getByRole("button", { name: /email report/i }));

    // Open modal 1st time
    fireEvent.click(screen.getByRole("button", { name: /email report/i }));
    expect(screen.getByRole("heading", { name: /email environmental report/i })).toBeInTheDocument();

    // Close via Close button (X)
    const closeBtn = screen.getByRole("button", { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("heading", { name: /email environmental report/i })).not.toBeInTheDocument();

    // Open modal 2nd time
    fireEvent.click(screen.getByRole("button", { name: /email report/i }));
    expect(screen.getByRole("heading", { name: /email environmental report/i })).toBeInTheDocument();

    // Close via Cancel button
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole("heading", { name: /email environmental report/i })).not.toBeInTheDocument();

    // Open modal 3rd time
    fireEvent.click(screen.getByRole("button", { name: /email report/i }));
    expect(screen.getByRole("heading", { name: /email environmental report/i })).toBeInTheDocument();
  });

  it("blocks submission and shows error message for invalid or empty email addresses", async () => {
    renderReportsPageWithStats();

    await waitFor(() => screen.getByRole("button", { name: /email report/i }));
    fireEvent.click(screen.getByRole("button", { name: /email report/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/municipal\.officer@coastline\.gov/i);
    const form = screen.getByRole("dialog").querySelector("form");

    // Test 1: Empty email
    fireEvent.change(emailInput, { target: { value: "   " } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid recipient email address.")).toBeInTheDocument();
    });
    expect(axios.post).not.toHaveBeenCalledWith(expect.stringContaining("/api/email/send-report"), expect.any(Object), expect.any(Object));

    // Test 2: Invalid email syntax (missing domain)
    fireEvent.change(emailInput, { target: { value: "invalid-email-address" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid email format. Please check the address.")).toBeInTheDocument();
    });
    expect(axios.post).not.toHaveBeenCalledWith(expect.stringContaining("/api/email/send-report"), expect.any(Object), expect.any(Object));

    // Test 3: Invalid email syntax (missing username)
    fireEvent.change(emailInput, { target: { value: "@missinguser.com" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid email format. Please check the address.")).toBeInTheDocument();
    });
    expect(axios.post).not.toHaveBeenCalledWith(expect.stringContaining("/api/email/send-report"), expect.any(Object), expect.any(Object));

    // Test 4: Valid email after fixes should succeed
    fireEvent.change(emailInput, { target: { value: "valid.officer@coastline.gov" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/email/send-report"),
        expect.objectContaining({ recipientEmail: "valid.officer@coastline.gov" }),
        expect.any(Object)
      );
    });
  });
});
