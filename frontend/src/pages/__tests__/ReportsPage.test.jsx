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
import { generatePdfReport } from "../../utils/generatePdfReport.js";
import { downloadMarkdown } from "../../utils/downloadUtils.js";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { StatsProvider } from "../../context/StatsContext.jsx";
import { SettingsProvider } from "../../context/SettingsContext.jsx";
import ReportsPage from "../ReportsPage.jsx";

const MOCK_STATS = {
  totalAnalyses: 25,
  totalWasteAllTime: 78,
  avgScore: 5.2,
  severityCounts: { Low: 10, Moderate: 8, High: 5, Severe: 2 },
  aggregateDetections: { bottle: 40, can: 20, bag: 15, wrapper: 3 },
  locations: [
    { beach: "Marina Beach", location_label: "Marina Beach, Chennai", total_waste: 35, pollution_score: 6 },
    { beach: "Elliot's Beach", location_label: "Elliot's Beach, Chennai", total_waste: 20, pollution_score: 4 },
  ],
  history: [
    {
      id: "scan-1",
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago (daily)
      beach: "Marina Beach",
      location_label: "Marina Beach, Chennai",
      total_waste: 12,
      pollution_score: 7,
      severity: "High",
      detections: { bottle: 8, can: 4 },
    },
    {
      id: "scan-2",
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago (weekly)
      beach: "Elliot's Beach",
      location_label: "Elliot's Beach, Chennai",
      total_waste: 8,
      pollution_score: 4,
      severity: "Moderate",
      detections: { bag: 5, wrapper: 3 },
    },
    {
      id: "scan-3",
      created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), // 15 days ago (monthly)
      beach: "Marina Beach",
      location_label: "Marina Beach, Chennai",
      total_waste: 15,
      pollution_score: 5,
      severity: "Moderate",
      detections: { bottle: 10, can: 5 },
    },
  ],
};

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
    axios.get.mockImplementation((url) => {
      if (url.includes("/api/stats")) {
        return Promise.resolve({ data: MOCK_STATS });
      }
      if (url.includes("/api/email/status")) {
        return Promise.resolve({ data: { status: "healthy", mode: "smtp", configured: true } });
      }
      return Promise.resolve({ data: {} });
    });
    axios.post.mockImplementation((url) => {
      if (url.includes("/report/generate")) {
        return Promise.resolve({
          data: {
            executive_summary: "AI generated environmental analysis for Littora coastline.",
            risk_assessment: "Elevated risk of plastic ingestion.",
            impact_analysis: "Threat to marine intertidal ecosystem.",
            priority_actions: [
              "Deploy volunteer crew to high-density zones",
              "Install additional disposal bins",
            ],
            source: "ollama_ministral-3:3b",
          },
        });
      }
      if (url.includes("/api/email/send-report")) {
        return Promise.resolve({ data: { message: "Report sent successfully", recipient: "test@example.com" } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("renders Reports title, period option cards, and action buttons", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^reports$/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
    expect(screen.getAllByText("Last 30 Days").length).toBeGreaterThan(0);
    expect(screen.getByText("Last 90 Days")).toBeInTheDocument();
    expect(screen.getByText("All Time")).toBeInTheDocument();
    expect(screen.getByText("Custom Report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf report/i })).toBeInTheDocument();
  });

  it("dynamically scopes metrics when switching between Last 7 Days, Last 30 Days, and Last 90 Days", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    
    // Switch to Last 7 Days
    await waitFor(() => screen.getByRole("button", { name: /select last 7 days/i }));
    fireEvent.click(screen.getByRole("button", { name: /select last 7 days/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select last 7 days/i }).className).toContain("selected");
      expect(screen.getAllByText("Last 7 Days").length).toBeGreaterThan(0);
    });

    // Switch to Last 90 Days
    fireEvent.click(screen.getByRole("button", { name: /select last 90 days/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /select last 90 days/i }).className).toContain("selected");
    });
  });

  it("renders custom date range and location filter toolbar when Custom Report is selected", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => screen.getByRole("button", { name: /select custom report/i }));

    fireEvent.click(screen.getByRole("button", { name: /select custom report/i }));

    await waitFor(() => {
      expect(screen.getByText("Custom Filter Criteria")).toBeInTheDocument();
      expect(screen.getByText("Start Date")).toBeInTheDocument();
      expect(screen.getByText("End Date")).toBeInTheDocument();
      expect(screen.getByText("Monitored Location")).toBeInTheDocument();
    });

    // Test location selector
    const locationSelect = screen.getByRole("combobox");
    expect(locationSelect).toBeInTheDocument();
    fireEvent.change(locationSelect, { target: { value: "Marina Beach" } });
    expect(locationSelect.value).toBe("Marina Beach");
  });

  it("renders AI Executive Summary card and allows regeneration", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => {
      expect(screen.getByText("AI Executive Environmental Summary")).toBeInTheDocument();
    });

    const regenerateBtn = screen.getByRole("button", { name: /regenerate ai summary/i });
    expect(regenerateBtn).toBeInTheDocument();

    fireEvent.click(regenerateBtn);
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/report/generate"),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it("opens interactive Email Report modal, validates email, and dispatches report", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => screen.getByRole("button", { name: /email report/i }));

    // Click Email Report to open modal
    fireEvent.click(screen.getByRole("button", { name: /email report/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /email environmental report/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/municipal\.officer@coastline\.gov/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput.value).toBe("reporter@example.com");

    // Edit email to another address
    fireEvent.change(emailInput, { target: { value: "officer@coastalgov.org" } });
    expect(emailInput.value).toBe("officer@coastalgov.org");

    // Submit report
    const sendBtn = screen.getByRole("button", { name: /send report/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/email/send-report"),
        expect.objectContaining({
          recipientEmail: "officer@coastalgov.org",
          reportType: "30d",
        }),
        expect.any(Object)
      );
    });
  });

  it("triggers generatePdfReport when Download PDF Report is clicked", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => screen.getByRole("button", { name: /download pdf report/i }));

    fireEvent.click(screen.getByRole("button", { name: /download pdf report/i }));
    await waitFor(() => {
      expect(generatePdfReport).toHaveBeenCalled();
    });
  });

  it("triggers downloadMarkdown when Markdown export button is clicked", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => screen.getByRole("button", { name: /markdown/i }));

    fireEvent.click(screen.getByRole("button", { name: /markdown/i }));
    expect(downloadMarkdown).toHaveBeenCalled();
  });

  it("selects report period via Enter and Space keyboard interaction", async () => {
    renderReports({ user: { id: "u-reporter", email: "reporter@example.com" } });
    await waitFor(() => screen.getByRole("button", { name: /select last 7 days/i }));

    const card7d = screen.getByRole("button", { name: /select last 7 days/i });
    fireEvent.keyDown(card7d, { key: "Enter" });
    expect(card7d.className).toContain("selected");

    const card90d = screen.getByRole("button", { name: /select last 90 days/i });
    fireEvent.keyDown(card90d, { key: " " });
    expect(card90d.className).toContain("selected");
  });
});
