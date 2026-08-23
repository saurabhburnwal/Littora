import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PhotoGallery from "../PhotoGallery.jsx";

const mockItems = [
  {
    id: 101,
    created_at: "2026-07-20T10:00:00Z",
    location_label: "Palolem Beach, Goa",
    total_waste: 8,
    pollution_score: 35,
    severity: "Moderate",
    image_url: "https://example.com/beach1.jpg",
    detections: [
      { waste_type: "bottle", count: 3 },
      { waste_type: "can",    count: 2 },
    ],
  },
  {
    id: 102,
    created_at: "2026-07-21T10:00:00Z",
    location_label: "Kovalam Beach",
    total_waste: 15,
    pollution_score: 70,
    severity: "High",
    image_url: "https://example.com/beach2.jpg",
    detections: [
      { waste_type: "bag",     count: 8 },
      { waste_type: "wrapper", count: 7 },
    ],
    user_email: "uploader@test.com",
    user_id:    "uid-202",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
describe("PhotoGallery — rendering", () => {
  it("renders photo cards with location, waste items count, and severity badge", () => {
    render(<PhotoGallery items={mockItems} />);

    expect(screen.getByText("Palolem Beach, Goa")).toBeInTheDocument();
    expect(screen.getByText("8 waste items")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("Kovalam Beach")).toBeInTheDocument();
    expect(screen.getByText("15 waste items")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders empty state when items list is empty", () => {
    render(<PhotoGallery items={[]} />);
    expect(screen.getByText("No photos match the selected filter.")).toBeInTheDocument();
  });

  it("renders empty state when items is undefined", () => {
    render(<PhotoGallery items={undefined} />);
    expect(screen.getByText("No photos match the selected filter.")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("PhotoGallery — modal", () => {
  it("opens detail modal when card is clicked", () => {
    render(<PhotoGallery items={mockItems} />);
    const card = screen.getAllByRole("button", { name: /analysis from/i })[0];
    fireEvent.click(card);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes modal when close button is clicked", () => {
    render(<PhotoGallery items={mockItems} />);
    fireEvent.click(screen.getAllByRole("button", { name: /analysis from/i })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes modal when overlay background is clicked", () => {
    render(<PhotoGallery items={mockItems} />);
    fireEvent.click(screen.getAllByRole("button", { name: /analysis from/i })[0]);
    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens modal via keyboard Enter key on card", () => {
    render(<PhotoGallery items={mockItems} />);
    const card = screen.getAllByRole("button", { name: /analysis from/i })[0];
    fireEvent.keyDown(card, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows uploader info in modal when showUser=true", () => {
    render(<PhotoGallery items={mockItems} showUser={true} />);
    fireEvent.click(screen.getAllByRole("button", { name: /analysis from/i })[1]);
    expect(screen.getByText("uploader@test.com")).toBeInTheDocument();
  });

  it("shows full user_name in modal when present", () => {
    const itemsWithName = [{ ...mockItems[1], user_name: "Saurabh" }];
    render(<PhotoGallery items={itemsWithName} showUser={true} />);
    fireEvent.click(screen.getByRole("button", { name: /analysis from/i }));
    expect(screen.getByText("Saurabh")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("PhotoGallery — delete button", () => {
  it("does NOT render delete button when onDeleteRequest is not provided", () => {
    render(<PhotoGallery items={mockItems} />);
    expect(screen.queryByRole("button", { name: /delete analysis/i })).not.toBeInTheDocument();
  });

  it("renders delete button on each card when onDeleteRequest is provided", () => {
    const onDelete = vi.fn();
    render(<PhotoGallery items={mockItems} onDeleteRequest={onDelete} />);
    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    expect(deleteBtns).toHaveLength(mockItems.length);
  });

  it("calls onDeleteRequest with item id when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<PhotoGallery items={mockItems} onDeleteRequest={onDelete} />);
    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith(101);
  });

  it("does NOT open modal when delete button is clicked (stopPropagation)", () => {
    const onDelete = vi.fn();
    render(<PhotoGallery items={mockItems} onDeleteRequest={onDelete} />);
    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    fireEvent.click(deleteBtns[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables delete button for the item being deleted", () => {
    render(<PhotoGallery items={mockItems} onDeleteRequest={vi.fn()} deletingId={101} />);
    const deleteBtns = screen.getAllByRole("button", { name: /delete analysis/i });
    expect(deleteBtns[0]).toBeDisabled();   // id=101 is deleting
    expect(deleteBtns[1]).not.toBeDisabled(); // id=102 is not
  });
});
