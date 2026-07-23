import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HistoryPage from "../HistoryPage.jsx";
import { StatsContext } from "../../context/StatsContext.jsx";

const mockHistoryData = [
  {
    id: 1,
    created_at: "2026-07-20T10:00:00Z",
    location_label: "Juhu Beach, Mumbai",
    total_waste: 5,
    pollution_score: 15,
    severity: "Moderate",
    image_url: "https://example.com/photo1.jpg",
  },
  {
    id: 2,
    created_at: "2026-07-21T10:00:00Z",
    location_label: "Baga Beach, Goa",
    total_waste: 2,
    pollution_score: 5,
    severity: "low", // mixed case test
    image_url: "https://example.com/photo2.jpg",
  },
  {
    id: 3,
    created_at: "2026-07-22T10:00:00Z",
    location_label: "Marina Beach, Chennai",
    total_waste: 12,
    pollution_score: 45,
    severity: "HIGH", // uppercase test
    image_url: "https://example.com/photo3.jpg",
  },
  {
    id: 4,
    created_at: "2026-07-23T10:00:00Z",
    location_label: "Juhu Beach, Mumbai",
    total_waste: 20,
    pollution_score: 85,
    severity: "Severe",
    image_url: "https://example.com/photo4.jpg",
  },
];

function renderWithStatsContext(history = mockHistoryData) {
  const statsValue = {
    stats: { history },
    loadStats: vi.fn(),
  };

  return render(
    <StatsContext.Provider value={statsValue}>
      <HistoryPage />
    </StatsContext.Provider>
  );
}

describe("HistoryPage component & filter functionality", () => {
  it("renders History page title and initial total count", () => {
    renderWithStatsContext();
    expect(screen.getByRole("heading", { level: 1, name: /history/i })).toBeInTheDocument();
    expect(screen.getByText(/4 total analyses/i)).toBeInTheDocument();
  });

  it("filters analyses correctly when clicking Low severity pill (handles lowercase data)", () => {
    renderWithStatsContext();

    const lowPill = screen.getByRole("button", { name: /^low$/i });
    fireEvent.click(lowPill);

    expect(screen.getByText(/1 matching analyses/i)).toBeInTheDocument();
    expect(screen.getAllByText("Baga Beach, Goa").length).toBeGreaterThan(0);
    expect(screen.queryByText("Marina Beach, Chennai")).not.toBeInTheDocument();
  });

  it("filters analyses correctly when clicking High severity pill (handles uppercase data)", () => {
    renderWithStatsContext();

    const highPill = screen.getByRole("button", { name: /^high$/i });
    fireEvent.click(highPill);

    expect(screen.getByText(/1 matching analyses/i)).toBeInTheDocument();
    expect(screen.getAllByText("Marina Beach, Chennai").length).toBeGreaterThan(0);
    expect(screen.queryByText("Baga Beach, Goa")).not.toBeInTheDocument();
  });

  it("filters analyses by location search input", () => {
    renderWithStatsContext();

    const searchInput = screen.getByPlaceholderText(/search location or severity/i);
    fireEvent.change(searchInput, { target: { value: "Juhu" } });

    expect(screen.getByText(/2 matching analyses/i)).toBeInTheDocument();
    expect(screen.getAllByText("Juhu Beach, Mumbai").length).toBeGreaterThan(0);
    expect(screen.queryByText("Baga Beach, Goa")).not.toBeInTheDocument();
  });

  it("combines severity pill filter and search input", () => {
    renderWithStatsContext();

    const moderatePill = screen.getByRole("button", { name: /^moderate$/i });
    fireEvent.click(moderatePill);

    const searchInput = screen.getByPlaceholderText(/search location or severity/i);
    fireEvent.change(searchInput, { target: { value: "Juhu" } });

    expect(screen.getByText(/1 matching analyses/i)).toBeInTheDocument();
    expect(screen.getAllByText("Juhu Beach, Mumbai").length).toBeGreaterThan(0);
  });

  it("displays empty filter state when no matches are found", () => {
    renderWithStatsContext();

    const searchInput = screen.getByPlaceholderText(/search location or severity/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentLocation" } });

    expect(screen.getByText(/0 matching analyses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no photos match the selected filter/i).length).toBeGreaterThan(0);
  });
});
