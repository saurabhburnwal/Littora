import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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
      { waste_type: "can", count: 2 },
    ],
  },
];

describe("PhotoGallery component", () => {
  it("renders photo cards with location and severity badge", () => {
    render(<PhotoGallery items={mockItems} />);

    expect(screen.getByText("Palolem Beach, Goa")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });

  it("opens detail modal when card is clicked and closes on close button click", () => {
    render(<PhotoGallery items={mockItems} />);

    const card = screen.getByRole("button", { name: /analysis from/i });
    fireEvent.click(card);

    // Modal opens showing analysis detail dialog
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders empty state when items list is empty", () => {
    render(<PhotoGallery items={[]} />);
    expect(screen.getByText("No photos match the selected filter.")).toBeInTheDocument();
  });
});
