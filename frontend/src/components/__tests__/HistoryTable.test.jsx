import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HistoryTable from "../HistoryTable.jsx";

const sampleRecords = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  created_at: `2026-07-${10 + i}T10:00:00Z`,
  location_label: `Beach ${i + 1}`,
  total_waste: (i + 1) * 2,
  pollution_score: (i + 1) * 10,
  severity: i % 2 === 0 ? "Low" : "High",
  image_url: `https://example.com/photo${i + 1}.jpg`,
}));

describe("HistoryTable component", () => {
  it("renders table with records and pagination", () => {
    render(<HistoryTable history={sampleRecords} />);

    expect(screen.getByText("Analysis Records")).toBeInTheDocument();
    expect(screen.getByText("12 entries")).toBeInTheDocument();
    expect(screen.getByText("Beach 12")).toBeInTheDocument();

    // Check pagination count (10 per page, so page 1 has 10 items)
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("navigates between pages", () => {
    render(<HistoryTable history={sampleRecords} />);

    const nextBtn = screen.getByRole("button", { name: /next →/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    const prevBtn = screen.getByRole("button", { name: /← prev/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("toggles sorting when clicking column headers", () => {
    render(<HistoryTable history={sampleRecords} />);

    const scoreHeader = screen.getByText(/score/i);
    fireEvent.click(scoreHeader); // Sort score desc
    expect(screen.getByText("120")).toBeInTheDocument();

    fireEvent.click(scoreHeader); // Sort score asc
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
  });

  it("renders empty state when history is empty", () => {
    render(<HistoryTable history={[]} />);
    expect(screen.getByText("No analyses match the selected filter.")).toBeInTheDocument();
  });
});
