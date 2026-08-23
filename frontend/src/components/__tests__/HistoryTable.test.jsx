import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HistoryTable from "../HistoryTable.jsx";

const sampleRecords = Array.from({ length: 12 }, (_, i) => ({
  id:              i + 1,
  created_at:      `2026-07-${10 + i}T10:00:00Z`,
  location_label:  `Beach ${i + 1}`,
  total_waste:     (i + 1) * 2,
  pollution_score: (i + 1) * 10,
  severity:        i % 2 === 0 ? "Low" : "High",
  image_url:       `https://example.com/photo${i + 1}.jpg`,
  detections:      [],
}));

// ─────────────────────────────────────────────────────────────────────────────
describe("HistoryTable — rendering", () => {
  it("renders table with records and pagination info", () => {
    render(<HistoryTable history={sampleRecords} />);

    expect(screen.getByText("Analysis Records")).toBeInTheDocument();
    expect(screen.getByText("12 entries")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("renders empty state when history is empty", () => {
    render(<HistoryTable history={[]} />);
    expect(screen.getByText("No analyses match the selected filter.")).toBeInTheDocument();
  });

  it("renders empty state when history is undefined", () => {
    render(<HistoryTable history={undefined} />);
    expect(screen.getByText("No analyses match the selected filter.")).toBeInTheDocument();
  });

  it("renders only PAGE_SIZE (10) records per page", () => {
    render(<HistoryTable history={sampleRecords} />);
    // 12 records, page 1 shows records sorted desc by date (newest first, so Beach 12 first)
    // After desc sort: beach 12, 11...3 on page 1 (10 items)
    const rows = screen.getAllByRole("row");
    // 1 header + 10 data rows
    expect(rows).toHaveLength(11);
  });

  it("shows Export CSV button", () => {
    render(<HistoryTable history={sampleRecords} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("does NOT show User column when showUser=false", () => {
    render(<HistoryTable history={sampleRecords} showUser={false} />);
    expect(screen.queryByText(/^user$/i)).not.toBeInTheDocument();
  });

  it("shows User column header when showUser=true", () => {
    const records = sampleRecords.map((r) => ({ ...r, user_email: "u@test.com" }));
    render(<HistoryTable history={records} showUser={true} />);
    expect(screen.getByText(/^user$/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HistoryTable — pagination", () => {
  it("navigates to next page on Next → click", () => {
    render(<HistoryTable history={sampleRecords} />);

    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("navigates back to previous page on ← Prev click", () => {
    render(<HistoryTable history={sampleRecords} />);

    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    fireEvent.click(screen.getByRole("button", { name: /← prev/i }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("Next button is disabled on last page", () => {
    render(<HistoryTable history={sampleRecords} />);

    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByRole("button", { name: /next →/i })).toBeDisabled();
  });

  it("Prev button is disabled on first page", () => {
    render(<HistoryTable history={sampleRecords} />);
    expect(screen.getByRole("button", { name: /← prev/i })).toBeDisabled();
  });

  it("resets to page 1 when history changes", () => {
    const { rerender } = render(<HistoryTable history={sampleRecords} />);
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    // Simulate filter reducing results to 11 (2 pages)
    rerender(<HistoryTable history={sampleRecords.slice(0, 11)} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HistoryTable — sorting", () => {
  it("toggles date sort when Date header is clicked", () => {
    render(<HistoryTable history={sampleRecords} />);

    // Default is desc — Beach 12 (most recent) should appear first
    expect(screen.getByText("Beach 12")).toBeInTheDocument();

    const dateHeader = screen.getByText(/date/i);
    fireEvent.click(dateHeader); // now asc — Beach 1 appears first

    expect(screen.getByText("Beach 1")).toBeInTheDocument();
  });

  it("toggles score sort when Score header is clicked", () => {
    render(<HistoryTable history={sampleRecords} />);

    const scoreHeader = screen.getByText(/score/i);
    fireEvent.click(scoreHeader); // sort desc by score → 120 first

    expect(screen.getByText("120")).toBeInTheDocument();

    fireEvent.click(scoreHeader); // sort asc → 10 first
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
  });

  it("resets to page 1 when sort changes", () => {
    render(<HistoryTable history={sampleRecords} />);
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/score/i));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HistoryTable — delete button", () => {
  it("does NOT render delete buttons when onDeleteRequest is not provided", () => {
    render(<HistoryTable history={sampleRecords} />);
    expect(screen.queryByRole("button", { name: /delete analysis/i })).not.toBeInTheDocument();
  });

  it("renders a delete button per row when onDeleteRequest is provided", () => {
    const onDelete = vi.fn();
    render(<HistoryTable history={sampleRecords.slice(0, 5)} onDeleteRequest={onDelete} />);
    const btns = screen.getAllByRole("button", { name: /delete analysis/i });
    expect(btns).toHaveLength(5);
  });

  it("calls onDeleteRequest with correct id when delete is clicked", () => {
    const onDelete = vi.fn();
    render(<HistoryTable history={sampleRecords.slice(0, 3)} onDeleteRequest={onDelete} />);
    const btns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(btns[0]);
    // First row after desc sort is id=3 (most recent)
    expect(onDelete).toHaveBeenCalledWith(3);
  });

  it("disables delete button for the row currently being deleted", () => {
    render(
      <HistoryTable
        history={sampleRecords.slice(0, 3)}
        onDeleteRequest={vi.fn()}
        deletingId={2}
      />
    );
    const btns = screen.getAllByRole("button", { name: /delete analysis/i });
    // Find the disabled one
    const disabledBtn = btns.find((b) => b.disabled);
    expect(disabledBtn).toBeTruthy();
  });

  it("renders a View Detection button for every row", () => {
    render(<HistoryTable history={sampleRecords.slice(0, 3)} />);
    const viewBtns = screen.getAllByRole("button", { name: /view detection/i });
    expect(viewBtns).toHaveLength(3);
  });
});
